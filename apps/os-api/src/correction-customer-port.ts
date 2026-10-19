import type { RequestContext } from '@isalwa/os-contracts';
import type { CorrectionCustomerPort } from '@isalwa/os-issue';
import { loadCustomerAuthorityFacts, type OsPartyStore } from '@isalwa/os-party';

/** T03 L4: customer facts for correction requests, from the same loader os-party commands use. */
export function createCorrectionCustomerPort(partyStore: OsPartyStore): CorrectionCustomerPort {
  return {
    async customerFacts({ organizationId, partyId, memberId, asOf }) {
      const party = await partyStore.getPartyInOrg(organizationId, partyId);
      if (!party || party.organizationId !== organizationId) return null;
      const ctx = { organizationId, actorMemberId: memberId, effectiveAt: asOf } as RequestContext;
      return loadCustomerAuthorityFacts(partyStore, ctx, partyId);
    },
    async targetBelongsToParty({ organizationId, partyId, contactId, locationId }) {
      if (contactId) {
        const contact = await partyStore.getContactInOrg(organizationId, contactId);
        if (!contact || contact.organizationPartyId !== partyId) return false;
      }
      if (locationId) {
        const location = await partyStore.getLocationInOrg(organizationId, locationId);
        if (!location || location.partyId !== partyId) return false;
      }
      return true;
    },
  };
}
