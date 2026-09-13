import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { MemberSummaryReadModel } from '@isalwa/os-contracts';
import {
  accessStatusTone,
  formatAccessStatus,
  formatEmploymentStatus,
  formatRoleKeys,
  memberDisplayName,
} from '@/lib/workforce/labels';
import { directoryMemberLabel } from '@/lib/workforce/member-labels';
import { memberHref } from '@/lib/workforce/navigation';

type MemberListProps = {
  items: MemberSummaryReadModel[];
  labelMap: Map<string, string>;
};

export function MemberList({ items, labelMap }: MemberListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Equipo">
      {items.map((item) => {
        const name = memberDisplayName(item.displayName, item.givenName, item.familyName);
        return (
          <ListRow key={item.memberId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={memberHref(item.memberId)}
                    className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {name}
                  </Link>
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    {item.email ? (
                      <div>
                        <dt className="sr-only">Correo</dt>
                        <dd>{item.email}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="sr-only">Rol</dt>
                      <dd>Rol: {formatRoleKeys(item.roleKeys)}</dd>
                    </div>
                    {item.departmentName ? (
                      <div>
                        <dt className="sr-only">Departamento</dt>
                        <dd>Departamento: {item.departmentName}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>
                        Responsable: {directoryMemberLabel(labelMap, item.managerMemberId)}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Relación laboral</dt>
                      <dd>Relación: {formatEmploymentStatus(item.employmentStatus)}</dd>
                    </div>
                    {item.activeDelegationCount > 0 ? (
                      <div>
                        <dt className="sr-only">Delegaciones</dt>
                        <dd>Delegaciones activas: {item.activeDelegationCount}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <StatusPill tone={accessStatusTone(item.accessStatus)}>
                  {formatAccessStatus(item.accessStatus)}
                </StatusPill>
              </div>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
