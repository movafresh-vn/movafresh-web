<template>
  <section class="hero" :class="{ 'is-lite': isLite }">
    <div class="hero-ambient" aria-hidden="true">
      <div class="ring ring-gold"></div>
      <div class="ring ring-green"></div>
    </div>

    <div class="wrap">
      <div class="copy">
        <span class="kicker">
          <span class="kicker-dot" aria-hidden="true"></span>
          NGUYÊN LIỆU SƠ CHẾ SẴN TỪ ĐẮK LẮK • GIAO TẬN CỬA TP.HCM
        </span>

        <h1>
          Mâm cơm nhà bạn, do Đầu bếp thiết kế riêng,
          <span class="h1-accent">nấu xong trong 15 phút.</span>
        </h1>

        <p class="sub">
          Đắk Lắk, xe lạnh xuyên đêm, tận cửa nhà bạn. Đầu bếp MOVA tuyển chọn thực đơn theo số người ăn, khẩu vị và thể trạng gia đình bạn, sơ chế sạch sẽ 100% và giao tận cửa.
        </p>

        <div class="cta">
          <div class="cta-row">
            <BaseButton tag="router-link" to="/plans" variant="orange" class="big cta-primary">
              Thiết kế thực đơn của tôi
            </BaseButton>
            <BaseButton tag="router-link" to="/menus" variant="secondary" class="big">
              Xem thực đơn tuần
            </BaseButton>
          </div>
          <p class="hint">Mất khoảng 1–2 phút. Bạn xem thực đơn trước, hài lòng rồi mới trả tiền.</p>
        </div>

        <!-- 3 Thẻ giá trị cốt lõi -->
        <div class="value-cards">
          <div class="val-card">
            <span class="val-icon" aria-hidden="true"><Clock :size="20" :stroke-width="2" /></span>
            <div class="val-text">
              <b>Chuẩn 15 phút – 1 chảo</b>
              <p>Sơ chế sạch 100%, định lượng sẵn, không cần đi chợ hay nhặt rau.</p>
            </div>
          </div>
          <div class="val-card">
            <span class="val-icon" aria-hidden="true"><Snowflake :size="20" :stroke-width="2" /></span>
            <div class="val-text">
              <b>Chuỗi xe lạnh 16 giờ</b>
              <p>Giữ mát 0°C – 4°C xuyên đêm từ Đắk Lắk tận cửa bếp.</p>
            </div>
          </div>
          <div class="val-card">
            <span class="val-icon" aria-hidden="true"><Sparkles :size="20" :stroke-width="2" /></span>
            <div class="val-text">
              <b>Gói xốt MOVA đặc biệt</b>
              <p>Định lượng chuẩn gram, gia vị độc quyền tách riêng từng món.</p>
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

      <!-- Right Column: Multi-Layer 3D Depth Stage -->
      <div class="hero-visual">
        <div
          class="hero-stage-perspective"
          @pointermove="tilt.onPointerMove"
          @pointerleave="tilt.onPointerLeave"
        >
          <div class="hero-stage-3d" :style="stageStyle">
            <!-- Base media showcase layer -->
            <div class="stage-main">
              <MealKitVideoHook />
            </div>

            <!-- Layer 1: Floating Harvest Gold badge -->
            <div class="depth-seal" aria-hidden="true">
              <span class="seal-eyebrow">CHUẨN BẾP MOVA</span>
              <strong>5 Món • 15'</strong>
              <span class="seal-sub">Gói 4 tuần ổn định</span>
            </div>

            <!-- Layer 2: Top-left 3D chip -->
            <div class="depth-chip chip-cook">
              <span class="chip-icon" aria-hidden="true"><Clock :size="18" :stroke-width="2" /></span>
              <div>
                <strong>Chuẩn 15 phút – 1 chảo</strong>
                <small>Nấu nhanh, ít rửa dọn</small>
              </div>
            </div>

            <!-- Layer 3: Bottom-right cold chain chip -->
            <div class="depth-chip chip-cold">
              <span class="chip-icon" aria-hidden="true"><Snowflake :size="18" :stroke-width="2" /></span>
              <div>
                <strong>Xe lạnh 0–4°C Đắk Lắk</strong>
                <small>Xuyên đêm 16h về TP.HCM</small>
              </div>
            </div>

            <!-- Layer 4: Transparent Figma Basket Cutout protruding forward -->
            <div class="cutout-layer" aria-hidden="true">
              <img
                :src="basketCutout"
                alt=""
                class="basket-cutout"
                loading="eager"
                decoding="async"
              />
              <span class="depth-pill-clean"><Check :size="14" :stroke-width="2.6" /> Sơ chế sạch 100%</span>
            </div>
          </div>
        </div>

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
import { computed } from 'vue';
import { Check, Clock, Snowflake, Sparkles } from 'lucide-vue-next';
import MealKitVideoHook from './MealKitVideoHook.vue';
import BaseButton from '../ui/BaseButton.vue';
import { use3dTilt } from '../../composables/use3dTilt';
import { isZaloMiniApp } from '../../services/zaloMiniApp';
import { figmaImg } from '../../shared/utils/assets';

