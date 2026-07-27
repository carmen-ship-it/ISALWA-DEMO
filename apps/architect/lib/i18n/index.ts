export { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";
export { LocaleProvider, useLocale, useTranslations } from "./context";
export { getMessages, translate, type TranslateParams } from "./translate";

import { DEFAULT_LOCALE } from "./config";
import { translate, type TranslateParams } from "./translate";

/**
 * Server-safe translation helper for server components / plain modules that
 * can't use the client `useTranslations()` hook. Architect has no per-request
 * locale negotiation yet, so this always resolves against `DEFAULT_LOCALE`
 * ("es") — the same value the client hook falls back to.
 */
export function t(key: string, params?: TranslateParams): string {
  return translate(DEFAULT_LOCALE, key, params);
}
