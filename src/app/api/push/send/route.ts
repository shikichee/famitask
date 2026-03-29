import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase-server';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured');
  }
  let subject = process.env.VAPID_SUBJECT || 'mailto:admin@famitask.example.com';
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    subject = `mailto:${subject}`;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function POST(request: NextRequest) {
  const { member_ids, exclude_member_id, title, body, url } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine target member IDs
  let targetMemberIds: string[] = member_ids || [];

  if (!member_ids && exclude_member_id) {
    const { data: members } = await supabase
      .from('family_members')
      .select('id')
      .neq('id', exclude_member_id);
    targetMemberIds = members?.map(m => m.id) ?? [];
  } else if (!member_ids && !exclude_member_id) {
    // No filter: send to all family members
    const { data: members } = await supabase
      .from('family_members')
      .select('id');
    targetMemberIds = members?.map(m => m.id) ?? [];
  }

  if (targetMemberIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Fetch subscriptions for target members
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('member_id', targetMemberIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  ensureVapidConfigured();

  const payload = JSON.stringify({ title, body, url: url || '/' });
  const expiredEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        throw err;
      }
    })
  );

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent, expired: expiredEndpoints.length });
}
