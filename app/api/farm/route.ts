import { vnDate, dayNumber, checkState, score } from '../../../lib/rules';
import { getJSON, listKeys, putFile, putJSON, updateJSON } from '../../../lib/store';
import { farmContext } from '../../../lib/farm-auth';

export const dynamic = 'force-dynamic';

const hide = (v: any) => ({ ...v, result: '', knowledge: '' });

export async function GET(request: Request) {
  try {
    const { user, c, member, admin } = await farmContext();
    const date = new URL(request.url).searchParams.get('date') || vnDate();
    const canSee = (owner: string) => admin || member?.id === c.lead || member?.id === owner;
    const [dayKeys, sessionKeys, reportMap, transactions] = await Promise.all([
      listKeys('day:' + date + ':'),
      listKeys('session:' + date + ':'),
      getJSON<Record<string, any>>('reports'),
      getJSON<any[]>('transactions'),
    ]);
    const [dayVals, sessionVals] = await Promise.all([
      Promise.all(dayKeys.map((k) => getJSON(k))),
      Promise.all(sessionKeys.map((k) => getJSON(k))),
    ]);
    const data: any = { days: {}, sessions: {}, reports: [], transactions: transactions || [] };
    dayKeys.forEach((k, i) => {
      const v = dayVals[i];
      if (!v) return;
      if (!canSee(v.member)) {
        v.exercise = !!v.exercise;
        if (v.report) v.report = hide(v.report);
      }
      data.days[k.split(':')[2]] = v;
    });
    sessionKeys.forEach((k, i) => {
      if (sessionVals[i]) data.sessions[k.split(':')[2]] = sessionVals[i];
    });
    data.reports = Object.values(reportMap || {}).map((v: any) => (canSee(v.member) ? v : hide(v)));
    return Response.json(
      {
        ...data,
        config: c,
        me: { id: member?.id || null, admin, lead: admin || member?.id === c.lead, email: user.email },
        serverNow: new Date().toISOString(),
        today: vnDate(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, c, member, admin, lead } = await farmContext();
    const body = (await request.json()) as any;
    const { action } = body;
    const now = new Date();
    const today = vnDate(now);
    const date = body.date || today;
    const audit = { by: user.userId, email: user.email, at: now.toISOString() };

    if (action === 'config') {
      if (!admin) throw new Error('Chỉ quản trị được thay đổi cài đặt.');
      const v = body.config;
      if (!Array.isArray(v.members) || !v.members.length || new Set(v.members.map((m: any) => m.id)).size !== v.members.length)
        throw new Error('Danh sách thành viên không hợp lệ.');
      if (
        !Array.isArray(v.slots) ||
        v.slots.length !== 9 ||
        v.slots.some((s: any) => !/^\d{2}:\d{2}$/.test(s.start) || !/^\d{2}:\d{2}$/.test(s.end) || s.end <= s.start || s.grace < 0 || s.grace > 60)
      )
        throw new Error('Kiểm tra lại 9 khung giờ.');
      if ([v.pass, v.penaltyOne, v.penaltyMany].some((x) => !Number.isFinite(Number(x)) || Number(x) < 0))
        throw new Error('Điểm / tiền phạt không hợp lệ.');
      const emails = v.members.map((m: any) => String(m.email || '').toLowerCase()).filter(Boolean);
      if (new Set(emails).size !== emails.length) throw new Error('Email mỗi thành viên phải khác nhau.');
      await updateJSON<any>('config', (cur) => {
        // Giữ lại avatar mới nhất nếu có người vừa đổi ảnh trong lúc quản trị đang sửa cài đặt.
        const avatars = Object.fromEntries((cur?.members || []).map((m: any) => [m.id, m.avatar]));
        return { ...v, members: v.members.map((m: any) => ({ ...m, avatar: avatars[m.id] ?? m.avatar })) };
      });
    } else if (action === 'avatar') {
      if (!member) throw new Error('Chưa gắn tài khoản cư dân.');
      if (typeof body.image !== 'string' || body.image.length > 2800000 || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(body.image))
        throw new Error('Ảnh không hợp lệ hoặc quá 2 MB.');
      const prefix = body.image.slice(0, body.image.indexOf(',') + 1);
      const bytes = Uint8Array.from(atob(body.image.slice(prefix.length)), (ch) => ch.charCodeAt(0));
      const key = 'avatar/' + member.id + '/' + crypto.randomUUID();
      await putFile(key, bytes, prefix.slice(5, prefix.indexOf(';')));
      await updateJSON<any>('config', (cur) => {
        const m = cur.members.find((x: any) => x.id === member.id);
        if (m) m.avatar = '/api/avatar?key=' + encodeURIComponent(key);
        return cur;
      });
    } else if (action === 'session') {
      if (!lead) throw new Error('Chỉ phụ trách hoặc quản trị được đặt link.');
      if (!c.slots.some((s: any) => s.id === body.slot)) throw new Error('Khung không hợp lệ.');
      if (body.url) {
        const u = new URL(body.url);
        if (u.protocol !== 'https:') throw new Error('Link phòng phải bắt đầu bằng https://');
      }
      await putJSON('session:' + date + ':' + body.slot, { url: body.url, title: body.title || '', ...audit });
    } else if (action === 'transaction') {
      if (!admin) throw new Error('Chỉ quản trị được ghi quỹ.');
      if (!Number.isFinite(body.amount) || body.amount <= 0) throw new Error('Số tiền phải lớn hơn 0.');
      await updateJSON<any[]>('transactions', (cur) => [
        ...(cur || []),
        { id: crypto.randomUUID(), member: body.member, type: body.type, amount: body.amount, note: String(body.note || '').slice(0, 1000), date: today, ...audit },
      ]);
    } else {
      if (!member) throw new Error('Hãy nhờ quản trị gắn email của bạn với một cư dân.');
      if (date !== today) throw new Error('Chỉ được cập nhật ngày hiện tại.');
      const id = 'day:' + date + ':' + member.id;
      const session = action === 'checkin' ? await getJSON('session:' + date + ':' + body.slot) : null;
      let reportToSave: any = null;
      await updateJSON<any>(id, (stored) => {
        reportToSave = null;
        const current = stored || { member: member.id, date, checks: {}, stickers: [], reflection: ['', '', '', '', ''], exercise: '', knowledge: '' };
        if (action === 'checkin') {
          const slot = c.slots.find((s: any) => s.id === body.slot);
          if (!slot) throw new Error('Khung không hợp lệ.');
          if (!current.checks[body.slot]) {
            const status = checkState(slot, now);
            if (status === 'early') throw new Error('Check-in mở trước giờ bắt đầu 5 phút.');
            if (status === 'closed') throw new Error('Khung giờ đã kết thúc.');
            if (!session?.url) throw new Error('Người phụ trách chưa đặt link phòng.');
            current.checks[body.slot] = { at: now.toISOString(), status };
            if (current.report) {
              current.report.states[Number(body.slot)] = status;
              current.report.points = score(current.report.states, current.report.rest, current.report.review, current.report.reflectionDone);
              reportToSave = current.report;
            }
          }
        } else if (action === 'sticker') {
          if (!Number.isInteger(body.task) || body.task < 0 || body.task > 5) throw new Error('Mục không hợp lệ.');
          current.stickers = current.stickers.includes(body.task) ? current.stickers.filter((x: number) => x !== body.task) : [...current.stickers, body.task];
        } else if (action === 'reflection') {
          if (!Array.isArray(body.values) || body.values.length !== 5) throw new Error('Cần 5 mục reflection.');
          current.reflection = body.values.map((x: any) => String(x).slice(0, 6000));
        } else if (action === 'report') {
          if (!Array.isArray(body.states) || body.states.length !== 9 || body.states.some((x: any) => !['on-time', 'late', 'absent'].includes(x)))
            throw new Error('Báo cáo cần đủ 9 khung.');
          const states = body.states.map((s: string, i: number) => current.checks[String(i)]?.status || s);
          const points = score(states, !!body.rest, !!body.review, !!body.reflectionDone);
          current.report = {
            member: member.id,
            date,
            states,
            rest: !!body.rest,
            review: !!body.review,
            reflectionDone: !!body.reflectionDone,
            points,
            counted: dayNumber(date) >= 1 && dayNumber(date) <= 68,
            sessions: Math.max(0, Math.min(50, Number(body.sessions) || 0)),
            result: String(body.result || '').slice(0, 6000),
            knowledge: String(body.knowledge || '').slice(0, 2000),
            submitted: now.toISOString(),
          };
          reportToSave = current.report;
        } else throw new Error('Thao tác không hợp lệ.');
        return { ...current, updated: now.toISOString() };
      });
      if (reportToSave) {
        const r = reportToSave;
        await updateJSON<Record<string, any>>('reports', (cur) => ({ ...(cur || {}), ['report:' + date + ':' + member.id]: r }));
      }
    }
    await putJSON('audit:' + now.toISOString() + ':' + crypto.randomUUID(), { action, date, ...audit });
    return Response.json({ ok: true, serverNow: now.toISOString() });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}
