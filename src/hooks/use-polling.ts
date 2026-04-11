'use client';

import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void, intervalMs: number = 3000) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
