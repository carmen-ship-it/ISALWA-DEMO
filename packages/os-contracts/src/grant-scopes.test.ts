import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADDITIONAL_ASSIGNABLE_SCOPE_KEYS,
  ADMIN_SCOPE_KEYS,
  COMMERCIAL_AUTHORITY_SCOPE_KEYS,
  COMMERCIAL_READ_SCOPE_KEYS,
  DELEGABLE_SCOPE_KEYS,
  isDelegableScope,
} from './scopes';
import {
  COMMAND_RESERVED_SCOPE_KEYS,
  OPERATIONS_ACCESS_SCOPE_KEYS,
  RECOGNIZED_PERMISSION_SCOPE_KEYS,
  TECHNICAL_ADMIN_SCOPE_KEYS,
  classifyRoleKey,
  isRecognizedPermissionScope,
  roleKeysThatConferAuthority,
} from './operations-scopes';
import { V1_PLANNED_ASSIGNMENTS } from './v1-planned-assignments';

describe('delegable scope allowlist', () => {
  it('is exactly the written-out list and nothing derived from a catalog', () => {
    assert.deepEqual(
      [...DELEGABLE_SCOPE_KEYS].sort(),
      ['approval.act', 'fiscal.admin', 'master_data.admin', 'org.admin', 'people.admin'],
    );
  });

  it('never contains a reserved technical or QA scope', () => {
    for (const reserved of COMMAND_RESERVED_SCOPE_KEYS) {
      assert.equal(isDelegableScope(reserved), false, reserved);
    }
    assert.equal(isDelegableScope('integration.admin'), false);
  });

  it('only lists recognized permission definitions', () => {
    for (const key of DELEGABLE_SCOPE_KEYS) assert.equal(isRecognizedPermissionScope(key), true, key);
  });

  it('does not delegate by absence from a denylist: unknown and near-miss strings fail', () => {
    for (const value of [
      'future.privileged.scope',
      'approval.act ',
      ' approval.act',
      'Approval.Act',
      'people.admin\n',
      '',
    ]) {
      assert.equal(isDelegableScope(value), false, JSON.stringify(value));
    }
  });

  it('does not make every recognized scope delegable', () => {
    for (const key of [
      ...OPERATIONS_ACCESS_SCOPE_KEYS,
      ...COMMERCIAL_AUTHORITY_SCOPE_KEYS,
      ...COMMERCIAL_READ_SCOPE_KEYS,
    ]) {
      assert.equal(isDelegableScope(key), false, key);
    }
  });
});

describe('recognized permission definitions', () => {
  it('cover every catalog the command layers draw from', () => {
    const catalogs = [
      ...ADMIN_SCOPE_KEYS,
      ...TECHNICAL_ADMIN_SCOPE_KEYS,
      ...OPERATIONS_ACCESS_SCOPE_KEYS,
      ...COMMERCIAL_READ_SCOPE_KEYS,
      ...COMMERCIAL_AUTHORITY_SCOPE_KEYS,
      ...ADDITIONAL_ASSIGNABLE_SCOPE_KEYS,
      ...V1_PLANNED_ASSIGNMENTS.flatMap((row) => row.intendedCapabilities),
      'approval.act',
    ];
    for (const key of catalogs) assert.equal(isRecognizedPermissionScope(key), true, key);
  });

  it('are exact, dotted, and unique', () => {
    assert.equal(new Set(RECOGNIZED_PERMISSION_SCOPE_KEYS).size > 0, true);
    for (const key of RECOGNIZED_PERMISSION_SCOPE_KEYS) {
      assert.match(key, /^[a-z_]+(\.[a-z_]+)+$/, key);
    }
    for (const value of ['', 'people.admin ', 'People.Admin', 'sales_rep', 'future.privileged.scope']) {
      assert.equal(isRecognizedPermissionScope(value), false, JSON.stringify(value));
    }
  });
});

describe('role key classification', () => {
  it('keeps supported job titles as titles', () => {
    for (const key of [
      'sales_rep',
      'sales_manager',
      'asc',
      'Gerente',
      'JEFE COMERCIAL',
      'Asesor Comercial',
      'Encargado de Producción',
    ]) {
      assert.equal(classifyRoleKey(key), 'job_title', key);
    }
  });

  it('classifies recognized permissions as scopes and technical or QA scopes as reserved', () => {
    for (const key of ['people.admin', 'approval.act', 'commercial.order.convert']) {
      assert.equal(classifyRoleKey(key), 'scope', key);
    }
    for (const key of COMMAND_RESERVED_SCOPE_KEYS) assert.equal(classifyRoleKey(key), 'reserved', key);
  });

  it('rejects strings that look like permissions but are not recognized', () => {
    for (const key of [
      'future.privileged.scope',
      'people.admin.',
      'people.admin ',
      'sales.rep',
      '',
      ' sales_rep',
      '9lives',
      'x'.repeat(65),
    ]) {
      assert.equal(classifyRoleKey(key), 'invalid', JSON.stringify(key));
    }
  });

  it('keeps every title shape from spelling a permission definition', () => {
    for (const key of RECOGNIZED_PERMISSION_SCOPE_KEYS) {
      assert.notEqual(classifyRoleKey(key), 'job_title', key);
    }
  });
});

describe('roleKeysThatConferAuthority', () => {
  it('drops titles and unknown strings and keeps recognized scopes', () => {
    assert.deepEqual(
      roleKeysThatConferAuthority([
        'sales_rep',
        'people.admin',
        'future.privileged.scope',
        'Gerente',
        'approval.act',
        'people.admin ',
      ]),
      ['people.admin', 'approval.act'],
    );
  });

  it('keeps technical and QA scopes that were provisioned out of band', () => {
    assert.deepEqual(roleKeysThatConferAuthority(['system.admin', 'qa.access']), [
      'system.admin',
      'qa.access',
    ]);
  });
});
