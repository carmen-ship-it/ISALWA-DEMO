/**
 * Department role homes need their own read capability. That string does not
 * exist. This package does not invent it. management.org.read stays the company gate.
 */

export const CROSS_LANE_CHANGE_REQUESTS = [
  {
    kind: 'CROSS_LANE_CHANGE_REQUEST' as const,
    id: 'department-operating-read-capabilities',
    blocker: 'CROSS_LANE_COLLISION' as const,
    homes: ['Producción', 'Almacén', 'Compras'] as const,
    existingCompanyGate: 'management.org.read' as const,
    doNotInventCapabilityString: true,
    detail:
      'Producción, Almacén, and Compras role homes cannot use purchasing, production, or warehouse write scopes as reads. commercial.team.read does not unlock these company stores. No department-specific read capability exists. Do not invent the string. management.org.read may gate the company reader because it already exists.',
    notAccepted: [
      'commercial.team.read',
      'people.admin',
      'purchasing.operational.record',
      'production.entry.member',
      'production.review.member',
      'production.operational.record',
      'warehouse.finished_goods.receive',
      'warehouse.finished_goods.allocate',
    ] as const,
    homesBlocked: [
      {
        home: 'Compras' as const,
        needed: 'a department-specific purchase read capability that already exists',
        notAccepted: ['purchasing.operational.record', 'commercial.team.read', 'people.admin'] as const,
      },
      {
        home: 'Producción' as const,
        needed: 'a department-specific production read capability that already exists',
        notAccepted: [
          'production.entry.member',
          'production.review.member',
          'production.operational.record',
          'commercial.team.read',
        ] as const,
      },
      {
        home: 'Almacén' as const,
        needed:
          'a department-specific finished-goods and allocation read capability that already exists',
        notAccepted: [
          'warehouse.finished_goods.receive',
          'warehouse.finished_goods.allocate',
          'commercial.team.read',
        ] as const,
        finishedGoodsReceiptStillUnproven:
          'Even after a read capability exists, finished-goods handoff stays UNPROVEN until a FinishedGoodsReceipt model exists. This package does not add that model or a migration.',
      },
    ],
  },
] as const;

export type CrossLaneChangeRequest = (typeof CROSS_LANE_CHANGE_REQUESTS)[number];
