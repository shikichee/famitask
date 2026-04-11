import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';
import { inArray } from 'drizzle-orm';

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
  // cron シークレットで認証
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, body, url } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const subscriptions = await db.select().from(pushSubscriptions);

  if (!subscriptions.length) {
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

  if (expiredEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, expiredEndpoints));
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent, expired: expiredEndpoints.length });
}
