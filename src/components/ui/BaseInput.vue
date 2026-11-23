<template>
  <div class="binput" :class="{ 'binput-err': !!error }">
    <label v-if="label" class="binput-label" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      class="binput-field"
      :value="modelValue"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? `${inputId}-msg` : undefined"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" :id="`${inputId}-msg`" class="binput-msg binput-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${inputId}-msg`" class="binput-msg">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

defineOptions({ name: 'BaseInput' });
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  id: { type: String, default: '' },
  type: { type: String, default: 'text' },
  inputmode: { type: String, default: undefined },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: undefined },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
});
defineEmits(['update:modelValue']);

const auto = `binput-${Math.random().toString(36).slice(2, 9)}`;
const inputId = computed(() => props.id || auto);
</script>

<style scoped>
.binput { display: block; }
.binput-label { display: block; margin-bottom: 6px; font-size: 13.5px; font-weight: var(--fw-semibold); color: var(--ink); }
.binput-field {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid var(--line-strong);
  border-radius: var(--r-ctl);
  background: var(--card);
  color: var(--ink);
  font: var(--fw-regular) 16px/1.3 var(--font);
}
.binput-field::placeholder { color: var(--faint); }
.binput-field:focus { outline: none; border-color: var(--green-d); box-shadow: 0 0 0 3px var(--green-soft); }
.binput-field:disabled { background: var(--surface); opacity: .7; }
.binput-err .binput-field { border-color: var(--red); }
.binput-msg { margin-top: 6px; font-size: 12.5px; color: var(--muted); }
.binput-error { color: var(--red); }
</style>
