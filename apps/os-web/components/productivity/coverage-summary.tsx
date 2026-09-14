'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@isalwa/ui';
import { loadCoverageSummary, lookupMembers } from '@/lib/productivity/actions';
import { countLabel, type CoverageSummary } from '@/lib/productivity/coverage';
import type { TypeaheadOption } from '@/lib/operating/typeahead';

type CoverageSummaryPanelProps = {
  onNavigate: (href: string) => void;
};

const ROWS: Array<{
  key: keyof Pick<
    CoverageSummary,
    | 'openWork'
    | 'overdueWork'
    | 'openFollowUps'
    | 'customersWithOpenWork'
    | 'openOpportunities'
    | 'submittedQuotes'
    | 'pendingApprovals'
    | 'commitments'
  >;
  label: string;
  link?: keyof CoverageSummary['links'];
}> = [
  { key: 'openWork', label: 'Trabajo abierto', link: 'openWork' },
  { key: 'overdueWork', label: 'Trabajo vencido', link: 'overdueWork' },
  { key: 'openFollowUps', label: 'Seguimientos abiertos' },
  { key: 'customersWithOpenWork', label: 'Clientes con trabajo abierto' },
  { key: 'openOpportunities', label: 'Oportunidades abiertas', link: 'opportunities' },
  { key: 'submittedQuotes', label: 'Cotizaciones enviadas', link: 'quotes' },
  { key: 'pendingApprovals', label: 'Aprobaciones pendientes', link: 'approvals' },
  { key: 'commitments', label: 'Compromisos' },
];

export function CoverageSummaryPanel({ onNavigate }: CoverageSummaryPanelProps) {
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'session' | 'denied' | 'error'>('loading');
  const [canLookup, setCanLookup] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [members, setMembers] = useState<TypeaheadOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadCoverageSummary().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus(result.reason === 'session' ? 'session' : result.reason === 'not_authorized' ? 'denied' : 'error');
        return;
      }
      setSummary(result.summary);
      setCanLookup(result.canLookupMembers);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canLookup || memberQuery.trim().length < 2) {
      setMembers([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void lookupMembers(memberQuery).then((result) => {
        if (!result.ok || !result.authorized) {
          setMembers([]);
          return;
        }
        setMembers(result.items);
      });
    }, 180);
    return () => window.clearTimeout(handle);
  }, [canLookup, memberQuery]);

  async function openMember(member: TypeaheadOption) {
    setStatus('loading');
    setMembers([]);
    const result = await loadCoverageSummary({ memberId: member.value, memberLabel: member.label });
    if (!result.ok) {
      setStatus(result.reason === 'session' ? 'session' : result.reason === 'not_authorized' ? 'denied' : 'error');
      return;
    }
    setSummary(result.summary);
    setStatus('ready');
  }

  return (
    <div className="px-3 py-3">
      <SectionHeader kicker="Cobertura" title="Resumen de ausencia" />
      <p className="mb-3 text-sm text-[var(--isalwa-slate)]">
        Solo lectura de registros autorizados. No reasigna trabajo. Un número truncado es un mínimo, no el total.
      </p>
      {status === 'loading' ? <p className="text-sm text-[var(--isalwa-slate)]">Consultando…</p> : null}
      {status === 'session' ? (
        <p className="text-sm text-[var(--isalwa-kiln)]" role="alert">Su sesión venció. Vuelva a iniciar sesión.</p>
      ) : null}
      {status === 'denied' ? (
        <p className="text-sm text-[var(--isalwa-kiln)]" role="alert">No tiene permiso para esa cobertura.</p>
      ) : null}
      {status === 'error' ? (
        <p className="text-sm text-[var(--isalwa-kiln)]" role="alert">No se pudo cargar la cobertura.</p>
      ) : null}
      {summary && status === 'ready' ? (
        <>
          <p className="mb-2 text-sm font-medium text-[var(--isalwa-kiln)]">{summary.memberLabel}</p>
          <ul className="divide-y divide-[var(--isalwa-mist)]">
            {ROWS.map((row) => {
              const lane = summary[row.key];
              const href = row.link ? summary.links[row.link] : undefined;
              return (
                <li key={row.key} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="text-sm text-[var(--isalwa-slate)]">{row.label}</span>
                  {href && lane.status === 'available' ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-[var(--isalwa-glaze)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                      onClick={() => onNavigate(href)}
                    >
                      {countLabel(lane)}
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-[var(--isalwa-kiln)]">{countLabel(lane)}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {summary.subject === 'member' ? (
            <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
              Sin enlace a una lista por responsable. Abrir Trabajo mostraría la suya, no la de esta persona.
            </p>
          ) : null}
        </>
      ) : null}
      {canLookup ? (
        <div className="mt-4">
          <label htmlFor="coverage-member" className="text-sm text-[var(--isalwa-slate)]">
            Cobertura de otra persona
          </label>
          <input
            id="coverage-member"
            value={memberQuery}
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Nombre, al menos 2 letras"
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            autoComplete="off"
          />
          {members.length > 0 ? (
            <ul className="mt-2">
              {members.map((member) => (
                <li key={member.value}>
                  <button
                    type="button"
                    className="w-full rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]"
                    onClick={() => void openMember(member)}
                  >
                    {member.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
          Buscar a otra persona requiere administración. Aquí solo aparece su trabajo autorizado.
        </p>
      )}
    </div>
  );
}