const isLite = computed(() => isZaloMiniApp());
const basketCutout = figmaImg('produce-basket-cutout.png');

const tilt = use3dTilt({ maxTilt: 6, glareOpacity: 0.12 });

const stageStyle = computed(() => {
  if (!tilt.enabled.value) return {};
  return {
    transform: tilt.state.active
      ? `rotateX(${tilt.state.rx.toFixed(2)}deg) rotateY(${tilt.state.ry.toFixed(2)}deg)`
      : 'rotateX(0deg) rotateY(0deg)'
  };
});
</script>

<style scoped>
.hero {
  position: relative;
  padding: 36px 0 42px;
  overflow: hidden;
  background: radial-gradient(circle at 84% 22%, rgba(217, 175, 8, 0.14) 0%, transparent 45%),
    radial-gradient(circle at 12% 82%, rgba(11, 156, 99, 0.08) 0%, transparent 42%),
    var(--bg);
}

.hero-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ring {
  position: absolute;
  border-radius: 50%;
}

.ring-gold {
  width: 520px;
  height: 520px;
  top: -140px;
  right: -90px;
  border: 2px dashed rgba(217, 175, 8, 0.28);
}

.ring-green {
  width: 340px;
  height: 340px;
  bottom: -140px;
  left: -80px;
  border: 1.5px solid rgba(11, 156, 99, 0.14);
}

.hero .wrap {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--red-orange-d);
  background: var(--orange-soft);
  border: 1px solid var(--amber-line);
  border-radius: 999px;
  padding: 7px 14px;
  margin-bottom: 16px;
  align-self: flex-start;
}

.kicker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  flex-shrink: 0;
}

.hero h1 {
  font-size: clamp(30px, 4.1vw, 52px);
  font-weight: 800;
  line-height: 1.09;
  letter-spacing: -0.025em;
  color: var(--ink);
}

.h1-accent {
  display: inline-block;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 700;
  color: var(--red-orange-d);
}

.sub {
  margin-top: 16px;
  font-size: 17px;
  line-height: 1.58;
  color: var(--muted);
  max-width: 52ch;
}

