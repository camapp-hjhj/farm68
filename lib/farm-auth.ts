import { getUser, ownerEmails } from './auth';
import { getJSON, updateJSON } from './store';
import { initialConfig } from './rules';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Ai được vào Farm 68: email trong OWNER_EMAILS (quản trị gốc) hoặc email đã được gắn với một cư dân.
export async function farmContext() {
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Bạn cần đăng nhập để sử dụng.');
  let c: any = await getJSON('config');
  if (!c) c = await updateJSON<any>('config', (cur) => cur ?? initialConfig());
  const email = user.email.toLowerCase();
  const member = c.members.find((m: any) => m.email && m.email.toLowerCase() === email);
  const owner = ownerEmails().includes(email);
  if (!member && !owner) {
    throw new HttpError(403, `Tài khoản ${user.email} chưa được thêm vào Farm 68. Hãy nhờ quản trị gắn email này với một cư dân.`);
  }
  const admin = owner || member?.role === 'admin';
  return { user, c, member, admin, lead: admin || member?.id === c.lead };
}
