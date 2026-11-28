<template>
  <div class="video-hook-container">
    <div class="video-wrapper">
      <!-- Top Badges (left-aligned so top-right 3D Harvest Gold seal never overlaps) -->
      <div class="video-top-bar">
        <button
          type="button"
          class="play-toggle-btn"
          :aria-pressed="!isPaused"
          :aria-label="isPaused ? 'Tiếp tục trình chiếu 3 bước nấu' : 'Tạm dừng trình chiếu'"
          @click="togglePlay"
        >
          <span class="toggle-icon" aria-hidden="true">
            <Play v-if="isPaused" :size="13" />
            <Pause v-else :size="13" />
          </span>
          <span class="toggle-text">{{ isPaused ? 'Chạy tiếp' : 'Tạm dừng' }}</span>
        </button>
      </div>

      <!-- High-res Local Figma Meal Stage (Zero external 403 media) -->
      <div class="hook-stage" @click="nextPhase">
        <picture
          v-for="(scene, idx) in scenes"
          :key="scene.key"
          class="scene-layer"
          :class="{ active: currentPhase === idx }"
        >
          <img
            :src="scene.src"
            :alt="scene.alt"
            class="scene-img"
            :fetchpriority="idx === 2 ? 'high' : undefined"
            :loading="idx === 2 ? undefined : 'eager'"
            decoding="async"
          />
        </picture>

        <div class="scene-scrim" aria-hidden="true"></div>

        <!-- Caption for current cooking moment -->
        <div class="scene-caption">
          <span class="scene-chip">{{ activeScene.badge }}</span>
          <strong class="scene-title">{{ activeScene.title }}</strong>
          <p class="scene-desc">{{ activeScene.desc }}</p>
        </div>
      </div>

      <!-- 3 Time-step Timeline Overlay -->
      <div class="timeline-bar" role="tablist" aria-label="Tiến trình nấu 15 phút">
        <button
          v-for="(step, idx) in steps"
          :key="step.time"
          type="button"
          role="tab"
          :aria-selected="currentPhase === idx"
          class="timeline-step"
          :class="{ active: currentPhase === idx }"
          @click="seekToPhase(idx)"
        >
          <div class="step-progress-track">
            <div class="step-progress-fill" :style="progressStyle(idx)"></div>
          </div>
          <div class="step-info">
            <span class="step-time">{{ step.time }}</span>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Pause, Play } from 'lucide-vue-next';
import { figmaImg } from '../../shared/utils/assets';

const currentPhase = ref(2); // Khởi đầu tại mâm cơm 5 món Việt rực rỡ (00:15)
const currentTime = ref(10);
const isPaused = ref(false);
let timerId = null;

const scenes = [
  {
    key: 'unbox',
    src: figmaImg('brand-farm-harvest.webp'),
    alt: 'Nguyên liệu tươi từ nông trại Đắk Lắk sơ chế sạch 100%',
    badge: 'Đắk Lắk • Sáng nay',
    title: 'Mở hộp nguyên liệu sơ chế sạch 100%',
    desc: 'Thịt cá cắt chuẩn cỡ, rau củ nhặt rửa sạch và gói xốt định lượng sẵn.'
  },
  {
    key: 'cook',
    src: figmaImg('meal-ga-nuong-mat-ong.webp'),
    alt: 'Đảo một chảo lửa lớn cùng gói xốt MOVA đặc biệt',
    badge: 'Chỉ 1 chảo • Không bừa bếp',
    title: 'Đảo 1 chảo & rưới túi xốt MOVA',
    desc: 'Không phải băm tỏi, nêm nếm cầu kỳ; dầu sôi vào chảo là dậy mùi thơm.'
  },
  {
    key: 'serve',
    src: figmaImg('meal-mam-com-viet.webp'),
    alt: 'Hoàn thành mâm cơm Việt 5 món đủ đạm rau canh tinh bột trái cây',
    badge: '15 Phút • 5 Món Đầy Đặn',
    title: 'Trọn mâm cơm Việt 5 món nóng hổi',
    desc: 'Đủ đạm, rau, canh, tinh bột và trái cây tráng miệng cho cả nhà.'
  }
];

