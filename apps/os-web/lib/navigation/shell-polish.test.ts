import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { deriveShellBreadcrumbs } from '@/lib/navigation/breadcrumbs';
import {
  filterNavByAccess,
  groupNavItems,
  PRIMARY_NAV,
  primaryNavIds,
} from '@/lib/navigation/nav-config';
import { navItemIsActive, navSectionIsOpen } from '@/lib/navigation/nav-active';
import { labelForNavItem, roleNavPresentation } from '@/lib/navigation/role-nav-labels';
import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
} from '@isalwa/os-contracts';

describe('shell breadcrumbs', () => {
  it('omits chrome on top-level destinations', () => {
    assert.deepEqual(deriveShellBreadcrumbs('/inicio'), { crumbs: [], back: null });
    assert.deepEqual(deriveShellBreadcrumbs('/clientes'), { crumbs: [], back: null });
    assert.deepEqual(deriveShellBreadcrumbs('/produccion'), { crumbs: [], back: null });
  });

  it('builds cliente depth without inventing entity names', () => {
    const trail = deriveShellBreadcrumbs('/clientes/party-1');
    assert.equal(trail.back?.href, '/clientes');
    assert.deepEqual(
      trail.crumbs.map((c) => c.label),
      ['Clientes', 'Cliente 360'],
    );
    assert.equal(trail.crumbs.some((c) => c.label === 'party-1'), false);
  });

  it('returns from opportunity detail to the cliente', () => {
    const trail = deriveShellBreadcrumbs('/clientes/party-1/oportunidades/opp-9');
    assert.equal(trail.back?.href, '/clientes/party-1');
    assert.deepEqual(
      trail.crumbs.map((c) => c.label),
      ['Clientes', 'Cliente 360', 'Oportunidad'],
    );
  });

  it('supports trabajo and aprobaciones detail trails', () => {
    assert.equal(deriveShellBreadcrumbs('/trabajo/w-1').back?.href, '/trabajo');
    assert.equal(deriveShellBreadcrumbs('/aprobaciones/a-1').back?.label, 'Volver a aprobaciones');
  });
});

describe('role-aware nav labeling (no authority change)', () => {
  it('keeps Inicio label as Inicio; role lens stays in focusLabel only', () => {
    const presentation = roleNavPresentation([
      COMMERCIAL_CUSTOMER_CREATE_SCOPE,
      COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
    ]);
    assert.equal(presentation.inicioLabel, 'Su trabajo');
    assert.equal(labelForNavItem('inicio', 'Inicio', presentation), 'Inicio');
    assert.equal(labelForNavItem('clientes', 'Clientes', presentation), 'Clientes');
    assert.ok(presentation.emphasizedIds.includes('inicio'));
    assert.deepEqual(primaryNavIds({ showAdmin: false }), [
      'inicio',
      'excepciones',
      'clientes',
      'oportunidades',
      'cotizaciones',
      'pedidos',
      'mapa',
      'trabajo',
      'conversaciones',
      'aprobaciones',
      'incidencias',
      'compromisos',
      'produccion',
      'almacen',
      'compras',
      'entregas',
      'finanzas',
      'salud-datos',
      'productos',
      'coordinacion',
      'memoria-decisiones',
      'ayuda',
    ]);
  });

  it('prefers company lens over team and own for Inicio label', () => {
    const presentation = roleNavPresentation([
      COMMERCIAL_CUSTOMER_CREATE_SCOPE,
      COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
      COMMERCIAL_TEAM_READ_SCOPE,
      MANAGEMENT_ORG_READ_SCOPE,
    ]);
    assert.equal(presentation.inicioLabel, 'Excepciones');
  });

  it('emphasizes producción desk for production scope without hiding others', () => {
    const presentation = roleNavPresentation([PRODUCTION_OPERATIONAL_RECORD_SCOPE]);
    assert.equal(presentation.focusLabel, 'Producción');
    assert.ok(presentation.emphasizedIds.includes('produccion'));
    assert.equal(
      filterNavByAccess(PRIMARY_NAV, { showAdmin: false }).some((i) => i.id === 'clientes'),
      true,
    );
  });

  it('emphasizes almacén for warehouse scope', () => {
    const presentation = roleNavPresentation([WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE]);
    assert.ok(presentation.emphasizedIds.includes('almacen'));
    assert.equal(presentation.focusLabel, 'Almacén');
  });
});

