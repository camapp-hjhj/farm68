'use client';
import { useEffect, useState } from 'react';
import Farm from './farm';

type ClaimState =
  | { status: 'loading' }
  | { status: 'ok' | 'login' }
  | { status: 'claim'; email: string; residents: { id: string; name: string; animal: string }[] };

export default function Gate() {
  const [state, setState] = useState<ClaimState>({ status: 'loading' });
  const [picked, setPicked] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/claim', { cache: 'no-store' });
      setState(await r.json());
    } catch {
      setState({ status: 'ok' });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function claim() {
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: picked }) });
      const v: any = await r.json();
      if (!r.ok) throw new Error(v.error);
      setState({ status: 'ok' });
    } catch (e: any) {
      setError(e.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (state.status === 'loading') return null;
  if (state.status !== 'claim') return <Farm />;

  const card: React.CSSProperties = { maxWidth: 460, margin: '10vh auto', padding: 32, borderRadius: 24, background: '#fffdf6', boxShadow: '0 12px 40px rgba(60,80,50,.12)', fontFamily: 'inherit', color: '#2f4a33' };
  return (
    <div style={{ minHeight: '100vh', background: '#f3f1e6', padding: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 34 }}>🌱</div>
        <h2 style={{ margin: '8px 0 6px', fontSize: 24 }}>Chào mừng đến Farm 68</h2>
        <p style={{ margin: '0 0 20px', color: '#6b7d66', lineHeight: 1.5 }}>
          Bạn đang đăng nhập bằng <b>{state.email}</b>. Chọn tên của bạn để vào xóm nhé. Mỗi tên chỉ nhận được một lần.
        </p>
        {state.residents.length === 0 ? (
          <p style={{ color: '#a0522d' }}>Tất cả cư dân đã có người nhận. Nếu bạn là thành viên, hãy nhờ quản trị gỡ email bị nhận nhầm.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {state.residents.map((m) => (
              <button
                key={m.id}
                onClick={() => setPicked(m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, cursor: 'pointer', fontSize: 16, textAlign: 'left', border: picked === m.id ? '2px solid #3d6b45' : '1px solid #dcdcc8', background: picked === m.id ? '#e8f0dd' : '#fff', color: 'inherit' }}
              >
                <span style={{ fontSize: 24 }}>{m.animal}</span>
                <b>{m.name}</b>
              </button>
            ))}
          </div>
        )}
        {error && <p style={{ color: '#b23b2b', marginTop: 14 }}>{error}</p>}
        <button
          onClick={claim}
          disabled={!picked || busy}
          style={{ marginTop: 20, width: '100%', padding: '14px 0', borderRadius: 14, border: 0, background: picked ? '#3d6b45' : '#b7c3b0', color: '#fff', fontSize: 16, fontWeight: 700, cursor: picked ? 'pointer' : 'default' }}
        >
          {busy ? 'Đang lưu…' : 'Đây là tôi, vào xóm'}
        </button>
        <p style={{ marginTop: 16, fontSize: 13, color: '#8a9a85' }}>
          Không phải tài khoản của bạn? <a href="/api/auth/logout">Đăng xuất</a> rồi <a href="/api/auth/login">đăng nhập lại</a>.
        </p>
      </div>
    </div>
  );
}
