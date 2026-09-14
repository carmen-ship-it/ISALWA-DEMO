/** Operator Spanish. Factual labels only. No deadline, no reassignment. */

export const ESCALATION_COPY = {
  panelLabel: 'Orientación',
  panelTitle: 'Impacto',
  blockedBy: 'Bloqueado por',
  mayAffect: 'Puede afectar',
  relatedPeople: 'Personas relacionadas',
  whoToTalkTo: 'A quién acudir',
  stages: {
    suggested: 'Atención sugerida',
    overdue: 'Vencido',
    needsAttention: 'Requiere atención',
    recorded: 'Escalado',
  },
  blockers: {
    pendingApproval: 'Aprobación pendiente',
    overdueWork: 'Trabajo vencido',
  },
  blockerDetail: {
    quoteApproval: 'La solicitud sigue pendiente. No crea un pedido.',
    orderApproval: 'La solicitud sigue pendiente. No cambia el pedido.',
    workApproval: 'La solicitud sigue pendiente. No completa el trabajo.',
    otherApproval: 'La solicitud sigue pendiente.',
    overdueStored: 'La atención ya está registrada como vencida.',
    overdueDuePrefix: 'Venció',
  },
  impact: {
    orderCreation: 'Creación del pedido',
    customerReply: 'Respuesta al cliente',
  },
  roles: {
    owner: 'Responsable actual',
    approver: 'Aprobador actual',
    requester: 'Quien solicitó',
    creator: 'Quien registró',
    attention: 'En su atención',
    manager: 'Jefe registrado',
    executive: 'Persona indicada',
  },
  contactRole: {
    approver: 'aprobador actual',
    owner: 'responsable actual',
  },
  rungs: {
    holder: 'Quien tiene la acción',
    manager: 'Jefe registrado',
    executive: 'Persona ejecutiva indicada',
  },
  holderMissing: 'No hay una persona registrada para esta acción.',
  managerWithheld:
    'No corresponde ahora. Solo se informa a un jefe si hay una política aprobada y un jefe registrado.',
  executiveWithheld:
    'No corresponde ahora. Solo se informa a una persona ejecutiva si la política aprobada marca el caso como prolongado y nombra a alguien.',
  informOnly: 'Puede informarle. No cambia el responsable ni el aprobador.',
  recordedDetail: 'Hay un hecho de escalación registrado. El responsable y el aprobador no cambian.',
  inactiveAccess:
    'El acceso de esa persona no figura como activo. Esta orientación no cambia al responsable ni al aprobador.',
  awareness:
    'Esto informa. No reasigna el trabajo, no cambia al aprobador y no transfiere la cuenta.',
  unknownMember: 'Miembro del equipo',
} as const;
