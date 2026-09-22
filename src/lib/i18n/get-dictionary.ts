import "server-only";
import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import mm from "./dictionaries/mm.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, mm };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
