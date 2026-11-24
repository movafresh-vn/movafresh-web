<template>
  <div class="weeks-tab">
    <p v-if="!data" class="pl-note">Đang tải…</p>

    <section v-else-if="!data.subscription" class="pl-card empty">
      <h2 class="pl-h2">Bạn chưa có gói đang chạy</h2>
      <p class="pl-lead">Thiết kế thực đơn và đăng ký gói 4 tuần để bắt đầu.</p>
      <router-link to="/plans" class="pl-btn primary">Thiết kế thực đơn</router-link>
    </section>

    <template v-else>
      <section v-if="data.subscription.status !== 'active'" class="pl-panel note-end">
        Gói này đã dừng. Các chuyến đã chốt sổ trước đó vẫn được giao.
        <router-link to="/plans" class="pl-btn sm">Đăng ký gói mới</router-link>
      </section>

      <RatingCard v-if="ratings.length" :orders="ratings" @rated="loadRatings" />

      <RenewCard v-if="data.renewal && data.renewal.due && data.subscription.status === 'active'" :key="data.weeks.length" :remaining="data.renewal.remaining_weeks" @done="load" />

      <!-- Dải tuần -->
      <nav class="strip" aria-label="Các tuần của tôi">
        <button
          v-for="w in data.weeks" :key="w.week_index" type="button" class="pill" :class="[w.status, { sel: w.week_index === selected }]"
          :aria-pressed="w.week_index === selected" @click="selected = w.week_index"
        >
          <b>Tuần {{ w.number }}</b>
          <span class="d">{{ w.boxes?.[0]?.delivery_date ? shortDate(w.boxes[0].delivery_date) : '' }}</span>
          <span class="s">{{ w.status_label }}</span>
        </button>
      </nav>

      <WeekCard v-if="current" :key="current.week_index" :week="current" @change="(t) => (changing = { week: current, target: t })" @skip="(w) => (skipping = w)" />

      <!-- Quyền lợi khách hàng & Quản lý thanh toán 1 chạm (Luật BVQLNTD 19/2023) -->
      <section v-if="data.subscription.status === 'active'" class="pl-card plan-actions-card">
        <div class="actions-header">
          <span class="shield-badge">🛡️ BẢO VỆ NGƯỜI TIÊU DÙNG</span>
          <h3 class="actions-h3">Quản lý gói &amp; Hủy 1 chạm bất kỳ lúc nào</h3>
          <p class="actions-sub">Không cam kết trói buộc · Xem thông tin hủy hoặc hoàn tiền trước khi xác nhận · Thông báo trước 7 ngày làm việc khi kết thúc chu kỳ.</p>
        </div>
        <div class="actions-btns">
          <button class="pl-btn outline danger-btn" type="button" @click="stopping = true">
            🛑 Dừng hoặc hủy gói
          </button>
          <button
            v-if="data.subscription.payment_method === 'card'"
            class="pl-btn outline"
            type="button"
            @click="unlinkCardAction"
          >
            💳 Hủy liên kết thẻ/ví đối tác
          </button>
          <button
            v-if="data.subscription.payment_method !== 'card'"
            class="pl-btn outline"
            type="button"
            data-testid="link-card-open"
            @click="linking = true"
          >
            💳 Liên kết thẻ/ví đối tác
          </button>
          <button
            v-if="current?.skip?.allowed"
            class="pl-btn ghost"
            type="button"
            @click="skipping = current"
          >
            ⏸️ Tạm hoãn tuần này (Không mất ưu đãi)
          </button>
        </div>
      </section>
    </template>

    <MealChangeSheet v-if="changing" :week="changing.week" :target="changing.target" @close="changing = null" @done="changing = null" />
    <SkipSheet v-if="skipping" :week="skipping" @close="skipping = null" @done="afterSkip" />
    <LinkCardSheet v-if="linking && data && data.subscription" :linked="data.subscription.payment_method === 'card'" @close="linking = false" @linked="afterLink" @unlinked="afterUnlink" />
    <StopPlanSheet v-if="stopping" @close="stopping = false" @done="stopping = false" @skip="skipFromStop" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../shared/api';
import { dowOfKey, parseDayKey } from '../../shared/utils/time';
import { useMovaStore } from '../../stores/useMovaStore';
import WeekCard from './WeekCard.vue';
import MealChangeSheet from './MealChangeSheet.vue';
import SkipSheet from './SkipSheet.vue';
import StopPlanSheet from './StopPlanSheet.vue';
import LinkCardSheet from './LinkCardSheet.vue';
import RenewCard from './RenewCard.vue';
import RatingCard from './RatingCard.vue';

