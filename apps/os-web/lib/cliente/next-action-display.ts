import type { Cliente360Composition } from '@/lib/party/next-action';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';

export type DisplayedCliente360NextAction = {
  text: string;
  isRegisteredAction: boolean;
  /** Failed read of follow-up — never shown as "no next step". */
  isUnavailable: boolean;
  href: string | null;
  hrefLabel: string | null;
  dueText: string | null;
  overdue: boolean;
  workItemId: string | null;
};

export function displayCliente360NextAction(
  nextAction: Cliente360Composition['nextAction'],
): DisplayedCliente360NextAction {
  if (nextAction.kind === 'unreadable') {
    return {
      text: CLIENTE360_UX_COPY.nextActionUnavailable,
      isRegisteredAction: false,
      isUnavailable: true,
      href: null,
      hrefLabel: null,
      dueText: null,
      overdue: false,
      workItemId: null,
    };
  }

  if (nextAction.kind === 'insufficient') {
    return {
      text: CLIENTE360_UX_COPY.noNextAction,
      isRegisteredAction: false,
      isUnavailable: false,
      href: null,
      hrefLabel: null,
      dueText: null,
      overdue: false,
      workItemId: null,
    };
  }

  return {
    text: nextAction.statement,
    isRegisteredAction: true,
    isUnavailable: false,
    href: nextAction.href,
    hrefLabel: nextAction.hrefLabel,
    dueText: nextAction.dueText,
    overdue: nextAction.overdue,
    workItemId: nextAction.workItemId,
  };
}
