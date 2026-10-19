import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOsPrisma,
  PrismaOsPartyStore,
  PrismaOsWorkforceStore,
  PrismaOsImportStore,
} from './index';
import { LocationCommandService, PartyCommandService } from '@isalwa/os-party';
import { ImportCommandService } from '@isalwa/os-import';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('client import phone review (no silent data loss)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let importStore: PrismaOsImportStore;
  let partySvc: PartyCommandService;
  let importSvc: ImportCommandService;
  const previousFlag = process.env.OS_REAL_CLIENT_IMPORT_ENABLED;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    importStore = new PrismaOsImportStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    importSvc = new ImportCommandService(importStore, partyStore, partySvc, new LocationCommandService(partyStore));
    process.env.OS_REAL_CLIENT_IMPORT_ENABLED = 'true';
  });

  after(() => {
    if (previousFlag === undefined) delete process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    else process.env.OS_REAL_CLIENT_IMPORT_ENABLED = previousFlag;
  });

  const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function seedAdmin() {
    const org = await workforceStore.seedOrganization('Phone Review Org', `ipr-${unique()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `ipr-${unique()}@o.bo`,
      'Rev',
      'Admin',
      'master_data.admin',
    );
    const c: RequestContext = {
      organizationId: org.id,
      actorMemberId: admin.member.id,
      personId: admin.person.id,
      authIdentityId: admin.auth.id,
      correlationId: `corr-ipr-${unique()}`,
      effectiveAt: new Date(),
    };
    return { org, c };
  }

  const row = (rowIndex: number, commercialName: string, cells: { celular?: string | number; telefono?: string }) => ({
    section: 'B' as const,
    rowIndex,
    commercialName,
    givenName: 'Contacto',
    familyName: `Fila${rowIndex}`,
    ...cells,
  });

  async function dryRun(c: RequestContext, rows: unknown[], extra: Record<string, unknown> = {}) {
    const result = await importSvc.execute(
      'DryRunClientImport',
      c,
      { sourceKind: 'xls_datos_clientes', sourceFingerprint: `fp-${unique()}`, rows, ...extra },
      `dry-${unique()}`,
    );
    return result.data as Record<string, any>;
  }

  async function review(c: RequestContext, importBatchId: string) {
    const result = await importSvc.execute('ListImportPhoneReview', c, { importBatchId }, `rev-${unique()}`);
    return result.data as Record<string, any>;
  }

  it('mixed batch: invalid values are listed with reasons, masked in receipts, and block execution with nothing written', async () => {
    const { org, c } = await seedAdmin();
    const receipt = await dryRun(c, [
      row(0, 'Mixta Valida', { celular: '70011111' }),
      row(1, 'Mixta Invalida', { celular: '2212345' }),
      row(2, 'Mixta Parcial', { celular: '80012345/70033333' }),
      row(3, 'Mixta Fijo', { telefono: '33123456' }),
    ]);
    const phones = receipt.phoneReview;
    assert.equal(phones.country, 'BO');
    assert.equal(phones.countrySource, 'default');
    assert.deepEqual(
      [phones.accepted, phones.invalid, phones.corrected, phones.omitted, phones.rowsNeedingCorrection],
      [3, 2, 0, 0, 2],
    );
    assert.deepEqual(
      phones.items.map((i: any) => [i.rowIndex, i.valueId, i.reason, i.proposedAction, i.maskedOriginal]),
      [
        [1, 'celular:0', 'wrong_length', 'correct_or_omit', '•••345'],
        [2, 'celular:0', 'unassigned_leading_digit', 'correct_or_omit', '•••345'],
      ],
    );

    // Receipts and events never carry the original values.
    const batch = await prisma.osImportBatch.findFirstOrThrow({ where: { id: receipt.importBatchId } });
    const events = await prisma.osBusinessEvent.findMany({ where: { organizationId: org.id } });
    for (const stored of [JSON.stringify(batch.receiptJson), JSON.stringify(events.map((e) => e.payloadJson))]) {
      assert.equal(stored.includes('2212345'), false);
      assert.equal(stored.includes('80012345'), false);
    }

    // Reviewers see originals; the read is not sealed into the replay table.
    const key = `rev-${unique()}`;
    const listed = (await importSvc.execute('ListImportPhoneReview', c, { importBatchId: receipt.importBatchId }, key))
      .data as Record<string, any>;
    const invalidRow = listed.rows.find((r: any) => r.rowIndex === 1);
    assert.equal(invalidRow.celularOriginal, '2212345');
    assert.equal(invalidRow.values[0].original, '2212345');
    assert.equal(invalidRow.needsCorrection, true);
    assert.equal(invalidRow.version, 0);
    assert.equal(await prisma.osIdempotencyKey.count({ where: { organizationId: org.id, key } }), 0);

    // Execution refuses before any write.
    const partiesBefore = await prisma.osParty.count({ where: { organizationId: org.id } });
    await assert.rejects(
      () => importSvc.execute('ExecuteClientImport', c, { importBatchId: receipt.importBatchId }, `ex-${unique()}`),
      (err: Error) => err.message === 'IMPORT_PHONE_REVIEW_REQUIRED',
    );
    assert.equal(await prisma.osParty.count({ where: { organizationId: org.id } }), partiesBefore);
    assert.equal(await prisma.osContact.count({ where: { organizationId: org.id } }), 0);
  });

  it('correction and explicit omission are versioned, replay-safe, and the batch then imports what was decided', async () => {
    const { org, c } = await seedAdmin();
    const receipt = await dryRun(
      c,
      [
        row(0, 'Decide Valida', { celular: '70011112' }),
        row(1, 'Decide Corregir', { celular: '2212345' }),
        row(2, 'Decide Omitir', { celular: '80012346/70033334' }),
      ],
      { phoneCountry: 'BO' },
    );
    assert.equal(receipt.phoneReview.countrySource, 'explicit');
    const batchId = receipt.importBatchId as string;
    const resolve = (payload: Record<string, unknown>, key = `res-${unique()}`) =>
      importSvc.execute('ResolveImportPhoneValue', c, { importBatchId: batchId, ...payload }, key);

    // Stale version, invalid correction, and rewriting a valid value are refused and change nothing.
    await assert.rejects(
      () => resolve({ rowIndex: 1, valueId: 'celular:0', expectedVersion: 3, decision: 'correct', correctedNumber: '22123456', reason: 'Confirmado por llamada' }),
      (err: Error) => err.message === 'CONFLICT',
    );
    await assert.rejects(
      () => resolve({ rowIndex: 1, valueId: 'celular:0', expectedVersion: 0, decision: 'correct', correctedNumber: '1234', reason: 'Confirmado por llamada' }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
    await assert.rejects(
      () => resolve({ rowIndex: 2, valueId: 'celular:1', expectedVersion: 0, decision: 'omit', reason: 'No se usa este número' }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
    assert.equal((await review(c, batchId)).rows.find((r: any) => r.rowIndex === 1).version, 0);

    // Correct: same key twice replays instead of applying twice.
    const key = `res-${unique()}`;
    const corrected = await resolve(
      { rowIndex: 1, valueId: 'celular:0', expectedVersion: 0, decision: 'correct', correctedNumber: '2212 3456', reason: 'Confirmado por llamada con el cliente' },
      key,
    );
    const replayed = await resolve(
      { rowIndex: 1, valueId: 'celular:0', expectedVersion: 0, decision: 'correct', correctedNumber: '2212 3456', reason: 'Confirmado por llamada con el cliente' },
      key,
    );
    assert.deepEqual(replayed.data, corrected.data);
    assert.equal(corrected.data.rowVersion, 1);
    assert.equal(JSON.stringify(corrected.data).includes('2212345'), false);
    const resolvedEvents = await prisma.osBusinessEvent.count({
      where: { organizationId: org.id, eventType: 'import.row.phone_resolved' },
    });
    assert.equal(resolvedEvents, 1);

    // Still blocked while row 2 has an unresolved value.
    await assert.rejects(
      () => importSvc.execute('ExecuteClientImport', c, { importBatchId: batchId }, `ex-${unique()}`),
      (err: Error) => err.message === 'IMPORT_PHONE_REVIEW_REQUIRED',
    );

    await resolve({ rowIndex: 2, valueId: 'celular:0', expectedVersion: 0, decision: 'omit', reason: 'El cliente no reconoce este número' });

    const listed = await review(c, batchId);
    const omittedRow = listed.rows.find((r: any) => r.rowIndex === 2);
    assert.equal(omittedRow.values[0].status, 'omitted');
    assert.equal(omittedRow.values[0].original, '80012346');
    assert.equal(omittedRow.values[0].resolution.byMemberId, c.actorMemberId);
    assert.equal(omittedRow.values[0].resolution.reason, 'El cliente no reconoce este número');
    const correctedRow = listed.rows.find((r: any) => r.rowIndex === 1);
    assert.equal(correctedRow.values[0].original, '2212345');
    assert.equal(correctedRow.values[0].reason, 'wrong_length');
    assert.equal(correctedRow.values[0].resolution.correctedOriginal, '2212 3456');
    assert.deepEqual(
      [listed.summary.accepted, listed.summary.corrected, listed.summary.omitted, listed.summary.invalid],
      [2, 1, 1, 0],
    );

    const executed = await importSvc.execute('ExecuteClientImport', c, { importBatchId: batchId }, `ex-${unique()}`);
    assert.equal(executed.data.created, 3);
    const contacts = await prisma.osContact.findMany({ where: { organizationId: org.id }, orderBy: { familyName: 'asc' } });
    assert.deepEqual(
      contacts.map((ct) => [ct.familyName, ct.phone, ct.whatsapp]),
      [
        ['Fila0', '+59170011112', '+59170011112'],
        ['Fila1', '+59122123456', '+59122123456'],
        ['Fila2', '+59170033334', '+59170033334'],
      ],
    );

    // Decisions close with the batch.
    await assert.rejects(
      () => resolve({ rowIndex: 2, valueId: 'celular:0', expectedVersion: 1, decision: 'correct', correctedNumber: '70055555', reason: 'Demasiado tarde para cambiar' }),
      (err: Error) => err.message === 'CONFLICT',
    );
  });

  it('a failed new value never replaces an existing valid contact number', async () => {
    const { org, c } = await seedAdmin();
    const existing = await partySvc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Existente Con Numero',
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    await partySvc.execute('UpdateContact', c, {
      organizationPartyId: String(existing.data.partyId),
      givenName: 'Pre',
      familyName: 'Existente',
      phone: { country: 'BO', number: '70044444' },
    });
    const receipt = await dryRun(c, [row(0, 'Existente Con Numero', { celular: '7004444' })]);
    assert.notEqual(receipt.wouldCreate, 1);
    assert.equal(receipt.phoneReview.invalid, 1);
    await importSvc.execute('ExecuteClientImport', c, { importBatchId: receipt.importBatchId }, `ex-${unique()}`);
    const contacts = await prisma.osContact.findMany({ where: { organizationId: org.id } });
    assert.deepEqual(contacts.map((ct) => ct.phone), ['+59170044444']);
  });

  it('a corrected number that belongs to an existing customer becomes a possible duplicate, not a create', async () => {
    const { c } = await seedAdmin();
    const existing = await partySvc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Dueño Del Numero',
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    await partySvc.execute('UpdateContact', c, {
      organizationPartyId: String(existing.data.partyId),
      givenName: 'Dueño',
      familyName: 'Numero',
      phone: { country: 'BO', number: '70066666' },
    });
    const receipt = await dryRun(c, [row(0, 'Otro Nombre', { celular: '7006666' })]);
    const result = await importSvc.execute(
      'ResolveImportPhoneValue',
      c,
      { importBatchId: receipt.importBatchId, rowIndex: 0, valueId: 'celular:0', expectedVersion: 0, decision: 'correct', correctedNumber: '70066666', reason: 'Número confirmado por el asesor' },
      `res-${unique()}`,
    );
    assert.equal(result.data.outcome, 'POSSIBLE_DUPLICATE');
    assert.equal(result.data.errorCode, 'CORRECTED_PHONE_MATCH');
  });

  it('a decision commits with its event, outbox and audit or not at all', async () => {
    const { org, c } = await seedAdmin();
    const receipt = await dryRun(c, [row(0, 'Atomica', { celular: '2212345' })]);
    const rows = await importStore.listRowsForBatch(org.id, receipt.importBatchId);
    const target = rows[0]!;
    const batchBefore = await prisma.osImportBatch.findFirstOrThrow({ where: { id: receipt.importBatchId } });
    const priorEvent = await prisma.osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id } });
    const event = {
      ...buildBusinessEvent({
        organizationId: org.id,
        eventType: 'import.row.phone_resolved',
        occurredAt: new Date(),
        actorMemberId: c.actorMemberId,
        authorizationContext: { memberId: c.actorMemberId },
        primaryEntityType: 'import_batch',
        primaryEntityId: receipt.importBatchId,
        payload: {},
        correlationId: c.correlationId,
        capabilityKey: 'partygraph',
      }),
      id: priorEvent.id,
    };
    await assert.rejects(() =>
      importStore.recordPhoneDecision({
        organizationId: org.id,
        importBatchId: receipt.importBatchId,
        rowId: target.id,
        expectedVersion: 0,
        row: {
          outcome: 'CREATE',
          errorCode: null,
          entityRefsJson: {},
          normalizedSnapshotJson: { ...target.normalizedSnapshotJson, phoneInput: { version: 1 } },
        },
        receipt: { ...(batchBefore.receiptJson as any), mode: 'tampered' },
        event,
        outbox: buildOutboxForEvent(event),
        audit: buildAuditEntry(org.id, c.actorMemberId, 'import.row.phone_resolved', 'import_batch', receipt.importBatchId, c.correlationId),
      }),
    );
    const after = await importStore.listRowsForBatch(org.id, receipt.importBatchId);
    assert.equal((after[0]!.normalizedSnapshotJson.phoneInput as { version: number }).version, 0);
    const batchAfter = await prisma.osImportBatch.findFirstOrThrow({ where: { id: receipt.importBatchId } });
    assert.deepEqual(batchAfter.receiptJson, batchBefore.receiptJson);
  });

  it('a batch dry-run before phone provenance existed must be dry-run again', async () => {
    const { org, c } = await seedAdmin();
    const receipt = await dryRun(c, [row(0, 'Antigua', { celular: '70077777' })]);
    const [stored] = await importStore.listRowsForBatch(org.id, receipt.importBatchId);
    const { phoneInput: _dropped, ...legacy } = stored!.normalizedSnapshotJson;
    await prisma.osImportRow.update({ where: { id: stored!.id }, data: { normalizedSnapshotJson: legacy as object } });
    await assert.rejects(
      () => importSvc.execute('ExecuteClientImport', c, { importBatchId: receipt.importBatchId }, `ex-${unique()}`),
      (err: Error) => err.message === 'IMPORT_DRY_RUN_OUTDATED',
    );
    assert.equal(await prisma.osParty.count({ where: { organizationId: org.id } }), 0);
  });
});
