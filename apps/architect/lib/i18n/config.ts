export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Spanish is the default and only locale rendered to Architect clients today. */
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