.cta {
  margin-top: 22px;
  display: grid;
  gap: 10px;
  justify-items: start;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.big {
  min-height: 54px;
  font-size: 16.5px;
  padding: 13px 26px;
}

.cta-primary {
  background: var(--red-orange-d) !important;
  border-color: var(--red-orange-d) !important;
  color: var(--text-on-accent) !important;
  box-shadow: 0 10px 24px rgba(196, 58, 20, 0.24);
}

.cta-primary:hover {
  background: var(--red-orange-dd) !important;
  border-color: var(--red-orange-dd) !important;
}

.hint {
  font-size: 14px;
  color: var(--muted);
}

.value-cards {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.val-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.val-card:hover {
  border-color: var(--green);
  transform: translate3d(0, -2px, 0);
  box-shadow: var(--shadow-md);
}

.val-icon {
  background: var(--green-soft);
  color: var(--green-d);
  width: 38px;
  height: 38px;
  border-radius: 11px;
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
  line-height: 1.38;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
  padding: 15px 16px;
  background: var(--forest);
  color: var(--text-on-olive);
  border-radius: var(--r-card);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.stat-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-num {
  font-size: 23px;
  font-weight: 800;
  color: var(--harvest-gold);
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.25;
}

/* Right Column: Multi-Layer 3D Depth Stage */
.hero-visual {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.hero-stage-perspective {
  perspective: 1250px;
  padding: 18px 10px 26px;
}

.hero-stage-3d {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.stage-main {
  transform: translate3d(0, 0, 18px);
}

.depth-seal {
  position: absolute;
  top: -18px;
  right: -8px;
  z-index: 8;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: var(--harvest-gold);
  color: var(--text-on-yellow);
  border: 3px solid var(--card);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  transform: translate3d(0, 0, 62px) rotate(-6deg);
}

.seal-eyebrow {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  opacity: 0.85;
}

.depth-seal strong {
  font-size: 16.5px;
  font-weight: 800;
  line-height: 1.15;
  margin: 2px 0;
}

.seal-sub {
  font-size: 10px;
  font-weight: 700;
}

.depth-chip {
  position: absolute;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 9px 13px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(8px);
}

.chip-cook {
  top: 72px;
  left: -18px;
  transform: translate3d(0, 0, 52px);
}

.chip-cold {
  right: -10px;
  bottom: -16px;
  transform: translate3d(0, 0, 48px);
}

.chip-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--green-soft);
  color: var(--green-d);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.depth-chip strong {
  display: block;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.2;
}

.depth-chip small {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.cutout-layer {
  position: absolute;
  left: -18px;
  bottom: -24px;
  z-index: 9;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
  transform: translate3d(0, 0, 68px);
}

.basket-cutout {
  width: 116px;
  height: auto;
  filter: drop-shadow(0 14px 20px rgba(40, 37, 31, 0.28));
}

.depth-pill-clean {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-d);
  color: var(--text-on-primary);
  border: 2px solid var(--card);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: var(--shadow-md);
  margin-bottom: 12px;
}

@supports ((animation-timeline: view()) and (animation-range: entry)) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 769px) {
    .hero:not(.is-lite) .cutout-layer {
      animation: hero-parallax-float linear both;
      animation-timeline: view();
      animation-range: entry 0% exit 100%;
    }
    @keyframes hero-parallax-float {
      from {
        transform: translate3d(0, 8px, 68px);
      }
      to {
        transform: translate3d(0, -10px, 68px);
      }
    }
  }
}

.route {
  list-style: none;
  margin: 0;
  padding: 20px;
  display: grid;
  gap: 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow-sm);
  position: relative;
}

.route li {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 10px 0;
  position: relative;
}

.route li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 20px;
  top: 48px;
  bottom: -10px;
  width: 2px;
  background: repeating-linear-gradient(180deg, var(--green) 0 6px, transparent 6px 11px);
  opacity: 0.6;
}

.pin {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--green-soft);
  border: 2px solid var(--green);
  color: var(--green-d);
  font-weight: 800;
  font-size: 17px;
  display: grid;
  place-items: center;
}

.pin.pot {
  background: var(--red-orange-d);
  border-color: var(--red-orange-d);
  position: relative;
}

.pin.pot::after {
  content: '';
  width: 18px;
  height: 10px;
  border: 3px solid var(--white);
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.route b {
  display: block;
  font-size: 16px;
}

.route small {
  display: block;
  font-size: 13.5px;
  color: var(--muted);
}

/* Lite / ZMP / Mobile adaptation */
.hero.is-lite .hero-stage-3d {
  transform: none !important;
  transform-style: flat;
}

@media (max-width: 960px) {
  .hero .wrap {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .hero-stage-perspective {
    padding: 14px 4px 12px;
  }
  .chip-cook {
    left: 6px;
    top: 48px;
  }
  .chip-cold {
    right: 6px;
  }
  .depth-seal {
    right: 4px;
    width: 94px;
    height: 94px;
  }
  .cutout-layer {
    left: 0;
    bottom: -16px;
  }
}

@media (max-width: 768px) {
  .hero-stage-perspective {
    perspective: none;
    padding: 12px 0 4px;
  }
  .hero-stage-3d {
    transform-style: flat;
    transform: none !important;
  }
  .stage-main {
    position: relative;
    z-index: 1;
    transform: none;
  }
  .depth-chip {
    display: none;
  }
  .depth-seal {
    z-index: 10;
    top: -10px;
    right: 4px;
    width: 82px;
    height: 82px;
    transform: rotate(-6deg);
  }
  .depth-seal strong {
    font-size: 14px;
  }
  .seal-sub {
    display: none;
  }
  .cutout-layer {
    position: relative;
    left: auto;
    bottom: auto;
    z-index: 10;
    transform: none !important;
    animation: none !important;
    margin-top: 10px;
    padding-left: 4px;
    align-items: center;
    gap: 10px;
  }
  .basket-cutout {
    width: 70px;
  }
  .depth-pill-clean {
    margin-bottom: 0;
  }
}

@media (max-width: 560px) {
  .hero {
    padding: 20px 0 28px;
  }
  .big {
    width: 100%;
  }
  .cta-row {
    width: 100%;
  }
  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 12px 10px;
  }
  .stat-num {
    font-size: 19px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-stage-3d,
  .val-card {
    transition: none;
    transform: none !important;
  }
}
</style>
