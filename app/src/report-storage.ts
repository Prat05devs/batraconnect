import {
  createReport,
  emptyDraft,
  isDraft,
  isReport,
  type Draft,
  type Report,
  type SentInfo,
} from './model.ts';
export type ReportSnapshot = { draft: Draft; reports: Report[] };
export const emptyReports = (): ReportSnapshot => ({ draft: emptyDraft(), reports: [] });
export function parseReports(raw: string | null): ReportSnapshot {
  if (!raw) return emptyReports();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid saved reports');
  const snapshot = value as Record<string, unknown>;
  if (!isDraft(snapshot.draft) || !Array.isArray(snapshot.reports) || !snapshot.reports.every(isReport))
    throw new Error('Invalid saved reports');
  return { draft: snapshot.draft, reports: snapshot.reports };
}

/** The adapter is used by the report provider and accepts testable storage operations. */
export function createReportOperations(
  read: () => ReportSnapshot,
  commit: (next: ReportSnapshot) => void,
  persist: (next: ReportSnapshot) => Promise<void>,
  remove: () => Promise<void>,
  cleanup: () => Promise<void>,
) {
  let pending = Promise.resolve();
  let saving: Promise<Report> | null = null;
  let clearing: Promise<boolean> | null = null;
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const job = pending.catch(() => {}).then(operation);
    pending = job.then(() => {});
    // Observe rejection even when a later operation has not yet attached a handler.
    pending.catch(() => {});
    return job;
  }
  return {
    updateDraft(patch: Partial<Draft>): Promise<void> {
      if (saving || clearing) return Promise.reject(new Error('Wait for saving or clearing to finish.'));
      const current = read();
      const next = {
        ...current,
        draft: { ...current.draft, ...patch, photos: [...(patch.photos ?? current.draft.photos)] },
      };
      commit(next); // Keep typing responsive; a failed write retains the in-memory draft.
      return enqueue(() => persist(next));
    },
    saveReport(): Promise<Report> {
      if (clearing) return Promise.reject(new Error('Wait for clearing to finish.'));
      if (saving) return saving;
      saving = enqueue(async () => {
        const current = read();
        const report = createReport(current.draft);
        const next = { draft: emptyDraft(), reports: [report, ...current.reports] };
        await persist(next);
        commit(next);
        return report;
      }).finally(() => {
        saving = null;
      });
      return saving;
    },
    /** Records the server receipt on a local report so lists can separate sent and device-only reports. */
    markSent(localId: string, sent: SentInfo): Promise<void> {
      return enqueue(async () => {
        const current = read();
        if (!current.reports.some(r => r.id === localId)) return;
        const next = {
          ...current,
          reports: current.reports.map(r => (r.id === localId ? { ...r, sent } : r)),
        };
        await persist(next);
        commit(next);
      });
    },
    clear(): Promise<boolean> {
      if (clearing) return clearing;
      clearing = enqueue(async () => {
        await remove();
        commit(emptyReports());
        try {
          await cleanup();
          return false;
        } catch {
          return true;
        }
      }).finally(() => {
        clearing = null;
      });
      return clearing;
    },
  };
}
