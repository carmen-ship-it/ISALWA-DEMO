import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COORDINATION_DECISION_CAPABILITY } from './coordination-decision';
import { WAREHOUSE_EXIT_RECORD_SCOPE } from './delivery';
import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  INTEGRATION_ADMIN_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  scopesGrantedByCargoOrTitle,
} from './operations-scopes';
import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
} from './scopes';
import { WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE } from './warehouse-task';
import {
  CROSS_LANE_CHANGE_REQUEST,
  LOGIN_IDENTITY_PENDING,
  PLANNED_PERSON,
  V1_CROSS_LANE_CHANGE_REQUESTS,
  V1_EXPLICIT_CAPABILITY_SLOTS,
  V1_KNOWN_EXPORTED_CAPABILITIES,
  V1_PLANNED_ASSIGNMENTS,
  V1_TENANT_LABEL,
  V1_UNASSIGNED_CAPABILITIES,
  bindSuppliedLoginIdentity,
  capabilitiesGrantedByFunctionLabel,
  capabilityAssignedToFunction,
  deliveryRecordSilentlyAssigned,
  intendedCapabilityIsGrantedNow,
  peopleAdminBundledIntoGerente,
  plannedAssignmentByFunction,
  plannedMapContainsInventedIdentity,
  receiveImpliesAllocate,
  scopeImpliedBySibling,
  v1FunctionMapReceipt,
  writeScopeSatisfiesRead,
  type V1PlannedFunctionId,
} from './v1-planned-assignments';

const REQUIRED_LABELS = [
  'Asesor Comercial',
  'Jefe Comercial',
  'Gerente General',
  'Encargado de Producción',
  'Encargado de Almacén',
  'Encargada de Compras',
  'Contabilidad',
  'Auxiliar Administrativa / Coordinación',
  'ISALWA Manager / Owner / Super Admin',
] as const;

