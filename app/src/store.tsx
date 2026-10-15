import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import { secureStorage } from './secure-storage';
import { emptyDraft, type Draft, type Report, type SentInfo } from './model';
import { createReportOperations, emptyReports, parseReports, type ReportSnapshot } from './report-storage';
const KEY = 'batra-connect:demo:v1';
type Snapshot = ReportSnapshot;
type State = Snapshot & {
  ready: boolean;
  error: string | null;
  updateDraft: (patch: Partial<Draft>) => void;
  saveReport: () => Promise<Report>;
  clear: () => Promise<void>;
  clearDraft: () => Promise<void>;
  markSent: (localId: string, sent: SentInfo) => Promise<void>;
};
const Context = createContext<State | null>(null);
export function StoreProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState<Snapshot>(emptyReports);
  const ref = useRef(data);
  const operations = useRef<ReturnType<typeof createReportOperations> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    secureStorage
      .getItem(KEY)
      .then(raw => {
        if (!active || !raw) return;
        const value = parseReports(raw);
        ref.current = value;
        setData(value);
      })
      .catch(() => {
        if (active) setError('Saved demo data could not be loaded. Restart or clear local data in Profile.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function getOperations() {
    if (!operations.current)
      operations.current = createReportOperations(
        () => ref.current,
        next => {
          ref.current = next;
          setData(next);
        },
        next => secureStorage.setItem(KEY, JSON.stringify(next)),
        () => secureStorage.removeItem(KEY),
        async () => {
          if (Platform.OS !== 'web') {
            const dir = new Directory(Paths.document, 'report-evidence');
            if (dir.exists) dir.delete();
          }
        },
      );
    return operations.current;
  }
  const updateDraft = (patch: Partial<Draft>) => {
    getOperations()
      .updateDraft(patch)
      .then(() => setError(null))
      .catch(() =>
        setError(
          'Draft could not be saved on this device. Keep the app open and try again after saving or clearing finishes.',
        ),
      );
  };
  const saveReport = async () => {
    const report = await getOperations().saveReport();
    setError(null);
    return report;
  };
  const clearDraft = async () => {
    await getOperations().updateDraft(emptyDraft());
  };
  const clear = async () => {
    const cleanupFailed = await getOperations().clear();
    setError(
      cleanupFailed ? 'Reports cleared, but photo cleanup failed. Clear local data again to retry.' : null,
    );
  };
  const markSent = (localId: string, sent: SentInfo) => getOperations().markSent(localId, sent);
  return (
    <Context.Provider value={{ ...data, ready, error, updateDraft, saveReport, clear, clearDraft, markSent }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider missing');
  return value;
}
