import { OWNER_ABSENT_LABEL } from '@/lib/party/customer-self-service';
import {
  APPROVE_DOES_NOT_CREATE_ORDER,
  ASSIGN_OWNER_CHECKLIST,
  CARGO_IS_NOT_AUTHORITY,
  CONVERT_CREATES_ORDER,
  CONVERT_QUOTE_CHECKLIST,
  CREATE_CUSTOMER_MORE_MATCHES,
  CREATE_CUSTOMER_NO_MERGE,
  CREATE_CUSTOMER_REVIEW_MATCHES,
  CREATE_QUOTE_CHECKLIST,
  CREATE_QUOTE_CONSEQUENCE,
  REASSIGN_OWNER_CHECKLIST,
  REASSIGN_OWNER_CONSEQUENCE,
  SEARCH_CUSTOMER_CHECKLIST,
  SEARCH_CUSTOMER_MIN_LENGTH,
  SEND_QUOTE_CHECKLIST,
  SEND_QUOTE_DOES_NOT_GRANT_APPROVAL,
  SEND_QUOTE_NEEDS_LINES,
  STANDING_RULES,
} from './catalog';
import { reportedPaymentGuidance } from './reported-payment';
import type { GuidanceNoteModel } from './model';

export type CreateCustomerSituation = {
  matchCount: number;
  hasMoreMatches: boolean;
};

export type SearchCustomerSituation = {
  queryLength: number;
};

export type SendQuoteSituation = {
  lineCount: number;
};

export type ConvertQuoteSituation = {
  /** CreateOrder accepts only a submitted quote. Default matches the form mount condition. */
  quoteStatus?: string;
};

export type ReassignOwnerSituation = {
  currentOwnerLabel: string;
};

export type GuidanceSection = {
  id: string;
  title: string;
  notes: readonly GuidanceNoteModel[];
};

export function guidanceForSearchCustomer(situation: SearchCustomerSituation): readonly GuidanceNoteModel[] {
  if (situation.queryLength >= 2) {
    return [SEARCH_CUSTOMER_CHECKLIST];
  }
  if (situation.queryLength === 1) {
    return [SEARCH_CUSTOMER_CHECKLIST, SEARCH_CUSTOMER_MIN_LENGTH];
  }
  return [SEARCH_CUSTOMER_CHECKLIST];
}

export function guidanceForCreateCustomer(situation: CreateCustomerSituation): readonly GuidanceNoteModel[] {
  if (situation.hasMoreMatches) {
    return [CREATE_CUSTOMER_MORE_MATCHES];
  }
  if (situation.matchCount > 0) {
    return [SEARCH_CUSTOMER_CHECKLIST, CREATE_CUSTOMER_REVIEW_MATCHES, CREATE_CUSTOMER_NO_MERGE];
  }
  return [SEARCH_CUSTOMER_CHECKLIST, CREATE_CUSTOMER_NO_MERGE];
}

export function guidanceForCreateQuote(): readonly GuidanceNoteModel[] {
  return [CREATE_QUOTE_CHECKLIST, CREATE_QUOTE_CONSEQUENCE, APPROVE_DOES_NOT_CREATE_ORDER, CONVERT_CREATES_ORDER];
}

export function guidanceForSendQuote(situation: SendQuoteSituation): readonly GuidanceNoteModel[] {
  const checklist =
    situation.lineCount === 0
      ? [SEND_QUOTE_NEEDS_LINES, SEND_QUOTE_CHECKLIST]
      : [SEND_QUOTE_CHECKLIST];
  return [...checklist, SEND_QUOTE_DOES_NOT_GRANT_APPROVAL, APPROVE_DOES_NOT_CREATE_ORDER, CONVERT_CREATES_ORDER];
}

export function guidanceForConvertQuote(situation: ConvertQuoteSituation = {}): readonly GuidanceNoteModel[] {
  const status = situation.quoteStatus ?? 'submitted';
  if (status !== 'submitted') {
    return [CONVERT_CREATES_ORDER, APPROVE_DOES_NOT_CREATE_ORDER, CARGO_IS_NOT_AUTHORITY];
  }
  return [
    CONVERT_QUOTE_CHECKLIST,
    CONVERT_CREATES_ORDER,
    APPROVE_DOES_NOT_CREATE_ORDER,
    CARGO_IS_NOT_AUTHORITY,
  ];
}

export function guidanceForReassignOwner(situation: ReassignOwnerSituation): readonly GuidanceNoteModel[] {
  const checklist =
    situation.currentOwnerLabel === OWNER_ABSENT_LABEL ? ASSIGN_OWNER_CHECKLIST : REASSIGN_OWNER_CHECKLIST;
  return [checklist, REASSIGN_OWNER_CONSEQUENCE, CARGO_IS_NOT_AUTHORITY];
}

/** Help page. Not a workflow state. No Mapa destination. */
export function ayudaSections(): readonly GuidanceSection[] {
  return [
    {
      id: 'before-create-customer',
      title: 'Antes de crear cliente',
      notes: guidanceForCreateCustomer({ matchCount: 0, hasMoreMatches: false }),
    },
    {
      id: 'before-create-quote',
      title: 'Antes de crear cotización',
      notes: guidanceForCreateQuote(),
    },
    {
      id: 'before-send-quote',
      title: 'Antes de enviar cotización',
      notes: guidanceForSendQuote({ lineCount: 1 }),
    },
    {
      id: 'before-convert',
      title: 'Antes de convertir',
      notes: guidanceForConvertQuote({ quoteStatus: 'submitted' }),
    },
    {
      id: 'before-reported-payment',
      title: 'Antes de reportar un pago',
      notes: reportedPaymentGuidance,
    },
    {
      id: 'before-reassign-owner',
      title: 'Antes de cambiar responsable',
      notes: guidanceForReassignOwner({ currentOwnerLabel: 'Miembro asignado' }),
    },
    {
      id: 'standing-rules',
      title: 'Reglas',
      notes: STANDING_RULES,
    },
  ];
}
