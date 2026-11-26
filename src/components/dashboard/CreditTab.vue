<template>
  <div v-if="sum" class="credit">
    <section class="pl-card bal">
      <h2 class="pl-h2">Fresh Credit</h2>
      <p class="total num">{{ fmt(sum.balance.total_vnd) }}</p>
      <div class="split">
        <div class="part">
          <small>Tiền ăn</small>
          <b class="num">{{ fmt(sum.balance.real_vnd) }}</b>
          <span v-if="sum.balance.held_real_vnd > 0" class="num">Đang tạm giữ cho tuần giao: {{ fmt(sum.balance.held_real_vnd) }}</span>
          <span>Số dư dùng để đổi bữa ăn tại MOVA Fresh (không rút tiền mặt).</span>
        </div>
        <div class="part promo">
          <small>Khuyến mãi</small>
          <b class="num">{{ fmt(sum.balance.promo_vnd) }}</b>
          <span v-if="sum.balance.held_promo_vnd > 0" class="num">Đang tạm giữ cho tuần giao: {{ fmt(sum.balance.held_promo_vnd) }}</span>
          <span>Ưu đãi gói trả trước, thưởng mời bạn. Không chuyển thành tiền ăn.</span>
        </div>
      </div>
      <p v-if="sum.reconciliation?.manual_reconciliation_required" class="pl-panel warn">
        Có số dư lịch sử chưa đủ bằng chứng nguồn thanh toán ({{ fmt(sum.reconciliation.unallocated_real_vnd) }}): trạng thái <b>Cần đối soát thủ công</b>.
      </p>
      <p v-if="sum.spend_order" class="pl-note">Khi trừ tiền tuần giao, MOVA dùng {{ spendOrderText }}. Phần chênh lệch khi đổi món có quy tắc riêng.</p>
      <p v-else class="pl-note">Không tải được thứ tự trừ tiền tuần giao từ máy chủ.</p>
      <button class="pl-btn primary" type="button" @click="store.openModal('topup')">Mua Gói Suất ăn trả trước</button>
    </section>

    <section v-if="sum.alert" class="pl-panel warn" role="alert">
      <b>Chưa đủ cho tuần {{ sum.alert.week_index + 1 }}</b>
      <p class="num">Tuần này cần {{ fmt(sum.alert.amount_vnd) }}, còn thiếu {{ fmt(sum.alert.shortfall_vnd) }}. MOVA trừ tiền lúc <b>{{ sum.alert.charge_label }}</b>.</p>
      <button v-if="sum.alert.suggested_topup" class="pl-btn orange sm" type="button" @click="store.openModal('topup')">
        Thanh toán bổ sung {{ fmt(sum.alert.suggested_topup.pay_vnd) }}
      </button>
    </section>
    <p v-if="sum.alert_unavailable" class="pl-error" role="alert">Không tải được cảnh báo số dư cho tuần giao. Vui lòng thử lại.</p>

    <section v-if="weekFlows.length" class="pl-card flows">
      <h2 class="pl-h2">Dòng tiền theo từng đơn tuần</h2>
      <ul>
        <li v-for="w in weekFlows" :key="w.week_id">
          <div>
            <b>Tuần {{ w.week_index }}<template v-if="w.order_code"> · {{ w.order_code }}</template></b>
            <small>Ngày giao: {{ w.delivery_date }} · Trạng thái giữ tiền: {{ holdLabel(w.hold_state) }}</small>
            <small class="num">
              <template v-if="w.held_real_vnd || w.held_promo_vnd">Đang tạm giữ: Tiền ăn {{ fmt(w.held_real_vnd) }}, KM {{ fmt(w.held_promo_vnd) }} · </template>
              <template v-if="w.captured_real_vnd || w.captured_promo_vnd">Đã chốt trừ: Tiền ăn {{ fmt(w.captured_real_vnd) }}, KM {{ fmt(w.captured_promo_vnd) }} · </template>
              <template v-if="w.refunded_real_vnd || w.refunded_promo_vnd">Đã hoàn: Tiền ăn {{ fmt(w.refunded_real_vnd) }}, KM {{ fmt(w.refunded_promo_vnd) }} · </template>
              <template v-if="w.external_paid_vnd">Thanh toán trực tiếp: {{ fmt(w.external_paid_vnd) }}</template>
            </small>
            <small v-if="w.manual_reconciliation_required" class="warn-tag">Cần đối soát thủ công</small>
          </div>
          <span class="amt num">{{ fmt(w.payable_vnd) }}</span>
        </li>
      </ul>
    </section>

    <section class="pl-card hist">
      <h2 class="pl-h2">Lịch sử</h2>
      <form class="search" @submit.prevent="search">
        <label for="credit-order">Tìm chính xác theo mã đơn</label>
        <input id="credit-order" v-model.trim="orderInput" class="pl-input" maxlength="80" />
        <button class="pl-btn sm" type="submit" :disabled="loading">Tìm</button>
        <button v-if="orderCode" class="pl-btn sm" type="button" :disabled="loading" @click="clearSearch">Xem tất cả</button>
      </form>
      <p v-if="!sum.history.length" class="pl-note">Chưa có giao dịch nào.</p>
      <ul v-else>
        <li v-for="h in sum.history" :key="h.id">
          <div>
            <b>{{ h.label }}</b>
            <small class="num">{{ fmtDeadline(new Date(h.at)) }}</small>
            <small class="num">{{ h.compartment === 'real' ? 'Tiền ăn' : 'Khuyến mãi' }}: {{ fmt(h.before_vnd) }} → {{ fmt(h.after_vnd) }}</small>
            <small v-if="h.order_code">Mã đơn: {{ h.order_code }}</small>
            <small v-else-if="h.ref_id">Tham chiếu: {{ h.ref_id }}</small>
            <small v-if="h.manual_reconciliation_required" class="warn-tag">Cần đối soát thủ công</small>
          </div>
          <span class="amt num" :class="{ minus: h.amount_vnd < 0 }">{{ signed(h.amount_vnd) }}</span>
        </li>
      </ul>
      <button v-if="sum.next_cursor" class="pl-btn sm" type="button" :disabled="loading" @click="loadMore">Xem thêm</button>
    </section>
  </div>
  <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { fmtDeadline } from '../../shared/utils/time';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const sum = ref(null);