describe('nav hierarchy groups', () => {
  it('groups visible items without changing filterNavByAccess', () => {
    const visible = filterNavByAccess(PRIMARY_NAV, { showAdmin: true });
    const sections = groupNavItems(visible);
    assert.deepEqual(
      sections.map((s) => s.group),
      ['inicio', 'comercial', 'trabajo', 'operaciones', 'control', 'mas'],
    );
    assert.equal(sections.find((s) => s.group === 'comercial')?.label, 'Comercial');
    assert.equal(sections.find((s) => s.group === 'operaciones')?.label, 'Operaciones');
    assert.deepEqual(
      sections.flatMap((s) => s.items.map((i) => i.id)),
      [
        'inicio',
        'excepciones',
        'clientes',
        'oportunidades',
        'cotizaciones',
        'pedidos',
        'mapa',
        'trabajo',
        'conversaciones',
        'aprobaciones',
        'incidencias',
        'compromisos',
        'produccion',
        'almacen',
        'compras',
        'entregas',
        'finanzas',
        'salud-datos',
        'auditoria',
        'productos',
        'coordinacion',
        'memoria-decisiones',
        'administracion',
        'ayuda',
      ],
    );
    assert.deepEqual(
      new Set(sections.flatMap((s) => s.items.map((i) => i.id))),
      new Set(visible.map((i) => i.id)),
    );
  });
});

describe('shell sticky contract', () => {
  it('scrolls page content beside the header so titles are not covered', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const shell = readFileSync(resolve(here, '../../components/shell/app-shell.tsx'), 'utf8');
    const breadcrumbs = readFileSync(resolve(here, '../../components/shell/shell-breadcrumbs.tsx'), 'utf8');
    const pageHeader = readFileSync(resolve(here, '../../components/shell/page-header.tsx'), 'utf8');
    const nav = readFileSync(resolve(here, '../../components/shell/app-nav.tsx'), 'utf8');
    const palette = readFileSync(resolve(here, '../../components/shell/command-palette.tsx'), 'utf8');
    assert.match(shell, /data-shell-header/);
    assert.match(shell, /data-shell-scroll/);
    assert.match(shell, /overflow-y-auto/);
    assert.doesNotMatch(shell, /sticky top-0 z-40/);
    assert.match(shell, /role="dialog"/);
    assert.match(shell, /aria-modal="true"/);
    assert.doesNotMatch(breadcrumbs, /className="[^"]*sticky/);
    assert.doesNotMatch(pageHeader, /className=\{?['"`][^'"`]*sticky/);
    assert.match(pageHeader, /Intentionally not sticky/);
    assert.doesNotMatch(nav, /h-1\.5 w-1\.5 shrink-0 rounded-full/);
    assert.match(palette, /Cerrar búsqueda/);
    assert.match(palette, />Cerrar</);
    assert.match(palette, /event\.key === 'Escape'/);
    assert.match(palette, /if \(event\.target === event\.currentTarget\) close\(\)/);
  });
});

describe('inicio and excepciones are distinct nav destinations', () => {
  it('highlights Inicio on /inicio and not Excepciones', () => {
    assert.equal(navItemIsActive('/inicio', '', 'inicio', '/inicio'), true);
    assert.equal(navItemIsActive('/inicio', '', 'excepciones', '/inicio?vista=excepciones'), false);
    assert.equal(navItemIsActive('/inicio', '?datos=demo', 'inicio', '/inicio'), true);
    assert.equal(navItemIsActive('/excepciones', '', 'inicio', '/inicio'), false);
  });

  it('highlights Excepciones only on the exceptions view', () => {
    assert.equal(
      navItemIsActive('/inicio', '?vista=excepciones', 'excepciones', '/inicio?vista=excepciones'),
      true,
    );
    assert.equal(navItemIsActive('/inicio', '?vista=excepciones&datos=demo', 'inicio', '/inicio'), false);
    assert.equal(navItemIsActive('/trabajo', '', 'excepciones', '/inicio?vista=excepciones'), false);
  });

  it('treats vista=excepciones as a dedicated destination flag', async () => {
    const { isInicioExceptionsView } = await import('@/lib/inicio/page-lens');
    assert.equal(isInicioExceptionsView('excepciones'), true);
    assert.equal(isInicioExceptionsView(undefined), false);
    assert.equal(isInicioExceptionsView('empresa'), false);
  });

  it('keeps the active group open even when the user collapsed it', () => {
    assert.equal(navSectionIsOpen(true, true), true);
    assert.equal(navSectionIsOpen(false, true), false);
    assert.equal(navSectionIsOpen(false, false), true);
  });
});
