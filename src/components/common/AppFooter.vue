<template>
  <footer class="site-footer">
    <!-- Dải trên — Đăng ký bản tin Đầu bếp MOVA -->
    <div class="newsletter-strip">
      <div class="wrap newsletter-inner">
        <div class="newsletter-left">
          <span class="nl-icon">👨‍🍳</span>
          <div class="nl-texts">
            <h3 class="nl-title">Đăng ký nhận bản tin công thức Đầu bếp MOVA</h3>
            <p class="nl-desc">
              Nhận thực đơn tuần mới mỗi thứ Năm &amp; <b>tặng ngay +15.000đ điểm bữa ăn</b> vào tài khoản Fresh Credit khi đặt gói.
            </p>
          </div>
        </div>

        <form class="newsletter-form" @submit.prevent="submitNewsletter">
          <input
            v-model="emailInput"
            type="email"
            class="nl-input"
            placeholder="Nhập email của bạn..."
            required
            :disabled="subscribed"
          />
          <button type="submit" class="nl-btn" :disabled="subscribed">
            {{ subscribed ? '✓ Đã đăng ký' : 'Đăng ký nhận công thức' }}
          </button>
        </form>
      </div>
      <div v-if="subscribed" class="wrap nl-success-msg">
        ✓ Cảm ơn bạn! Đầu bếp MOVA đã ghi nhận email <b>{{ emailInput }}</b> và cộng ngay +15.000đ Fresh Credit vào tài khoản của bạn.
      </div>
    </div>

    <!-- Thân Footer 4 cột cân đối -->
    <div class="wrap footer-main-body">
      <div class="footer-grid">
        <!-- Cột 1: MOVA FRESH -->
        <div class="f-col col-brand">
          <router-link to="/" class="f-logo" aria-label="MOVA FRESH">
            <BrandLogo variant="onWhite" :width="110" />
            <div class="f-logo-text">
              <span class="f-city-tag">TP.HCM</span>
            </div>
          </router-link>
          <p class="f-tagline">{{ BRAND_TAGLINE }}</p>

          <p class="f-brand-desc">
            Nông sản sơ chế sạch 100% từ Đắk Lắk, xe lạnh 0–4°C giao sáng tận bếp TP.HCM. Giải pháp bữa ăn tiện lợi cho người bận rộn: <b>15 phút — 1 chảo</b>.
          </p>

          <nav class="f-links" aria-label="Liên kết chính">
            <router-link to="/">Trang chủ</router-link>
            <router-link to="/menus">Thực đơn tuần</router-link>
            <router-link to="/plans">Thiết kế thực đơn</router-link>
            <router-link to="/account">Quản lý tài khoản</router-link>
          </nav>
        </div>

        <!-- Cột 2: Hỗ trợ & Pháp lý -->
        <div class="f-col">
          <h4 class="f-col-title">Hỗ trợ &amp; Pháp lý</h4>
          <nav class="f-links" aria-label="Chính sách và pháp lý">
            <router-link to="/faq">Trung tâm Hỏi đáp (FAQs)</router-link>
            <router-link to="/terms">Điều khoản giao dịch</router-link>
            <router-link to="/refund-policy">Chính sách hoàn tiền 7 ngày</router-link>
            <router-link to="/privacy">Chính sách bảo mật</router-link>
            <router-link to="/q/demo">Tra cứu nguồn gốc lô hàng</router-link>
          </nav>
        </div>

        <!-- Cột 3: Phương thức thanh toán -->
        <div class="f-col col-payment">
          <h4 class="f-col-title">Phương thức thanh toán</h4>
          <p class="f-pay-desc">
            Thanh toán trả trước 100% không dùng tiền mặt (Zero COD), đảm bảo dòng tiền lành mạnh theo NĐ 52/2024/NĐ-CP.
          </p>

          <div class="payment-badges-grid" aria-label="Các phương thức thanh toán hỗ trợ">
            <!-- VietQR -->
            <div class="pay-badge" title="Chuyển khoản VietQR động">
              <span class="pay-txt vietqr">Viet<b>QR</b></span>
            </div>
            <!-- MoMo -->
            <div class="pay-badge" title="Ví điện tử MoMo">
              <span class="pay-txt momo">mo<b>mo</b></span>
            </div>
            <!-- ZaloPay -->
            <div class="pay-badge" title="Ví điện tử ZaloPay">
              <span class="pay-txt zalopay">Zalo<b>Pay</b></span>
            </div>
            <!-- VNPAY -->
            <div class="pay-badge" title="Cổng thanh toán VNPAY-QR">
              <span class="pay-txt vnpay">VN<b>PAY</b></span>
            </div>
            <!-- Visa -->
            <div class="pay-badge" title="Thẻ quốc tế Visa">
              <span class="pay-txt visa">VISA</span>
            </div>
            <!-- Mastercard -->
            <div class="pay-badge" title="Thẻ quốc tế Mastercard">
              <span class="pay-txt mc">mastercard</span>
            </div>
          </div>

          <p class="f-sec-note">
            🔒 Bảo mật SSL/TLS 256-bit · Hủy liên kết thẻ 1 chạm bất kỳ lúc nào.
          </p>
        </div>

        <!-- Cột 4: Vận hành & Liên hệ -->
        <div class="f-col col-contact">
          <h4 class="f-col-title">Vận hành &amp; Liên hệ</h4>
          <div class="f-contact-items">
            <div class="contact-item">
              <span class="c-ico">🏭</span>
              <div>
                <b>Xưởng sơ chế trung tâm Đắk Lắk:</b>
                <span>Xã Hòa Thắng, TP. Buôn Ma Thuột, Đắk Lắk</span>
              </div>
            </div>

            <div class="contact-item">
              <span class="c-ico">❄️</span>
              <div>
                <b>Kho lạnh phân phối TP.HCM:</b>
                <span>Phường Tân Phong, Quận 7, TP. Hồ Chí Minh</span>
              </div>
            </div>

            <div class="contact-item">
              <span class="c-ico">📞</span>
              <div>
                <b>Hotline hỗ trợ bếp:</b>
                <a href="tel:19008899" class="hotline-link">1900 8899</a>
                <small>(06:00 – 21:00 hàng ngày)</small>
              </div>
            </div>

            <div class="contact-item">
              <span class="c-ico">💬</span>
              <div>
                <b>Zalo Official Account:</b>
                <span>MOVA FRESH Official</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chân Footer: Bản quyền & Link nhanh -->
    <div class="footer-bottom">
      <div class="wrap footer-bottom-inner">
        <p class="copyright-line">
          © 2026 MOVA FRESH Việt Nam. Bảo lưu mọi quyền. Tuân thủ NĐ 52/2024/NĐ-CP &amp; Thông tư 99/2025/TT-BTC.
        </p>
        <div class="bottom-quick-links">
          <router-link to="/terms">Điều khoản</router-link>
          <span>•</span>
          <router-link to="/privacy">Bảo mật</router-link>
          <span>•</span>
          <router-link to="/refund-policy">Hoàn tiền 7 ngày</router-link>
          <span>•</span>
          <router-link to="/faq">Hỏi đáp</router-link>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import BrandLogo from './BrandLogo.vue';
