<template>
  <div class="ps" role="group" :aria-label="label">
    <button type="button" class="ps-btn" :disabled="modelValue <= min" :aria-label="`Bớt một ${label}`" @click="$emit('update:modelValue', modelValue - 1)">−</button>
    <div class="ps-val num">
      <b>{{ modelValue }}</b>
      <span>{{ label }}</span>
      <small v-if="sublabel" class="sublabel">{{ sublabel }}</small>
    </div>
    <button type="button" class="ps-btn" :disabled="modelValue >= max" :aria-label="`Thêm một ${label}`" @click="$emit('update:modelValue', modelValue + 1)">+</button>
  </div>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';

defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: BUSINESS.plan.householdMin },
  max: { type: Number, default: BUSINESS.plan.householdMax },
  label: { type: String, default: 'người ăn' },
  sublabel: { type: String, default: '' }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.ps { display: inline-flex; align-items: center; gap: 14px; }
.ps-btn {
  width: 52px; height: 52px; border-radius: 14px; border: 1.5px solid var(--green);
  background: var(--card); color: var(--green-d); font-size: 26px; font-weight: 700; line-height: 1;
  cursor: pointer;
}
.ps-btn:hover:not(:disabled) { background: var(--green-soft); }
.ps-btn:disabled { opacity: .35; cursor: not-allowed; }
.ps-val { min-width: 96px; text-align: center; display: flex; flex-direction: column; line-height: 1.1; }
.ps-val b { font-size: 34px; font-weight: 800; color: var(--ink); }
.ps-val span { font-size: 14px; color: var(--muted); margin-top: 2px; font-weight: 600; }
.sublabel { font-size: 11px; color: var(--muted); margin-top: 1px; font-weight: 500; }
</style>
