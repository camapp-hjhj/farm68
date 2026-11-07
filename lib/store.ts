// Lưu trữ dữ liệu Farm 68.
// Trên Netlify: dùng Netlify Blobs (không cần cài database riêng).
// Chạy thử trên máy: đặt FARM_LOCAL_STORE=1 để lưu vào thư mục .data/.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const local = process.env.FARM_LOCAL_STORE === '1';
const LOCAL_DIR = path.join(process.cwd(), '.data');

const dataStore = () => getStore({ name: 'farm68-data', consistency: 'strong' });
const fileStore = () => getStore({ name: 'farm68-files', consistency: 'strong' });

function localPath(bucket: string, key: string) {
  return path.join(LOCAL_DIR, bucket, encodeURIComponent(key));
}
const tag = (s: string) => createHash('sha1').update(s).digest('hex');

export async function readJSON<T = any>(key: string): Promise<{ data: T; etag?: string } | null> {
  if (local) {
    try {
      const raw = await fs.readFile(localPath('data', key), 'utf8');
      return { data: JSON.parse(raw), etag: tag(raw) };
    } catch {
      return null;
    }
  }
  // Đọc key chưa tồn tại bằng GET đôi khi bị treo trên Netlify, nên kiểm tra bằng HEAD (getMetadata) trước.
  const store = dataStore();
  if (!(await store.getMetadata(key))) return null;
  const r = await store.getWithMetadata(key, { type: 'json' });
  return r ? { data: r.data as T, etag: r.etag } : null;
}

export async function getJSON<T = any>(key: string): Promise<T | null> {
  return (await readJSON<T>(key))?.data ?? null;
}

// Ghi có điều kiện: etag === undefined nghĩa là chỉ ghi khi key chưa tồn tại.
async function writeIf(key: string, value: any, etag: string | undefined): Promise<boolean> {
  const raw = JSON.stringify(value);
  if (local) {
    const cur = await readJSON(key);
    if ((cur?.etag ?? undefined) !== etag) return false;
    await fs.mkdir(path.join(LOCAL_DIR, 'data'), { recursive: true });
    await fs.writeFile(localPath('data', key), raw);
    return true;
  }
  const res = etag
    ? await dataStore().setJSON(key, value, { onlyIfMatch: etag })
    : await dataStore().setJSON(key, value, { onlyIfNew: true });
  return res.modified;
}

export async function putJSON(key: string, value: any): Promise<void> {
  if (local) {
    await fs.mkdir(path.join(LOCAL_DIR, 'data'), { recursive: true });
    await fs.writeFile(localPath('data', key), JSON.stringify(value));
    return;
  }
  await dataStore().setJSON(key, value);
}

// Đọc - sửa - ghi an toàn khi nhiều người cùng thao tác.
export async function updateJSON<T>(key: string, fn: (current: T | null) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await readJSON<T>(key);
    const next = await fn(cur ? structuredClone(cur.data) : null);
    if (await writeIf(key, next, cur?.etag)) return next;
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
  }
  throw new Error('Hệ thống đang bận, vui lòng thử lại.');
}

export async function listKeys(prefix: string): Promise<string[]> {
  if (local) {
    try {
      const names = await fs.readdir(path.join(LOCAL_DIR, 'data'));
      return names.map(decodeURIComponent).filter((k) => k.startsWith(prefix));
    } catch {
      return [];
    }
  }
  const r = await dataStore().list({ prefix });
  return r.blobs.map((b) => b.key);
}

export async function putFile(key: string, bytes: ArrayBuffer | Uint8Array, contentType: string) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (local) {
    await fs.mkdir(path.join(LOCAL_DIR, 'files'), { recursive: true });
    await fs.writeFile(localPath('files', key), buf);
    await fs.writeFile(localPath('files', key) + '.type', contentType);
    return;
  }
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  await fileStore().set(key, ab, { metadata: { contentType } });
}

export async function getFile(key: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (local) {
    try {
      const body = await fs.readFile(localPath('files', key));
      const contentType = await fs.readFile(localPath('files', key) + '.type', 'utf8');
      return { body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer, contentType };
    } catch {
      return null;
    }
  }
  const store = fileStore();
  if (!(await store.getMetadata(key))) return null;
  const r = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!r) return null;
  return { body: r.data, contentType: String(r.metadata?.contentType || 'image/jpeg') };
}

export async function deleteFile(key: string) {
  if (local) {
    await fs.rm(localPath('files', key), { force: true });
    await fs.rm(localPath('files', key) + '.type', { force: true });
    return;
  }
  await fileStore().delete(key);
}
