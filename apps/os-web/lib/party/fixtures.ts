import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import type { PartyDetailResponse } from './types';

export const samplePartySummary: PartySummaryReadModel = {
  partyId: 'party-1',
  organizationId: 'org-1',
  partyKind: 'organization',
  displayName: 'Distribuidora La Paz S.R.L.',
  legalName: 'Distribuidora La Paz S.R.L.',
  status: 'active',
  activeRoleKeys: ['customer', 'supplier'],
  hasCommercialAccount: true,
  commercialAccountStatus: 'active',
  mergedIntoPartyId: null,
  duplicateStatus: 'none',
  searchText: 'distribuidora la paz',
};

export const duplicatePartySummary: PartySummaryReadModel = {
  ...samplePartySummary,
  partyId: 'party-dup',
  displayName: 'Comercial Andina',
  duplicateStatus: 'suggested',
};

export const samplePartyDetail: PartyDetailResponse = {
  party: {
    id: 'party-1',
    organizationId: 'org-1',
    partyKind: 'organization',
    displayName: 'Distribuidora La Paz S.R.L.',
    legalName: 'Distribuidora La Paz S.R.L.',
    status: 'active',
    mergedIntoPartyId: null,
    version: 1,
  },
  roles: [
    {
      id: 'role-1',
      organizationId: 'org-1',
      partyId: 'party-1',
      roleKey: 'customer',
      effectiveAt: '2020-01-01T00:00:00.000Z',
      endedAt: null,
    },
    {
      id: 'role-2',
      organizationId: 'org-1',
      partyId: 'party-1',
      roleKey: 'supplier',
      effectiveAt: '2021-06-01T00:00:00.000Z',
      endedAt: null,
    },
  ],
  contacts: [
    {
      id: 'contact-1',
      organizationId: 'org-1',
      organizationPartyId: 'party-1',
      personPartyId: null,
      givenName: 'María',
      familyName: 'Fernández',
      email: 'maria@distlapaz.bo',
      phone: '+59170011223',
      whatsapp: null,
      title: 'Compras',
      status: 'active',
      version: 0,
    },
  ],
  commercialAccount: {
    id: 'ca-1',
    organizationId: 'org-1',
    partyId: 'party-1',
    territoryId: null,
    ownerMemberId: null,
    status: 'active',
    version: 0,
  },
};

export const mergedPartyDetail: PartyDetailResponse = {
  ...samplePartyDetail,
  party: {
    ...samplePartyDetail.party,
    id: 'party-merged',
    status: 'merged',
    mergedIntoPartyId: 'party-1',
  },
  roles: [],
  contacts: [],
  commercialAccount: null,
};
