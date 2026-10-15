export const categories = [
  {
    name: 'Road & Transport',
    icon: 'car-outline',
    detail: 'Roads, traffic and public transport',
    color: '#075BD8',
    tint: '#EAF2FF',
  },
  {
    name: 'IT & Public Services',
    icon: 'desktop-outline',
    detail: 'Government portals and digital services',
    color: '#087B62',
    tint: '#E9F7F1',
  },
  {
    name: 'Science & Technology',
    icon: 'flask-outline',
    detail: 'Research, innovation and facilities',
    color: '#6943B8',
    tint: '#F2EDFC',
  },
  {
    name: 'Biotechnology',
    icon: 'leaf-outline',
    detail: 'Biotechnology facilities and services',
    color: '#AA3F6B',
    tint: '#FCEEF4',
  },
  {
    name: 'Water supply',
    icon: 'water-outline',
    detail: 'Roorkee: no supply, leaks or dirty water',
    color: '#0B6E99',
    tint: '#E6F4FA',
  },
  {
    name: 'Drainage & sewerage',
    icon: 'git-merge-outline',
    detail: 'Roorkee: blocked drains, overflow or open manholes',
    color: '#7A5A12',
    tint: '#FBF3E2',
  },
  {
    name: 'Street lighting',
    icon: 'bulb-outline',
    detail: 'Roorkee: street lights not working',
    color: '#8A6100',
    tint: '#FFF6DB',
  },
  {
    name: 'Waste & sanitation',
    icon: 'trash-outline',
    detail: 'Roorkee: garbage collection and public cleanliness',
    color: '#2F6B2F',
    tint: '#EAF5EA',
  },
  {
    name: 'Other',
    icon: 'ellipsis-horizontal-outline',
    detail: 'Tell us about another issue',
    color: '#52617A',
    tint: '#EEF1F6',
  },
] as const;
export const districts = [
  { name: 'Almora', hi: 'अल्मोड़ा' },
  { name: 'Bageshwar', hi: 'बागेश्वर' },
  { name: 'Chamoli', hi: 'चमोली' },
  { name: 'Champawat', hi: 'चंपावत' },
  { name: 'Dehradun', hi: 'देहरादून' },
  { name: 'Haridwar', hi: 'हरिद्वार' },
  { name: 'Nainital', hi: 'नैनीताल' },
  { name: 'Pauri Garhwal', hi: 'पौड़ी गढ़वाल' },
  { name: 'Pithoragarh', hi: 'पिथौरागढ़' },
  { name: 'Rudraprayag', hi: 'रुद्रप्रयाग' },
  { name: 'Tehri Garhwal', hi: 'टिहरी गढ़वाल' },
  { name: 'Udham Singh Nagar', hi: 'ऊधम सिंह नगर' },
  { name: 'Uttarkashi', hi: 'उत्तरकाशी' },
] as const;
export type Draft = {
  category: string;
  title: string;
  description: string;
  photos: string[];
  district: string;
  locality: string;
  wardId?: string;
  latitude?: number;
  longitude?: number;
};
export type SentInfo = { id: string; reference: string; sentAt: string };
export type Report = Draft & { id: string; createdAt: string; status: 'Saved locally'; sent?: SentInfo };
export const emptyDraft = (): Draft => ({
  category: '',
  title: '',
  description: '',
  photos: [],
  district: '',
  locality: '',
});
export function validateStep(step: number, draft: Draft): string | null {
  if (step === 0 && !categories.some(c => c.name === draft.category))
    return 'Choose an issue category to continue.';
  if (step === 1 && draft.title.trim().length < 5) return 'Add a title with at least 5 characters.';
  if (step === 1 && draft.description.trim().length < 20)
    return 'Add at least 20 characters to help explain the problem.';
  if (step === 1 && draft.title.length > 100) return 'Keep the title within 100 characters.';
  if (step === 1 && draft.description.length > 1000) return 'Keep the description within 1,000 characters.';
  if (step === 2 && (draft.photos.length > 3 || draft.photos.some(uri => !uri.trim())))
    return 'Attach up to 3 photos with valid references.';
  if (step === 3 && !draft.district.trim()) return 'Enter the district where the issue is located.';
  if (step === 3 && draft.locality.trim().length < 3) return 'Add a locality or a nearby landmark.';
  if (step === 3 && draft.district.length > 80) return 'Keep the district within 80 characters.';
  if (step === 3 && draft.locality.length > 160) return 'Keep the locality within 160 characters.';
  if (step === 3 && (draft.latitude === undefined) !== (draft.longitude === undefined))
    return 'The saved GPS position is incomplete. Capture it again or remove it.';
  return null;
}
export function validateReport(draft: Draft): string | null {
  for (const step of [0, 1, 2, 3]) {
    const error = validateStep(step, draft);
    if (error) return error;
  }
  return null;
}
export function createReport(draft: Draft): Report {
  const error = validateReport(draft);
  if (error) throw new Error(error);
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    district: draft.district.trim(),
    locality: draft.locality.trim(),
    photos: [...draft.photos],
    id: `LOCAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'Saved locally',
  };
}
export function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  const optional = (key: string, type: string) =>
    d[key] === undefined || (typeof d[key] === type && (type !== 'number' || Number.isFinite(d[key])));
  return (
    ['category', 'title', 'description', 'district', 'locality'].every(key => typeof d[key] === 'string') &&
    Array.isArray(d.photos) &&
    d.photos.length <= 3 &&
    d.photos.every(uri => typeof uri === 'string') &&
    optional('wardId', 'string') &&
    optional('latitude', 'number') &&
    optional('longitude', 'number')
  );
}
export function isReport(value: unknown): value is Report {
  if (!isDraft(value) || validateReport(value) !== null) return false;
  const r = value as Draft & Record<string, unknown>;
  const sent = r.sent as SentInfo | undefined;
  return (
    typeof r.id === 'string' &&
    r.id.startsWith('LOCAL-') &&
    typeof r.createdAt === 'string' &&
    Number.isFinite(Date.parse(r.createdAt)) &&
    r.status === 'Saved locally' &&
    (sent === undefined ||
      (!!sent &&
        typeof sent.id === 'string' &&
        typeof sent.reference === 'string' &&
        Number.isFinite(Date.parse(sent.sentAt))))
  );
}
