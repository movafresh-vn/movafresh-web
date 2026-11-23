<template>
  <div class="video-hook-container">
    <div class="video-wrapper" :class="{ 'is-muted': isMuted }">
      <!-- Top Badges -->
      <div class="video-top-bar">
        <span class="hook-badge">
          <span class="live-dot"></span>
          10s Mở Hộp &amp; Nấu 15 Phút
        </span>
        <button
          type="button"
          class="sound-toggle-btn"
          :title="isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'"
          @click="toggleSound"
        >
          <span class="sound-icon">{{ isMuted ? '🔇' : '🔊' }}</span>
          <span class="sound-text">{{ isMuted ? 'Bật tiếng' : 'Tắt tiếng' }}</span>
        </button>
      </div>

      <!-- Main HTML5 Video -->
      <video
        v-if="!hasError"
        ref="videoRef"
        class="hook-video"
        :src="HERO_DEMO_VIDEO_URL"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        @timeupdate="onTimeUpdate"
        @error="onError"
      ></video>

      <!-- Fallback Visual Animation if offline or video cannot be loaded -->
      <div v-else class="hook-fallback">
        <div class="fallback-scene" :class="'phase-' + currentPhase">
          <div class="scene-visual">
            <div v-if="currentPhase === 0" class="scene-box">
              <span class="scene-emoji">📦</span>
              <h4>Thùng Cách Nhiệt Đắk Lắk</h4>
              <p>Thịt thảo mộc, rau củ sơ chế sạch 100%, túi xốt định lượng sẵn</p>
            </div>
            <div v-else-if="currentPhase === 1" class="scene-pan">
              <span class="scene-emoji sizzling">🍳</span>
              <h4>Đảo 1 Chảo Lửa Lớn</h4>
              <p>Rưới túi xốt độc quyền, thơm nức mũi trong 5–7 phút</p>
            </div>
            <div v-else class="scene-table">
              <span class="scene-emoji pulse">🍲</span>
              <h4>Hoàn Thành Mâm Cơm 5 Món</h4>
              <p>Đạm, rau, canh, tinh bột, trái cây nóng hổi sẵn sàng</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3 Time-step Timeline Overlay (Grand Frais Style) -->
      <div class="timeline-bar">
        <button
          v-for="(step, idx) in steps"
          :key="idx"
          type="button"
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

<script>
// =========================================================================
// URL VIDEO HOOK CẬN CẢNH SƠ CHẾ & NẤU 15 PHÚT (GRAND FRAIS HOOK)
// Khi nhận video chính thức từ xưởng sơ chế Đắk Lắk & R&D, chỉ cần thay thành:
// export const HERO_DEMO_VIDEO_URL = '/videos/mova-unbox-15m.mp4';
// =========================================================================
export const HERO_DEMO_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-cooking-ingredients-on-a-table-41131-large.mp4';
</script>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const videoRef = ref(null);
const isMuted = ref(true);
const hasError = ref(false);
const currentPhase = ref(0); // 0: 00:00, 1: 00:05, 2: 00:15
const currentTime = ref(0);
let timerId = null;

const steps = [
  { time: '00:00', label: 'Mở hộp Đắk Lắk sơ chế sạch', startSec: 0, endSec: 5 },
  { time: '00:05', label: 'Đảo 1 chảo & rưới túi xốt', startSec: 5, endSec: 10 },
  { time: '00:15', label: 'Xong mâm cơm 5 món', startSec: 10, endSec: 15 }
];

function toggleSound() {
  if (videoRef.value) {
    videoRef.value.muted = !videoRef.value.muted;
    isMuted.value = videoRef.value.muted;
  } else {
    isMuted.value = !isMuted.value;
  }
}

function onTimeUpdate() {
  if (!videoRef.value) return;
  currentTime.value = videoRef.value.currentTime % 15; // vòng lặp 15s
  if (currentTime.value < 5) currentPhase.value = 0;
  else if (currentTime.value < 10) currentPhase.value = 1;
  else currentPhase.value = 2;
}

