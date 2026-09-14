export const RECORD_NOT_MOUNTED = 'El registro no está montado.';
export const NO_RECORD = 'Sin registro';
export const ATTENTION_QUESTION = '¿Qué necesita mi atención?';

const MOUNTED_RECORD = [
  /^\/clientes\/[^/]+$/,
  /^\/clientes\/[^/]+\/cotizaciones\/[^/]+$/,
  /^\/clientes\/[^/]+\/pedidos\/[^/]+$/,
  /^\/clientes\/[^/]+\/oportunidades\/[^/]+$/,
  /^\/trabajo\/[^/]+$/,
  /^\/aprobaciones\/[^/]+$/,
] as const;

/** Department desks other workers mount. A lens action, not a record card. */
const MOUNTED_DESK = [
  '/produccion',
  '/almacen',
  '/compras',
  '/entregas',
  '/coordinacion',
  '/clientes',
  '/cotizaciones',
  '/oportunidades',
  '/trabajo',
  '/aprobaciones',
  '/productos',
  '/administracion',
] as const;

export function pathnameOnly(href: string | null | undefined): string | null {
  const path = href?.trim().split(/[?#]/, 1)[0] ?? '';
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** A specific record route that exists in this app. Otherwise the card must not link. */
export function mountedRecordHref(href: string | null | undefined): string | null {
  const path = pathnameOnly(href);
  if (!path) return null;
  return MOUNTED_RECORD.some((pattern) => pattern.test(path)) ? path : null;
}

export function mountedDeskHref(href: string | null | undefined): string | null {
  const path = pathnameOnly(href);
  if (!path) return null;
  return (MOUNTED_DESK as readonly string[]).includes(path) ? path : null;
}

export type QueueItem = {
  id: string;
  subject: string;
  meta: string;
  href: string | null;
  unmounted: string | null;
};

export function queueItem(input: {
  id: string;
  subject: string;
  href: string | null | undefined;
}): QueueItem {
  const href = mountedRecordHref(input.href);
  return {
    id: input.id,
    subject: input.subject.trim() || 'Registro',
    meta: href ? 'Abrir el registro' : RECORD_NOT_MOUNTED,
    href,
    unmounted: href ? null : RECORD_NOT_MOUNTED,
  };
}
