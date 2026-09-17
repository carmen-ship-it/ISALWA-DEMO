/**
 * RC3 hardened hosted-BV assertion catalog.
 *
 * Documents deny-aware proofs for Pedido, Quote, Cliente, Opportunity,
 * Approval, Conversation, Document, History, Audit, Work — all via
 * `assertResourceLoaded` from `./rc3-bv-assert-resource.mjs`.
 *
 * This module is importable from harness runners. It does not navigate;
 * call sites navigate first, then invoke `runHardenedCheck(page, id)`.
 *
 * Seeded DEMO MADERAS anchors (staging RC2/RC3):
 *   party  01M2PM95PV7YP6AECYXSX4GRBW
 *   quote  01M2PM9KSJXN1K4CF45FT0H299  → Q-000002
 *   order  01M2PMA280KX4AAV7049YKNE07  → O-000002
 */

import {
  assertResourceLoaded,
  ACCESS_DENIED_RE,
  ERROR_BOUNDARY_RE,
  evaluateResourceLoaded,
  readScopedText,
  toRegExp,
} from './rc3-bv-assert-resource.mjs';

export const MADERAS = {
  partyId: '01M2PM95PV7YP6AECYXSX4GRBW',
  quoteId: '01M2PM9KSJXN1K4CF45FT0H299',
  orderId: '01M2PMA280KX4AAV7049YKNE07',
  quoteNumber: 'Q-000002',
  orderNumber: 'O-000002',
  customerName: /DEMO\s+MADERAS|MADERAS\s+ORIENTE/i,
};

/**
 * @typedef {{
 *   id: string,
 *   kind: import('./rc3-bv-assert-resource.mjs').ResourceKind,
 *   description: string,
 *   softAntiPattern: string,
 *   buildOpts: () => import('./rc3-bv-assert-resource.mjs').AssertResourceOptions,
 *   extra?: (page: any, text: string) => Promise<{ ok: boolean, detail?: string } | null>,
 * }} HardenedAssertion
 */

