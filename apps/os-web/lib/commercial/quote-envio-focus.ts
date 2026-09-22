/**
 * Phone-friendly jump to Envío: scroll the section into view, then open the
 * register-send dialog when the active CTA is present.
 */
export function focusQuoteEnvioRegister(options?: { openDialog?: boolean }): void {
  if (typeof document === 'undefined') return;
  const openDialog = options?.openDialog !== false;
  const section = document.getElementById('envio');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (!openDialog) return;
  window.setTimeout(() => {
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-quote-register-send="active"] button',
    );
    trigger?.click();
  }, 400);
}
