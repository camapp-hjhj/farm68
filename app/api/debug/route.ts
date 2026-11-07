import { getUser } from '../../../lib/auth';
import { getJSON, listKeys, readJSON } from '../../../lib/store';

export const dynamic = 'force-dynamic';

const withTimeout = <T,>(p: Promise<T>, ms = 5000) =>
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
  const r = [];
  r.push(await step('getUser', async () => (await getUser())?.email ?? null));
  r.push(await step('readJSON config', async () => {
    const x = await readJSON<any>('config');
    return x ? { etag: x.etag, members: x.data?.members?.map((m: any) => [m.id, m.name, !!m.email]) } : null;
  }));
  r.push(await step('getJSON reports', () => getJSON('reports')));
  r.push(await step('getJSON transactions', () => getJSON('transactions')));
  r.push(await step('listKeys day:', () => listKeys('day:')));
  r.push(await step('listKeys session:', () => listKeys('session:')));
  return Response.json(r);
}