/** @type {HardenedAssertion[]} */
export const HARDENED_ASSERTIONS = [
  {
    id: 'pedido',
    kind: 'pedido',
    description: 'Pedido detail — order number + client + lifecycle content; deny AccessDenied',
    softAntiPattern: '/O-000002|Pedido/ (breadcrumb Pedido PASS on AccessDenied)',
    buildOpts: () => ({
      kind: 'pedido',
      id: /O-000002|01M2PMA280KX4AAV7049YKNE07/,
      customerName: MADERAS.customerName,
      contentPatterns: [
        /Preparaci[oó]n|Nota de Entrega|Registrado|L[ií]neas|Ciclo de vida|Salida|Entrega/i,
      ],
    }),
  },
  {
    id: 'quote',
    kind: 'quote',
    description: 'Quote detail — Q-number + client + quote body; no bare Cotización',
    softAntiPattern: '/Q-000002|Cotizaci/ (breadcrumb Cotización alone)',
    buildOpts: () => ({
      kind: 'quote',
      id: /Q-000002|01M2PM9KSJXN1K4CF45FT0H299/,
      customerName: MADERAS.customerName,
      contentPatterns: [
        /L[ií]nea|Total|Enviad|Borrador|Aprobaci[oó]n|Convertir a Pedido|PDF|Seguimiento/i,
      ],
    }),
  },
  {
    id: 'cliente',
    kind: 'cliente',
    description: 'Cliente 360 — named DEMO client + dossier metrics/content',
    softAntiPattern: '/cliente|pedido|cotizaci/i OR nav labels',
    buildOpts: () => ({
      kind: 'cliente',
      id: /01M2PM95PV7YP6AECYXSX4GRBW|DEMO\s+MADERAS/,
      customerName: MADERAS.customerName,
      contentPatterns: [
        /Oportunidades|Cotizaciones|Pedidos|Resumen|Comercial|Q-000002|O-000002/i,
      ],
    }),
  },
  {
    id: 'opportunity',
    kind: 'opportunity',
    description: 'Opportunity / comercial tab — seeded quote or named opportunity row',
    softAntiPattern: '/Cotizaci|oportunidad/ without Q-… or title',
    buildOpts: () => ({
      kind: 'opportunity',
      id: /Q-000002|01M2PM9KSJXN1K4CF45FT0H299/,
      customerName: MADERAS.customerName,
      contentPatterns: [/Oportunidad|Comercial|Cotizaci[oó]n|Abierta|En curso/i],
    }),
  },
  {
    id: 'approval',
    kind: 'approval',
    description: 'Approval surface — request id or approval copy in main (not sidebar Aprobaciones)',
    softAntiPattern: '/Aprobaci/ matching nav Aprobaciones',
    buildOpts: () => ({
      kind: 'approval',
      id: /Aprobaci[oó]n|solicitud|approval/i,
      contentPatterns: [
        /Pendiente|Aprobar|Rechazar|no crea un pedido|Convertir a Pedido|Solicitud/i,
      ],
    }),
  },
  {
    id: 'conversation',
    kind: 'conversation',
    description: 'Conversaciones desk — thread/party/empty-inbox in workspace main',
    softAntiPattern: '!Application error or /Conversaci/ nav alone',
    buildOpts: () => ({
      kind: 'conversation',
      id: /Conversaci|bandeja|hilo|mensaje|inbox/i,
      contentPatterns: [
        /DEMO\s+MADERAS|ANDINA|Sin conversaciones|No hay conversaciones|Selecciona|Recomendad|WhatsApp|Manual/i,
      ],
    }),
  },
  {
    id: 'document',
    kind: 'document',
    description: 'Documentos tab — PDF control or document row (not tab label alone)',
    softAntiPattern: '/Documentos|PDF|Cotización|Nota/ tab chrome',
    buildOpts: () => ({
      kind: 'document',
      id: /Q-000002|O-000002|PDF|Nota de Entrega/,
      customerName: MADERAS.customerName,
      contentPatterns: [/Descargar PDF|Ver PDF|href|Documento|\.pdf|Nota de Entrega/i],
    }),
    extra: async (page) => {
      const pdf = page
        .getByRole('link', { name: /PDF|Descargar|Ver documento/i })
        .or(page.getByRole('button', { name: /PDF|Descargar/i }))
        .or(page.locator('a[href*="/pdf"]'));
      const n = await pdf.count();
      if (n > 0) return { ok: true, detail: `pdf_controls=${n}` };
      return null;
    },
  },
  {
    id: 'history',
    kind: 'history',
    description: 'Historial tab — timeline event verb + time (not tab label / length>100)',
    softAntiPattern: '/Historial|Actividad/ OR text.length > 100',
    buildOpts: () => ({
      kind: 'history',
      id: /Historial|Actividad|timeline/i,
      customerName: MADERAS.customerName,
      contentPatterns: [
        /registr[oó]|cre[oó]|envi[oó]|actualiz|aprob|convert|hace\s+\d|:\d{2}|evento/i,
      ],
    }),
  },
  {
    id: 'audit',
    kind: 'audit',
    description: 'Auditoría desk — list row or intentional empty; fail AccessDenied',
    softAntiPattern: '!Application error; /Auditor/ nav as negative proof',
    buildOpts: () => ({
      kind: 'audit',
      id: /Auditor[ií]a|registro|evento/i,
      contentPatterns: [
        /Sin eventos|No hay|filtro|actor|recurso|cambi[oó]|fecha|detalle/i,
      ],
    }),
  },
  {
    id: 'work',
    kind: 'work',
    description: 'Trabajo desk — work item / quién tiene la pelota content',
    softAntiPattern: 'bare Trabajo nav or !Application error',
    buildOpts: () => ({
      kind: 'work',
      id: /Trabajo|compromiso|tarea|pelota/i,
      contentPatterns: [
        /Qui[eé]n tiene|pendiente|asignad|compromiso|siguiente paso|vac[ií]o|Sin trabajo/i,
      ],
    }),
  },
];

/**
 * Run one catalog assertion against the current page.
 * @param {import('playwright-core').Page | import('playwright').Page} page
 * @param {string} assertionId
 */
