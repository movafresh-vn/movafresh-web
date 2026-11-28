<template>
  <!-- Giao nhanh 24-36 giờ cho đơn đầu. Tự ẩn khi máy chủ báo tắt / chưa duyệt chính sách (hành vi cũ giữ nguyên). -->
  <section v-if="show" class="pl-card sec express-panel" aria-label="Giao nhanh 24-36 giờ" data-testid="express-panel">
    <h2 class="pl-h2">Giao nhanh 24–36 giờ cho đơn đầu <small class="tag">tùy chọn</small></h2>

    <template v-if="hold">
      <div class="pl-panel ok" role="status" data-testid="express-hold">
        <b>Đã giữ chỗ giao nhanh:</b> {{ dayText(hold.window_start) }}, {{ timeText(hold.window_start) }} – {{ timeText(hold.window_end) }}.
        Phí giao: <b>{{ fmt(hold.fee_vnd) }}</b>. Chỗ giữ đến <b>{{ timeText(hold.expires_at) }}</b>; hết giờ này bạn cần chọn lại.
      </div>
      <p class="note">{{ policyNote }}</p>
      <button type="button" class="pl-btn ghost" data-testid="express-drop" :disabled="x.busy" @click="store.dropExpress()">Không giao nhanh nữa</button>
    </template>

    <template v-else-if="offer.available">
      <p class="note">{{ policyNote }} Khung giao được tính từ lúc thanh toán thành công và nằm trọn trong {{ offer.sla.min_hours }}–{{ offer.sla.max_hours }} giờ.</p>
      <p v-if="offer.last_mile && offer.last_mile.fee_vnd != null" class="note" data-testid="express-fee">
        Phí giao chặng cuối đã được xác nhận: <b>{{ fmt(offer.last_mile.fee_vnd) }}</b> (hiệu lực đến {{ timeText(offer.last_mile.valid_until) }}).
      </p>
      <div class="chips" role="radiogroup" aria-label="Khung giao nhanh">
        <button v-for="s in offer.slots" :key="`${s.day}-${s.slot_id}`" type="button" class="pl-chip" role="radio" :aria-checked="false" :disabled="x.busy" :data-slot="`${s.day}:${s.slot_id}`" @click="store.chooseExpress(s)">
          {{ dayText(s.window_start) }} · {{ timeText(s.window_start) }} – {{ timeText(s.window_end) }}
        </button>
      </div>
    </template>

    <template v-else>
      <p class="note" data-testid="express-unavailable">{{ unavailableText }}</p>
      <button type="button" class="pl-btn ghost" :disabled="x.busy" data-testid="express-refresh" @click="store.loadExpress()">Kiểm tra lại</button>
    </template>

    <p v-if="x.error" class="pl-error" role="alert">{{ x.error }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { fmt } from '../../shared/utils/formatters';

const store = usePlanFlowStore();
const x = store.express;
const offer = computed(() => store.express.offer || {});
const hold = computed(() => store.express.hold);
// Chỉ hiện khi máy chủ nói tính năng đang mở (cờ bật VÀ chính sách đã duyệt). Tắt thì không có gì thay đổi trên màn hình.
const show = computed(() => Boolean(store.express.offer && store.express.offer.enabled) || Boolean(store.express.hold));

const policyNote = 'Giao nhanh trừ Fresh Credit NGAY khi bạn đặt (đơn đầu); các tuần sau vẫn trừ tự động trước giờ giao 72 giờ như gói thường. Gói vẫn tối thiểu 4 tuần.';

const REASON = {
  last_mile_quote_pending: 'MOVA đang xác nhận phí giao đến địa chỉ của bạn với đơn vị vận chuyển. Bạn kiểm tra lại sau ít phút.',
  last_mile_quote_unavailable: 'Hiện MOVA chưa báo được phí giao nhanh đến địa chỉ này.',
  last_mile_quote_rejected: 'Địa chỉ này hiện chưa giao nhanh được. Bạn vẫn đặt gói giao thường bình thường.',
  last_mile_quote_expired: 'Báo giá giao nhanh đã hết hạn và cần xác nhận lại. Bạn kiểm tra lại sau ít phút.',
  no_feasible_slot: 'Hiện chưa có khung giao nhanh nào chắc chắn thực hiện được. Bạn vẫn đặt gói giao thường bình thường.',
  not_evaluable: 'Thực đơn tuần đầu hiện chưa hỗ trợ giao nhanh.'
};
const unavailableText = computed(() => REASON[offer.value.reason] || 'Giao nhanh hiện chưa khả dụng cho đơn này.');

const dayText = (iso) => new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const timeText = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

const canCheckExpress = () => Boolean(String(store.checkout.street || '').trim()) && !store.options?.earliest_delivery_date;

onMounted(() => {
  if (canCheckExpress()) void store.loadExpress();
  else store.express.offer = null;
});
// Đổi lịch hoặc địa chỉ thì chỗ giữ cũ không còn đúng: nhả và tính lại.
watch(
  () => [store.checkout.slotId, store.checkout.optionIndex, store.checkout.district, store.checkout.street, store.checkout.ward, store.options?.earliest_delivery_date],
  async () => {
    if (store.express.hold) await store.dropExpress();
    else if (canCheckExpress()) await store.loadExpress();
    else {
      store.express.offer = null;
      store.express.error = '';
    }
  }
);
</script>

<style scoped>
.express-panel .note { font-size: 14px; color: var(--ink-2); margin: 6px 0 10px; }
.express-panel .tag { font-size: 12px; font-weight: 600; background: var(--green-soft); color: var(--green-d); padding: 2px 8px; border-radius: 6px; margin-left: 6px; }
.express-panel .chips { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
