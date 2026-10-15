import { useEffect, useState } from 'react';
import { api } from './auth';
import type { Category, Office, Ward } from './api-client';
import { categories as bundled } from './model';
type Reference = { categories: Category[]; wards: Ward[]; offices: Office[]; live: boolean };
// Bundled fallback keeps the report form usable offline; live data replaces it once loaded.
const fallback: Reference = {
  categories: bundled.map((c, i) => ({
    name: c.name,
    hindiName: c.name,
    scope: c.detail.startsWith('Roorkee') ? 'roorkee' : 'state',
    slaHours: 168,
    active: true,
    sort: i,
  })),
  wards: Array.from({ length: 40 }, (_, i) => ({
    id: `roorkee-${i + 1}`,
    district: 'haridwar',
    town: 'Roorkee',
    number: i + 1,
    name: `Ward ${i + 1}`,
    hindiName: `वार्ड ${i + 1}`,
    localities: [],
    verified: false,
    active: true,
  })),
  offices: [],
  live: false,
};
let cache: Reference = fallback;
let loading: Promise<Reference> | null = null;
let loadedAt = 0;
function load() {
  if (loading && Date.now() - loadedAt < 10 * 60000) return loading;
  loadedAt = Date.now();
  loading = Promise.all([
    api<{ categories: Category[] }>('/categories'),
    api<{ wards: Ward[] }>('/wards?town=Roorkee'),
    api<{ offices: Office[] }>('/offices'),
  ])
    .then(
      ([c, w, o]) => (cache = { categories: c.categories, wards: w.wards, offices: o.offices, live: true }),
    )
    .catch(() => {
      loading = null;
      return cache;
    });
  return loading;
}
/** Categories, Roorkee wards and offices from the server, with an offline fallback. */
export function useReferenceData() {
  const [data, setData] = useState(cache);
  useEffect(() => {
    let active = true;
    void load().then(value => {
      if (active) setData(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return data;
}
