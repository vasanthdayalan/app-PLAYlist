export const LANGUAGES = [
  'Tamil',
  'English',
  'Malayalam',
  'Telugu',
  'Kannada',
  'Hindi',
  'Spanish',
  'Korean',
  'Others',
] as const;

export type LanguageName = (typeof LANGUAGES)[number];
