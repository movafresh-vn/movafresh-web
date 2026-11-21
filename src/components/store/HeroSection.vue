<template>
  <section class="hero">
    <div class="wrap">
      <div class="copy">
        <span class="kicker">NGUYÊN LIỆU SƠ CHẾ SẴN TỪ ĐẮK LẮK, GIAO TẬN CỬA TP.HCM</span>
        <h1>Mâm cơm nhà bạn, do Đầu bếp thiết kế riêng, nấu xong trong 15 phút.</h1>
        <p class="sub">
          Đắk Lắk, xe lạnh xuyên đêm, tận cửa nhà bạn. Đầu bếp MOVA tuyển chọn thực đơn theo số người ăn, khẩu vị và thể trạng gia đình bạn, sơ chế sạch sẽ 100% và giao tận cửa.
        </p>
        <div class="cta">
          <div class="cta-row">
            <router-link to="/plans" class="pl-btn primary big">Thiết kế thực đơn của tôi</router-link>
            <router-link to="/menus" class="pl-btn outline big">Xem thực đơn tuần</router-link>
          </div>
          <p class="hint">Mất khoảng 1–2 phút. Bạn xem thực đơn trước, hài lòng rồi mới trả tiền.</p>
        </div>

        <!-- 3 Thẻ giá trị cốt lõi -->
        <div class="value-cards">
          <div class="val-card">
            <span class="val-icon">🍳</span>
            <div class="val-text">
              <b>Chuẩn 15 phút – 1 chảo</b>
              <p>Sơ chế sạch 100%, tẩm ướp sẵn, không cần đi chợ hay nhặt rau.</p>
            </div>
          </div>
          <div class="val-card">
            <span class="val-icon">❄️</span>
            <div class="val-text">
              <b>Chuỗi xe lạnh 16 giờ</b>
              <p>Giữ mát 0°C – 4°C xuyên đêm từ Đắk Lắk tận cửa bếp.</p>
            </div>
          </div>
          <div class="val-card">
            <span class="val-icon">🥣</span>
            <div class="val-text">
              <b>Gói xốt MOVA đặc biệt</b>
              <p>Định lượng chuẩn gram, gia vị độc quyền tách riêng.</p>
            </div>
          </div>
        </div>

        <!-- Dải 3 chỉ số nổi bật -->
        <div class="hero-stats">
          <div class="stat-col">
            <b class="stat-num num">16h</b>
            <span class="stat-label">Từ trại về bếp HCM</span>
          </div>
          <div class="stat-col">
            <b class="stat-num num">100%</b>
            <span class="stat-label">Sơ chế sạch ATTP</span>
          </div>
          <div class="stat-col">
            <b class="stat-num num">2 Giờ</b>
            <span class="stat-label">Tiết kiệm mỗi ngày</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <MealKitVideoHook />
        <ol class="route" aria-label="Hành trình của nguyên liệu">
          <li>
            <span class="pin">1</span>
            <div><b>Đắk Lắk</b><small>Nhà máy sơ chế theo đơn của bạn</small></div>
          </li>
          <li>
            <span class="pin">2</span>
            <div><b>Xe lạnh xuyên đêm</b><small>Chạy thẳng về kho TP.HCM</small></div>
          </li>
          <li>
            <span class="pin">3</span>
            <div><b>Tận cửa nhà bạn</b><small>Giao đúng khung giờ bạn chọn</small></div>
          </li>
          <li>
            <span class="pin pot" aria-hidden="true"></span>
            <div><b>Nấu 15 phút</b><small>Một chảo, gói xốt MOVA đặc biệt có sẵn</small></div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<script setup>
import MealKitVideoHook from './MealKitVideoHook.vue';
</script>

<style scoped>
.hero { padding: 38px 0 34px; }
.hero .wrap { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 40px; align-items: stretch; }
.copy { display: flex; flex-direction: column; justify-content: space-between; }
.hero-visual { display: flex; flex-direction: column; gap: 16px; justify-content: space-between; }
.kicker { display: inline-block; font-size: 13px; font-weight: 700; color: var(--orange-ink); background: var(--orange-soft); border-radius: 999px; padding: 6px 12px; margin-bottom: 14px; align-self: flex-start; }
.hero h1 { font-size: clamp(28px, 4.4vw, 46px); font-weight: 800; line-height: 1.15; letter-spacing: -0.025em; }
.sub { margin-top: 14px; font-size: 17px; color: var(--muted); max-width: 52ch; }
.cta { margin-top: 20px; display: grid; gap: 10px; justify-items: start; }
.big { min-height: 56px; font-size: 18px; padding: 14px 28px; }
.hint { font-size: 15px; color: var(--muted); }

.value-cards {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}
.val-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  transition: transform .15s ease, border-color .15s ease;
}
.val-card:hover {
  border-color: var(--green);
  transform: translateY(-1px);
}
.val-icon {
  font-size: 20px;
  line-height: 1;
  background: var(--green-soft);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.val-text b {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 2px;
}
.val-text p {
  margin: 0;
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.35;
}

.hero-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(28, 51, 37, 0.05) 0%, rgba(45, 90, 61, 0.08) 100%);
  border: 1px solid var(--green-soft);
  border-radius: 16px;
  text-align: center;
}
.stat-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--green-d);
}
.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.25;
}

.route { list-style: none; margin: 0; padding: 22px; display: grid; gap: 0; background: var(--card); border: 1px solid var(--line); border-radius: 22px; position: relative; }
.route li { display: grid; grid-template-columns: 44px 1fr; gap: 14px; align-items: center; padding: 12px 0; position: relative; }
.route li:not(:last-child)::after { content: ''; position: absolute; left: 21px; top: 50px; bottom: -12px; width: 2px; background: repeating-linear-gradient(180deg, var(--green) 0 6px, transparent 6px 11px); opacity: .6; }
.pin { width: 44px; height: 44px; border-radius: 50%; background: var(--green-soft); border: 2px solid var(--green); color: var(--green-d); font-weight: 800; font-size: 18px; display: grid; place-items: center; }
.pin.pot { background: var(--orange); border-color: var(--orange); position: relative; }
.pin.pot::after { content: ''; width: 18px; height: 10px; border: 3px solid #fff; border-top: 0; border-radius: 0 0 10px 10px; }
.route b { display: block; font-size: 18px; }
.route small { display: block; font-size: 15px; color: var(--muted); }

@media (max-width: 900px) {
  .hero .wrap { grid-template-columns: minmax(0, 1fr); gap: 24px; }
}
@media (max-width: 480px) {
  .big { width: 100%; }
  .hero-stats { grid-template-columns: 1fr; gap: 8px; }
}
</style>
