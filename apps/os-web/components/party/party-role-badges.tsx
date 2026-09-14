import { StatusPill } from '@isalwa/ui';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import {
  formatCommercialAccountStatus,
  formatDuplicateStatus,
  formatPartyRole,
  formatPartyStatus,
  partyStatusTone,
} from '@/lib/party/labels';

type PartyRoleBadgesProps = {
  roleKeys: string[];
  size?: 'sm' | 'md';
};

export function PartyRoleBadges({ roleKeys, size = 'md' }: PartyRoleBadgesProps) {
  const unique = [...new Set(roleKeys.map((roleKey) => formatPartyRole(roleKey)))];
  if (unique.length === 0) {
    return (
      <StatusPill tone="neutral" className={size === 'sm' ? 'text-[10px]' : undefined}>
        Sin relación
      </StatusPill>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Relaciones comerciales">
      {unique.map((label) => (
        <StatusPill key={label} tone="info" className={size === 'sm' ? 'text-[10px]' : undefined}>
          {label}
        </StatusPill>
      ))}
    </div>
  );
}

type PartyStatusBadgeProps = {
  status: string;
  duplicateStatus?: PartySummaryReadModel['duplicateStatus'];
};

export function PartyStatusBadge({ status, duplicateStatus }: PartyStatusBadgeProps) {
  const duplicate = formatDuplicateStatus(duplicateStatus ?? null);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPill tone={partyStatusTone(status)}>{formatPartyStatus(status)}</StatusPill>
      {duplicate ? <StatusPill tone="warning">{duplicate}</StatusPill> : null}
    </div>
  );
}

type CommercialBadgeProps = {
  hasCommercialAccount: boolean;
  commercialAccountStatus: string | null;
};

export function CommercialBadge({ hasCommercialAccount, commercialAccountStatus }: CommercialBadgeProps) {
  if (!hasCommercialAccount) return null;
  const label = formatCommercialAccountStatus(commercialAccountStatus) ?? 'Cuenta comercial';
  return <StatusPill tone="neutral">{label}</StatusPill>;
}
