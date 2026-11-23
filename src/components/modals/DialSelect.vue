<template>
  <select class="pl-input dial" :value="modelValue" :aria-label="label" @change="$emit('update:modelValue', $event.target.value)">
    <option v-for="c in COUNTRIES" :key="c.iso" :value="c.dial">{{ countryLabel(c) }}</option>
  </select>
</template>

<script setup>
import { COUNTRIES, countryLabel } from '../../shared/config/countries';

defineProps({
  modelValue: { type: String, default: '84' },
  label: { type: String, default: 'Mã vùng điện thoại' }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.dial { flex: 0 0 auto; width: auto; max-width: 168px; }
</style>