defineEmits(['tab']);
const store = useMovaStore();
const route = useRoute();

const data = ref(null);
const ratings = ref([]);
const selected = ref(null);
const changing = ref(null);
const skipping = ref(null);
const stopping = ref(false);
const linking = ref(false);

const DONE = ['delivered', 'postponed', 'cancelled'];
const current = computed(() => (data.value ? data.value.weeks.find((w) => w.week_index === selected.value) || null : null));

function shortDate(key) {
  const { m, d } = parseDayKey(key);
  const dow = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dowOfKey(key)];
  return `${dow} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

async function load() {
  const res = await api.customer.myWeeks();
  if (res.status === 'error') return;
  data.value = res.data;
  const weeks = res.data.weeks;
  if (!weeks.some((w) => w.week_index === selected.value)) {
    const next = weeks.find((w) => !DONE.includes(w.status)) || weeks[weeks.length - 1];
    selected.value = next ? next.week_index : null;
  }
  await loadRatings();
}

async function loadRatings() {
  const r = await api.customer.pendingRatings();
  ratings.value = r.status === 'success' ? r.data : [];
}

async function afterSkip() {
  skipping.value = null;
  await load();
}

async function afterLink() {
  linking.value = false;
  await load();
}

async function afterUnlink() {
  linking.value = false;
  store.toast('✓ Đã hủy liên kết thẻ/ví đối tác thành công');
  await load();
}

async function unlinkCardAction() {
  if (window.confirm('Bạn có chắc chắn muốn hủy liên kết thẻ/ví đối tác? Sau khi hủy, MOVA sẽ không tự động trừ tiền các tuần tiếp theo.')) {
    const res = await api.customer.unlinkCard();
    if (res.status === 'success') {
      store.toast('✓ Đã hủy liên kết thẻ/ví đối tác thành công');
      await load();
    } else {
      store.toast(res.error?.message || 'Không thể hủy liên kết lúc này');
    }
  }
}

function skipFromStop(weekIndex) {
  stopping.value = false;
  const w = data.value.weeks.find((x) => x.week_index === weekIndex);
  if (w) {
    selected.value = weekIndex;
    skipping.value = w;
  }
}

watch(() => store.version, load);
onMounted(async () => {
  load();
  if (route.hash === '#danh-gia') {
    await nextTick();
    const el = document.getElementById('danh-gia');
    if (el) el.scrollIntoView({ block: 'start' });
  }
});
</script>

<style scoped>
.weeks-tab { display: grid; gap: 16px; }
.empty { max-width: 560px; }
.note-end { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 16px; }

.strip {
  display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 8px; scroll-snap-type: x proximity; scrollbar-width: thin;
}
.pill {
  scroll-snap-align: start; flex: 0 0 auto; min-width: 118px; min-height: 76px; text-align: left; padding: 10px 12px;
  border: 1.5px solid var(--line); background: var(--card); border-radius: 16px; display: grid; gap: 1px; font-size: 15px;
}
.pill b { font-size: 16px; }
.pill .d { color: var(--muted); }
.pill .s { font-size: 14px; font-weight: 700; }
.pill.sel { border-color: var(--green); box-shadow: 0 0 0 2px var(--green-soft); background: var(--white); }
.pill.editable .s { color: var(--green-d); }
.pill.charged .s { color: var(--blue); }
.pill.charge_failed .s { color: var(--red); }
.pill.locked .s, .pill.in_production .s { color: var(--amber-ink); }
.pill.shipping .s { color: var(--orange-ink); }
.pill.delivered .s { color: var(--green-d); }
.pill.postponed, .pill.cancelled { background: var(--line-2); }
.pill.postponed .s, .pill.cancelled .s { color: var(--muted); }

.plan-actions-card {
  margin-top: 12px;
  background: var(--bg);
  border: 1px dashed var(--line);
  border-radius: 16px;
  padding: 16px 18px;
  display: grid;
  gap: 12px;
}
.shield-badge {
  display: inline-block;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  padding: 2px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
}
.actions-h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}
.actions-sub {
  font-size: 13px;
  color: var(--muted);
  margin: 4px 0 0;
  line-height: 1.4;
}
.actions-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.danger-btn {
  color: var(--red);
  border-color: var(--red-line);
}
.danger-btn:hover {
  background: var(--red-soft);
}
.stop { display: grid; gap: 6px; justify-items: start; margin-top: 8px; }
.stop-btn {
  min-height: 44px; background: none; border: 0; color: var(--red); font-weight: 700; font-size: 16px;
  text-decoration: underline; padding: 0 4px;
}
</style>
