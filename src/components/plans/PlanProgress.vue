<template>
  <nav class="prog" aria-label="Tiến trình đăng ký">
    <ol>
      <li v-for="(s, i) in STEPS" :key="s" :class="{ done: i + 1 < step, cur: i + 1 === step }" :aria-current="i + 1 === step ? 'step' : undefined">
        <button type="button" class="dot" :disabled="!canGo(i + 1)" :aria-label="`Bước ${i + 1}: ${s}`" @click="$emit('go', i + 1)">
          <Check v-if="i + 1 < step" :size="18" :stroke-width="2.6" aria-hidden="true" />
          <span v-else class="num">{{ i + 1 }}</span>
        </button>
        <span class="lbl">{{ s }}</span>
      </li>
    </ol>
    <p class="mini">Bước <b class="num">{{ step }}</b>/4 · {{ STEPS[step - 1] }}</p>
  </nav>
</template>

<script setup>
import { Check } from 'lucide-vue-next';
const STEPS = ['Về bạn', 'Thực đơn tuần 1', 'Giao hàng và thanh toán', 'Hoàn tất'];

const props = defineProps({ step: { type: Number, required: true }, reach: { type: Number, default: 1 } });
defineEmits(['go']);

// Chỉ quay lại được các bước đã qua; không nhảy tới trước
const canGo = (n) => n < props.step && n <= props.reach && props.step !== 4;
</script>

<style scoped>
.prog { margin-bottom: 20px; }
ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
li { display: grid; justify-items: center; gap: 6px; position: relative; text-align: center; }
li::before { content: ''; position: absolute; top: 20px; left: -50%; width: 100%; height: 3px; background: var(--line); z-index: 0; }
li:first-child::before { display: none; }
li.done::before, li.cur::before { background: var(--green); }
.dot { position: relative; z-index: 1; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--line); background: var(--card); font-size: 17px; font-weight: 800; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; }
li.cur .dot { border-color: var(--green-d); background: var(--green-d); color: var(--white); }
li.done .dot { border-color: var(--green); background: var(--green-soft); color: var(--green-d); }
.dot:disabled { cursor: default; }
.lbl { font-size: 15px; font-weight: 600; color: var(--muted); line-height: 1.25; }
li.cur .lbl { color: var(--ink); font-weight: 800; }
.mini { display: none; font-size: 16px; margin-top: 10px; text-align: center; }
@media (max-width: 640px) {
  .lbl { display: none; }
  .mini { display: block; }
  .dot { width: 40px; height: 40px; }
  li::before { top: 18px; }
}
</style>