import { BRAND_TAGLINE } from '../../shared/config/brandLogo';

const store = useMovaStore();
const emailInput = ref('');
const subscribed = ref(false);

function submitNewsletter() {
  if (!emailInput.value || !emailInput.value.includes('@')) return;
  subscribed.value = true;
  // Cộng thưởng promo credit nếu khách đã đăng nhập
  if (store.isLoggedIn && store.balance) {
    store.balance.promo_vnd = (store.balance.promo_vnd || 0) + 15000;
    store.balance.total_vnd = (store.balance.real_vnd || 0) + store.balance.promo_vnd;
  }
}
</script>

<style scoped>
.site-footer {
  background: var(--white);
  border-top: 1px solid var(--line);
  color: var(--ink);
  font-size: 13.5px;
}

/* Dải Newsletter */
.newsletter-strip {
  background: var(--green-tint);
  border-bottom: 1px solid var(--green-line);
  padding: 24px 0;
}
.newsletter-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.newsletter-left {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 580px;
}
.nl-icon {
  font-size: 32px;
  flex-shrink: 0;
}
.nl-texts {
  display: grid;
  gap: 2px;
}
.nl-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--green-dd);
  margin: 0;
}
.nl-desc {
  font-size: 13px;
  color: var(--green-d);
  margin: 0;
  line-height: 1.4;
}
.newsletter-form {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 440px;
}
.nl-input {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--green-line);
  border-radius: 12px;
  font-size: 14px;
  background: var(--white);
  outline: none;
}
.nl-input:focus {
  border-color: var(--green);
}
.nl-btn {
  min-height: 44px;
  padding: 0 16px;
  background: var(--green-d);
  color: var(--white);
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease;
}
.nl-btn:hover:not(:disabled) {
  background: var(--green-dd);
}
.nl-btn:disabled {
  background: var(--green);
  cursor: default;
}
.nl-success-msg {
  margin-top: 10px;
  font-size: 13px;
  color: var(--green-d);
  font-weight: 600;
}

