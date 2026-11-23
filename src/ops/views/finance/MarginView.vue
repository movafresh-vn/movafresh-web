<template>
  <section>
    <h1>Giá vốn & margin</h1>
    <p class="ops-muted fin-note">
      Giá vốn mỗi thùng = <strong>SKU × giá PO</strong> (có cộng dự phòng hao hụt) + <strong>bao bì</strong> + túi xốt + <strong>chi phí logistics phân bổ</strong> (P2C đẩy sang theo ngày giao).
      Margin dưới {{ data ? Math.round(data.minPct * 100) : 20 }}% thì cảnh báo. <strong>Chu kỳ đầu</strong> (có ưu đãi lớn) báo cáo riêng như chi phí kéo khách, không tính vào cảnh báo của các tuần sau.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <div class="fin-tools">
      <div><label for="m-f">Từ ngày giao</label><input id="m-f" v-model="from" type="date" class="ops-input" /></div>
      <div><label for="m-t">Đến ngày</label><input id="m-t" v-model="to" type="date" class="ops-input" /></div>
      <button class="ops-btn ops-btn-small" @click="load">Lọc</button>
    </div>
    <template v-if="data">
      <div class="fin-tiles">
        <div class="fin-tile" :class="tone(data.steady.marginPct)" data-testid="steady-margin"><span class="n">{{ pct(data.steady.marginPct) }}</span><strong>Margin các tuần thường</strong><small>{{ data.steady.boxes }} thùng · lãi {{ fmt(data.steady.marginVnd) }}</small></div>
        <div class="fin-tile" data-testid="first-cost"><span class="n">{{ fmt(data.firstCycle.acquisitionCostVnd) }}</span><strong>Chi phí kéo khách (chu kỳ đầu)</strong><small>thẻ quà tặng {{ fmt(data.firstCycle.giftVnd) }} + khuyến mãi dùng {{ fmt(data.firstCycle.promoUsedVnd) }}</small></div>
        <div class="fin-tile" data-testid="first-margin"><span class="n">{{ pct(data.firstCycle.marginPct) }}</span><strong>Margin chu kỳ đầu</strong><small>{{ data.firstCycle.boxes }} thùng · lãi {{ fmt(data.firstCycle.marginVnd) }}</small></div>
        <div class="fin-tile" :class="data.alerts.length ? 'bad' : 'ok'" data-testid="margin-alerts"><span class="n">{{ data.alerts.length }}</span><strong>Cảnh báo margin</strong><small>tuần / gói / khu dưới ngưỡng</small></div>
      </div>
      <p v-if="data.alerts.length" class="fin-warn">
        Dưới ngưỡng: <span v-for="a in data.alerts" :key="a.type + a.key" class="fin-tag">{{ a.label }} {{ pct(a.marginPct) }}</span>
      </p>

      <div class="fin-grid2">
        <section v-for="blk in blocks" :key="blk.id" class="ops-card" :aria-label="blk.title">
          <h2>{{ blk.title }}</h2>
          <div class="ops-table-wrap">
            <table class="ops-table" :data-testid="`margin-${blk.id}`">
              <thead><tr><th>{{ blk.head }}</th><th class="r">Thùng</th><th class="r">Doanh thu</th><th class="r">Giá vốn</th><th class="r">Margin</th></tr></thead>
              <tbody>
                <tr v-for="g in data[blk.id]" :key="g.key" :class="{ 'row-bad': g.alert }">
                  <td>{{ blk.id === 'weeks' ? `Tuần ${dm(g.key)}` : g.label }}</td><td class="r">{{ g.boxes }}</td><td class="r">{{ fmt(g.revenueVnd) }}</td><td class="r">{{ fmt(g.cogsVnd) }}</td>
                  <td class="r" :class="g.alert ? 'fin-neg' : ''">{{ pct(g.marginPct) }}<small>trước logistics {{ pct(g.productMarginPct) }}</small></td>
                </tr>
                <tr v-if="!data[blk.id].length"><td colspan="5" class="ops-muted">Chưa có thùng nào của các tuần thường đã giao.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="ops-card" aria-label="Từng thùng">
        <h2>Từng thùng đã giao</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="margin-boxes">
            <thead><tr><th>Đơn</th><th>Ngày giao · khu</th><th class="r">Doanh thu</th><th class="r">Nguyên liệu + bao bì + xốt</th><th class="r">Logistics</th><th class="r">Margin</th></tr></thead>
            <tbody>
              <tr v-for="b in data.boxes" :key="b.orderId" class="row-click" :class="{ 'row-bad': b.alert, 'row-on': detail && detail.orderId === b.orderId }" :data-box="b.orderId" tabindex="0" @click="open(b.orderId)" @keydown.enter="open(b.orderId)">
                <td class="mono">{{ b.orderId }}<small v-if="b.firstCycle">chu kỳ đầu</small></td>
                <td>{{ b.deliveryDay }}<small>{{ b.zoneId }} · {{ data.planLabels[b.planType] }}</small></td>
                <td class="r">{{ fmt(b.revenueVnd) }}</td><td class="r">{{ fmt(b.materialsVnd) }}</td>
                <td class="r">{{ fmt(b.logisticsVnd) }}<small v-if="b.logisticsEstimated">dự kiến</small></td>
                <td class="r" :class="b.marginVnd < 0 ? 'fin-neg' : ''">{{ pct(b.marginPct) }}<small>{{ signedVnd(b.marginVnd) }}</small></td>
              </tr>
              <tr v-if="!data.boxes.length"><td colspan="6" class="ops-muted">Chưa có đơn nào đã giao.</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="detail" class="impact-order" data-testid="box-detail">
          <h3>Giá vốn thùng {{ detail.orderId }} (giao {{ detail.deliveryDay }})</h3>
          <div class="ops-table-wrap">
            <table class="ops-table">
              <thead><tr><th>SKU</th><th class="r">Số lượng mua</th><th class="r">Giá PO</th><th class="r">Thành tiền</th></tr></thead>
              <tbody>
                <tr v-for="l in detail.cost.lines" :key="l.sku"><td>{{ l.name }}<small class="mono">{{ l.sku }}</small></td><td class="r">{{ l.qty }} {{ l.unit }}</td><td class="r">{{ fmt(l.priceVnd) }}</td><td class="r">{{ fmt(l.costVnd) }}</td></tr>
                <tr><td colspan="3">Bao bì (thùng + túi cách nhiệt)</td><td class="r">{{ fmt(detail.cost.packagingVnd) }}</td></tr>
                <tr><td colspan="3">Túi xốt ({{ detail.cost.saucePacks }} túi)</td><td class="r">{{ fmt(detail.cost.sauceVnd) }}</td></tr>
                <tr><td colspan="3">Logistics phân bổ{{ detail.cost.logisticsEstimated ? ' (dự kiến)' : '' }}</td><td class="r">{{ fmt(detail.cost.logisticsVnd) }}</td></tr>
                <tr><td colspan="3"><strong>Giá vốn cả thùng</strong></td><td class="r"><strong>{{ fmt(detail.cost.totalVnd) }}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { dm, pct, signedVnd } from '../../format';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const blocks = [
  { id: 'weeks', title: 'Theo tuần (các tuần thường)', head: 'Tuần' },
  { id: 'plans', title: 'Theo loại gói', head: 'Loại gói' },
  { id: 'zones', title: 'Theo khu', head: 'Khu' }
];
const data = ref(null);
const detail = ref(null);
const error = ref('');
const from = ref('');
const to = ref('');

const tone = (p) => (p == null ? '' : p < 0.2 ? 'bad' : 'ok');

async function load() {
  try {
    data.value = await api.ops.finance.margins(ctx.value, { from: from.value || null, to: to.value || null });
    if (detail.value) detail.value = await api.ops.finance.boxCost(ctx.value, detail.value.orderId);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 10000 });

async function open(orderId) {
  if (detail.value && detail.value.orderId === orderId) {
    detail.value = null;
    return;
  }
  try {
    detail.value = await api.ops.finance.boxCost(ctx.value, orderId);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
</script>
