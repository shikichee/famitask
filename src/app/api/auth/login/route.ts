import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { familyMembers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
  }

  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.email, email));

  if (!member || !member.passwordHash) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
  }

  const token = await createToken(member.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}
