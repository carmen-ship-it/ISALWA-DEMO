/**
 * A submitted quote may offer the existing human follow-up command.
 * Showing the action does not create a WorkItem, an aging rule, or a quote subject.
 */
export function canRegisterQuoteFollowUp(status: string): boolean {
  return status === 'submitted';
}
