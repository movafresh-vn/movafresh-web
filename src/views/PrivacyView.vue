<template>
  <div class="legal-page">
    <div class="wrap">
      <nav class="breadcrumb" aria-label="Đường dẫn trang">
        <router-link to="/">Trang chủ</router-link>
        <span class="sep">›</span>
        <span>Chính sách Bảo mật Thông tin</span>
      </nav>

      <article class="legal-card pl-card">
        <header class="legal-header">
          <div class="legal-badge-strip">
            <span class="l-badge green">BẢO VỆ DỮ LIỆU CÁ NHÂN</span>
            <span class="l-badge">Nghị định 13/2023/NĐ-CP</span>
          </div>
          <h1 class="legal-h1">Chính sách Bảo mật Thông tin Khách hàng</h1>
          <p class="legal-sub">
            MOVA Fresh cam kết bảo vệ tuyệt đối dữ liệu cá nhân, quyền riêng tư và thông tin khẩu vị của bạn và gia đình.
          </p>
        </header>

        <section class="legal-content">
          <h2>1. Mục đích thu thập dữ liệu cá nhân</h2>
          <p>
            Chúng tôi chỉ thu thập các trường thông tin tối thiểu cần thiết để phục vụ trải nghiệm nấu nướng và giao nhận:
          </p>
          <ul>
            <li><b>Số điện thoại:</b> Dùng để gửi mã xác thực OTP bảo mật khi tạo đơn, thông báo trạng thái đơn hàng và để shipper liên hệ giao hàng tận nơi.</li>
            <li><b>Địa chỉ nhận hàng:</b> Điều phối tuyến xe lạnh giao hàng nhanh chóng trong khung giờ yêu cầu.</li>
            <li><b>Khẩu vị, kiêng cữ &amp; dị ứng:</b> Tùy biến thực đơn, kích hoạt cơ chế lọc cứng 100% món ăn chứa chất dị ứng đảm bảo an toàn tính mạng và sức khỏe cho gia đình bạn.</li>
            <li><b>Email (nếu đăng ký):</b> Gửi hóa đơn điện tử GTGT hợp pháp và bản tin công thức nấu ăn Đầu bếp MOVA (+15.000đ điểm bữa ăn).</li>
          </ul>

          <h2>2. Nguyên tắc Che giấu thông tin nhận diện (PII Masking)</h2>
          <p>
            2.1. <b>Bảo vệ dữ liệu trong nội bộ xưởng sản xuất:</b>
            Tại phân xưởng sơ chế Đắk Lắk và hệ thống vận hành `/ops.html`, công nhân và quản đốc chỉ nhìn thấy bảng tổng hợp định mức nguyên liệu thô (BOM Reverse Aggregator) và mã suất ăn. Tên họ, số điện thoại và địa chỉ nhà của khách hàng được ẩn 100% khỏi màn hình xưởng.
          </p>
          <p>
            2.2. <b>Giao diện Shipper chặng cuối:</b>
            Shipper chỉ thấy địa chỉ giao hàng và số điện thoại được che một phần (Ví dụ: `0987***321`), không thể xem số dư tài khoản hay lịch sử chi tiêu của quý khách.
          </p>

          <h2>3. Cam kết Không chia sẻ dữ liệu trái phép</h2>
          <p>
            3.1. MOVA Fresh <b>tuyệt đối không bán, không cho thuê, không chia sẻ</b> thông tin cá nhân của khách hàng cho bất kỳ tổ chức hay bên thứ ba nào vì mục đích quảng cáo hoặc thương mại.
          </p>
          <p>
            3.2. Dữ liệu chỉ được cung cấp cho các đối tác hạ tầng thiết yếu (cổng thanh toán thẻ, ngân hàng VietQR, hệ thống máy chủ chứng thực bảo mật) trong phạm vi tối thiểu để xử lý giao dịch.
          </p>

          <h2>4. Quyền của Chủ thể dữ liệu (Quyền của Khách hàng)</h2>
          <p>
            Căn cứ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân, quý khách có toàn bộ các quyền sau:
          </p>
          <ul>
            <li><b>Quyền xem và chỉnh sửa:</b> Tự do cập nhật số điện thoại, địa chỉ nhận hàng và danh mục khẩu vị bất kỳ lúc nào tại trang Quản lý tài khoản.</li>
            <li><b>Quyền từ chối nhận tin quảng cáo (Opt-out):</b> Bấm hủy nhận bản tin công thức qua link ở chân mỗi email hoặc tắt thông báo Zalo với 1 thao tác.</li>
            <li><b>Quyền yêu cầu xóa hoặc ẩn danh hóa dữ liệu:</b> Quý khách có quyền yêu cầu xóa toàn bộ lịch sử tài khoản, thông tin liên hệ khỏi hệ thống cơ sở dữ liệu của MOVA Fresh khi ngừng sử dụng dịch vụ.</li>
          </ul>

          <h2>5. Lưu trữ và Bảo mật kỹ thuật</h2>
          <p>
            Mọi dữ liệu truyền tải giữa thiết bị của quý khách và hệ thống MOVA Fresh được mã hóa theo tiêu chuẩn an toàn cao nhất (SSL/TLS 256-bit). Hệ thống kiểm soát truy cập phân quyền nghiêm ngặt theo vai trò với khóa bảo mật riêng biệt.
          </p>

          <h2>6. Liên hệ Bộ phận Bảo vệ dữ liệu (DPO)</h2>
          <div class="contact-box">
            <p><b>Phòng An ninh Thông tin &amp; Pháp chế — MOVA Fresh Việt Nam</b></p>
            <p>✉️ Email tiếp nhận yêu cầu dữ liệu: <b>privacy@movafresh.vn</b></p>
            <p>📞 Hotline: <b>1900 8899</b> (Hỗ trợ 06:00 – 21:00)</p>
            <p>Thời hạn phản hồi và giải quyết yêu cầu xóa dữ liệu: Trong vòng <b>72 giờ làm việc</b>.</p>
          </div>
        </section>

        <footer class="legal-footer">
          <router-link to="/terms" class="pl-btn outline">Xem Điều khoản sử dụng ›</router-link>
          <router-link to="/faq" class="pl-btn primary">Xem Trung tâm Hỏi đáp ›</router-link>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal-page {
  padding: 30px 0 80px;
  background: var(--bg);
  min-height: 80vh;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
}
.breadcrumb a {
  color: var(--green-d);
  text-decoration: none;
  font-weight: 600;
}
.breadcrumb .sep {
  color: var(--line);
}

