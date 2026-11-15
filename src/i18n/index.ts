// All player-facing texts. Czech is the default; other languages are selected with ?lang=en.
// To add a language: copy en.ts, translate it and register it in LANGUAGES.
import { cs, type Texts } from "./cs";
import { en } from "./en";

export type { Texts };
export const LANGUAGES = { cs, en } satisfies Record<string, Texts>;
export type Lang = keyof typeof LANGUAGES;
export const DEFAULT_LANG: Lang = "cs";

function pickLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const requested = new URLSearchParams(window.location.search).get("lang");
  return requested && requested in LANGUAGES ? (requested as Lang) : DEFAULT_LANG;
}

/** Texts for the current language, chosen once on page load. */
export const t: Texts = LANGUAGES[pickLang()];

/** Decimal number in the current language, e.g. "2,5" / "2.5". */
export function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString(t.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
