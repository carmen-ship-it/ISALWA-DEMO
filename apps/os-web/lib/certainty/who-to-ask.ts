/**
 * Who-to-ask model — canonical RESPONSABLE only.
 * Never infer a person from Cargo/title.
 */

export const WHO_TO_ASK_COPY = {
  kicker: 'RESPONSABLE',
  absent: 'Aún no hay una persona responsable asignada.',
  assign: 'Asignar responsable',
  requestUpdate: 'Solicitar actualización',
} as const;

export type CanonicalResponsible = {
  memberId: string;
  displayName: string;
  /** Team / area label already assigned in canonical data — never a Cargo inference. */
  teamLabel: string | null;
};

export type WhoToAskInput = {
  responsible: CanonicalResponsible | null;
  /** Gate: only authorized actors see Asignar responsable. */
  canAssignResponsible?: boolean;
  /** Optional request-update when a responsible already exists. */
  canRequestUpdate?: boolean;
};

export type WhoToAskView =
  | {
      kind: 'assigned';
      kicker: typeof WHO_TO_ASK_COPY.kicker;
      name: string;
      teamLabel: string | null;
      memberId: string;
      requestUpdateLabel: typeof WHO_TO_ASK_COPY.requestUpdate | null;
    }
  | {
      kind: 'absent';
      message: typeof WHO_TO_ASK_COPY.absent;
      assignLabel: typeof WHO_TO_ASK_COPY.assign | null;
    };

export function whoToAskView(input: WhoToAskInput): WhoToAskView {
  const responsible = input.responsible;
  if (
    responsible &&
    responsible.memberId.trim() &&
    responsible.displayName.trim()
  ) {
    return {
      kind: 'assigned',
      kicker: WHO_TO_ASK_COPY.kicker,
      name: responsible.displayName.trim(),
      teamLabel: responsible.teamLabel?.trim() || null,
      memberId: responsible.memberId.trim(),
      requestUpdateLabel: input.canRequestUpdate ? WHO_TO_ASK_COPY.requestUpdate : null,
    };
  }

  return {
    kind: 'absent',
    message: WHO_TO_ASK_COPY.absent,
    assignLabel: input.canAssignResponsible ? WHO_TO_ASK_COPY.assign : null,
  };
}
