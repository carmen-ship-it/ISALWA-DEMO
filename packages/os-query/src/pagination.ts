import type { PaginatedMeta, PartySummaryReadModel } from '@isalwa/os-contracts';

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
};

export function toPartySummary(model: PartySummaryReadModel): PartySummaryReadModel {
  return {
    partyId: model.partyId,
    organizationId: model.organizationId,
    partyKind: model.partyKind,
    displayName: model.displayName,
    legalName: model.legalName,
    status: model.status,
    activeRoleKeys: [...model.activeRoleKeys],
    hasCommercialAccount: model.hasCommercialAccount,
    commercialAccountStatus: model.commercialAccountStatus,
    mergedIntoPartyId: model.mergedIntoPartyId,
    duplicateStatus: model.duplicateStatus,
    searchText: model.searchText,
    ...(model.primaryPhone !== undefined ? { primaryPhone: model.primaryPhone } : {}),
    ...(model.commercialOwnerMemberId !== undefined
      ? { commercialOwnerMemberId: model.commercialOwnerMemberId }
      : {}),
    ...(model.hasCoordinates !== undefined ? { hasCoordinates: model.hasCoordinates } : {}),
    ...(model.locationProvenanceUrl !== undefined
      ? { locationProvenanceUrl: model.locationProvenanceUrl }
      : {}),
  };
}
