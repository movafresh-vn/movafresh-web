<template>
  <section>
    <h1>Doanh thu & hóa đơn</h1>
    <p class="ops-muted fin-note">
      Doanh thu chỉ ghi khi đơn <strong>đã giao</strong>, theo <strong>giá trị tiền thật đã dùng</strong>. Phần khuyến mãi đã dùng tách riêng, không phải doanh thu tiền mặt
      ({{ data && data.treatment === 'gross' ? 'cấu hình "gross": ghi cả phần khuyến mãi thành doanh thu khuyến mãi, kèm chi phí khuyến mãi' : 'cấu hình "net": không ghi doanh thu cho phần khuyến mãi, chỉ tính là chi phí kéo khách' }}).
      Tiền đã thu cho các tuần chưa giao là nợ khách, chưa phải doanh thu.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <div class="fin-tools">
      <div><label for="r-f">Từ ngày giao</label><input id="r-f" v-model="from" type="date" class="ops-input" /></div>
      <div><label for="r-t">Đến ngày</label><input id="r-t" v-model="to" type="date" class="ops-input" /></div>
      <button class="ops-btn ops-btn-small" @click="load">Lọc</button>
    </div>
    <template v-if="data">
      <div class="fin-tiles">
        <div class="fin-tile ok" data-testid="rev-net"><span class="n">{{ fmt(data.totals.netRevenueVnd) }}</span><strong>Doanh thu ghi nhận</strong><small>chưa gồm VAT · {{ data.totals.orders }} đơn đã giao</small></div>
        <div class="fin-tile" data-testid="rev-real"><span class="n">{{ fmt(data.totals.realVnd) }}</span><strong>Tiền thật đã dùng</strong><small>gồm VAT {{ fmt(data.totals.vatVnd) }}</small></div>
        <div class="fin-tile" data-testid="rev-promo"><span class="n">{{ fmt(data.totals.promoVnd) }}</span><strong>Khuyến mãi đã dùng</strong><small>không phải doanh thu tiền mặt</small></div>
        <div class="fin-tile warn" data-testid="rev-deferred"><span class="n">{{ fmt(data.deferred.realVnd) }}</span><strong>Thu trước chưa giao</strong><small>{{ data.deferred.orders }} đơn · chưa là doanh thu</small></div>
      </div>
      <p v-if="data.vatUnconfirmed" class="fin-info">{{ data.vatNote }}</p>

      <section class="ops-card" aria-label="Doanh thu theo ngày">
        <h2>Theo ngày giao</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="rev-days">
            <thead><tr><th>Ngày</th><th class="r">Đơn</th><th class="r">Tiền thật</th><th class="r">VAT</th><th class="r">Doanh thu</th><th class="r">Khuyến mãi dùng</th></tr></thead>
            <tbody>
              <tr v-for="d in data.days" :key="d.day"><td>{{ d.day }}</td><td class="r">{{ d.orders }}</td><td class="r">{{ fmt(d.realVnd) }}</td><td class="r">{{ fmt(d.vatVnd) }}</td><td class="r">{{ fmt(d.netRevenueVnd) }}</td><td class="r">{{ fmt(d.promoVnd) }}</td></tr>
              <tr v-if="!data.days.length"><td colspan="6" class="ops-muted">Chưa có đơn nào đã giao nên chưa ghi nhận doanh thu.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Doanh thu từng đơn">
        <h2>Từng đơn đã giao</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="rev-orders">
            <thead><tr><th>Đơn</th><th>Khách</th><th>Đã giao</th><th class="r">Giá trị đơn</th><th class="r">Tiền thật</th><th class="r">Khuyến mãi</th><th class="r">Doanh thu</th></tr></thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.orderId" :data-order="r.orderId">
                <td class="mono">{{ r.orderId }}<small v-if="r.firstCycle">chu kỳ đầu</small></td><td class="mono">{{ r.customerId }}</td>
                <td>{{ fmtDeadline(new Date(r.deliveredAt)) }}</td>
                <td class="r">{{ fmt(r.amountVnd) }}<small v-if="r.giftVnd">thẻ quà tặng −{{ fmt(r.giftVnd) }}</small></td>
                <td class="r">{{ fmt(r.realVnd) }}</td><td class="r">{{ fmt(r.promoVnd) }}</td><td class="r">{{ fmt(r.netRevenueVnd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-if="inv" class="ops-card" aria-label="Hóa đơn điện tử">
      <div class="head-row">
        <h2>Hóa đơn điện tử</h2>
        <button class="ops-btn ops-btn-small" data-testid="issue-now" :disabled="!inv.pending" @click="issue">Xuất {{ inv.pending }} hóa đơn còn thiếu</button>
      </div>
      <p class="ops-muted">
        {{ inv.provider }}. Thời điểm xuất đang cấu hình: <strong data-testid="issue-on">{{ inv.issueOn === 'delivery' ? 'khi giao hàng (theo tiền thật đã dùng của đơn)' : 'khi nhận tiền (nạp, chuyển khoản trọn gói, trừ thẻ)' }}</strong>.
        Quy định về hóa đơn khi bán điểm / voucher trả trước còn chưa thống nhất nên đây là cấu hình (đổi ở tab Cài đặt, trước khi có hóa đơn đầu tiên).
      </p>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="inv-table">
          <thead><tr><th>Số hóa đơn</th><th>Nguồn</th><th>Khách</th><th class="r">Giá trị</th><th class="r">VAT</th><th>Ngày xuất</th></tr></thead>
          <tbody>
            <tr v-for="i in inv.list" :key="i.id" :data-invoice="i.number">
              <td class="mono">{{ i.number }}<small>tra cứu {{ i.lookupCode }}</small></td>
              <td>{{ i.description }}<small class="mono">{{ i.sourceId }}</small></td>
              <td class="mono">{{ i.customerId }}</td>
              <td class="r">{{ fmt(i.totalVnd) }}</td>
              <td class="r">{{ i.vatUnconfirmed ? 'chưa xác nhận' : fmt(i.vatVnd) }}</td>
              <td>{{ fmtDeadline(new Date(i.issuedAt)) }}</td>
            </tr>
            <tr v-if="!inv.list.length"><td colspan="6" class="ops-muted">Chưa có hóa đơn nào được xuất.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const inv = ref(null);
const error = ref('');
const from = ref('');
const to = ref('');

async function load() {
  try {
    [data.value, inv.value] = await Promise.all([api.ops.finance.revenue(ctx.value, { from: from.value || null, to: to.value || null }), api.ops.finance.invoices(ctx.value)]);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 8000 });

async function issue() {
  try {
    await api.ops.finance.issueInvoices(ctx.value);
  } catch (e) {
    error.value = financeError(e);
  }
  await load();
}
</script>
