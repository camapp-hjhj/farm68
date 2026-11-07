import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chính sách bảo mật · Farm 68' };

export default function Privacy() {
  const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px', lineHeight: 1.7, color: '#2f4a33' };
  return (
    <main style={{ minHeight: '100vh', background: '#f6f4ea' }}>
      <div style={wrap}>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>Chính sách bảo mật</h1>
        <p style={{ color: '#7b8a76', marginTop: 0 }}>Farm 68 · Cập nhật ngày 07/11/2026</p>

        <p>Farm 68 là web nội bộ dành cho một nhóm nhỏ cùng tham gia thử thách 68 ngày. Trang này giải thích web lấy dữ liệu gì và dùng vào việc gì.</p>

        <h2 style={{ fontSize: 20 }}>Dữ liệu web nhận từ Google</h2>
        <p>Khi bạn đăng nhập bằng Google, web chỉ nhận <b>tên</b>, <b>địa chỉ email</b> và <b>mã định danh tài khoản</b>. Web không đọc Gmail, Drive, danh bạ hay bất kỳ dữ liệu nào khác trong tài khoản Google của bạn.</p>

        <h2 style={{ fontSize: 20 }}>Dữ liệu bạn tự nhập</h2>
        <p>Check-in, báo cáo cuối ngày, reflection, ảnh tập luyện, ảnh đại diện và sổ quỹ do thành viên tự nhập để theo dõi thử thách. Những dữ liệu này chỉ thành viên trong nhóm xem được.</p>

        <h2 style={{ fontSize: 20 }}>Cách dữ liệu được dùng và lưu trữ</h2>
        <ul>
          <li>Email dùng để nhận ra bạn là cư dân nào trong nhóm.</li>
          <li>Dữ liệu được lưu trên hạ tầng của Netlify, không bán, không chia sẻ cho bên thứ ba và không dùng cho quảng cáo.</li>
          <li>Phiên đăng nhập được lưu trong cookie của trình duyệt tối đa 30 ngày.</li>
        </ul>

        <h2 style={{ fontSize: 20 }}>Xóa dữ liệu</h2>
        <p>Bạn có thể đăng xuất bất cứ lúc nào. Muốn xóa dữ liệu của mình, hãy liên hệ quản trị nhóm qua email <a href="mailto:htbaongoc1508@gmail.com">htbaongoc1508@gmail.com</a>.</p>

        <p style={{ marginTop: 40 }}>
          <a href="/">← Về Farm 68</a>
        </p>
      </div>
    </main>
  );
}
