import { NextResponse } from 'next/server';
import { googleConfig, safeReturnTo, siteOrigin, STATE_COOKIE } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { clientId } = googleConfig();
  const origin = siteOrigin(request);
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get('return_to'));
  const state = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', origin + '/api/auth/callback');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  const res = NextResponse.redirect(url.toString());
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
