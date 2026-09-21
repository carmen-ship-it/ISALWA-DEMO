import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('Task 11D backend bounds', () => {
  it('locations and contacts API are cursor-bounded with default 25', () => {
    const controller = read('../os-api/src/parties.controller.ts');
    const store = read('../../packages/os-database/src/prisma-party-store.ts');
    const queries = read('../../packages/os-contracts/src/queries.ts');
    assert.match(queries, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(100\)\.default\(25\)/);
    assert.match(controller, /listPartyLocations/);
    assert.match(controller, /listPartyContacts/);
    assert.match(controller, /contactsMeta/);
    assert.match(controller, /hasMore: page\.hasMore/);
    assert.match(store, /take: limit \+ 1/);
    assert.doesNotMatch(controller, /total:/);
  });

  it('Cliente 360 consumes bounded locations and paged contacts', () => {
    const load = read('lib/cliente/load-cliente-360.ts');
    const page = read('app/(app)/clientes/[partyId]/page.tsx');
    const panel = read('components/party/customer-location-panel.tsx');
    const client = read('lib/api/os-api-client.ts');
    assert.match(load, /listPartyLocations\(partyId, \{ limit: 25 \}\)/);
    assert.match(client, /listPartyContacts/);
    assert.match(page, /Ver más contactos/);
    assert.match(page, /listPartyContacts/);
    assert.match(panel, /hasMore/);
    assert.doesNotMatch(panel, /API pendiente/);
  });

  it('document assembly is capped at 25 with truthful partial copy', () => {
    const docs = read('lib/cliente/document-links.ts');
    const ui = read('components/cliente/cliente-360-documentos.tsx');
    assert.match(docs, /DOCUMENT_LINKS_CAP = 25/);
    assert.match(docs, /DOCUMENT_SOURCE_FANOUT = 10/);
    assert.match(docs, /OPPORTUNITY_TITLE_FETCH_MAX = 10/);
    assert.match(docs, /limit: DELIVERY_NOTES_LIST_LIMIT/);
    assert.match(docs, /partial: truncated/);
    assert.match(ui, /outcome\.hasMore \|\| outcome\.partial/);
    assert.doesNotMatch(ui, /encontrados/);
    assert.doesNotMatch(ui, /de \{outcome\.links\.length\}/);
  });
});
