# Farm 68 — bản chạy trên Netlify

Bản chuyển từ ChatGPT Sites sang Netlify. Giao diện, nông trại 3D và luật chấm điểm giữ nguyên. Ba phần đã đổi:

| Phần | Bản cũ | Bản Netlify |
|---|---|---|
| Đăng nhập | Tài khoản ChatGPT | Tài khoản Google |
| Dữ liệu | Cloudflare D1 | Netlify Blobs (có sẵn, không cần cài) |
| Ảnh tập, avatar | Cloudflare R2 | Netlify Blobs |

Chỉ những email nằm trong `OWNER_EMAILS` hoặc đã được gắn với một cư dân trong **Nhà điều hành** mới vào xem được.

## Cài đặt lần đầu

1. **Deploy lên Netlify:** Add new site → Import from GitHub → chọn repo này. Netlify tự nhận cấu hình từ `netlify.toml`.
2. **Tạo Google OAuth** (Google Cloud Console → APIs & Services):
   - OAuth consent screen: chọn External, điền tên app "Farm 68", thêm email của 5 người vào Test users.
   - Credentials → Create credentials → OAuth client ID → Web application.
   - Authorized redirect URIs: `https://<tên-site>.netlify.app/api/auth/callback`.
3. **Thêm biến môi trường** trong Netlify (Site configuration → Environment variables), xem mẫu ở `.env.example`:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: lấy ở bước 2.
   - `AUTH_SECRET`: chuỗi ngẫu nhiên từ 32 ký tự trở lên.
   - `OWNER_EMAILS`: email Google của quản trị gốc.
4. **Deploy lại** (Deploys → Trigger deploy) để nhận biến môi trường.
5. **Gắn email cho cư dân:** quản trị đăng nhập, vào **Nhà điều hành** và gắn email Google cho từng người.

## Chạy thử trên máy

```bash
npm install
FARM_LOCAL_STORE=1 AUTH_SECRET=... OWNER_EMAILS=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run dev
```

Khi đặt `FARM_LOCAL_STORE=1`, dữ liệu được lưu vào thư mục `.data/` thay vì Netlify Blobs.
