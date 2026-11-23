<template>
  <button
    v-if="selectable"
    type="button"
    class="bchip"
    :class="[`bchip-${tone}`, { on: modelValue }]"
    :aria-pressed="modelValue ? 'true' : 'false'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <slot />
  </button>
  <span v-else class="bchip" :class="[`bchip-${tone}`]"><slot /></span>
</template>

<script setup>
// tone: green | orange | neutral. selectable: chip chọn được (v-model là boolean).
defineOptions({ name: 'BaseChip' });
defineProps({
  modelValue: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  tone: { type: String, default: 'green' }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.bchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: var(--card);
  color: var(--ink);
  font: var(--fw-medium) 13.5px/1.2 var(--font);
}
button.bchip { cursor: pointer; transition: background .15s, border-color .15s; }
button.bchip:hover { background: var(--line-2); }
.bchip-green { background: var(--green-soft); border-color: var(--green-line); color: var(--green-d); }
.bchip-orange { background: var(--orange-soft); border-color: var(--amber-line); color: var(--orange-ink); }
.bchip-neutral { background: var(--surface); color: var(--ink-2); }
button.bchip.on { background: var(--green-soft); border-color: var(--green-d); color: var(--green-d); font-weight: var(--fw-semibold); }
button.bchip-orange.on { background: var(--orange-soft); border-color: var(--red-orange-d); color: var(--orange-ink); }
</style>
