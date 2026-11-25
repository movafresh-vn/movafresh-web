<template>
  <section v-if="offer" class="pl-card renew" aria-labelledby="renew-title">
    <h2 id="renew-title" class="pl-h2">{{ remaining ? 'Gói của bạn sắp hết' : 'Gói của bạn đã hết' }}</h2>
    <p class="pl-lead">
      MOVA <b>không tự gia hạn</b>. Nếu muốn nấu tiếp, bạn đồng ý gia hạn thêm {{ offer.weeks.length }} tuần bên dưới.
    </p>

    <ul class="weeks num">
      <li v-for="w in offer.weeks" :key="w.week_index">
        <span>Tuần {{ w.number }}: giao {{ w.delivery_label }}<small>Đổi món trước {{ w.deadline_label }}</small></span>
        <b>{{ fmt(w.amount_vnd) }}</b>
      </li>
    </ul>
    <p class="pl-note num">
      Tổng {{ fmt(offer.total_vnd) }}, không có thẻ quà tặng (chỉ áp ở chu kỳ đầu). MOVA trừ từng tuần trước giờ giao 72 tiếng,
      {{ offer.payment_method === 'fresh_credit' ? 'từ Fresh Credit' : 'từ thẻ của bạn' }}.
      <template v-if="offer.switched_from_bank"> Gói trước bạn trả bằng chuyển khoản, nên chu kỳ mới trừ từ Fresh Credit.</template>
    </p>
    <p v-if="offer.needs_credit && (offer.balance?.total_vnd ?? 0) < (offer.weeks?.[0]?.amount_vnd ?? 0)" class="pl-panel warn">
      Fresh Credit hiện có {{ fmt(offer.balance.total_vnd) }}, chưa đủ cho tuần đầu của chu kỳ mới. Bạn nên nạp thêm trước mốc trừ.
      <button class="pl-btn sm" type="button" @click="store.openModal('topup')">Nạp thêm</button>
    </p>

    <label class="agree">
      <input v-model="agree" type="checkbox" />
      <span>Tôi đồng ý gia hạn thêm {{ offer.weeks.length }} tuần, tổng <b class="num">{{ fmt(offer.total_vnd) }}</b>, và để MOVA trừ tiền từng tuần như trên.</span>
    </label>
    <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
    <button class="pl-btn primary" type="button" :disabled="!agree || busy" @click="renew">Gia hạn thêm {{ offer.weeks.length }} tuần</button>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const props = defineProps({ remaining: { type: Number, default: 0 }, subscriptionId: { type: String, required: true } });
const emit = defineEmits(['done']);
const store = useMovaStore();

const offer = ref(null);
const agree = ref(false);
const error = ref('');
const busy = ref(false);

onMounted(async () => {
  const res = await api.customer.renewalOffer(props.subscriptionId);
  offer.value = res.status === 'success' ? res.data : null;
});

async function renew() {
  busy.value = true;
  const r = await api.customer.renewSubscription({ consent: agree.value, subscription_id: props.subscriptionId });
  busy.value = false;
  if (r.status === 'error') {
    error.value = r.error.message;
    return;
  }
  await store.refresh();
  store.toast(`Đã gia hạn thêm ${r.data.weeks_added} tuần`);
  emit('done');
}
</script>

<style scoped>
.renew { display: grid; gap: 14px; background: var(--green-soft); border-color: var(--green-line); }
.weeks { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.weeks li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--green-line); font-size: 16px; }
.weeks small { display: block; color: var(--muted); font-size: 14px; }
.agree { display: flex; gap: 12px; align-items: flex-start; font-size: 16px; cursor: pointer; min-height: 44px; }
.agree input { width: 24px; height: 24px; margin-top: 2px; accent-color: var(--green); flex-shrink: 0; }
</style>
