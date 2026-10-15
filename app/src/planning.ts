export const ideaCategories = [
  'Public spaces',
  'Transport',
  'Digital services',
  'Environment',
  'Other',
] as const;
export type IdeaDraft = { category: string; title: string; description: string; district: string };
export type MeetingDraft = { subject: string; notes: string; district: string };
export type Idea = IdeaDraft & { id: string; createdAt: string; status: 'Saved locally' };
export type MeetingNote = MeetingDraft & { id: string; createdAt: string; status: 'Preparation only' };
export type PlanningData = {
  ideaDraft: IdeaDraft;
  meetingDraft: MeetingDraft;
  ideas: Idea[];
  meetings: MeetingNote[];
  bookmarks: string[];
  savedSchemes: string[];
};
export const emptyIdea = (): IdeaDraft => ({ category: '', title: '', description: '', district: '' });
export const emptyMeeting = (): MeetingDraft => ({ subject: '', notes: '', district: '' });
export const emptyPlanning = (): PlanningData => ({
  ideaDraft: emptyIdea(),
  meetingDraft: emptyMeeting(),
  ideas: [],
  meetings: [],
  bookmarks: [],
  savedSchemes: [],
});
export function validateIdea(d: IdeaDraft): string | null {
  if (!ideaCategories.some(c => c === d.category)) return 'Choose the area your idea would improve.';
  if (d.title.trim().length < 5 || d.title.length > 100) return 'Use a title between 5 and 100 characters.';
  if (d.description.trim().length < 20 || d.description.length > 2000)
    return 'Explain your idea in 20 to 2,000 characters.';
  if (!d.district.trim() || d.district.length > 100)
    return 'Add a district, using no more than 100 characters.';
  return null;
}
export function validateMeeting(d: MeetingDraft): string | null {
  if (d.subject.trim().length < 5 || d.subject.length > 100)
    return 'Use a meeting subject between 5 and 100 characters.';
  if (d.notes.trim().length < 20 || d.notes.length > 2000)
    return 'Add 20 to 2,000 characters of preparation notes.';
  if (!d.district.trim() || d.district.length > 100)
    return 'Add a district, using no more than 100 characters.';
  return null;
}
const localId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
export function createIdea(d: IdeaDraft): Idea {
  const error = validateIdea(d);
  if (error) throw new Error(error);
  return {
    category: d.category,
    title: d.title.trim(),
    description: d.description.trim(),
    district: d.district.trim(),
    id: localId('IDEA'),
    createdAt: new Date().toISOString(),
    status: 'Saved locally',
  };
}
export function createMeeting(d: MeetingDraft): MeetingNote {
  const error = validateMeeting(d);
  if (error) throw new Error(error);
  return {
    subject: d.subject.trim(),
    notes: d.notes.trim(),
    district: d.district.trim(),
    id: localId('NOTE'),
    createdAt: new Date().toISOString(),
    status: 'Preparation only',
  };
}
function strings(value: unknown, keys: string[]): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    keys.every(k => typeof (value as Record<string, unknown>)[k] === 'string')
  );
}
function identity(value: { id: string; createdAt: string }, prefix: string) {
  return value.id.startsWith(prefix) && Number.isFinite(Date.parse(value.createdAt));
}
export function parsePlanning(raw: string | null): PlanningData {
  if (raw === null) return emptyPlanning();
  const p = JSON.parse(raw) as PlanningData;
  if (
    !p ||
    !strings(p.ideaDraft, ['category', 'title', 'description', 'district']) ||
    !strings(p.meetingDraft, ['subject', 'notes', 'district']) ||
    !Array.isArray(p.ideas) ||
    !p.ideas.every(
      i =>
        strings(i, ['category', 'title', 'description', 'district', 'id', 'createdAt']) &&
        validateIdea(i) === null &&
        identity(i, 'IDEA-') &&
        i.status === 'Saved locally',
    ) ||
    !Array.isArray(p.meetings) ||
    !p.meetings.every(
      m =>
        strings(m, ['subject', 'notes', 'district', 'id', 'createdAt']) &&
        validateMeeting(m) === null &&
        identity(m, 'NOTE-') &&
        m.status === 'Preparation only',
    ) ||
    !Array.isArray(p.bookmarks) ||
    !p.bookmarks.every(id => typeof id === 'string')
  )
    throw new Error('Invalid planning data');
  if (
    p.savedSchemes !== undefined &&
    (!Array.isArray(p.savedSchemes) ||
      !p.savedSchemes.every(id => typeof id === 'string' && id.trim().length > 0))
  )
    throw new Error('Invalid saved schemes');
  // Older snapshots may carry staffNotes from the retired design preview; they are dropped.
  const { staffNotes: _retired, ...rest } = p as PlanningData & { staffNotes?: unknown };
  return { ...rest, savedSchemes: [...new Set(p.savedSchemes ?? [])] };
}
export function filterIdeas(ideas: Idea[], query: string, category: string): Idea[] {
  const q = query.trim().toLocaleLowerCase();
  return ideas.filter(
    i =>
      (category === 'All' || i.category === category) &&
      `${i.title} ${i.description} ${i.district}`.toLocaleLowerCase().includes(q),
  );
}
