// Tự đăng ký: người đăng nhập Google lần đầu tự chọn tên mình trong danh sách cư dân.
// Mỗi cư dân chỉ nhận được một lần; quản trị có thể xóa email trong Nhà điều hành để nhận lại.
import { getUser, ownerEmails } from '../../../lib/auth';
import { getJSON, updateJSON } from '../../../lib/store';
import { initialConfig } from '../../../lib/rules';

export const dynamic = 'force-dynamic';

async function loadConfig() {
  return (await getJSON<any>('config')) ?? (await updateJSON<any>('config', (cur) => cur ?? initialConfig()));
}

const linked = (c: any, email: string) => c.members.some((m: any) => m.email && m.email.toLowerCase() === email);

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ status: 'login' });
  const email = user.email.toLowerCase();
  const c = await loadConfig();
  if (linked(c, email)) return Response.json({ status: 'ok' });
  const residents = c.members.filter((m: any) => !m.email).map((m: any) => ({ id: m.id, name: m.name, animal: m.animal }));
  // Quản trị gốc vẫn vào được dù chưa chọn tên (khi đã hết chỗ trống).
  if (ownerEmails().includes(email) && residents.length === 0) return Response.json({ status: 'ok' });
  return Response.json({ status: 'claim', email: user.email, residents });
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Bạn cần đăng nhập trước.');
    const email = user.email.toLowerCase();
    const { id } = (await request.json()) as any;
    await updateJSON<any>('config', (cur) => {
      const c = cur ?? initialConfig();
      if (linked(c, email)) throw new Error('Email này đã được gắn với một cư dân.');
      const m = c.members.find((x: any) => x.id === String(id));
      if (!m) throw new Error('Không tìm thấy cư dân này.');
      if (m.email) throw new Error(`${m.name} đã có người nhận. Nếu nhầm, hãy nhờ quản trị gỡ ra.`);
      m.email = email;
      return c;
    });
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
