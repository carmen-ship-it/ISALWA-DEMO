import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname);

describe('FulfillmentController wiring', () => {
  it('registers fulfillment reads on AppModule and uses existing company read gate', () => {
    const controller = readFileSync(join(root, 'fulfillment.controller.ts'), 'utf8');
    const appModule = readFileSync(join(root, 'app.module.ts'), 'utf8');
    const pkg = JSON.parse(readFileSync(join(root, '../package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };

    assert.match(controller, /@Controller\('fulfillment'\)/);
    assert.match(controller, /readWarehouseExits/);
    assert.match(controller, /readDeliveries/);
    assert.match(controller, /session\.grantedScopes/);
    assert.match(controller, /session\.organizationId/);
    assert.doesNotMatch(controller, /cargo|title/);
    assert.match(controller, /PERMISSION_DENIED/);
    assert.match(appModule, /FulfillmentController/);
    assert.equal(pkg.dependencies['@isalwa/os-read-fulfillment'], 'workspace:*');
  });

  it('does not invent auto-delivery-from-order in the controller', () => {
    const controller = readFileSync(join(root, 'fulfillment.controller.ts'), 'utf8');
    assert.doesNotMatch(controller, /auto.?deliver|createDeliveryFromOrder|ConvertOrder/i);
  });
});
