/**
 * Path-derived shell breadcrumbs. Labels are employee vocabulary only.
 * Never invents entity display names from IDs — deep segments stay generic.
 */

export type ShellCrumb = {
  href: string | null;
  label: string;
};

export type ShellTrail = {
  crumbs: ShellCrumb[];
  back: { href: string; label: string } | null;
};

const ROOT_LABELS: Record<string, string> = {
  inicio: 'Inicio',
  clientes: 'Clientes',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  trabajo: 'Trabajo',
  productos: 'Productos',
  produccion: 'Producción',
  almacen: 'Almacén',
  compras: 'Compras',
  finanzas: 'Finanzas',
  entregas: 'Entregas',
  coordinacion: 'Coordinación',
  aprobaciones: 'Aprobaciones',
  conversaciones: 'Conversaciones',
  incidencias: 'Incidencias',
  administracion: 'Administración',
  mapa: 'Mapa',
  ayuda: 'Ayuda',
  mensajes: 'Mensajes',
  sistema: 'Controles del sistema',
  compromisos: 'Compromisos',
  incidencias: 'Incidencias',
};

function cleanPath(pathname: string): string {
  const cut = pathname.trim().split(/[?#]/, 1)[0] ?? '';
  if (!cut.startsWith('/') || cut.startsWith('//')) return '';
  return cut.length > 1 ? cut.replace(/\/+$/, '') : cut;
}

function segmentLabel(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const id = decoded.trim();
  if (!id || id === '.' || id === '..') return null;
  if (/[/?#\\]/.test(id)) return null;
  return id;
}

function trail(crumbs: ShellCrumb[], back: ShellTrail['back']): ShellTrail {
  return { crumbs, back };
}

/**
 * Build a breadcrumb trail for the authenticated shell.
 * Returns an empty trail on top-level destinations (no chrome noise).
 */
export function deriveShellBreadcrumbs(pathname: string): ShellTrail {
  const path = cleanPath(pathname);
  if (!path || path === '/') return trail([], null);

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return trail([], null);

  const root = parts[0] ?? '';
  const rootLabel = ROOT_LABELS[root];
  if (!rootLabel) return trail([], null);

  // Top-level list/home — no breadcrumb strip.
  if (parts.length === 1) return trail([], null);

  const rootHref = `/${root}`;

  // /clientes/nuevo
  if (root === 'clientes' && parts[1] === 'nuevo' && parts.length === 2) {
    return trail(
      [
        { href: rootHref, label: rootLabel },
        { href: null, label: 'Nuevo cliente' },
      ],
      { href: rootHref, label: 'Volver a clientes' },
    );
  }

  // /clientes/:partyId...
  if (root === 'clientes') {
    const partyId = segmentLabel(parts[1] ?? '');
    if (!partyId || partyId === 'nuevo') return trail([], null);
    const clienteHref = `${rootHref}/${encodeURIComponent(partyId)}`;
    const crumbs: ShellCrumb[] = [
      { href: rootHref, label: rootLabel },
      { href: parts.length === 2 ? null : clienteHref, label: 'Cliente' },
    ];

    if (parts.length === 2) {
      return trail(crumbs, { href: rootHref, label: 'Volver a clientes' });
    }

    const section = parts[2] ?? '';
    if (section === 'oportunidades') {
      if (parts[3] === 'nueva' && parts.length === 4) {
        crumbs.push({ href: null, label: 'Nueva oportunidad' });
        return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
      }
      const opportunityId = segmentLabel(parts[3] ?? '');
      if (!opportunityId) return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
      const opportunityHref = `${clienteHref}/oportunidades/${encodeURIComponent(opportunityId)}`;
      crumbs.push({
        href: parts.length === 4 ? null : opportunityHref,
        label: 'Oportunidad',
      });
      if (parts.length === 4) {
        return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
      }
      if (parts[4] === 'cotizaciones' && parts[5] === 'nueva') {
        crumbs.push({ href: null, label: 'Nueva cotización' });
        return trail(crumbs, { href: opportunityHref, label: 'Volver a la oportunidad' });
      }
      return trail(crumbs, { href: opportunityHref, label: 'Volver a la oportunidad' });
    }

    if (section === 'cotizaciones') {
      const quoteId = segmentLabel(parts[3] ?? '');
      crumbs.push({ href: null, label: quoteId ? 'Cotización' : 'Cotizaciones' });
      return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
    }

    if (section === 'pedidos') {
      const orderId = segmentLabel(parts[3] ?? '');
      crumbs.push({ href: null, label: orderId ? 'Pedido' : 'Pedidos' });
      return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
    }

    return trail(crumbs, { href: clienteHref, label: 'Volver al cliente' });
  }

  // /trabajo/:id
  if (root === 'trabajo' && parts.length >= 2) {
    return trail(
      [
        { href: rootHref, label: rootLabel },
        { href: null, label: 'Detalle' },
      ],
      { href: rootHref, label: 'Volver a trabajo' },
    );
  }

  // /aprobaciones/:id
  if (root === 'aprobaciones' && parts.length >= 2) {
    return trail(
      [
        { href: rootHref, label: rootLabel },
        { href: null, label: 'Solicitud' },
      ],
      { href: rootHref, label: 'Volver a aprobaciones' },
    );
  }

  // /administracion/...
  if (root === 'administracion' && parts.length >= 2) {
    const crumbs: ShellCrumb[] = [{ href: rootHref, label: rootLabel }];
    const section = parts[1] ?? '';
    if (section === 'equipo') {
      crumbs.push({
        href: parts.length === 2 ? null : `${rootHref}/equipo`,
        label: 'Equipo',
      });
      if (parts[2] === 'invitar') {
        crumbs.push({ href: null, label: 'Invitar' });
        return trail(crumbs, { href: `${rootHref}/equipo`, label: 'Volver al equipo' });
      }
      if (parts.length >= 3) {
        crumbs.push({ href: null, label: 'Persona' });
        return trail(crumbs, { href: `${rootHref}/equipo`, label: 'Volver al equipo' });
      }
      return trail(crumbs, { href: rootHref, label: 'Volver a administración' });
    }
    if (section === 'accesos') {
      crumbs.push({ href: null, label: 'Accesos' });
      return trail(crumbs, { href: rootHref, label: 'Volver a administración' });
    }
    if (section === 'capacidades') {
                  crumbs.push({ href: null, label: 'Funciones' });
                  return trail(crumbs, { href: rootHref, label: 'Volver a administración' });
                }
    return trail(crumbs, { href: rootHref, label: 'Volver a administración' });
  }

  // Generic depth ≥ 2 under a known root
  return trail(
    [
      { href: rootHref, label: rootLabel },
      { href: null, label: 'Detalle' },
    ],
    { href: rootHref, label: `Volver a ${rootLabel.toLowerCase()}` },
  );
}