/* Thân Footer 4 cột */
.footer-main-body {
  padding: 40px 0 36px;
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr 1.1fr 1.3fr;
  gap: 32px;
}
@media (max-width: 960px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 28px;
  }
}
@media (max-width: 640px) {
  .newsletter-card {
    padding: 16px;
    gap: 14px;
  }
  .newsletter-form {
    flex-direction: column;
    width: 100%;
    max-width: 100%;
  }
  .nl-btn {
    width: 100%;
  }
}
@media (max-width: 560px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.f-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.f-col-title {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  letter-spacing: 0.02em;
}

.f-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.f-logo-text {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-tagline {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--green-d);
}
.f-city-tag {
  font-size: 10px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 2px 6px;
  border-radius: 6px;
}
.f-brand-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
}

.f-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.f-links a {
  color: var(--ink-2);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: color 0.15s ease, transform 0.15s ease;
  width: fit-content;
}
.f-links a:hover {
  color: var(--green-d);
  transform: translateX(2px);
}

.f-pay-desc {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

/* Payment badges */
.payment-badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pay-badge {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.pay-txt {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.2px;
}
.pay-txt.vietqr { color: var(--pay-vietqr); }
.pay-txt.momo { color: var(--pay-momo); font-size: 13px; }
.pay-txt.zalopay { color: var(--pay-zalo); }
.pay-txt.vnpay { color: var(--blue); }
.pay-txt.visa { color: var(--pay-visa); font-weight: 900; font-size: 13px; font-style: italic; }
.pay-txt.mc { color: var(--pay-mc); font-size: 10px; text-transform: lowercase; }

.f-sec-note {
  font-size: 11.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

/* Contact items */
.f-contact-items {
  display: grid;
  gap: 10px;
}
.contact-item {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.4;
}
.c-ico {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}
.contact-item b {
  display: block;
  color: var(--ink);
  font-size: 12px;
}
.contact-item span {
  color: var(--muted);
}
.hotline-link {
  color: var(--orange-ink);
  font-weight: 800;
  font-size: 14px;
  text-decoration: none;
  margin-right: 4px;
}
.contact-item small {
  color: var(--muted);
  font-size: 11px;
}

/* Chân Footer */
.footer-bottom {
  border-top: 1px solid var(--line-2);
  padding: 16px 0;
  font-size: 12px;
  color: var(--muted);
}
.footer-bottom-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.copyright-line {
  margin: 0;
}
.bottom-quick-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bottom-quick-links a {
  color: var(--muted);
  text-decoration: none;
}
.bottom-quick-links a:hover {
  color: var(--green-d);
}
</style>
