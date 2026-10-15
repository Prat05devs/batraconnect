import { schemes } from './content/schemes.ts';
import { hindiSchemes } from './content/hindi-schemes.ts';
import { hindiUI } from './content/hindi-ui.ts';
import { hindiServices } from './content/hindi-services.ts';
import { serviceTasks } from './content/services.ts';
export type Language = 'en' | 'hi';
const dictionary: Record<string, string> = { ...hindiUI };
for (const task of serviceTasks) {
  const hindi = hindiServices[task.id];
  if (!hindi) continue;
  for (const field of ['title', 'summary', 'audience', 'note'] as const)
    dictionary[task[field]] = hindi[field];
  for (const field of ['documents', 'steps'] as const)
    task[field].forEach((text, index) => {
      dictionary[text] = hindi[field][index];
    });
}
for (const scheme of schemes) {
  const hindi = hindiSchemes[scheme.id];
  if (!hindi) continue;
  dictionary[scheme.name] = scheme.hindiName;
  for (const field of ['summary', 'benefit', 'howToApply'] as const) dictionary[scheme[field]] = hindi[field];
  if (scheme.documentsNote && hindi.documentsNote) dictionary[scheme.documentsNote] = hindi.documentsNote;
  for (const field of ['eligibility', 'documents'] as const)
    scheme[field].forEach((text, index) => {
      dictionary[text] = hindi[field][index];
    });
}
export function translate(text: string, language: Language): string {
  if (language === 'en') return text;
  if (Object.hasOwn(dictionary, text)) return dictionary[text];
  const trimmed = text.trim();
  if (Object.hasOwn(dictionary, trimmed)) return text.replace(trimmed, dictionary[trimmed]);
  if (text.includes('\n'))
    return text
      .split('\n')
      .map(part => translate(part, language))
      .join('\n');
  if (text.includes(' · '))
    return text
      .split(' · ')
      .map(part => translate(part, language))
      .join(' · ');
  const filter = text.match(/^Filter: (.+)$/);
  if (filter) return `फ़िल्टर: ${translate(filter[1], language)}`;
  const evidence = text.match(/^(Evidence photo|Report evidence|Remove photo) (\d+)$/);
  if (evidence) return `${translate(evidence[1], language)} ${evidence[2]}`;
  const progress = text.match(/^STEP (\d+) OF 5$/);
  if (progress) return `चरण ${progress[1]} / 5`;
  const category = text.match(/^Category: (.+)$/);
  if (category) return `श्रेणी: ${translate(category[1], language)}`;
  const count = text.match(/^(\d+) locally saved requests?$/);
  if (count) return `${count[1]} स्थानीय रूप से सहेजी रिपोर्ट`;
  const photos = text.match(/^(\d+) photos? attached$/);
  if (photos) return `${photos[1]} फोटो जोड़ी गई`;
  const reports = text.match(/^(\d+) local reports?$/);
  if (reports) return `${reports[1]} स्थानीय रिपोर्ट`;
  return text;
}
