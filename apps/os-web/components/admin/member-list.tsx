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
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Directorio del equipo">
      {items.map((item) => {
        const name = memberDisplayName(item.displayName, item.givenName, item.familyName);
        return (
          <ListRow key={item.memberId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-4 md:px-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={memberHref(item.memberId)}
                    className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {name}
                  </Link>
                  {item.email ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.email}</p>
                  ) : null}
                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-[var(--isalwa-slate)]">Estado</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {formatEmploymentStatus(item.employmentStatus)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--isalwa-slate)]">Rol</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatRoleKeys(item.roleKeys)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--isalwa-slate)]">Departamento</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">{item.departmentName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--isalwa-slate)]">Responsable</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {directoryMemberLabel(labelMap, item.managerMemberId)}
                      </dd>
                    </div>
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
