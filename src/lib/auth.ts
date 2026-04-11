import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export const COOKIE_NAME = 'famitask-session';
const EXPIRES_IN = '30d';

export async function createToken(memberId: string): Promise<string> {
  return new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ memberId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { memberId: payload.memberId as string };
  } catch {
    return null;
  }
}
