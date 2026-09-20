import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { workDetailReturn, workItemHref } from '@/lib/work/navigation';

describe('work detail return context', () => {
  it('Compras opens review with from=compras and Volver returns to Compras', () => {
    assert.equal(workItemHref('w-1', 'compras'), '/trabajo/w-1?from=compras');
    assert.deepEqual(workDetailReturn('compras'), {
      href: '/compras',
      label: 'Volver a Compras',
    });
  });

  it('default and unknown from stay on Trabajo — never Inicio', () => {
    assert.equal(workItemHref('w-1'), '/trabajo/w-1');
    assert.equal(workItemHref('w-1', 'trabajo'), '/trabajo/w-1');
    assert.deepEqual(workDetailReturn(undefined), {
      href: '/trabajo',
      label: 'Volver a trabajo',
    });
    assert.deepEqual(workDetailReturn('inicio'), {
      href: '/trabajo',
      label: 'Volver a trabajo',
    });
    assert.notEqual(workDetailReturn('compras').href, '/inicio');
  });
});
