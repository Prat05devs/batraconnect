import type { Language } from './translations.ts';
export const languageKey = 'batra-connect:language:v1';
export function createLanguagePreference(
  storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<unknown>;
  },
  onChange: (language: Language) => void,
  onError: (failed: boolean) => void,
) {
  let active = true;
  let changed = false;
  let writes = Promise.resolve();
  return {
    async hydrate() {
      try {
        const value = await storage.getItem(languageKey);
        if (active && !changed && (value === 'en' || value === 'hi')) onChange(value);
      } catch {
        if (active) onError(true);
      }
    },
    select(language: Language) {
      if (!active) return writes;
      changed = true;
      onChange(language);
      writes = writes
        .then(() => storage.setItem(languageKey, language))
        .then(() => {
          if (active) onError(false);
        })
        .catch(() => {
          if (active) onError(true);
        });
      return writes;
    },
    dispose() {
      active = false;
    },
  };
}
