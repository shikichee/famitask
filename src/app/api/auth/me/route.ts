import { NextResponse } from 'next/server';
import { getAuthMember } from '@/lib/api-auth';

export async function GET() {
  const member = await getAuthMember();
  if (!member) {
    return NextResponse.json({ member: null }, { status: 401 });
  }
  return NextResponse.json({ member });
}
