import type {
  ImportCommandName,
  ImportInputRow,
  RequestContext,
} from '@isalwa/os-contracts';
import { COMMAND_REQUIRED_SCOPES } from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasScope,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
} from '@isalwa/os-events';
import type { LocationCommandService, PartyCommandService, OsPartyStore } from '@isalwa/os-party';
import { createId } from '@isalwa/ts-utils';
import type { OsImportStore } from './import-store';
import { analyzeRows } from './match';
import { normalizeImportRow } from './normalize-row';
import { buildReceipt, isRealClientImportEnabled } from './receipt';
import type {
  AnalyzedImportRow,
  ImportBatchRecord,
  ImportEntityRefs,
  ImportReceipt,
  ImportRowRecord,
  NormalizedCustomerRow,
} from './types';

export type ImportCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

type PartyAccessStore = Pick<
  OsPartyStore,
  | 'getMemberInOrg'
  | 'listRoleAssignmentsForMember'
  | 'listDelegationsForDelegate'
  | 'appendEventAndAudit'
  | 'findIdempotency'
  | 'saveIdempotency'
>;

export class ImportCommandService {
  private activeIdempotencyKey?: string;

  constructor(
    private readonly importStore: OsImportStore,
    private readonly partyAccess: PartyAccessStore,
    private readonly partyCommands: PartyCommandService,
    private readonly locationCommands: LocationCommandService,
  ) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.partyAccess.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.partyAccess.listRoleAssignmentsForMember(memberId);
    const delegations = await this.partyAccess.listDelegationsForDelegate(memberId);
    const effectiveScopes = computeEffectiveScopes(
      roles.map((r) => ({
        roleKey: r.roleKey,
        effectiveAt: r.effectiveAt,
        endedAt: r.endedAt,
      })),
      delegations.map((d) => ({
        scopes: d.scopes,
        startsAt: d.startsAt,
        expiresAt: d.expiresAt,
        revokedAt: d.revokedAt,
        delegatorMemberId: '',
      })),
      asOf,
    );
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: effectiveScopes,
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    command: ImportCommandName,
    targetOrgId: string,
  ): Promise<void> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    const required = COMMAND_REQUIRED_SCOPES[command];
    if (!required || required === 'member_active') return;
    if (!memberHasScope(snap, required)) throw new Error('PERMISSION_DENIED');
  }

  async execute(
    command: ImportCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<ImportCommandResult> {
    const actor = await this.partyAccess.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor || actor.organizationId !== ctx.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }

    if (idempotencyKey) {
      const existing = await this.partyAccess.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) {
        return existing.resultJson as unknown as ImportCommandResult;
      }
    }

    this.activeIdempotencyKey = idempotencyKey;
    let result: ImportCommandResult;
    switch (command) {
      case 'DryRunClientImport':
        result = await this.dryRunOrValidate(ctx, payload, 'dry_run');
        break;
      case 'ValidateClientImport':
        result = await this.dryRunOrValidate(ctx, payload, 'validated');
        break;
      case 'ExecuteClientImport':
        result = await this.executeImport(ctx, payload);
        break;
      case 'ReverseImportBatch':
        result = await this.reverseBatch(ctx, payload);
        break;
      case 'GetImportBatchReceipt':
        result = await this.getReceipt(ctx, payload);
        break;
      default:
        throw new Error('VALIDATION_FAILED');
    }

    if (idempotencyKey) {
      await this.partyAccess.saveIdempotency({
        organizationId: ctx.organizationId,
        key: idempotencyKey,
        commandName: command,
        resultJson: result as unknown as Record<string, unknown>,
        expiresAt: new Date(Date.now() + 86400_000),
      });
    }

    return result;
  }

  private async dryRunOrValidate(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    status: 'dry_run' | 'validated',
  ): Promise<ImportCommandResult> {
    const command: ImportCommandName =
      status === 'dry_run' ? 'DryRunClientImport' : 'ValidateClientImport';
    await this.authorize(ctx, command, ctx.organizationId);

    const sourceKind = String(payload.sourceKind ?? 'xls_datos_clientes');
    const sourceFingerprint = String(payload.sourceFingerprint);
    const rows = payload.rows as ImportInputRow[];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('VALIDATION_FAILED');

    const catalog = await this.importStore.loadMatchCatalog(ctx.organizationId);
    const normalized = rows.map(normalizeImportRow);
    const analyzed = analyzeRows(normalized, catalog);

    const importBatchId = createId();
    const mode = status === 'dry_run' ? 'dry_run' : 'validate';
    const receipt = buildReceipt({ importBatchId, mode, analyzed });

    const idempotencyKey =
      this.activeIdempotencyKey ??
      `import:${status}:${sourceKind}:${sourceFingerprint}:${ctx.organizationId}`;

    const batch: ImportBatchRecord = {
      id: importBatchId,
      organizationId: ctx.organizationId,
      sourceKind: sourceKind as ImportBatchRecord['sourceKind'],
      sourceFingerprint,
      status,
      createdByMemberId: ctx.actorMemberId,
      createdAt: new Date(),
      completedAt: new Date(),
      receiptJson: receipt,
      idempotencyKey,
      reversedAt: null,
      reversedEntityRefs: null,
    };

    const rowRecords: ImportRowRecord[] = analyzed.map((row) => ({
      id: createId(),
      importBatchId,
      organizationId: ctx.organizationId,
      section: row.section,
      rowIndex: row.rowIndex,
      outcome: row.outcome,
      entityRefsJson: row.entityRefs,
      errorCode: row.errorCode,
      normalizedSnapshotJson: {
        ...row.snapshot,
        // Persist fields needed for execute without re-exposing in errors
        ...(row.normalized.section === 'B'
          ? {
              commercialName: row.normalized.commercialName,
              givenName: row.normalized.givenName,
              familyName: row.normalized.familyName,
              phone: row.normalized.phone,
              whatsapp: row.normalized.whatsapp,
              location: {
                kind: row.normalized.location.kind,
                label: row.normalized.location.label,
                latitude: row.normalized.location.latitude,
                longitude: row.normalized.location.longitude,
                provenanceUrl: row.normalized.location.provenanceUrl,
              },
            }
          : {
              givenName: row.normalized.givenName,
              familyName: row.normalized.familyName,
              emailKey: row.normalized.emailKey,
              cargo: row.normalized.cargo,
            }),
      },
    }));

    await this.importStore.insertBatch(batch);
    await this.importStore.insertRows(rowRecords);

    await this.emit(
      ctx,
      status === 'dry_run' ? 'import.batch.dry_run' : 'import.batch.validated',
      importBatchId,
      {
        importBatchId,
        rowsReceived: receipt.rowsReceived,
        wouldCreate: receipt.wouldCreate,
        matched: receipt.matched,
        possibleDuplicates: receipt.possibleDuplicates,
        manualReview: receipt.manualReview,
        rowsRejected: receipt.rowsRejected,
      },
    );

    return {
      commandId: createId(),
      correlationId: ctx.correlationId,
      data: { ...receipt },
    };
  }

  private async executeImport(
    ctx: RequestContext,
    payload: Record<string, unknown>,
  ): Promise<ImportCommandResult> {
    await this.authorize(ctx, 'ExecuteClientImport', ctx.organizationId);

    if (!isRealClientImportEnabled()) {
      throw new Error('IMPORT_DISABLED');
    }

    const importBatchId = String(payload.importBatchId);
    const batch = await this.importStore.getBatchInOrg(ctx.organizationId, importBatchId);
    if (!batch) throw new Error('NOT_FOUND');
    if (batch.organizationId !== ctx.organizationId) throw new Error('TENANT_FORBIDDEN');
    if (batch.status === 'imported') {
      return {
        commandId: createId(),
        correlationId: ctx.correlationId,
        data: { ...batch.receiptJson, mode: 'execute' },
      };
    }
    if (batch.status !== 'dry_run' && batch.status !== 'validated') {
      throw new Error('VALIDATION_FAILED');
    }

    const rows = await this.importStore.listRowsForBatch(ctx.organizationId, importBatchId);
    let created = 0;

    for (const row of rows) {
      if (row.outcome !== 'CREATE') continue;
      if (row.section !== 'B') continue;

      const snap = row.normalizedSnapshotJson;
      const commercialName = String(snap.commercialName ?? '');
      const givenName = String(snap.givenName ?? '');
      const familyName = String(snap.familyName ?? '');
      const phone = snap.phone ? String(snap.phone) : undefined;
      const whatsapp = snap.whatsapp ? String(snap.whatsapp) : undefined;
      const loc = snap.location as NormalizedCustomerRow['location'] | undefined;

      const partyResult = await this.partyCommands.execute(
        'CreateParty',
        ctx,
        {
          partyKind: 'organization',
          displayName: commercialName,
          initialRoleKey: 'customer',
          createCommercialAccount: true,
        },
        `import-exec-party-${importBatchId}-${row.rowIndex}`,
      );
      const partyId = String(partyResult.data.partyId);

      const contactResult = await this.partyCommands.execute(
        'UpdateContact',
        ctx,
        {
          organizationPartyId: partyId,
          givenName,
          familyName,
          phone,
          whatsapp,
        },
        `import-exec-contact-${importBatchId}-${row.rowIndex}`,
      );
      const contactId = String(contactResult.data.contactId);

      const refs: ImportEntityRefs = {
        partyId,
        contactId,
        createdByBatch: true,
      };

      if (loc && loc.kind !== 'skipped' && loc.provenanceUrl) {
        const locPayload: Record<string, unknown> = {
          partyId,
          label: loc.label || 'Ubicación GPS',
          provenanceUrl: loc.provenanceUrl,
        };
        if (loc.latitude !== null && loc.longitude !== null) {
          locPayload.latitude = loc.latitude;
          locPayload.longitude = loc.longitude;
        }
        const locResult = await this.locationCommands.execute(
          'CreateLocation',
          ctx,
          locPayload,
          `import-exec-loc-${importBatchId}-${row.rowIndex}`,
        );
        refs.locationId = String(locResult.data.locationId);
      }

      await this.importStore.updateRowEntityRefs(ctx.organizationId, row.id, refs, 'CREATE');
      created += 1;
    }

    const analyzed: AnalyzedImportRow[] = rows.map((r) => ({
      section: r.section,
      rowIndex: r.rowIndex,
      outcome: r.outcome,
      errorCode: r.errorCode,
      entityRefs: r.entityRefsJson,
      normalized:
        r.section === 'A'
          ? {
              section: 'A' as const,
              rowIndex: r.rowIndex,
              givenName: String(r.normalizedSnapshotJson.givenName ?? ''),
              familyName: String(r.normalizedSnapshotJson.familyName ?? ''),
              displayNameKey: String(r.normalizedSnapshotJson.displayNameKey ?? ''),
              emailKey: (r.normalizedSnapshotJson.emailKey as string | null) ?? null,
              cargo: (r.normalizedSnapshotJson.cargo as string | null) ?? null,
            }
          : {
              section: 'B' as const,
              rowIndex: r.rowIndex,
              commercialName: String(r.normalizedSnapshotJson.commercialName ?? ''),
              commercialNameKey: String(r.normalizedSnapshotJson.commercialNameKey ?? ''),
              givenName: String(r.normalizedSnapshotJson.givenName ?? ''),
              familyName: String(r.normalizedSnapshotJson.familyName ?? ''),
              personNameKey: String(r.normalizedSnapshotJson.personNameKey ?? ''),
              phone: (r.normalizedSnapshotJson.phone as string | null) ?? null,
              whatsapp: (r.normalizedSnapshotJson.whatsapp as string | null) ?? null,
              phoneKey: null,
              phoneKeys: [],
              extraPhoneNotImported: Number(r.normalizedSnapshotJson.extraPhoneNotImported ?? 0),
              nitKey: null,
              location: (r.normalizedSnapshotJson.location as NormalizedCustomerRow['location']) ?? {
                kind: 'skipped',
                label: 'Ubicación GPS',
                latitude: null,
                longitude: null,
                provenanceUrl: null,
              },
            },
      snapshot: r.normalizedSnapshotJson,
    }));

    const receipt = buildReceipt({
      importBatchId,
      mode: 'execute',
      analyzed,
      created,
    });

    await this.importStore.updateBatch(ctx.organizationId, importBatchId, {
      status: 'imported',
      completedAt: new Date(),
      receiptJson: receipt,
    });

    await this.emit(ctx, 'import.batch.executed', importBatchId, {
      importBatchId,
      created,
      matched: receipt.matched,
      possibleDuplicates: receipt.possibleDuplicates,
      manualReview: receipt.manualReview,
    });

    return {
      commandId: createId(),
      correlationId: ctx.correlationId,
      data: { ...receipt },
    };
  }

  private async reverseBatch(
    ctx: RequestContext,
    payload: Record<string, unknown>,
  ): Promise<ImportCommandResult> {
    await this.authorize(ctx, 'ReverseImportBatch', ctx.organizationId);
    const importBatchId = String(payload.importBatchId);
    const batch = await this.importStore.getBatchInOrg(ctx.organizationId, importBatchId);
    if (!batch) throw new Error('NOT_FOUND');
    if (batch.organizationId !== ctx.organizationId) throw new Error('TENANT_FORBIDDEN');

    if (batch.status === 'rolled_back') {
      return {
        commandId: createId(),
        correlationId: ctx.correlationId,
        data: {
          ...batch.receiptJson,
          mode: 'rollback',
          reversed: batch.receiptJson.reversed ?? { parties: 0, contacts: 0, locations: 0 },
        },
      };
    }

    const rows = await this.importStore.listRowsForBatch(ctx.organizationId, importBatchId);
    let parties = 0;
    let contacts = 0;
    let locations = 0;

    // Dependency order: locations → contacts → parties. Never touch MATCH-only refs.
    for (const row of rows) {
      const refs = row.entityRefsJson;
      if (!refs.createdByBatch) continue;

      if (refs.locationId) {
        await this.locationCommands.execute(
          'DeactivateLocation',
          ctx,
          { locationId: refs.locationId },
          `import-rev-loc-${importBatchId}-${row.rowIndex}`,
        );
        locations += 1;
      }
      if (refs.contactId) {
        await this.importStore.deactivateContactInOrg(ctx.organizationId, refs.contactId);
        contacts += 1;
      }
      if (refs.partyId) {
        await this.partyCommands.execute(
          'DeactivateParty',
          ctx,
          { partyId: refs.partyId },
          `import-rev-party-${importBatchId}-${row.rowIndex}`,
        );
        parties += 1;
      }
    }

    const reversed = { parties, contacts, locations };
    const receipt: ImportReceipt = {
      ...batch.receiptJson,
      mode: 'rollback',
      reversed,
    };

    await this.importStore.updateBatch(ctx.organizationId, importBatchId, {
      status: 'rolled_back',
      completedAt: new Date(),
      receiptJson: receipt,
      reversedAt: new Date(),
      reversedEntityRefs: reversed,
    });

    await this.emit(ctx, 'import.batch.rolled_back', importBatchId, {
      importBatchId,
      ...reversed,
    });

    return {
      commandId: createId(),
      correlationId: ctx.correlationId,
      data: { ...receipt },
    };
  }

  private async getReceipt(
    ctx: RequestContext,
    payload: Record<string, unknown>,
  ): Promise<ImportCommandResult> {
    await this.authorize(ctx, 'GetImportBatchReceipt', ctx.organizationId);
    const importBatchId = String(payload.importBatchId);
    const batch = await this.importStore.getBatchInOrg(ctx.organizationId, importBatchId);
    if (!batch) throw new Error('NOT_FOUND');
    if (batch.organizationId !== ctx.organizationId) throw new Error('TENANT_FORBIDDEN');

    return {
      commandId: createId(),
      correlationId: ctx.correlationId,
      data: { ...batch.receiptJson, mode: 'receipt', status: batch.status },
    };
  }

  private async emit(
    ctx: RequestContext,
    eventType: string,
    primaryId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event = buildBusinessEvent({
      organizationId: ctx.organizationId,
      eventType,
      occurredAt: ctx.effectiveAt,
      actorMemberId: ctx.actorMemberId,
      authorizationContext: { memberId: ctx.actorMemberId },
      primaryEntityType: 'import_batch',
      primaryEntityId: primaryId,
      payload,
      correlationId: ctx.correlationId,
      idempotencyKey: this.activeIdempotencyKey,
      capabilityKey: 'partygraph',
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      ctx.organizationId,
      ctx.actorMemberId,
      eventType,
      'import_batch',
      primaryId,
      ctx.correlationId,
      undefined,
      payload,
    );
    await this.partyAccess.appendEventAndAudit(event, outbox, audit);
  }
}
