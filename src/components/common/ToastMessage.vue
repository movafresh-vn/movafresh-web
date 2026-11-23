<template>
  <div
    class="toast"
    :class="{ show: store.toastVisible }"
    role="status"
    aria-live="polite"
  >
    {{ store.toastMessage }}
  </div>
</template>

<script setup>
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translate(-50%, 16px);
  background: var(--ink);
  color: var(--white);
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: .25s ease;
  z-index: 75;
  max-width: min(92vw, 500px);
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .25);
}

.toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (max-width: 980px) {
  .toast {
    bottom: 92px;
  }
}
</style>
