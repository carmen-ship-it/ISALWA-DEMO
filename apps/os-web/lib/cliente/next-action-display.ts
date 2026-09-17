import type { Cliente360Composition } from '@/lib/party/next-action';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';

export type DisplayedCliente360NextAction = {
  text: string;
  isRegisteredAction: boolean;
  href: string | null;
  hrefLabel: string | null;
  dueText: string | null;
  overdue: boolean;
  workItemId: string | null;
};

export function displayCliente360NextAction(
  nextAction: Cliente360Composition['nextAction'],
): DisplayedCliente360NextAction {
  if (nextAction.kind === 'insufficient' || nextAction.kind === 'unreadable') {
    return {
      text: CLIENTE360_UX_COPY.noNextAction,
      isRegisteredAction: false,
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
    href: nextAction.href,
    hrefLabel: nextAction.hrefLabel,
    dueText: nextAction.dueText,
    overdue: nextAction.overdue,
    workItemId: nextAction.workItemId,
  };
}
