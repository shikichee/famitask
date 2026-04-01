'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeEvent } from './use-realtime';

const supabase = createClient();
const isSupabaseConfigured = true;
import { FamilyMember } from '@/types/database';

const DEMO_MEMBERS: FamilyMember[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: '妻', avatar: '👩', color: '#E91E63', role: 'adult', total_points: 0, auth_user_id: null, is_admin: false, last_seen_history_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000002', name: '夫', avatar: '👨', color: '#2196F3', role: 'adult', total_points: 0, auth_user_id: null, is_admin: true, last_seen_history_at: new Date().toISOString() },
  { id: 'a0000000-0000-0000-0000-000000000003', name: '娘', avatar: '👧', color: '#FF9800', role: 'child', total_points: 0, auth_user_id: null, is_admin: false, last_seen_history_at: new Date().toISOString() },
];

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>(DEMO_MEMBERS);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchMembers = async () => {
      const { data } = await supabase
        .from('family_members')
        .select('*')
        .order('name');
      if (data) setMembers(data);
    };

    fetchMembers();
  }, []);

  useRealtimeEvent('family_members', 'INSERT', (payload) => {
    const newMember = payload.new as FamilyMember;
    setMembers(prev => {
      if (prev.some(m => m.id === newMember.id)) return prev;
      return [...prev, newMember].sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  useRealtimeEvent('family_members', 'UPDATE', (payload) => {
    const updated = payload.new as FamilyMember;
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  });

  useRealtimeEvent('family_members', 'DELETE', (payload) => {
    const deleted = payload.old as FamilyMember;
    setMembers(prev => prev.filter(m => m.id !== deleted.id));
  });

  return members;
}