const steps = [
  { time: '00:00', label: 'Mở hộp Đắk Lắk sơ chế sạch', startSec: 0, endSec: 5 },
  { time: '00:05', label: 'Đảo 1 chảo & rưới túi xốt', startSec: 5, endSec: 10 },
  { time: '00:15', label: 'Xong mâm cơm 5 món', startSec: 10, endSec: 15 }
];

const activeScene = computed(() => scenes[currentPhase.value] || scenes[0]);

function updatePhaseFromTime() {
  if (currentTime.value < 5) currentPhase.value = 0;
  else if (currentTime.value < 10) currentPhase.value = 1;
  else currentPhase.value = 2;
}

function seekToPhase(idx) {
  currentPhase.value = idx;
  currentTime.value = steps[idx].startSec;
}

function nextPhase() {
  const next = (currentPhase.value + 1) % steps.length;
  seekToPhase(next);
}

function togglePlay() {
  isPaused.value = !isPaused.value;
}

function progressStyle(idx) {
  if (currentPhase.value > idx) return { width: '100%' };
  if (currentPhase.value < idx) return { width: '0%' };
  const step = steps[idx];
  const pct = Math.min(100, Math.max(0, ((currentTime.value - step.startSec) / (step.endSec - step.startSec)) * 100));
  return { width: `${pct}%` };
}

function startCycleTimer() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    isPaused.value = true;
    return;
  }
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    if (isPaused.value) return;
    currentTime.value = (currentTime.value + 0.25) % 15;
    updatePhaseFromTime();
  }, 250);
}

onMounted(() => {
  startCycleTimer();
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>

<style scoped>
.video-hook-container {
  width: 100%;
  border-radius: 26px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: var(--brown);
  border: 1px solid rgba(40, 37, 31, 0.14);
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  min-height: 280px;
  overflow: hidden;
  background: var(--ink);
}

.video-top-bar {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.hook-badge,
.play-toggle-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(40, 37, 31, 0.82);
  color: var(--text-on-dark);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  font-size: 12.5px;
  font-weight: 700;
}

.play-toggle-btn {
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.play-toggle-btn:hover {
  background: rgba(40, 37, 31, 0.96);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--harvest-gold);
  box-shadow: 0 0 0 3px rgba(217, 175, 8, 0.28);
}

.hook-stage {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.scene-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(1.03);
  transition: opacity 0.45s ease, transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  display: block;
}

.scene-layer.active {
  opacity: 1;
  transform: scale(1);
}

.scene-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scene-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(24, 21, 17, 0.22) 0%,
    rgba(24, 21, 17, 0.08) 42%,
    rgba(24, 21, 17, 0.88) 100%
  );
  pointer-events: none;
  z-index: 2;
}

.scene-caption {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 74px;
  z-index: 4;
  color: var(--text-on-dark);
  display: grid;
  gap: 4px;
  pointer-events: none;
}

.scene-chip {
  justify-self: start;
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--harvest-gold);
  color: var(--text-on-yellow);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.scene-title {
  font-size: clamp(16px, 2.2vw, 20px);
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-on-dark);
}

.scene-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.38;
  color: rgba(255, 255, 255, 0.9);
  max-width: 44ch;
}

.timeline-bar {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 6;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.timeline-step {
  appearance: none;
  background: rgba(40, 37, 31, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 7px 9px;
  min-height: 48px;
  color: var(--text-on-dark);
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 5px;
  align-content: start;
  backdrop-filter: blur(6px);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.timeline-step.active {
  background: rgba(40, 37, 31, 0.92);
  border-color: var(--harvest-gold);
}

.step-progress-track {
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  overflow: hidden;
}

.step-progress-fill {
  height: 100%;
  background: var(--harvest-gold);
  border-radius: 999px;
  transition: width 0.2s linear;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.step-time {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--harvest-gold);
  line-height: 1.1;
}

.step-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.94);
  line-height: 1.2;
}

@media (max-width: 560px) {
  .video-wrapper {
    aspect-ratio: 4 / 3.4;
  }
  .scene-caption {
    bottom: 82px;
  }
  .step-label {
    font-size: 10px;
  }
  .toggle-text {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-layer,
  .step-progress-fill {
    transition: none;
    transform: none;
  }
}
</style>
