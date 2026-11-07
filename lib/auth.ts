// Đăng nhập bằng Google cho Farm 68.
// Phiên đăng nhập lưu trong cookie đã ký (HS256) bằng AUTH_SECRET.
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

export type FarmUser = { userId: string; email: string; displayName: string };

export const SESSION_COOKIE = 'farm68_session';
export const STATE_COOKIE = 'farm68_oauth';
const SESSION_DAYS = 30;

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('Thiếu AUTH_SECRET (ít nhất 32 ký tự) trong biến môi trường.');
  return new TextEncoder().encode(s);
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET.');
  return { clientId, clientSecret };
}

export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function siteOrigin(request: Request): string {
  const fixed = process.env.SITE_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function createSession(user: FarmUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export const sessionMaxAge = SESSION_DAYS * 24 * 3600;

export async function getUser(): Promise<FarmUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: typeof payload.name === 'string' && payload.name ? payload.name : payload.email,
    };
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(idToken: string, clientId: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });
  if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
    throw new Error('Email Google chưa được xác minh.');
  }
  return {
    userId: 'google:' + payload.sub,
    email: payload.email.toLowerCase(),
    displayName: typeof payload.name === 'string' ? payload.name : payload.email,
  } satisfies FarmUser;
}

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const u = new URL(value, 'https://farm.local');
    if (u.origin !== 'https://farm.local' || u.pathname.startsWith('/api/auth')) return '/';
    return u.pathname + u.search + u.hash;
  } catch {
    return '/';
  }
}
