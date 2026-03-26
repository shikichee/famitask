'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();
const isSupabaseConfigured = true;
import { FamilyMember } from '@/types/database';

const DEMO_MEMBERS: FamilyMember[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: '妻', avatar: '👩', color: '#E91E63', role: 'adult', total_points: 0, auth_user_id: null, is_admin: false },
  { id: 'a0000000-0000-0000-0000-000000000002', name: '夫', avatar: '👨', color: '#2196F3', role: 'adult', total_points: 0, auth_user_id: null, is_admin: true },
  { id: 'a0000000-0000-0000-0000-000000000003', name: '娘', avatar: '👧', color: '#FF9800', role: 'child', total_points: 0, auth_user_id: null, is_admin: false },
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

    const channel = supabase
      .channel('family_members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return members;
}
