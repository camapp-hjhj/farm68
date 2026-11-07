import { NextResponse } from 'next/server';
import { SESSION_COOKIE, siteOrigin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const res = NextResponse.redirect(siteOrigin(request) + '/');
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
