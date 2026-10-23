'use client';
import { useEffect, useState } from 'react';
import { photoUrl } from './api';

/** Loads a private photo with the admin's sign-in and returns a temporary object URL (revoked on unmount). */
export function usePhoto(id: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let active = true;
    photoUrl(id)
      .then(u => {
        url = u;
        if (active) setSrc(u);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return src;
}
