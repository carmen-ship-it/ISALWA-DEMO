/**
 * Proposal only. These records do not register a capability and must not be
 * granted by people.admin, system.admin, cargo, or title.
 * No scope string is assigned in this pass.
 */

export const GOVERNANCE_PROPOSALS = [
  {
    id: 'CROSS_LANE_CHANGE_REQUEST — QUOTE_CREATE_SEND_ACCEPT',
    businessAction: 'Create, send, and accept a quote as three explicit commercial write actions.',
    existingScopesConsidered: [
      'commercial.team.read',
      'commercial.org.read',
      'commercial.exception.authorize',
      'people.admin',
      'system.admin',
    ],
    whyNoneFits:
      'Read scopes do not authorize a commercial write. commercial.exception.authorize is an explicit exception, not quote creation, sending, or acceptance.',
    narrowestAuthority:
      'A write authority, not yet named, that covers only quote create, quote send, and quote accept, still bound to the session organization and the owned commercial record.',
    v1Functions: ['Asesor Comercial', 'Jefe Comercial'],
    direction: 'write',
    resourceBoundary: 'The quote and its commercial account in the session organization. Not every order and not the company operating stores.',
    whyAdminOrReadIsInsufficient:
      'people.admin and system.admin are identity/admin authorities. commercial.team.read is a read. None of them is a license to create, send, or accept a quote.',
    implemented: false,
    proposedScopeString: null,
  },
  {
    id: 'CROSS_LANE_CHANGE_REQUEST — VISIT_WRITE_AUTHORITY',
    businessAction: 'Check in a visit as an explicit field or customer-visit write.',
    existingScopesConsidered: [
      'commercial.team.read',
      'operations.coordinator.record',
      'people.admin',
      'system.admin',
    ],
    whyNoneFits:
      'A visit check-in is not a commercial read and not a coordination decision. operations.coordinator.record does not name a visit.',
    narrowestAuthority:
      'A write authority, not yet named, that records a visit check-in for a customer or location already in the session organization.',
    v1Functions: ['Asesor Comercial'],
    direction: 'write',
    resourceBoundary: 'The visit and the related party or location in the session organization. Not location master-data administration.',
    whyAdminOrReadIsInsufficient:
      'people.admin can manage people, not a customer visit. A read scope does not check anyone in.',
    implemented: false,
    proposedScopeString: null,
  },
  {
    id: 'CROSS_LANE_CHANGE_REQUEST — LOCATION_DETAIL_READ',
    businessAction: 'Read one location by id.',
    existingScopesConsidered: [
      'commercial.team.read',
      'management.org.read',
      'people.admin',
      'system.admin',
    ],
    whyNoneFits:
      'No existing contract names a location-detail read. Tenant membership proves organization, not a location read capability. management.org.read is the company operating gate, not a location card.',
    narrowestAuthority:
      'A read authority, not yet named, that returns one location in the session organization and returns nothing for a foreign id.',
    v1Functions: ['Asesor Comercial', 'Encargado de Almacén', 'Auxiliar Administrativa / Coordinación'],
    direction: 'read',
    resourceBoundary: 'One location in the session organization. GET /locations/:locationId stays authorization-unproven until this exists.',
    whyAdminOrReadIsInsufficient:
      'people.admin and system.admin are not a location read. commercial.team.read does not name location detail. Authenticating a member is not that capability.',
    implemented: false,
    proposedScopeString: null,
  },
  {
    id: 'CROSS_LANE_CHANGE_REQUEST — COORDINATION_READ_AUTHORITY',
    businessAction: 'Read open and resolved coordination decisions, including owner, stored due date, linked case, and recorded history.',
    existingScopesConsidered: [
      'coordination.decision.record',
      'operations.coordinator.record',
      'management.org.read',
      'people.admin',
      'system.admin',
    ],
    whyNoneFits:
      'coordination.decision.record is a write. operations.coordinator.record is not an established read. management.org.read gates the company board, not a decision history reader.',
    narrowestAuthority:
      'A read authority, not yet named, that lists coordination decisions already persisted for the session organization and does not record a new decision.',
    v1Functions: ['Auxiliar Administrativa / Coordinación', 'Gerente General'],
    direction: 'read',
    resourceBoundary: 'OsCoordinationDecision rows in the session organization. Foreign decisions return no evidence.',
    whyAdminOrReadIsInsufficient:
      'people.admin and system.admin do not read coordination history. The record capability does not imply the read. The persistent reader stays closed until this authority is approved.',
    implemented: false,
    proposedScopeString: null,
  },
] as const;

export type GovernanceProposal = (typeof GOVERNANCE_PROPOSALS)[number];
