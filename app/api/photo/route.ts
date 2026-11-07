import { vnDate } from '../../../lib/rules';
import { deleteFile, getFile, getJSON, putFile, updateJSON } from '../../../lib/store';
import { farmContext } from '../../../lib/farm-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { member: m } = await farmContext();
    if (!m) throw new Error('Chưa gắn tài khoản cư dân.');
    const f = await req.formData();
    const photo = f.get('photo');
    if (!(photo instanceof File) || photo.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5 MB.');
    const buf = await photo.arrayBuffer();
    const a = new Uint8Array(buf);
    const jpeg = a[0] === 255 && a[1] === 216 && a[2] === 255;
    const png = a[0] === 137 && a[1] === 80 && a[2] === 78 && a[3] === 71;
    const webp = String.fromCharCode(...a.slice(0, 4)) === 'RIFF' && String.fromCharCode(...a.slice(8, 12)) === 'WEBP';
    if (!jpeg && !png && !webp) throw new Error('Ảnh không hợp lệ.');
    const today = vnDate();
    const key = 'exercise/' + today + '/' + m.id + '/' + crypto.randomUUID();
    await putFile(key, buf, jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp');
    let old = '';
    await updateJSON<any>('day:' + today + ':' + m.id, (day) => {
      const d = day || { member: m.id, date: today, checks: {}, stickers: [], reflection: ['', '', '', '', ''] };
      old = d.exercise || '';
      d.exercise = key;
      d.updated = new Date().toISOString();
      return d;
    });
    if (old && old !== key) await deleteFile(old);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}

export async function GET(req: Request) {
  try {
    await farmContext();
    const url = new URL(req.url);
    const member = url.searchParams.get('member');
    const date = url.searchParams.get('date');
    const day: any = await getJSON('day:' + date + ':' + member);
    const key = day?.exercise;
    if (!key || typeof key !== 'string') return new Response('Chưa có ảnh.', { status: 404 });
    const object = await getFile(key);
    if (!object) return new Response('Không tìm thấy ảnh.', { status: 404 });
    return new Response(object.body, {
      headers: { 'Content-Type': object.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (e: any) {
    return new Response(e.message || 'Cần đăng nhập.', { status: e.status || 401 });
  }
}
