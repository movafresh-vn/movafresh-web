import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { isZaloMiniApp } from '../services/zaloMiniApp';

/**
 * Hiệu ứng nghiêng 3D + phản chiếu ánh sáng (60fps) trên Desktop,
 * tự động hạ tải siêu nhẹ trên Zalo Mini App, màn hình nhỏ và prefers-reduced-motion.
 */
export function use3dTilt(options = {}) {
  const maxTilt = options.maxTilt ?? 7;
  const glareOpacity = options.glareOpacity ?? 0.16;

  const state = reactive({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 50,
    active: false
  });

  const enabled = ref(false);
  let rafId = null;

  function detectSupport() {
    if (typeof window === 'undefined') return false;
    if (isZaloMiniApp()) return false;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) return false;
    const fineHover = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
    return Boolean(fineHover && window.innerWidth >= 768);
  }

  function updateSupport() {
    enabled.value = detectSupport();
    if (!enabled.value) reset();
  }

  function onPointerMove(e) {
    if (!enabled.value) return;
    const el = e.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      state.ry = (px - 0.5) * (maxTilt * 2);
      state.rx = (0.5 - py) * (maxTilt * 2);
      state.gx = Math.round(px * 100);
      state.gy = Math.round(py * 100);
      state.active = true;
    });
  }

  function reset() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    state.rx = 0;
    state.ry = 0;
    state.gx = 50;
    state.gy = 50;
    state.active = false;
  }

  onMounted(() => {
    updateSupport();
    window.addEventListener('resize', updateSupport, { passive: true });
  });

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', updateSupport);
  });

  function cardStyle() {
    if (!enabled.value) return {};
    return {
      transform: state.active
        ? `perspective(1050px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg) translate3d(0, -4px, 0)`
        : 'perspective(1050px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)',
      '--glare-x': `${state.gx}%`,
      '--glare-y': `${state.gy}%`,
      '--glare-o': state.active ? glareOpacity : 0
    };
  }

  return {
    enabled,
    state,
    onPointerMove,
    onPointerLeave: reset,
    cardStyle
  };
}
