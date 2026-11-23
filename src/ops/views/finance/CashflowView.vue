<template>
  <section>
    <h1>Dòng tiền {{ data ? data.horizonDays : 30 }} ngày</h1>
    <p class="ops-muted fin-note">
      Tiền vào dự kiến: các lần trừ thẻ theo lịch và gia hạn (nhân tỷ lệ gia hạn {{ data ? Math.round(data.renewalRate * 100) : 50 }}%). Khách trả bằng Fresh Credit hoặc chuyển khoản trọn gói đã thu tiền nên không có tiền vào mới.
      Tiền ra: công nợ nhà cung cấp theo hạn, PO chưa có hóa đơn (hạn ước tính) và chi phí logistics chưa trả.
      <strong>Tỷ lệ bao phủ = tiền mặt ÷ nợ Fresh Credit (phần tiền thật)</strong>; dưới {{ data ? data.coverage.minRatio : 1 }} thì cảnh báo.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <p v-for="a in data.alerts" :key="a.type" class="fin-warn" role="alert" :data-alert="a.type">{{ a.message }}</p>
      <div class="fin-tiles">
        <div class="fin-tile" :class="data.coverage.alert ? 'bad' : 'ok'" data-testid="coverage"><span class="n">{{ data.coverage.ratio == null ? '—' : data.coverage.ratio.toFixed(2).replace('.', ',') }}</span><strong>Tỷ lệ bao phủ</strong><small>{{ data.coverage.alert ? `dưới ngưỡng ${data.coverage.minRatio}, thiếu ${fmt(data.coverage.shortfallVnd)}` : `ngưỡng tối thiểu ${data.coverage.minRatio}` }}</small></div>
        <div class="fin-tile" data-testid="cash-now"><span class="n">{{ fmt(data.position.cashVnd) }}</span><strong>Tiền mặt hiện có</strong><small>thẻ đang về {{ fmt(data.position.inTransitVnd) }}</small></div>
        <div class="fin-tile" data-testid="cash-liability"><span class="n">{{ fmt(data.totals.liabilityRealVnd) }}</span><strong>Nợ Fresh Credit (tiền thật)</strong><small>khuyến mãi treo {{ fmt(data.totals.promoOutstandingVnd) }}</small></div>
        <div class="fin-tile" :class="data.forecast.endCashVnd < 0 ? 'bad' : ''" data-testid="cash-end"><span class="n">{{ fmt(data.forecast.endCashVnd) }}</span><strong>Tiền dự kiến cuối kỳ</strong><small>sau {{ data.horizonDays }} ngày</small></div>
      </div>

      <section class="ops-card" aria-label="Diễn biến tiền mặt">
        <h2>Tiền mặt dự kiến theo ngày</h2>
        <div class="fin-cash-bars" data-testid="cash-bars" role="img" :aria-label="`Tiền mặt dự kiến ${data.horizonDays} ngày`">
          <div v-for="d in data.forecast.days" :key="d.day" class="bar" :class="{ neg: d.cashEndVnd < 0 }" :style="{ height: `${barHeight(d.cashEndVnd)}%` }" :title="`${dmy(d.day)}: ${fmt(d.cashEndVnd)}`"></div>
        </div>
        <div class="fin-cash-labels"><span>{{ dmy(data.forecast.days[0].day) }}</span><span>thấp nhất {{ fmt(data.forecast.lowest.cashEndVnd) }} ({{ dmy(data.forecast.lowest.day) }})</span><span>{{ dmy(data.forecast.days[data.forecast.days.length - 1].day) }}</span></div>
        <dl class="kv">
          <div><dt>Vào: trừ thẻ theo lịch</dt><dd class="fin-pos">{{ fmt(data.forecast.cardVnd) }}</dd></div>
          <div><dt>Vào: gia hạn dự kiến</dt><dd class="fin-pos">{{ fmt(data.forecast.renewalVnd) }}</dd></div>
          <div><dt>Ra: công nợ đã đối chiếu</dt><dd class="fin-neg">{{ fmt(data.forecast.payablesVnd) }}</dd></div>
          <div><dt>Ra: PO chưa đối chiếu (ước tính)</dt><dd class="fin-neg">{{ fmt(data.forecast.estimatedVnd) }}</dd></div>
          <div><dt>Ra: logistics chưa trả</dt><dd class="fin-neg">{{ fmt(data.forecast.logisticsVnd) }}</dd></div>
        </dl>
      </section>

      <section class="ops-card" aria-label="Các ngày có dòng tiền">
        <h2>Các ngày có phát sinh</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="cash-days">
            <thead><tr><th>Ngày</th><th class="r">Vào (thẻ)</th><th class="r">Vào (gia hạn)</th><th class="r">Ra (công nợ)</th><th class="r">Ra (ước tính)</th><th class="r">Ra (logistics)</th><th class="r">Tiền cuối ngày</th></tr></thead>
            <tbody>
              <tr v-for="d in activeDays" :key="d.day" :class="{ 'row-bad': d.cashEndVnd < 0 }">
                <td>{{ dmy(d.day) }}</td><td class="r">{{ d.cardVnd ? fmt(d.cardVnd) : '' }}</td><td class="r">{{ d.renewalVnd ? fmt(d.renewalVnd) : '' }}</td>
                <td class="r">{{ d.payablesVnd ? fmt(d.payablesVnd) : '' }}</td><td class="r">{{ d.estimatedVnd ? fmt(d.estimatedVnd) : '' }}</td><td class="r">{{ d.logisticsVnd ? fmt(d.logisticsVnd) : '' }}</td>
                <td class="r">{{ fmt(d.cashEndVnd) }}</td>
              </tr>
              <tr v-if="!activeDays.length"><td colspan="7" class="ops-muted">Không có khoản nào dự kiến trong kỳ.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Vị thế tiền">
        <h2>Tiền mặt hiện có: cách tính</h2>
        <dl class="kv">
          <div><dt>Số dư đầu kỳ (Cài đặt)</dt><dd>{{ fmt(data.position.openingVnd) }}</dd></div>
          <div><dt>Tiền vào (nạp, chuyển khoản, thẻ về)</dt><dd class="fin-pos">{{ fmt(data.position.inVnd) }}</dd></div>
          <div><dt>Hoàn khách khi dừng gói</dt><dd class="fin-neg">{{ fmt(data.position.refundVnd) }}</dd></div>
          <div><dt>Trả nhà cung cấp</dt><dd class="fin-neg">{{ fmt(data.position.supplierPaidVnd) }}</dd></div>
          <div><dt>Mua nông sản (bảng kê)</dt><dd class="fin-neg">{{ fmt(data.position.directVnd) }}</dd></div>
          <div><dt>Phí cổng thẻ đã trừ</dt><dd>{{ fmt(data.position.feesVnd) }}</dd></div>
          <div><dt>Đơn đã thu trước, chưa giao</dt><dd>{{ fmt(data.prepaidOrdersVnd) }}</dd></div>
        </dl>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { dmy } from '../../labels';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const error = ref('');

const activeDays = computed(() => (data.value ? data.value.forecast.days.filter((d) => d.inVnd || d.outVnd) : []));

/** Chiều cao cột theo giá trị tiền, quy về 4–100% theo khoảng thấp nhất / cao nhất. */
function barHeight(v) {
  const days = data.value.forecast.days;
  const max = Math.max(...days.map((d) => d.cashEndVnd), 1);
  const min = Math.min(...days.map((d) => d.cashEndVnd), 0);
  if (max === min) return 50;
  return Math.max(4, Math.round(((v - min) / (max - min)) * 96) + 4);
}

async function load() {
  try {
    data.value = await api.ops.finance.cashflow(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 8000 });
</script>