const EXPECTED_INTENDED: Record<V1PlannedFunctionId, readonly string[]> = {
  'asesor-comercial': [COMMERCIAL_CUSTOMER_CREATE_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
  'jefe-comercial': [COMMERCIAL_TEAM_READ_SCOPE],
  'gerente-general': [MANAGEMENT_ORG_READ_SCOPE],
  'encargado-produccion': [PRODUCTION_OPERATIONAL_RECORD_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE],
  'encargado-almacen': [
    WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
    WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
    WAREHOUSE_EXIT_RECORD_SCOPE,
  ],
  'encargada-compras': [PURCHASING_OPERATIONAL_RECORD_SCOPE],
  contabilidad: [FINANCE_OPERATIONAL_RECORD_SCOPE],
  'auxiliar-coordinacion': [
    OPERATIONS_COORDINATOR_RECORD_SCOPE,
    COORDINATION_DECISION_CAPABILITY,
    DELIVERY_RECORD_SCOPE,
  ],
  'isalwa-manager': [MANAGEMENT_ORG_READ_SCOPE, SYSTEM_ADMIN_SCOPE],
};

describe('V1 planned function map', () => {
  it('represents each named function with a pending person and pending login', () => {
    assert.equal(V1_PLANNED_ASSIGNMENTS.length, REQUIRED_LABELS.length);
    for (const label of REQUIRED_LABELS) {
      const row = V1_PLANNED_ASSIGNMENTS.find((item) => item.functionLabel === label);
      assert.ok(row, label);
      assert.equal(row.tenant, V1_TENANT_LABEL);
      assert.equal(row.person, PLANNED_PERSON);
      assert.equal(row.loginIdentity, LOGIN_IDENTITY_PENDING);
      assert.equal(row.cargoGrantsAuthority, false);
      assert.equal(row.authoritySource, 'explicit-capability');
      assert.ok(row.intendedCapabilities.length > 0);
      assert.deepEqual(row.intendedCapabilities, EXPECTED_INTENDED[row.functionId]);
    }
  });

  it('does not invent an email, auth subject, or WhatsApp number', () => {
    const receipt = v1FunctionMapReceipt();
    assert.equal(receipt.loginIdentitiesInvented, 0);
    assert.equal(receipt.authIdentitiesCreated, 0);
    assert.equal(receipt.emailsInvented, 0);
    assert.equal(receipt.whatsAppNumbersInvented, 0);
    assert.equal(receipt.personStatus, PLANNED_PERSON);
    assert.equal(receipt.loginIdentityStatus, LOGIN_IDENTITY_PENDING);
    assert.equal(plannedMapContainsInventedIdentity(receipt), false);
    assert.equal(plannedMapContainsInventedIdentity(V1_PLANNED_ASSIGNMENTS), false);
    const row = V1_PLANNED_ASSIGNMENTS[0]!;
    const before = JSON.stringify(row);
    assert.equal(bindSuppliedLoginIdentity(row, null), null);
    assert.equal(
      bindSuppliedLoginIdentity(row, {
        authIdentityId: ' ',
        email: ' ',
      }),
      null,
    );
    assert.equal(JSON.stringify(row), before);
    assert.equal(JSON.stringify(receipt).includes('@'), false);
  });

  it('does not grant scopes from a function label, cargo, or title', () => {
    const titles = [
      ...REQUIRED_LABELS,
      'Jefe',
      'Gerente',
      'Gerencia',
      'Super Admin',
      'Owner',
      'Encargado de Almacén',
      'Auxiliar',
    ];
    for (const title of titles) {
      assert.deepEqual(capabilitiesGrantedByFunctionLabel(title, title, title), []);
      assert.deepEqual(scopesGrantedByCargoOrTitle(title, title), []);
    }
    for (const row of V1_PLANNED_ASSIGNMENTS) {
      const granted = capabilitiesGrantedByFunctionLabel(
        row.functionLabel,
        row.functionLabel,
        row.functionLabel,
      );
      assert.deepEqual(granted, []);
      const grantedScopes = granted as readonly string[];
      for (const scope of row.intendedCapabilities) {
        assert.equal(grantedScopes.includes(scope), false, row.functionId);
        assert.equal(intendedCapabilityIsGrantedNow(row, scope), false);
      }
      for (const slot of row.explicitSlotsNotAutoGranted) {
        assert.equal(slot.autoGranted, false);
        assert.equal(slot.grantedByTitle, false);
        assert.equal(grantedScopes.includes(slot.capability), false);
      }
    }
  });

  it('does not let receive imply allocate', () => {
    assert.equal(receiveImpliesAllocate(), false);
    assert.equal(
      scopeImpliedBySibling(
        WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
        WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
      ),
      false,
    );
    assert.equal(
      scopeImpliedBySibling(
        WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
        WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      ),
      false,
    );
    const warehouse = plannedAssignmentByFunction('encargado-almacen');
    assert.ok(warehouse);
    assert.equal(
      warehouse.intendedCapabilities.includes(WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE),
      true,
    );
    assert.equal(
      warehouse.intendedCapabilities.includes(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE),
      true,
    );
    assert.notEqual(
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
    );
    const heldReceive = [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE] as readonly string[];
    assert.equal(heldReceive.includes(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE), false);
    for (const held of warehouse.intendedCapabilities) {
      for (const required of warehouse.intendedCapabilities) {
        if (held === required) continue;
        assert.equal(scopeImpliedBySibling(held, required), false);
      }
    }
  });

  it('assigns delivery.record only to Coordinación', () => {
    assert.equal(deliveryRecordSilentlyAssigned(), false);
    assert.equal(capabilityAssignedToFunction(DELIVERY_RECORD_SCOPE), 'auxiliar-coordinacion');
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(DELIVERY_RECORD_SCOPE), false);
    const coordinacion = plannedAssignmentByFunction('auxiliar-coordinacion');
    const warehouse = plannedAssignmentByFunction('encargado-almacen');
    const asesor = plannedAssignmentByFunction('asesor-comercial');
    const jefe = plannedAssignmentByFunction('jefe-comercial');
    const owner = plannedAssignmentByFunction('isalwa-manager');
    assert.ok(coordinacion);
    assert.ok(warehouse);
    assert.ok(asesor);
    assert.ok(jefe);
    assert.ok(owner);
    assert.deepEqual(coordinacion.intendedCapabilities, [
      OPERATIONS_COORDINATOR_RECORD_SCOPE,
      COORDINATION_DECISION_CAPABILITY,
      DELIVERY_RECORD_SCOPE,
    ]);
    for (const row of V1_PLANNED_ASSIGNMENTS) {
      assert.equal(
        row.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE),
        row.functionId === 'auxiliar-coordinacion',
        row.functionId,
      );
      assert.equal(
        row.explicitSlotsNotAutoGranted.some((slot) => slot.capability === DELIVERY_RECORD_SCOPE),
        false,
        row.functionId,
      );
    }
    assert.equal(warehouse.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE), false);
    assert.equal(warehouse.intendedCapabilities.includes(WAREHOUSE_EXIT_RECORD_SCOPE), true);
    assert.equal(asesor.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE), false);
    assert.equal(jefe.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE), false);
    assert.equal(owner.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE), false);
    assert.equal(scopeImpliedBySibling(WAREHOUSE_EXIT_RECORD_SCOPE, DELIVERY_RECORD_SCOPE), false);
    assert.equal(
      scopeImpliedBySibling(OPERATIONS_COORDINATOR_RECORD_SCOPE, DELIVERY_RECORD_SCOPE),
      false,
    );
    assert.equal(scopeImpliedBySibling(COORDINATION_DECISION_CAPABILITY, DELIVERY_RECORD_SCOPE), false);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(WAREHOUSE_EXIT_RECORD_SCOPE), false);
    assert.equal(capabilityAssignedToFunction(WAREHOUSE_EXIT_RECORD_SCOPE), 'encargado-almacen');
    const receipt = v1FunctionMapReceipt();
    assert.equal(receipt.unassignedCapabilities.includes(DELIVERY_RECORD_SCOPE), false);
    assert.equal(
      receipt.unassignedNotes.some((item) => item.capability === DELIVERY_RECORD_SCOPE),
      false,
    );
    assert.equal(receipt.notImpliedByFunction.includes(DELIVERY_RECORD_SCOPE), true);
  });

  it('does not bundle people.admin into Gerente as a business shortcut', () => {
    assert.equal(peopleAdminBundledIntoGerente(), false);
    const gerente = plannedAssignmentByFunction('gerente-general');
    const jefe = plannedAssignmentByFunction('jefe-comercial');
    const manager = plannedAssignmentByFunction('isalwa-manager');
    assert.ok(gerente);
    assert.ok(jefe);
    assert.ok(manager);
    assert.equal(JSON.stringify(gerente).includes(PEOPLE_ADMIN_SCOPE), false);
    assert.equal(gerente.intendedCapabilities.includes(SYSTEM_ADMIN_SCOPE), false);
    assert.equal(gerente.layer, 'business');
    assert.deepEqual(gerente.intendedCapabilities, [MANAGEMENT_ORG_READ_SCOPE]);
    assert.equal(manager.intendedCapabilities.includes(PEOPLE_ADMIN_SCOPE), false);
    assert.equal(manager.intendedCapabilities.includes(MANAGEMENT_ORG_READ_SCOPE), true);
    assert.equal(manager.intendedCapabilities.includes(SYSTEM_ADMIN_SCOPE), true);
    assert.equal(scopeImpliedBySibling(SYSTEM_ADMIN_SCOPE, MANAGEMENT_ORG_READ_SCOPE), false);
    assert.equal(scopeImpliedBySibling(MANAGEMENT_ORG_READ_SCOPE, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(manager.layer, 'technical');
    assert.deepEqual(manager.intendedCapabilities, [MANAGEMENT_ORG_READ_SCOPE, SYSTEM_ADMIN_SCOPE]);
    for (const row of V1_PLANNED_ASSIGNMENTS) {
      const hasBusinessData = row.intendedCapabilities.some(
        (scope) =>
          scope.startsWith('commercial.') ||
          scope.startsWith('production.') ||
          scope.startsWith('management.'),
      );
      if (hasBusinessData) {
        assert.equal(row.intendedCapabilities.includes(PEOPLE_ADMIN_SCOPE), false, row.functionId);
      }
    }
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(PEOPLE_ADMIN_SCOPE), true);
    assert.equal(jefe.intendedCapabilities.includes(PEOPLE_ADMIN_SCOPE), false);
  });

  it('keeps commercial.exception.authorize as an explicit slot that is not auto-granted', () => {
    assert.equal(V1_EXPLICIT_CAPABILITY_SLOTS.length, 1);
    const slot = V1_EXPLICIT_CAPABILITY_SLOTS[0]!;
    assert.equal(slot.capability, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
    assert.equal(slot.autoGranted, false);
    assert.equal(slot.grantedByTitle, false);
    assert.deepEqual(slot.eligibleFunctionIds, ['jefe-comercial', 'gerente-general']);
    assert.equal(capabilityAssignedToFunction(COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), null);
    for (const functionId of slot.eligibleFunctionIds) {
      const row = plannedAssignmentByFunction(functionId);
      assert.ok(row);
      assert.equal(row.intendedCapabilities.includes(COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), false);
      assert.equal(row.explicitSlotsNotAutoGranted.length, 1);
      assert.equal(row.explicitSlotsNotAutoGranted[0]?.autoGranted, false);
      assert.equal(
        (capabilitiesGrantedByFunctionLabel(row.functionLabel) as readonly string[]).includes(
          COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
        ),
        false,
      );
    }
    const receipt = v1FunctionMapReceipt();
    assert.equal(receipt.notImpliedByFunction.includes(COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), true);
  });

  it('records missing read scopes without inventing capability strings', () => {
    const receipt = v1FunctionMapReceipt();
    assert.equal(receipt.crossLaneChangeRequests.length, 4);
    const domains = receipt.crossLaneChangeRequests.map((request) => request.domain).sort();
    assert.deepEqual(domains, ['coordination', 'production', 'purchasing', 'warehouse']);
    for (const request of V1_CROSS_LANE_CHANGE_REQUESTS) {
      assert.equal(request.kind, CROSS_LANE_CHANGE_REQUEST);
      assert.equal(request.need, 'read');
      assert.equal(request.readDoesNotEqualWrite, true);
      assert.equal(request.requestedCapabilityString, null);
      assert.ok(request.existingWriteCapabilities.length > 0);
      for (const writeScope of request.existingWriteCapabilities) {
        assert.equal(writeScopeSatisfiesRead(writeScope, request.domain), false);
        assert.equal(
          (V1_KNOWN_EXPORTED_CAPABILITIES as readonly string[]).includes(writeScope),
          true,
          writeScope,
        );
      }
    }
    const serializedRequests = JSON.stringify(V1_CROSS_LANE_CHANGE_REQUESTS);
    assert.equal(serializedRequests.includes('production.read'), false);
    assert.equal(serializedRequests.includes('warehouse.read'), false);
    assert.equal(serializedRequests.includes('purchasing.read'), false);
    assert.equal(serializedRequests.includes('coordination.read'), false);
  });

  it('uses only exported capability constants', () => {
    const used = [
      ...V1_PLANNED_ASSIGNMENTS.flatMap((row) => [
        ...row.intendedCapabilities,
        ...row.explicitSlotsNotAutoGranted.map((slot) => slot.capability),
      ]),
      ...V1_UNASSIGNED_CAPABILITIES,
    ];
    for (const scope of used) {
      assert.equal(
        (V1_KNOWN_EXPORTED_CAPABILITIES as readonly string[]).includes(scope),
        true,
        scope,
      );
    }
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(COMMERCIAL_ORDER_CONVERT_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(COMMERCIAL_ACCOUNT_REASSIGN_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(COMMERCIAL_ORG_READ_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(COMMERCIAL_PRICE_APPROVE_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(PRODUCTION_REVIEW_MEMBER_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(INTEGRATION_ADMIN_SCOPE), true);
    assert.equal(V1_UNASSIGNED_CAPABILITIES.includes(WAREHOUSE_EXIT_RECORD_SCOPE), false);
    assert.equal(capabilityAssignedToFunction(WAREHOUSE_EXIT_RECORD_SCOPE), 'encargado-almacen');
  });
});