function onError() {
  hasError.value = true;
  startFallbackTimer();
}

function seekToPhase(idx) {
  currentPhase.value = idx;
  const targetSec = steps[idx].startSec;
  currentTime.value = targetSec;
  if (videoRef.value) {
    try {
      videoRef.value.currentTime = targetSec;
      videoRef.value.play();
    } catch {
      // ignore
    }
  }
}

function progressStyle(idx) {
  if (currentPhase.value > idx) return { width: '100%' };
  if (currentPhase.value < idx) return { width: '0%' };
  const step = steps[idx];
  const pct = Math.min(100, Math.max(0, ((currentTime.value - step.startSec) / (step.endSec - step.startSec)) * 100));
  return { width: `${pct}%` };
}

function startFallbackTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    currentTime.value = (currentTime.value + 0.5) % 15;
    if (currentTime.value < 5) currentPhase.value = 0;
    else if (currentTime.value < 10) currentPhase.value = 1;
    else currentPhase.value = 2;
  }, 500);
}

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.muted = true;
    const playPromise = videoRef.value.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Trình duyệt chặn autoplay có tiếng -> fallback sang muted
        if (videoRef.value) {
          videoRef.value.muted = true;
          videoRef.value.play().catch(() => {
            hasError.value = true;
            startFallbackTimer();
          });
        }
      });
    }
  }
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>

<style scoped>
.video-hook-container {
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(18, 53, 36, 0.12);
  border: 1px solid var(--line);
  background: var(--brown);
  position: relative;
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--brown);
  overflow: hidden;
}

@media (max-width: 640px) {
  .video-wrapper {
    aspect-ratio: 4 / 3;
  }
}

.hook-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Top bar with badge and audio toggle */
.video-top-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
  pointer-events: none;
}

.hook-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(18, 53, 36, 0.85);
  backdrop-filter: blur(8px);
  color: var(--white);
  font-size: 13px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 8px var(--green);
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.sound-toggle-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  color: var(--white);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sound-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Fallback visual */
.hook-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brown) 0%, var(--green-dd) 50%, var(--green-dd) 100%);
  color: var(--white);
  text-align: center;
  padding: 20px;
}

.fallback-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.4s ease;
}

.scene-emoji {
  font-size: 52px;
  display: block;
  margin-bottom: 8px;
}

.scene-emoji.sizzling {
  animation: sizzle 0.6s infinite alternate ease-in-out;
}

.scene-emoji.pulse {
  animation: pulse-emoji 1s infinite alternate ease-in-out;
}

@keyframes sizzle {
  from { transform: rotate(-3deg) translateY(0); }
  to { transform: rotate(3deg) translateY(-4px); }
}

@keyframes pulse-emoji {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.scene-box h4, .scene-pan h4, .scene-table h4 {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px;
  color: var(--white);
}

.scene-box p, .scene-pan p, .scene-table p {
  font-size: 14px;
  color: var(--line-strong);
  margin: 0;
  max-width: 32ch;
}

/* 3-Step Timeline Bar */
.timeline-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(10, 25, 17, 0.95) 40%, rgba(10, 25, 17, 0.98) 100%);
  padding: 14px 12px 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  z-index: 5;
}

.timeline-step {
  background: transparent;
  border: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.timeline-step:hover,
.timeline-step.active {
  opacity: 1;
}

.step-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  overflow: hidden;
}

.step-progress-fill {
  height: 100%;
  background: var(--green);
  transition: width 0.1s linear;
}

.timeline-step.active .step-progress-fill {
  background: var(--green);
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-time {
  font-size: 11px;
  font-weight: 800;
  color: var(--faint);
  font-family: monospace;
}

.timeline-step.active .step-time {
  color: var(--green-d);
}

.step-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--line-2);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 480px) {
  .step-label {
    font-size: 10px;
  }
  .step-time {
    font-size: 10px;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>
