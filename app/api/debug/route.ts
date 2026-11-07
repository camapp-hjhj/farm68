import { getStore } from '@netlify/blobs';

export const dynamic = 'force-dynamic';

const withTimeout = <T,>(p: Promise<T>, ms = 4000) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms')), ms))]);

async function step(name: string, fn: () => Promise<any>) {
  const t = Date.now();
  try {
    const v = await withTimeout(fn());
    return { name, ok: true, ms: Date.now() - t, v: JSON.stringify(v)?.slice(0, 150) };
  } catch (e: any) {
    return { name, ok: false, ms: Date.now() - t, err: String(e?.message || e).slice(0, 200) };
  }
}

export async function GET() {
  const strong = getStore({ name: 'farm68-data', consistency: 'strong' });
  const eventual = getStore({ name: 'farm68-data' });
  const r = [];
  r.push(await step('list all', () => eventual.list()));
  r.push(await step('strong.get missing json', () => strong.get('nope-x', { type: 'json' })));
  r.push(await step('strong.get missing text', () => strong.get('nope-x')));
  r.push(await step('strong.getMetadata missing', () => strong.getMetadata('nope-x')));
  r.push(await step('eventual.getWithMetadata missing', () => eventual.getWithMetadata('nope-x', { type: 'json' })));
  r.push(await step('strong.getWithMetadata missing text', () => strong.getWithMetadata('nope-x')));
  r.push(await step('strong.get config json', () => strong.get('config', { type: 'json' })));
  r.push(await step('strong.getMetadata config', () => strong.getMetadata('config')));
  return Response.json(r);
}
