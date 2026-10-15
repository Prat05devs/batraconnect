import { getScheme, type Scheme } from './content/schemes.ts';
export function toggleSavedScheme(saved: string[], id: string): string[] {
  if (!getScheme(id)) throw new Error('This scheme is unavailable.');
  return saved.includes(id) ? saved.filter(value => value !== id) : [...new Set([...saved, id])];
}
export function visibleSavedSchemes(available: Scheme[], saved: string[], savedOnly: boolean): Scheme[] {
  return savedOnly ? available.filter(scheme => saved.includes(scheme.id)) : available;
}
