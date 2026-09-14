import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { MemberSummaryReadModel } from '@isalwa/os-contracts';
import {
  accessStatusTone,
  formatAccessStatus,
  formatEmploymentStatus,
  formatRoleKeys,
  memberDisplayName,
  splitRoleKeys,
} from '@/lib/workforce/labels';
import { directoryMemberLabel } from '@/lib/workforce/member-labels';
import { memberHref } from '@/lib/workforce/navigation';

type MemberListProps = {
  items: MemberSummaryReadModel[];
  labelMap: Map<string, string>;
};

export function MemberList({ items, labelMap }: MemberListProps) {
  return (
    <div role="region" aria-label="Directorio del equipo">
      {items.map((item) => {
        const name = memberDisplayName(item.displayName, item.givenName, item.familyName);
        const { primary, additional } = splitRoleKeys(item.roleKeys);
        // Role is roleKeys only. Cargo is not authority and is not shown.
        const additionalLabel =
          additional.length > 0 ? `Permisos adicionales: ${additional.length}` : null;
        const meta = [
          formatEmploymentStatus(item.employmentStatus),
          formatAccessStatus(item.accessStatus),
          formatRoleKeys(primary),
          item.departmentName?.trim() || '—',
          `Responsable · ${directoryMemberLabel(labelMap, item.managerMemberId)}`,
        ].join(' · ');

        return (
          <OperatingRow
            key={item.memberId}
            href={memberHref(item.memberId)}
            subject={name}
            meta={meta}
            status={
              <>
                <StatusPill tone={accessStatusTone(item.accessStatus)}>
                  {formatAccessStatus(item.accessStatus)}
                </StatusPill>
                {additionalLabel ? <StatusPill tone="neutral">{additionalLabel}</StatusPill> : null}
              </>
            }
          />
        );
      })}
    </div>
  );
}
