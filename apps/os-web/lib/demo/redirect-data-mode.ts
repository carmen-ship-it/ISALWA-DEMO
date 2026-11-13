/**
 * Import path kept only for importers outside lane B. The data-mode switch is
 * retired, so post-create redirects never carry a mode from the form, Referer
 * or a stored cookie. The integrator removes the call sites and deletes this file.
 */
export async function redirectKeepingDataMode(href: string, _formData?: FormData): Promise<string> {
  return href;
}
