<template>
  <header class="dash-header">
    <div class="u-info">
      <div class="u-avatar" aria-hidden="true">{{ initial }}</div>
      <div>
        <h1>{{ c?.name }}</h1>
        <p class="muted">{{ c?.phone }}<template v-if="c?.zone_name"> · Khu {{ c.zone_name }}</template></p>
      </div>
    </div>
    <div class="u-stats">
      <button type="button" class="stat" @click="$emit('tab', 'credit')">
        <small>Fresh Credit</small>
        <b class="num">{{ fmt(store.balance?.total_vnd ?? 0) }}</b>
        <span class="num">Tiền ăn {{ fmt(store.balance?.real_vnd ?? 0) }}</span>
      </button>
      <div class="stat plain" v-if="sub">
        <small>Gói của bạn</small>
        <b>{{ statusText }}</b>
        <span>{{ sub?.slot_label }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../shared/utils/formatters';

defineEmits(['tab']);
const store = useMovaStore();
const c = computed(() => store.account?.customer || {});
const sub = computed(() => store.account?.subscription || null);
const initial = computed(() => (c.value?.name || 'K').trim().split(/\s+/).pop().charAt(0));
const statusText = computed(() => (sub.value?.status === 'active' ? `${sub.value?.weeks || 0} tuần` : 'Đã dừng'));
</script>

<style scoped>
.dash-header {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 18px 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.u-info { display: flex; align-items: center; gap: 14px; min-width: 0; }
.u-avatar {
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--green-d), var(--green-d));
  color: var(--white); display: grid; place-items: center; font-weight: 800; font-size: 22px;
}
h1 { font-size: 21px; font-weight: 800; overflow-wrap: anywhere; }
.u-info p { font-size: 15px; }
.u-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.stat {
  background: var(--bg); border: 1.5px solid var(--line); border-radius: 16px; padding: 10px 16px;
  text-align: left; min-height: 48px; display: grid; gap: 1px;
}
button.stat {
  cursor: pointer;
  background: linear-gradient(135deg, var(--green-soft) 0%, var(--butter) 100%);
  border-color: var(--green);
}
button.stat:hover {
  background: var(--green-soft);
}
.stat small { font-size: 12.5px; color: var(--muted); font-weight: 700; }
button.stat small { color: var(--green-dd); }
.stat b { font-size: 19px; font-weight: 800; color: var(--green-d); }
.stat span { font-size: 12.5px; color: var(--muted); }
@media (max-width: 640px) {
  .dash-header { padding: 16px; }
  .u-stats { width: 100%; }
  .stat { flex: 1; }
}
</style>