.legal-card {
  max-width: 840px;
  margin: 0 auto;
  padding: 36px 40px;
  border-radius: 20px;
}
@media (max-width: 640px) {
  .legal-card {
    padding: 24px 20px;
  }
}

.legal-header {
  border-bottom: 1px solid var(--line-2);
  padding-bottom: 24px;
  margin-bottom: 24px;
}
.legal-badge-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.l-badge {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #F1F5F9;
  color: #475569;
}
.l-badge.green {
  background: var(--green-soft);
  color: var(--green-d);
}

.legal-h1 {
  font-size: 26px;
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 10px;
  line-height: 1.3;
}
.legal-sub {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
}

.legal-content {
  font-size: 14.5px;
  line-height: 1.65;
  color: #1E293B;
  display: grid;
  gap: 16px;
}
.legal-content h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--green-d);
  margin: 16px 0 6px;
  border-left: 3.5px solid var(--green);
  padding-left: 10px;
}
.legal-content p {
  margin: 0;
}
.legal-content ul {
  margin: 4px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
}

.contact-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 20px;
  display: grid;
  gap: 6px;
  font-size: 13.5px;
}
.contact-box p {
  margin: 0;
}

.legal-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 28px;
  margin-top: 24px;
  border-top: 1px solid var(--line-2);
  flex-wrap: wrap;
}
</style>
