<template>
  <div
    ref="stageRef"
    class="box3d-stage"
    :class="{
      'is-open': isOpen,
      'is-lite': liteMode,
      'is-scroll-css': cssScrollSupported && !liteMode
    }"
    :style="stageStyle"
  >
    <div class="box3d-toolbar">
      <div class="box3d-status">
        <span class="temp-pill num">❄️ 0°C – 4°C</span>
        <span class="hint-text">
          {{ liteMode ? 'Chạm để mở lớp nguyên liệu bên trong' : 'Cuộn trang hoặc chạm để xoay & mở nắp hộp' }}
        </span>
      </div>
      <div class="box3d-controls">
        <button
          type="button"
          class="box-ctrl-btn"
          :aria-pressed="isOpen ? 'true' : 'false'"
          @click="toggleOpen"
        >
          {{ isOpen ? 'Đóng nắp hộp' : 'Mở nắp hộp 3D' }}
        </button>
        <button
          v-if="!liteMode"
          type="button"
          class="box-ctrl-btn ghost"
          @click="cycleAngle"
        >
          ↻ Góc nhìn ({{ angleLabel }})
        </button>
      </div>
    </div>

    <div
      class="box3d-viewport"
      @pointermove="onStageMove"
      @pointerleave="onStageLeave"
      @click="toggleOpen"
    >
      <!-- Chế độ siêu nhẹ cho Zalo Mini App / Mobile nhỏ / Reduced Motion -->
      <div v-if="liteMode" class="lite-box">
        <div class="lite-lid" :class="{ open: isOpen }">
          <div class="lid-brand">MOVA FRESH · THÙNG CÁCH NHIỆT 3 LỚP</div>
          <span class="lid-chip">{{ isOpen ? 'Đang mở' : 'Chạm để mở' }}</span>
        </div>
        <div class="lite-layers">
          <div
            v-for="(layer, idx) in layers"
            :key="layer.id"
            class="lite-layer"
            :style="{ '--idx': idx }"
          >
            <span class="l-badge">{{ layer.tag }}</span>
            <div class="l-text">
              <b>{{ layer.title }}</b>
              <small>{{ layer.desc }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Sân khấu CSS 3D tương tác (Desktop & Mobile trình duyệt chuẩn) -->
      <div v-else class="cube-scene" :style="cubeTransform">
        <!-- Bóng đổ dưới sàn 3D -->
        <div class="box-floor-shadow" aria-hidden="true"></div>

        <!-- Khung hộp cách nhiệt -->
        <div class="carton-body">
          <div class="face face-front">
            <img :src="logoUrl" alt="MOVA FRESH" class="box-logo" />
            <span class="face-stamp">ĐẮK LẮK → TP.HCM · 0–4°C</span>
          </div>
          <div class="face face-side">
            <span class="side-badge">BB-THUNG-01</span>
            <span class="side-sub">3 lớp giữ nhiệt 6 giờ</span>
          </div>
          <div class="face face-inner"></div>
        </div>

        <!-- Nắp hộp mở lên theo tiến trình cuộn hoặc nút bấm -->
        <div class="carton-lid">
          <div class="lid-top">
            <span class="lid-tape">NIÊM PHONG CHUỖI LẠNH MOVA</span>
          </div>
        </div>

        <!-- 4 tầng nguyên liệu bung độ sâu 3D khi mở nắp -->
        <div class="exploded-stack">
          <div
            v-for="(layer, idx) in layers"
            :key="layer.id"
            class="stack-layer"
            :class="`layer-${idx}`"
          >
            <span class="layer-pill">{{ layer.tag }}</span>
            <div class="layer-copy">
              <b>{{ layer.title }}</b>
              <small>{{ layer.desc }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chú thích 4 lớp rõ ràng -->
    <div class="box3d-legend">
      <div v-for="layer in layers" :key="layer.id" class="legend-item">
        <span class="legend-dot" :style="{ background: layer.color }"></span>
        <span><b>{{ layer.title }}:</b> {{ layer.short }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { isZaloMiniApp } from '../../services/zaloMiniApp';
import { figmaImg } from '../../shared/utils/assets';

const logoUrl = figmaImg('brand-logo-full.svg');

const layers = [
  {
    id: 'protein',
    tag: 'Tầng 1 · Hút chân không',
    title: 'Đạm tươi sơ chế Đắk Lắk',
    desc: 'Thịt heo thảo mộc, bò Chư Sê, cá bớp Vũng Tàu định lượng chuẩn gram.',
    short: 'Cắt sẵn, dán nhãn màu mát/đông',
    color: '#C43A14'
  },
  {
    id: 'greens',
    tag: 'Tầng 2 · Ngăn mát 0–4°C',
    title: 'Rau củ sạch & Trái cây IQF',
    desc: 'Rau hữu cơ rửa sạch cắt khúc; chuối chín cây hoặc vải thiều IQF.',
    short: 'Sơ chế 100%, không cần rửa lại',
    color: '#087A4D'
  },
  {
    id: 'sauce',
    tag: 'Tầng 3 · Độc quyền',
    title: 'Gói xốt MOVA đặc biệt',
    desc: 'Pha sẵn chuẩn vị từng món; không đóng gói mắm muối dầu ăn thừa thãi.',
    short: '1 chảo 15 phút, không cần nêm',
    color: '#F89122'
  },
  {
    id: 'gel',
    tag: 'Tầng đáy · Bảo ôn',
    title: 'Đá gel -18°C & Túi xốp bạc',
    desc: 'Giữ nhiệt độ 0–4°C ổn định suốt chuyến xe lạnh xuyên đêm.',
    short: 'An toàn thực phẩm suốt 16 giờ',
    color: '#1D6FA5'
  }
];

const stageRef = ref(null);
const manualOpen = ref(null); // null = theo cuộn trang, true/false = người dùng tự chọn
const scrollProgress = ref(0.55); // 0..1
const angleIdx = ref(0);
const hoverTilt = ref({ rx: 0, ry: 0 });
const liteMode = ref(false);
const cssScrollSupported = ref(false);

const angles = [
  { label: 'Mặc định', rx: -18, ry: -22 },
  { label: 'Chính diện', rx: -10, ry: 0 },
  { label: 'Từ trên', rx: -32, ry: 18 }
];

const angleLabel = computed(() => angles[angleIdx.value].label);
const isOpen = computed(() => (manualOpen.value !== null ? manualOpen.value : scrollProgress.value >= 0.32));
const effectiveProgress = computed(() => {
  if (manualOpen.value === true) return 1;
  if (manualOpen.value === false) return 0;
  return scrollProgress.value;
});

const stageStyle = computed(() => ({
  '--open-p': effectiveProgress.value.toFixed(3)
}));

const cubeTransform = computed(() => {
  const base = angles[angleIdx.value];
  const rx = base.rx + hoverTilt.value.rx;
  const ry = base.ry + hoverTilt.value.ry;
  return {
    transform: `rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)`
  };
});

function toggleOpen() {
  manualOpen.value = !isOpen.value;
}

function cycleAngle() {
  angleIdx.value = (angleIdx.value + 1) % angles.length;
}

function onStageMove(e) {
  if (liteMode.value) return;
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) return;
  const rect = e.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  hoverTilt.value = {
    rx: -py * 10,
    ry: px * 14
  };
}

function onStageLeave() {
  hoverTilt.value = { rx: 0, ry: 0 };
}

let observer = null;
function updateScrollProgress() {
  if (!stageRef.value || liteMode.value) return;
  const rect = stageRef.value.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  // Khi hộp đi từ mép dưới lên giữa màn hình -> tiến trình mở từ 0 -> 1
  const raw = (vh * 0.88 - rect.top) / (vh * 0.52);
  scrollProgress.value = Math.max(0, Math.min(1, raw));
}

onMounted(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const smallMobile = window.innerWidth < 640;
  liteMode.value = Boolean(isZaloMiniApp() || reduced || smallMobile);
  cssScrollSupported.value = typeof CSS !== 'undefined' && CSS.supports?.('(animation-timeline: view()) and (animation-range: entry)');

  if (reduced) {
    manualOpen.value = true;
    return;
  }

  if (!liteMode.value && typeof IntersectionObserver !== 'undefined' && stageRef.value) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) {
        window.addEventListener('scroll', updateScrollProgress, { passive: true });
        updateScrollProgress();
      } else {
        window.removeEventListener('scroll', updateScrollProgress);
      }
    }, { threshold: 0 });
    observer.observe(stageRef.value);
    updateScrollProgress();
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  window.removeEventListener('scroll', updateScrollProgress);
});
</script>

