<template>
  <div v-if="r" class="done">
    <section class="pl-card hero">
      <span class="tick" aria-hidden="true"><Check :size="30" :stroke-width="2.8" /></span>
      <h1 class="pl-h1">MOVA đã nhận gói {{ r.cycle_weeks.length }} tuần của bạn</h1>
      <p class="pl-lead">Nhà máy Đắk Lắk sẽ bắt đầu sơ chế theo thực đơn bạn đã chọn.</p>
    </section>

    <section class="pl-card sum">
      <h2 class="pl-h2">Tóm tắt gói</h2>
      <dl>
        <div><dt>Mã gói</dt><dd>{{ r.subscription_id }}</dd></div>
        <div v-if="r.planSummary"><dt>Thực đơn</dt><dd class="num">{{ r.planSummary.meals_per_week }} bữa mỗi tuần cho {{ r.planSummary.household_size }} người</dd></div>
        <div><dt>Gói trị giá</dt><dd class="num">{{ fmt(r.package_value_vnd) }}</dd></div>
        <div v-if="r.week1_charged" data-testid="week1-charged"><dt>Đã trừ tuần 1 từ Fresh Credit</dt><dd class="num">{{ fmt(r.paid_now_vnd) }}</dd></div>
        <div v-else-if="r.payment_method === 'fresh_credit'" data-testid="week1-pending"><dt>Tuần 1</dt><dd>Chưa trừ: MOVA trừ khi Fresh Credit đủ, trước giờ giao {{ r.auto_debit_cutoff_hours || 72 }} giờ</dd></div>
        <div v-else><dt>Bạn đã trả hôm nay</dt><dd class="num">{{ fmt(r.paid_now_vnd) }}</dd></div>
        <div><dt>Cách trả</dt><dd>{{ methodLabel }}</dd></div>
        <div v-if="r.payment_method === 'bank_transfer_4w'"><dt>Mã đối soát</dt><dd><b class="ref">{{ r.payment_ref }}</b></dd></div>
        <div v-if="r.payment_method === 'fresh_credit'"><dt>Fresh Credit còn lại</dt><dd class="num">{{ fmt(r.fresh_credit_balance_remaining_vnd) }}</dd></div>
        <div><dt>Giao lần đầu</dt><dd>{{ fmtDay(r.next_delivery.date) }}, {{ r.next_delivery.slot }}</dd></div>
      </dl>
      <div class="deadline">
        <small>Hạn đổi món tuần 1</small>
        <b class="num">{{ fmtDeadline(new Date(r.next_delivery.dish_change_deadline)) }}</b>
        <span>Sau mốc này nhà máy chốt sổ và bắt đầu sơ chế, thực đơn tuần 1 không đổi được nữa.</span>
      </div>
      <ul class="weeks">
        <li v-for="w in r.cycle_weeks" :key="w.week_index">
          <span>Tuần {{ w.week_index + 1 }}: đổi món trước <b>{{ fmtDeadline(new Date(w.cutoff_at)) }}</b></span>
          <span class="num muted">{{ fmt(w.amount_vnd) }}</span>
        </li>
      </ul>
    </section>

    <section class="pl-card invite">
      <h2 class="pl-h2">Mời bạn bè cùng nấu cơm nhà</h2>
      <p class="pl-lead">
        Bạn bè đăng ký gói đầu tiên, bạn nhận <b class="num">{{ fmt(rewards.referrer) }}</b> Fresh Credit
        và bạn bè nhận <b class="num">{{ fmt(rewards.referee) }}</b>.
      </p>
      <button class="pl-btn" type="button" :disabled="!r.referral_code" @click="invite">{{ copied ? 'Đã sao chép liên kết' : 'Mời bạn bè' }}</button>
    </section>

    <div class="go">
      <router-link to="/account" class="pl-btn primary">Xem gói của tôi</router-link>
      <button class="pl-btn ghost" type="button" @click="$emit('again')">Thiết kế gói khác</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Check } from 'lucide-vue-next';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { BUSINESS } from '../../shared/config/business';
import { fmt } from '../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../shared/utils/time';

defineEmits(['again']);
const store = usePlanFlowStore();
const r = computed(() => store.result);
const rewards = BUSINESS.incentives.rewards;
const copied = ref(false);

const METHODS = { fresh_credit: 'Gói Suất ăn trả trước (Fresh Credit)', bank_transfer_4w: 'Chuyển khoản một lần cho cả gói', card: 'Liên kết thẻ/ví đối tác, tự trừ từng tuần' };
const methodLabel = computed(() => METHODS[r.value.payment_method] || '');

async function invite() {
  const code = r.value.referral_code;
  if (!code) return;
  const url = `${location.origin}/plans?${new URLSearchParams({ ref: code })}`;
  const text = 'Mình đang dùng MOVA Fresh: nguyên liệu sơ chế sẵn từ Đắk Lắk, nấu cơm nhà 15 phút. Đăng ký qua link này nhé:';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'MOVA Fresh', text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      copied.value = true;
    }
  } catch {
    copied.value = false;
  }
}
</script>

<style scoped>
.done { display: grid; gap: 16px; max-width: 680px; margin: 0 auto; }
.hero { text-align: center; background: var(--green-soft); border-color: var(--green-line); }
.tick { width: 60px; height: 60px; border-radius: 50%; background: var(--green); color: var(--white); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.sum { display: grid; gap: 14px; }
dl { margin: 0; display: grid; gap: 0; }
dl > div { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 16px; }
dt { color: var(--muted); }
dd { margin: 0; font-weight: 700; text-align: right; }
.ref { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .04em; }
.deadline { background: var(--orange-soft); border-radius: 14px; padding: 14px; display: grid; gap: 4px; }
.deadline small { font-size: 15px; color: var(--orange-ink); font-weight: 700; }
.deadline b { font-size: 24px; color: var(--orange-ink); }
.deadline span { font-size: 15px; }
.weeks { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.weeks li { display: flex; justify-content: space-between; gap: 10px; font-size: 15px; padding: 6px 0; }
.go { display: grid; gap: 8px; }
</style>