export async function runHardenedCheck(page, assertionId) {
  const spec = HARDENED_ASSERTIONS.find((a) => a.id === assertionId);
  if (!spec) {
    return {
      ok: false,
      status: 'FAIL',
      reason: `unknown_assertion:${assertionId}`,
      kind: 'work',
      textSample: '',
    };
  }

  if (spec.extra) {
    const text = await readScopedText(page, 'main');
    if (ACCESS_DENIED_RE.test(text) || ERROR_BOUNDARY_RE.test(text)) {
      return evaluateResourceLoaded(text, spec.buildOpts());
    }
    const bonus = await spec.extra(page, text);
    if (bonus?.ok) {
      return {
        ok: true,
        status: 'PASS',
        reason: `extra:${bonus.detail ?? 'ok'}`,
        kind: spec.kind,
        textSample: text.slice(0, 400),
      };
    }
  }

  return assertResourceLoaded(page, spec.buildOpts());
}

/**
 * Seeded Maderas pedido proof — drop-in replacement for soft pedido_maderas.
 * @param {import('playwright-core').Page | import('playwright').Page} page
 */
export async function assertPedidoMaderasLoaded(page) {
  return assertResourceLoaded(page, {
    kind: 'pedido',
    id: /O-000002|01M2PMA280KX4AAV7049YKNE07/,
    customerName: MADERAS.customerName,
    contentPatterns: [
      /Preparaci[oó]n|Nota de Entrega|Registrado|L[ií]neas|Ciclo de vida|Salida|Entrega/i,
    ],
  });
}

/**
 * Seeded Maderas quote proof.
 * @param {import('playwright-core').Page | import('playwright').Page} page
 */
export async function assertQuoteMaderasLoaded(page) {
  return assertResourceLoaded(page, {
    kind: 'quote',
    id: /Q-000002|01M2PM9KSJXN1K4CF45FT0H299/,
    customerName: MADERAS.customerName,
    contentPatterns: [
      /L[ií]nea|Total|Enviad|Borrador|Aprobaci[oó]n|Convertir a Pedido|PDF|Seguimiento/i,
    ],
  });
}

/**
 * Lifecycle strip on an authorized pedido — requires assertPedido first.
 * @param {import('playwright-core').Page | import('playwright').Page} page
 */
export async function assertPedidoProgressVocabulary(page) {
  const base = await assertPedidoMaderasLoaded(page);
  if (!base.ok) return { ...base, reason: `progress_blocked:${base.reason}` };

  const text = await readScopedText(page, 'main');
  const labels = [
    /Cotizaci[oó]n/i,
    /Pedido/i,
    /Preparaci[oó]n/i,
    /Nota de Entrega/i,
    /Salida/i,
    /Entrega/i,
  ];
  const all = labels.every((re) => re.test(text));
  return {
    ok: all,
    status: all ? 'PASS' : 'PARTIAL',
    reason: all ? 'lifecycle_labels_in_main' : 'incomplete_lifecycle_labels',
    kind: 'pedido',
    textSample: text.slice(0, 400),
  };
}

/**
 * Negative desk proof: exclusion banner required; bare /Auditor/ nav is NOT proof.
 * @param {string} text
 * @param {{ requireExclusion?: boolean, forbidAuditRows?: boolean }} [opts]
 */
export function assertNegativeDeskExclusion(text, opts = {}) {
  const exclusion =
    /no est[aá] disponible|no corresponde|escritorio de evaluaci[oó]n|Sin permiso|AccessDenied|deneg/i.test(
      text,
    );
  if (opts.requireExclusion !== false && !exclusion) {
    // Do not accept bare Auditoría / nav as PASS
    if (/Auditor/i.test(text) && !ACCESS_DENIED_RE.test(text)) {
      return {
        ok: false,
        status: 'FAIL',
        reason: 'nav_auditoria_ alone_is_not_exclusion',
      };
    }
    return { ok: false, status: 'PARTIAL', reason: 'missing_exclusion_banner' };
  }
  if (opts.forbidAuditRows) {
    const hasRows =
      /href=["'][^"']*auditoria[^"']*\/[01A-Z0-9]{20,}/i.test(text) ||
      (/actor/i.test(text) && /recurso/i.test(text) && /cambi/i.test(text));
    if (hasRows && !exclusion) {
      return { ok: false, status: 'FAIL', reason: 'audit_rows_visible_without_exclusion' };
    }
  }
  return { ok: true, status: 'PASS', reason: 'exclusion_proven' };
}

export { assertResourceLoaded, evaluateResourceLoaded, readScopedText, toRegExp, ACCESS_DENIED_RE };
