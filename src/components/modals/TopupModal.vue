<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="topup-title" @click.self="store.closeModal">
    <div class="mbox box">
      <button class="mclose" type="button" @click="store.closeModal" aria-label="Đóng">×</button>
      <h2 id="topup-title" class="pl-h2">Mua Gói Suất ăn trả trước</h2>

      <p v-if="loading" class="pl-note" role="status">Đang tải các gói…</p>
      <p v-else-if="!sum" class="pl-error" role="alert">{{ error || 'Không tải được danh sách gói. Bạn thử lại sau nhé.' }}</p>

      <template v-else-if="!order">
        <p v-if="sum.alert_unavailable" class="pl-error" role="alert">Không tải được cảnh báo số dư cho tuần giao. Vui lòng thử lại.</p>
        <p v-if="alert" class="pl-panel warn" role="status">
          Tuần {{ alert.week_index + 1 }} cần <b class="num">{{ fmt(alert.amount_vnd) }}</b>, bạn đang có <b class="num">{{ fmt(alert.balance_vnd) }}</b>.
          Bổ sung trước <b>{{ alert.charge_label }}</b> để MOVA trừ được điểm bữa ăn.
        </p>
        <p v-else class="pl-note">Số dư hiện tại <b class="num">{{ fmt(store.balance.total_vnd) }}</b>. Chọn Gói Suất ăn trả trước cố định để nhận ưu đãi chiết khấu khoảng {{ Math.round(sum.bonus_pct * 100) }}% điểm tặng thêm.</p>

        <div class="pl-chips col opts" role="radiogroup" aria-label="Gói suất ăn trả trước">
          <button v-if="alert && alert.suggested_topup" type="button" class="pl-chip big" :class="{ on: choice === 'need' }" role="radio" :aria-checked="choice === 'need'" @click="choice = 'need'">
            <b class="num">Bổ sung vừa đủ: {{ fmt(alert.suggested_topup.pay_vnd) }}</b>
            <small class="num">Nhận {{ fmt(alert.suggested_topup.credit_received_vnd) }} (gồm ưu đãi {{ fmt(alert.suggested_topup.bonus_vnd) }})</small>
          </button>
          <button v-for="p in sum.packs" :key="p.pack_id" type="button" class="pl-chip big" :class="{ on: choice === p.pack_id }" role="radio" :aria-checked="choice === p.pack_id" @click="choice = p.pack_id">
            <b class="num">{{ p.label }}: {{ fmt(p.pay_vnd) }}</b>
            <small class="num">Nhận {{ fmt(p.credit_received_vnd) }} (gồm ưu đãi chiết khấu {{ fmt(p.bonus_vnd) }})</small>
          </button>
        </div>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <button class="pl-btn primary" type="button" :disabled="!choice || busy" @click="prepare">{{ busy ? 'Đang tạo lệnh…' : 'Tiếp tục' }}</button>
      </template>

      <template v-else>
        <p class="pl-lead">Quét mã bằng ứng dụng ngân hàng để chuyển đúng <b class="num">{{ fmt(order.pay_vnd) }}</b>.</p>
        <div class="qr"><VietQrSvg :seed="order.pay_vnd" /></div>
        <p class="pl-note">Nội dung chuyển khoản: <b class="ref">{{ order.transfer_content }}</b></p>
        <p class="pl-note">
          Chuyển đúng số tiền và nội dung trên. Khi ngân hàng báo tiền về, MOVA tự cộng <b class="num">{{ fmt(order.credit_received_vnd) }}</b> vào Fresh Credit của bạn
          (lệnh có hiệu lực đến {{ fmtDeadline(new Date(order.expires_at)) }}).
        </p>
        <button class="pl-btn primary" type="button" @click="done">Đã hiểu</button>
        <button class="pl-btn ghost" type="button" @click="order = null">Chọn gói khác</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { fmtDeadline } from '../../shared/utils/time';
import VietQrSvg from '../common/VietQrSvg.vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const sum = ref(null);
const loading = ref(true);
const choice = ref('');
const order = ref(null);
const error = ref('');
const busy = ref(false);
const alert = computed(() => (sum.value ? sum.value.alert : null));

onMounted(async () => {
  const r = await api.customer.creditSummary();
  loading.value = false;
  if (r.status === 'error') {
    error.value = r.error.message;
    return;
  }
  sum.value = r.data;
  choice.value = alert.value && alert.value.suggested_topup ? 'need' : r.data.packs[0] ? r.data.packs[0].pack_id : '';
});

// MOVA chỉ bán Gói Suất ăn trả trước cố định (không nhận số tiền lẻ). Chọn gói là tạo một lệnh chờ chuyển khoản.
async function prepare() {
  error.value = '';
  const packId = choice.value === 'need' ? alert.value.suggested_topup.pack_id : choice.value;
  busy.value = true;
  const res = await api.customer.topUpCredit({ pack_id: packId });
  busy.value = false;
  if (res.status === 'error') {
    error.value = res.error.message;
    return;
  }
  order.value = res.data;
}

function done() {
  store.closeModal();
  store.toast('MOVA sẽ cộng Fresh Credit ngay khi ngân hàng báo tiền về');
}
</script>

<style scoped>
.box { max-width: 480px; padding: 26px 22px; display: grid; gap: 14px; }
.opts { margin-top: 2px; }
.qr { width: 190px; height: 190px; margin: 0 auto; background: var(--white); padding: 8px; border-radius: 12px; border: 1px solid var(--line); }
.ref { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .03em; }
</style>
