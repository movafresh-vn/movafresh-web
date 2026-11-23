<template>
  <component
    :is="tag"
    class="bbtn"
    :class="[`bbtn-${variant}`, `bbtn-${size}`, { 'bbtn-block': block }]"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="tag !== 'button' && disabled ? 'true' : undefined"
  >
    <slot />
  </component>
</template>

<script setup>
// variant: primary (xanh đậm) | accent (cam-đỏ đậm, CTA/giá) | sun (cam, chữ nâu) | secondary | ghost
// Chữ nhỏ luôn đặt trên biến thể đậm hoặc chữ nâu để đạt AA; không dùng chữ trắng trên --green / --red-orange.
defineOptions({ name: 'BaseButton' });
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  tag: { type: String, default: 'button' },
  type: { type: String, default: 'button' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});
</script>

<style scoped>
.bbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: 1.5px solid transparent;
  border-radius: var(--r-ctl);
  font: var(--fw-semibold) 15px/1.2 var(--font);
  text-decoration: none;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.bbtn-sm { min-height: 36px; padding: 6px 14px; font-size: 13px; border-radius: 10px; }
.bbtn-block { display: flex; width: 100%; }
.bbtn-primary { background: var(--green-d); border-color: var(--green-d); color: var(--white); }
.bbtn-primary:hover:not(:disabled) { background: var(--green-dd); border-color: var(--green-dd); }
.bbtn-accent { background: var(--red-orange-d); border-color: var(--red-orange-d); color: var(--white); }
.bbtn-accent:hover:not(:disabled) { background: var(--red-orange-dd); border-color: var(--red-orange-dd); }
.bbtn-sun { background: var(--orange); border-color: var(--orange); color: var(--on-orange); }
.bbtn-sun:hover:not(:disabled) { filter: brightness(.95); }
.bbtn-secondary { background: var(--card); border-color: var(--line-strong); color: var(--ink); }
.bbtn-secondary:hover:not(:disabled) { background: var(--line-2); }
.bbtn-ghost { background: transparent; color: var(--green-d); padding-left: 6px; padding-right: 6px; }
.bbtn-ghost:hover:not(:disabled) { text-decoration: underline; }
.bbtn:disabled, .bbtn[aria-disabled="true"] { opacity: .5; cursor: not-allowed; }
</style>
