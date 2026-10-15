import type { Report } from './model';
const normalise = (text: string) => text.normalize('NFKC').trim().toLocaleLowerCase();
/** Search, district/category filter and date order for reports saved on this phone (My requests). */
export function filterReports(
  reports: Report[],
  query = '',
  district = '',
  category = '',
  order: 'newest' | 'oldest' = 'newest',
) {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  return reports
    .filter(
      report =>
        (!district || normalise(report.district) === normalise(district)) &&
        (!category || report.category === category) &&
        terms.every(term =>
          normalise(
            [
              report.title,
              report.description,
              report.district,
              report.locality,
              report.id,
              report.category,
            ].join(' '),
          ).includes(term),
        ),
    )
    .sort((a, b) =>
      order === 'newest'
        ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
        : Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
}
