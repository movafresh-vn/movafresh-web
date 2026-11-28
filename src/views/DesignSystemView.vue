<template>
  <main class="ds wrap">
    <h1 class="ds-h1">Design system MOVA FRESH</h1>
    <p class="muted ds-lead">Trang tài liệu sống, chỉ có ở bản dev (VITE_DEV_TOOLS=true). Nguồn token: <code>src/assets/styles/tokens.css</code>.</p>

    <section class="ds-sec" aria-labelledby="ds-colors">
      <h2 id="ds-colors" class="ds-h2">Màu</h2>
      <div class="ds-swatches">
        <div v-for="c in colors" :key="c.name" class="ds-sw">
          <span class="ds-chip" :style="{ background: `var(${c.name})` }"></span>
          <b>{{ c.name }}</b>
          <small class="muted">{{ c.note }}</small>
        </div>
      </div>
      <p class="ds-note">Chữ nhỏ trên xanh hoặc cam-đỏ dùng biến thể đậm (<code>--green-d</code>, <code>--red-orange-d</code>) hoặc chữ nâu. Chữ trắng trên <code>--green</code> / <code>--red-orange</code> chỉ cho chữ lớn đậm (từ 18,66px).</p>
    </section>

    <section class="ds-sec" aria-labelledby="ds-type">
      <h2 id="ds-type" class="ds-h2">Chữ (Epilogue)</h2>
      <p class="ds-display">Display 44px / 100%</p>
      <p class="ds-t20">Tiêu đề 20px, 600</p>
      <p class="ds-t16">Thân bài 16px, 400. Thịt tươi Đắk Lắk sơ chế sẵn, giao tận bếp.</p>
      <p class="ds-t12 muted">Chú thích 12px, 500</p>
      <div class="ds-dark">
        <p class="ds-hero">Tiêu đề hero gradient</p>
        <p class="ds-dark-sub">Chữ phụ trên nền tối rgba(255,255,255,.5)</p>
      </div>
    </section>

    <section class="ds-sec" aria-labelledby="ds-btn">
      <h2 id="ds-btn" class="ds-h2">Nút</h2>
      <div class="ds-row">
        <BaseButton>Primary</BaseButton>
        <BaseButton variant="accent">Accent</BaseButton>
        <BaseButton variant="sun">Sun</BaseButton>
        <BaseButton variant="secondary">Secondary</BaseButton>
        <BaseButton variant="ghost">Ghost</BaseButton>
        <BaseButton disabled>Disabled</BaseButton>
        <BaseButton size="sm">Small</BaseButton>
      </div>
    </section>

    <section class="ds-sec" aria-labelledby="ds-form">
      <h2 id="ds-form" class="ds-h2">Form và chip</h2>
      <div class="ds-form">
        <BaseInput v-model="text" label="Số điện thoại" placeholder="0908 123 456" hint="MOVA gửi mã OTP để xác nhận." />
        <BaseInput v-model="bad" label="Có lỗi" error="Số điện thoại chưa đúng." />
      </div>
      <div class="ds-row">
        <BaseChip>Xanh</BaseChip>
        <BaseChip tone="orange">Cam</BaseChip>
        <BaseChip tone="neutral">Trung tính</BaseChip>
        <BaseChip v-model="picked" selectable>Chọn được</BaseChip>
      </div>
    </section>

    <section class="ds-sec" aria-labelledby="ds-card">
      <h2 id="ds-card" class="ds-h2">Thẻ và sheet</h2>
      <div class="ds-cards">
        <BaseCard>Thẻ trắng</BaseCard>
        <BaseCard tone="cream">Thẻ kem</BaseCard>
        <BaseCard tone="green">Thẻ xanh</BaseCard>
        <BaseCard tone="brown">Thẻ nâu</BaseCard>
        <BaseCard tone="orange">Thẻ cam</BaseCard>
      </div>
      <BaseButton variant="secondary" @click="sheet = true">Mở BaseSheet</BaseButton>
      <BaseSheet v-model="sheet" title="Ví dụ sheet">
        <p>Nội dung sheet. Nhấn Esc, nền mờ hoặc nút đóng để thoát.</p>
        <template #footer><BaseButton block @click="sheet = false">Xong</BaseButton></template>
      </BaseSheet>
    </section>

    <section class="ds-sec" aria-labelledby="ds-logo">
      <h2 id="ds-logo" class="ds-h2">Logo (4 biến thể)</h2>
      <p class="ds-note">Logo chính thức trích xuất từ Figma DFL24-web.</p>
      <div class="ds-logos">
        <div v-for="v in variants" :key="v" class="ds-logo-cell" :style="{ background: LOGO_VARIANTS[v].bg }">
          <BrandLogo :variant="v" :width="160" />
          <span :style="{ color: LOGO_VARIANTS[v].mova }">{{ v }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import BrandLogo from '../components/common/BrandLogo.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';
import BaseChip from '../components/ui/BaseChip.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSheet from '../components/ui/BaseSheet.vue';
import { LOGO_VARIANTS, LOGO_VARIANT_NAMES } from '../shared/config/brandLogo';

const variants = LOGO_VARIANT_NAMES;
const text = ref('');
const bad = ref('12');
const picked = ref(true);
const sheet = ref(false);

const colors = [
  { name: '--green', note: 'xanh thương hiệu' },
  { name: '--green-d', note: 'xanh đậm AA' },
  { name: '--forest', note: 'rừng olive sâu (Figma)' },
  { name: '--harvest-gold', note: 'vàng mùa gặt (Figma)' },
  { name: '--orange', note: 'cam ấm (Figma)' },
  { name: '--red-orange', note: 'cam-đỏ thương hiệu' },
  { name: '--red-orange-d', note: 'terracotta AA' },
  { name: '--brown', note: 'nâu espresso' },
  { name: '--cream', note: 'kem nền (Figma)' },
  { name: '--cream-warm', note: 'kem ấm (Figma)' },
  { name: '--sand', note: 'nền cát ấm (Figma)' },
  { name: '--card', note: 'trắng thẻ' },
  { name: '--muted', note: 'chữ phụ AA' },
  { name: '--line', note: 'đường kẻ' },
  { name: '--green-soft', note: 'nền nhạt xanh' },
  { name: '--orange-soft', note: 'nền nhạt cam' },
  { name: '--red', note: 'lỗi' },
  { name: '--blue', note: 'thông tin' }
];
</script>

<style scoped>
.ds { padding-top: 32px; padding-bottom: 64px; }
.ds-h1 { font-size: var(--fs-display); line-height: var(--lh-display); margin-bottom: 12px; }
.ds-h2 { font-size: var(--fs-20); font-weight: var(--fw-semibold); margin-bottom: 14px; }
.ds-lead { margin-bottom: 24px; }
.ds-sec { margin-bottom: 36px; }
.ds-note { margin-top: 12px; font-size: 14px; color: var(--muted); max-width: 70ch; }
.ds-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.ds-sw { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.ds-chip { height: 56px; border-radius: var(--r-ctl); border: 1px solid var(--line); }
.ds-display { font-size: var(--fs-display); line-height: var(--lh-display); font-weight: var(--fw-semibold); }
.ds-t20 { font-size: var(--fs-20); font-weight: var(--fw-semibold); margin-top: 8px; }
.ds-t16 { font-size: var(--fs-16); margin-top: 8px; }
.ds-t12 { font-size: var(--fs-12); font-weight: var(--fw-medium); margin-top: 8px; }
.ds-dark { margin-top: 16px; padding: 24px; border-radius: var(--r-card); background: var(--brown); }
.ds-hero {
  font-size: 32px;
  line-height: 1.05;
  font-weight: var(--fw-semibold);
  background: var(--grad-hero-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ds-dark-sub { margin-top: 8px; color: var(--on-dark-muted); }
.ds-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
.ds-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; max-width: 560px; }
.ds-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.ds-logos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.ds-logo-cell { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; padding: 20px; border-radius: var(--r-card); border: 1px solid var(--line); font-size: 12px; font-weight: var(--fw-semibold); }
</style>
