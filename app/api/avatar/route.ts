import { getFile } from '../../../lib/store';
import { farmContext } from '../../../lib/farm-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await farmContext();
  } catch (e: any) {
    return new Response('Unauthorized', { status: e.status || 401 });
  }
  const key = new URL(req.url).searchParams.get('key');
  if (!key?.startsWith('avatar/')) return new Response('Not found', { status: 404 });
  const obj = await getFile(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.contentType || 'image/png', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
}
