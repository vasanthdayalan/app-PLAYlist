// Strips only combining marks in the Latin diacritics block so that
// Indic vowel signs (used in Tamil, Malayalam, etc.) are preserved.
const LATIN_DIACRITICS = /[\u0300-\u036f]/g;
const PUNCTUATION_AND_SYMBOLS = /[\p{P}\p{S}]/gu;

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(LATIN_DIACRITICS, '')
    .normalize('NFC')
    .replace(PUNCTUATION_AND_SYMBOLS, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
