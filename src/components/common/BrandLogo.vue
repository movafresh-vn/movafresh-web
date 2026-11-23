<template>
  <svg
    class="brand-logo"
    :class="`brand-logo-${variant}`"
    :viewBox="`0 0 ${size.width} ${size.height}`"
    :width="width"
    :height="height"
    role="img"
    :aria-label="label"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <title>{{ label }}</title>
    <rect v-if="plate" :x="-pad" :y="-pad" :width="size.width + pad * 2" :height="size.height + pad * 2" :rx="pad" :fill="colors.bg" stroke="none" />
    <g v-for="row in rows" :key="row.key" :transform="`translate(0 ${row.top})`" :stroke-width="row.stroke">
      <path
        v-for="(g, i) in row.glyphs"
        :key="i"
        :d="g.d"
        :transform="`translate(${g.x} 0)`"
        :stroke="g.tone ? colors[g.tone] : colors[row.key]"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
import {
  BRAND_NAME,
  LOGO_SIZE as size,
  LOGO_ROWS,
  LOGO_GLYPHS,
  logoVariant,
  logoHeight
} from '../../shared/config/brandLogo';

// variant: onWhite | onGreen | onBrown | onBlack (chọn theo màu nền đặt logo)
const props = defineProps({
  variant: { type: String, default: 'onWhite' },
  width: { type: Number, default: 126 },
  label: { type: String, default: BRAND_NAME },
  plate: { type: Boolean, default: false }
});

const colors = computed(() => logoVariant(props.variant));
const height = computed(() => logoHeight(props.width));
const pad = 8;
const rows = ['mova', 'fresh'].map((key) => ({
  key,
  top: LOGO_ROWS[key].top,
  stroke: LOGO_ROWS[key].stroke,
  glyphs: LOGO_GLYPHS[key]
}));
</script>

<style scoped>
.brand-logo { display: block; flex: none; overflow: visible; }
</style>
