'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient();

type EventType = 'INSERT' | 'UPDATE' | 'DELETE';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeCallback = (payload: any) => void;

interface Listener {
  table: string;
  event: EventType;
  callback: RealtimeCallback;
  filter?: string;
}

let channel: RealtimeChannel | null = null;
let listeners: Listener[] = [];

function rebuildChannel() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  if (listeners.length === 0) return;

  const seen = new Set<string>();
  let ch = supabase.channel('famitask_realtime');

  for (const l of listeners) {
    const key = `${l.table}:${l.event}:${l.filter ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = { event: l.event, schema: 'public', table: l.table };
    if (l.filter) config.filter = l.filter;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ch = ch.on('postgres_changes', config, (payload: any) => {
      // Fan out to all matching listeners
      for (const listener of listeners) {
        if (listener.table === l.table && listener.event === l.event && listener.filter === l.filter) {
          listener.callback(payload);
        }
      }
    });
  }

  channel = ch;
  ch.subscribe();
}

function addListener(listener: Listener) {
  const needsRebuild = !listeners.some(
    l => l.table === listener.table && l.event === listener.event && l.filter === listener.filter
  );
  listeners.push(listener);
  if (needsRebuild) {
    rebuildChannel();
  }
}

function removeListener(listener: Listener) {
  listeners = listeners.filter(l => l !== listener);
  // Check if we still need this table+event combo
  const stillNeeded = listeners.some(
    l => l.table === listener.table && l.event === listener.event && l.filter === listener.filter
  );
  if (!stillNeeded) {
    rebuildChannel();
  }
}

// 初回接続を遅延させることで、初期レンダリングを優先
const REALTIME_DELAY_MS = 300;

/**
 * Subscribe to a Supabase real-time event on a shared channel.
 * All hooks share a single WebSocket channel for reduced overhead.
 * Connection is delayed to prioritize initial page render.
 */
export function useRealtimeEvent(
  table: string,
  event: EventType,
  callback: RealtimeCallback,
  filter?: string,
) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener: Listener = { table, event, filter, callback: (payload: any) => callbackRef.current(payload) };

    // 初期レンダリング完了後にWebSocket接続を開始
    const timer = setTimeout(() => {
      addListener(listener);
    }, REALTIME_DELAY_MS);

    return () => {
      clearTimeout(timer);
      removeListener(listener);
    };
  }, [table, event, filter]);
}
