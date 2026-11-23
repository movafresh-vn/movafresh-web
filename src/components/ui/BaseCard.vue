<template>
  <component :is="tag" class="bcard" :class="[`bcard-${tone}`, { 'bcard-flush': flush }]">
    <slot />
  </component>
</template>

<script setup>
// Thẻ bo 16px theo guideline. tone: white | cream | green | brown | orange
defineOptions({ name: 'BaseCard' });
defineProps({
  tone: { type: String, default: 'white' },
  tag: { type: String, default: 'div' },
  flush: { type: Boolean, default: false }
});
</script>

<style scoped>
.bcard {
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: 20px;
  background: var(--card);
  color: var(--ink);
}
.bcard-flush { padding: 0; overflow: hidden; }
.bcard-cream { background: var(--cream); }
.bcard-green { background: var(--green-d); border-color: var(--green-d); color: var(--white); }
.bcard-brown { background: var(--brown); border-color: var(--brown); color: var(--cream); }
.bcard-orange { background: var(--orange); border-color: var(--orange); color: var(--on-orange); }
</style>
