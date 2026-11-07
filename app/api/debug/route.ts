import { getStore } from '@netlify/blobs';

export const dynamic = 'force-dynamic';

const withTimeout = <T,>(p: Promise<T>, ms = 5000) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms')), ms))]);

async function step(name: string, fn: () => Promise<any>) {
  const t = Date.now();
  try {
    const v = await withTimeout(fn());
    return { name, ok: true, ms: Date.now() - t, v: JSON.stringify(v)?.slice(0, 120) };
  } catch (e: any) {
    return { name, ok: false, ms: Date.now() - t, err: String(e?.message || e).slice(0, 200) };
  }
}

export async function GET() {
  const env = {
    hasBlobsCtx: !!process.env.NETLIFY_BLOBS_CONTEXT,
    hasSiteId: !!process.env.SITE_ID,
    netlify: process.env.NETLIFY || null,
  };
  const eventual = getStore({ name: 'farm68-debug' });
  const strong = getStore({ name: 'farm68-debug', consistency: 'strong' });
  const results = [];
  results.push(await step('eventual.set', () => eventual.setJSON('ping', { at: Date.now() })));
  results.push(await step('eventual.get', () => eventual.get('ping', { type: 'json' })));
  results.push(await step('strong.get', () => strong.get('ping', { type: 'json' })));
  results.push(await step('strong.getWithMetadata', () => strong.getWithMetadata('ping', { type: 'json' })));
  results.push(await step('list', () => eventual.list({ prefix: 'p' })));
  return Response.json({ env, results });
}