<style scoped>
.box3d-stage {
  background: rgba(255, 253, 248, 0.94);
  border: 1.5px solid rgba(40, 37, 31, 0.14);
  border-radius: 22px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-hero);
  color: var(--ink-dark);
}

.box3d-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.box3d-status {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.temp-pill {
  background: var(--blue-soft);
  color: var(--blue-ink);
  border: 1px solid var(--blue-line);
  font-size: 12.5px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
}

.hint-text {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.box3d-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.box-ctrl-btn {
  min-height: 38px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--green-d);
  background: var(--green-d);
  color: var(--text-on-primary);
  font-size: 13px;
  font-weight: 700;
  transition: background .15s ease, transform .15s ease;
}

.box-ctrl-btn:hover {
  background: var(--green-dd);
}

.box-ctrl-btn.ghost {
  background: var(--white);
  color: var(--ink-dark);
  border-color: var(--line-strong);
}

.box-ctrl-btn.ghost:hover {
  background: var(--cream-warm);
}

.box3d-viewport {
  position: relative;
  min-height: 360px;
  display: grid;
  place-items: center;
  perspective: 1150px;
  overflow: hidden;
  border-radius: 16px;
  background: radial-gradient(circle at 50% 35%, #FFFDF8 0%, #F4EFE0 72%, #EAE2CF 100%);
  border: 1px solid var(--line-2);
  padding: 28px 16px;
  cursor: pointer;
}

/* Sân khấu CSS 3D */
.cube-scene {
  position: relative;
  width: min(420px, 88%);
  height: 290px;
  transform-style: preserve-3d;
  transition: transform .35s cubic-bezier(.22, 1, .36, 1);
  will-change: transform;
}

.box-floor-shadow {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 6px;
  height: 38px;
  background: radial-gradient(ellipse at center, rgba(40, 37, 31, .28) 0%, transparent 72%);
  transform: translate3d(0, 0, -40px) rotateX(84deg);
  pointer-events: none;
}

.carton-body {
  position: absolute;
  left: 50%;
  bottom: 24px;
  width: 280px;
  height: 122px;
  margin-left: -140px;
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  border-radius: 10px;
}

.face-front {
  background: linear-gradient(155deg, #FFFDF7 0%, #F2EBDC 100%);
  border: 2px solid #D3C5A8;
  transform: translate3d(0, 0, 72px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: inset 0 -6px 14px rgba(84, 63, 24, .08);
}

.box-logo {
  width: 96px;
  height: auto;
}

.face-stamp {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--forest);
  background: var(--green-soft);
  padding: 2px 9px;
  border-radius: 999px;
}

.face-side {
  width: 144px;
  left: auto;
  right: -72px;
  background: linear-gradient(180deg, #E7DEC8 0%, #D9CEB4 100%);
  border: 2px solid #C8B899;
  transform: rotateY(90deg) translate3d(0, 0, 140px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  padding: 8px;
}

.side-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--brown);
}

.side-sub {
  font-size: 10px;
  color: var(--muted);
}

.face-inner {
  background: linear-gradient(180deg, #283318 0%, #52652B 100%);
  border: 2px solid #C8B899;
  transform: translate3d(0, 0, -72px);
}

/* Nắp hộp quay mở theo biến --open-p (0 -> 1) */
.carton-lid {
  position: absolute;
  left: 50%;
  bottom: 142px;
  width: 288px;
  height: 146px;
  margin-left: -144px;
  transform-origin: center top;
  transform: translate3d(0, 0, -72px) rotateX(calc(90deg - var(--open-p, 0.5) * 118deg));
  transform-style: preserve-3d;
  transition: transform .42s cubic-bezier(.22, 1, .36, 1);
  pointer-events: none;
}

.lid-top {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #087A4D 0%, #0B9C63 100%);
  border: 2px solid #065F3C;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(6, 95, 60, .2);
}

.lid-tape {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--text-on-primary);
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.32);
  padding: 5px 12px;
  border-radius: 999px;
}

/* Các tầng nguyên liệu bung độ sâu khi mở hộp */
.exploded-stack {
  position: absolute;
  left: 50%;
  bottom: 66px;
  width: 310px;
  margin-left: -155px;
  display: grid;
  gap: 8px;
  transform-style: preserve-3d;
  pointer-events: none;
}

.stack-layer {
  background: rgba(255, 255, 255, 0.96);
  border: 1.5px solid var(--line-strong);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 20px rgba(40, 37, 31, 0.12);
  transition: transform .45s cubic-bezier(.22, 1, .36, 1), opacity .35s ease;
}

.stack-layer.layer-0 {
  transform: translate3d(0, calc(var(--open-p, 0.5) * -118px), calc(var(--open-p, 0.5) * 64px));
  border-left: 5px solid #C43A14;
}
.stack-layer.layer-1 {
  transform: translate3d(0, calc(var(--open-p, 0.5) * -80px), calc(var(--open-p, 0.5) * 44px));
  border-left: 5px solid #087A4D;
}
.stack-layer.layer-2 {
  transform: translate3d(0, calc(var(--open-p, 0.5) * -42px), calc(var(--open-p, 0.5) * 26px));
  border-left: 5px solid #F89122;
}
.stack-layer.layer-3 {
  transform: translate3d(0, calc(var(--open-p, 0.5) * -6px), calc(var(--open-p, 0.5) * 10px));
  border-left: 5px solid #1D6FA5;
}

.layer-pill {
  font-size: 10px;
  font-weight: 800;
  color: var(--ink-dark);
  background: var(--cream);
  border: 1px solid var(--line);
  padding: 3px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.layer-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.layer-copy b {
  font-size: 12.5px;
  color: var(--ink-dark);
}

.layer-copy small {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Chế độ siêu nhẹ cho ZMP / Mobile nhỏ (GPU translate3d, không 3D nặng) */
.lite-box {
  width: 100%;
  display: grid;
  gap: 10px;
}

.lite-lid {
  background: var(--green-d);
  color: var(--text-on-primary);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  transition: transform .25s ease;
}

.lite-lid.open {
  transform: translate3d(0, -3px, 0);
}

.lid-brand {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.lid-chip {
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.lite-layers {
  display: grid;
  gap: 8px;
}

.lite-layer {
  background: var(--white);
  border: 1px solid var(--line);
  border-left: 4px solid var(--green-d);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  transition: transform .24s ease, opacity .24s ease;
}

.box3d-stage.is-open .lite-layer {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}

.box3d-stage:not(.is-open) .lite-layer {
  transform: translate3d(0, calc(var(--idx, 0) * -4px), 0);
  opacity: 0.82;
}

.l-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
}

.l-text b {
  display: block;
  font-size: 13.5px;
  color: var(--ink-dark);
}

.l-text small {
  font-size: 12px;
  color: var(--muted);
}

/* Chú thích chân sân khấu */
.box3d-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-2);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-dark);
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .box3d-stage {
    padding: 14px;
  }
  .box3d-viewport {
    min-height: 220px;
    padding: 16px 12px;
  }
  .box3d-legend {
    grid-template-columns: 1fr;
  }
}
</style>
