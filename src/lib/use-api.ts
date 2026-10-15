'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

type Result<T> = { key: string; data: T | null; error: unknown };
/**
 * Loads `path` from the API. Changing `path` loads the new data (showing `loading` until it arrives);
 * `reload()` refreshes quietly in the background, keeping the current data on screen.
 */
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<Result<T>>({ key: '', data: null, error: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path)
      .then(data => {
        if (active) setResult({ key: path, data, error: null });
      })
      .catch(error => {
        if (active) setResult(r => ({ key: path, data: r.key === path ? r.data : null, error }));
      });
    return () => {
      active = false;
    };
  }, [path, nonce]);
  const current = result.key === path;
  const setData = useCallback((data: T) => setResult({ key: path ?? '', data, error: null }), [path]);
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !!path && !current,
    reload: () => setNonce(n => n + 1),
    setData,
  };
}
