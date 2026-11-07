import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSession,
  googleConfig,
  safeReturnTo,
  sessionMaxAge,
  SESSION_COOKIE,
  siteOrigin,
  STATE_COOKIE,
  verifyGoogleIdToken,
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function fail(origin: string, message: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Farm 68</title><body style="font-family:sans-serif;padding:40px"><h2>Đăng nhập chưa thành công</h2><p>${message}</p><p><a href="${origin}/api/auth/login">Thử lại</a></p></body>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  let saved: { state?: string; returnTo?: string } = {};
  try {
    saved = JSON.parse(jar.get(STATE_COOKIE)?.value || '{}');
  } catch {}
  if (params.get('error')) return fail(origin, 'Bạn đã hủy đăng nhập Google.');
  const code = params.get('code');
  if (!code || !saved.state || params.get('state') !== saved.state) {
    return fail(origin, 'Phiên đăng nhập đã hết hạn. Hãy bấm Thử lại.');
  }
  try {
    const { clientId, clientSecret } = googleConfig();
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: origin + '/api/auth/callback',
        grant_type: 'authorization_code',
      }),
    });
    const tokens: any = await tokenRes.json();
    if (!tokenRes.ok || !tokens.id_token) throw new Error('Google không trả về thông tin đăng nhập.');
    const user = await verifyGoogleIdToken(tokens.id_token, clientId);
    const res = NextResponse.redirect(origin + safeReturnTo(saved.returnTo || '/'));
    res.cookies.set(SESSION_COOKIE, await createSession(user), {
      httpOnly: true,
      secure: origin.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e: any) {
    return fail(origin, e?.message || 'Có lỗi khi đăng nhập.');
  }
}
