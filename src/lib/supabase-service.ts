import { createClient } from '@supabase/supabase-js';

/**
 * サービスロールキーを使うクライアント（サーバーサイド専用）
 * RLS をバイパスするため、cron や webhook など認証なしのサーバー処理で使用
 */
export function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(url, serviceKey);
}