const weekFlows = ref([]);
const error = ref('');
const loading = ref(false);
const orderInput = ref('');
const orderCode = ref('');
let sequence = 0;
const spendOrderText = computed(() => sum.value.spend_order.map((b) => b === 'real' ? 'tiền ăn' : 'khuyến mãi').join(' trước, rồi '));
const HOLD_LABELS = { none: 'Chưa giữ tiền', held: 'Đang tạm giữ (Hold)', captured: 'Đã chốt trừ (Capture)', released: 'Đã giải tỏa (Release)' };
const holdLabel = (s) => HOLD_LABELS[s] || s;

const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}`;

async function load(cursor = null) {
  const seq = ++sequence;
  loading.value = true;
  error.value = '';
  try {
    const r = await api.customer.creditSummary({ cursor, order_code: orderCode.value });
    if (seq !== sequence) return;
    if (r.status === 'error') {
      error.value = r.error.message;
      return;
    }
    if (cursor && sum.value) r.data.history = [...sum.value.history, ...r.data.history];
    sum.value = r.data;
    if (!cursor) {
      const wf = await api.customer.weekCashflow(orderCode.value ? { order_code: orderCode.value } : {});
      if (seq === sequence && wf.status === 'success') weekFlows.value = wf.data.weeks || [];
    }
  } catch {
    if (seq === sequence) error.value = 'Không tải được lịch sử Fresh Credit. Vui lòng kiểm tra kết nối và thử lại.';
  } finally {
    if (seq === sequence) loading.value = false;
  }
}
function search() { orderCode.value = orderInput.value; sum.value = null; load(); }
function clearSearch() { orderInput.value = ''; search(); }
function loadMore() { if (sum.value?.next_cursor) load(sum.value.next_cursor); }
load();
watch(() => store.version, () => load());
</script>

<style scoped>
.credit { display: grid; gap: 16px; max-width: 760px; }
.bal { display: grid; gap: 12px; }
.total { font-size: 36px; font-weight: 800; color: var(--green-d); }
.split { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
.part { background: var(--green-soft); border-radius: 14px; padding: 12px 14px; display: grid; gap: 2px; align-content: start; }
.part.promo { background: var(--butter); }
.part small { font-size: 15px; font-weight: 700; }
.part b { font-size: 20px; }
.part span { font-size: 14px; color: var(--muted); }
.hist ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; }
.hist li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line-2); align-items: flex-start; }
.hist li > div { display: grid; gap: 2px; min-width: 0; }
.hist b { font-size: 16px; }
.hist small { font-size: 14px; color: var(--muted); }
.search { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
.amt { font-weight: 800; font-size: 17px; color: var(--green-d); white-space: nowrap; }
.amt.minus { color: var(--ink); }
@media (max-width: 520px) { .split { grid-template-columns: 1fr; } .total { font-size: 32px; } }
</style>
