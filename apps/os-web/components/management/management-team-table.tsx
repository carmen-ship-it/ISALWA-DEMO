import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type { TeamMemberMetricsRow } from '@/lib/management/team-metrics';
import type { MemberLabelMap } from '@/lib/work/member-resolver';

type ManagementTeamTableProps = {
  rows: TeamMemberMetricsRow[];
  memberLabels: MemberLabelMap;
};

export function ManagementTeamTable({ rows, memberLabels }: ManagementTeamTableProps) {
  if (rows.length === 0) return null;

  return (
    <PageSection card className="min-w-0 overflow-x-auto p-0" aria-label="Equipo comercial">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-100)_40%,white)]">
          <tr>
            {[
              'Asesor',
              'Clientes asignados',
              'Oportunidades abiertas',
              'Cotizaciones emitidas',
              'Cotizaciones convertidas',
              'Tasa cotización → pedido',
              'Seguimientos vencidos',
              'Incidencias abiertas',
            ].map((label) => (
              <th
                key={label}
                scope="col"
                className="px-4 py-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = memberLabels.get(row.memberId) ?? row.memberId;
            return (
              <tr key={row.memberId} className="border-b border-[var(--isalwa-mist)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--isalwa-kiln)]">
                  <Link href={row.href} className="hover:underline">
                    {name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">
                  {row.assignedClients ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.openOpportunities}</td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.issuedQuotes}</td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.convertedQuotes}</td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.quoteToOrderRate}</td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.overdueFollowUps}</td>
                <td className="px-4 py-3 text-[var(--isalwa-slate)]">{row.openIssues}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PageSection>
  );
}
