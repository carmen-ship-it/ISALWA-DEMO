import { DEFAULT_LOCALE, type Locale } from "./config";
import { en } from "./messages/en";
import { es } from "./messages/es";

/** Arbitrarily-nested string dictionary — leaves are message templates. */
export type MessageTree = { [key: string]: string | MessageTree };

const DICTIONARIES: Record<Locale, MessageTree> = { es, en };

export type TranslateParams = Record<string, string | number>;

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolve a dot-path translation key against a locale's message tree.
 * Falls back to the default locale, then to the key itself so a missing
 * translation is visibly wrong (never a crash) during development.
 */
export function translate(locale: Locale, key: string, params?: TranslateParams): string {
  const primary = lookup(DICTIONARIES[locale], key);
  if (primary !== undefined) return interpolate(primary, params);

  if (locale !== DEFAULT_LOCALE) {
    const fallback = lookup(DICTIONARIES[DEFAULT_LOCALE], key);
    if (fallback !== undefined) return interpolate(fallback, params);
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[i18n] Missing translation key "${key}" for locale "${locale}"`);
  }
  return key;
}

export function getMessages(locale: Locale): MessageTree {
  return DICTIONARIES[locale];
}
