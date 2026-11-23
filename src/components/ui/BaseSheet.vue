<template>
  <Teleport to="body">
    <div v-if="modelValue" class="bsheet-back" @click.self="close">
      <div class="bsheet" role="dialog" aria-modal="true" :aria-label="title || undefined" @keydown.esc="close">
        <header class="bsheet-head">
          <h2 v-if="title" class="bsheet-title">{{ title }}</h2>
          <button type="button" class="bsheet-x" aria-label="Đóng" @click="close">×</button>
        </header>
        <div class="bsheet-body"><slot /></div>
        <footer v-if="$slots.footer" class="bsheet-foot"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// BaseSheet: ngăn kéo dưới (mobile) / hộp giữa (desktop). v-model điều khiển đóng mở.
defineOptions({ name: 'BaseSheet' });
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue', 'close']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<style scoped>
.bsheet-back {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(84, 63, 24, .45);
}
.bsheet {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  color: var(--ink);
  border-radius: var(--r-card) var(--r-card) 0 0;
  box-shadow: var(--shadow-2);
}
.bsheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px 8px; }
.bsheet-title { font-size: var(--fs-20); font-weight: var(--fw-semibold); }
.bsheet-x { width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--surface); font-size: 22px; line-height: 1; }
.bsheet-body { padding: 8px 20px 20px; overflow-y: auto; }
.bsheet-foot { padding: 12px 20px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }
@media (min-width: 640px) {
  .bsheet-back { align-items: center; }
  .bsheet { border-radius: var(--r-card); }
}
</style>
