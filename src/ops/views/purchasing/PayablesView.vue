<template>
  <section>
    <h1>Công nợ nhà cung cấp</h1>
    <p class="ops-muted proc-note">Mỗi PO đã có hàng nhận là một dòng: đã giao, hóa đơn, ngày đến hạn, đã trả. Phiếu khiếu nại phần không đạt được trừ vào khoản phải trả khi đối chiếu.</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <section class="ops-card" aria-label="Tuổi nợ">
        <h2>Tuổi nợ (khoản đã đối chiếu, chưa trả)</h2>
        <div class="ops-grid" data-testid="aging">
          <div v-for="b in data.aging" :key="b.id" class="ops-stat plan-kpi" :data-aging="b.id">
            <span class="ops-stat-n" :class="{ 'diff-over': b.id === 'overdue' && b.count }">{{ fmt(b.amountVnd) }}</span>
            <span>{{ b.label }} · {{ b.count }} PO</span>
          </div>
        </div>
        <dl class="kv">
          <div><dt>Đang nợ (đã đối chiếu)</dt><dd data-testid="open-total">{{ fmt(data.totals.openVnd) }}</dd></div>
          <div><dt>Đã đến hạn</dt><dd :class="{ 'diff-over': data.totals.dueVnd }">{{ fmt(data.totals.dueVnd) }}</dd></div>
          <div><dt>Chờ đối chiếu hóa đơn</dt><dd>{{ fmt(data.totals.waitingMatchVnd) }}</dd></div>
          <div><dt>Khiếu nại chưa trừ</dt><dd>{{ fmt(data.totals.claimOpenVnd) }}</dd></div>
        </dl>
      </section>

      <section class="ops-card" aria-label="Công nợ từng PO">
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="payable-table">
            <thead><tr><th>PO</th><th class="r">Đã giao</th><th>Hóa đơn</th><th class="r">Phải trả</th><th>Đến hạn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.poId" class="row-click" :class="{ 'row-bad': r.stage === 'due' }" :data-payable="r.poId" tabindex="0" @click="go(r.poId)" @keydown.enter="go(r.poId)">
                <td><span class="po-id">{{ r.poId }}</span><small>{{ r.supplierName }}</small></td>
                <td class="r">{{ fmt(r.deliveredVnd) }}<small v-if="r.claimVnd">khiếu nại −{{ fmt(r.claimVnd) }}</small></td>
                <td>{{ r.invoiceNumber || 'Chưa có' }}<small v-if="r.invoiceNumber">{{ fmt(r.invoiceVnd) }} · {{ dmy(r.invoiceAt) }}</small></td>
                <td class="r">{{ r.payableVnd != null ? fmt(r.payableVnd) : '—' }}</td>
                <td>
                  <template v-if="r.dueAt">{{ dmy(r.dueAt) }}<small v-if="r.status === 'matched'" :class="{ 'diff-over': r.daysToDue < 0 }">{{ r.daysToDue < 0 ? `quá hạn ${-r.daysToDue} ngày` : `còn ${r.daysToDue} ngày` }}</small></template>
                  <span v-else class="ops-muted">—</span>
                </td>
                <td>
                  <span class="ops-pill" :class="stagePill(r.stage)">{{ labels[r.stage] }}</span>
                  <small v-if="r.paidAt">Trả {{ dmy(r.paidAt) }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Khiếu nại">
        <h2>Phiếu khiếu nại phần không đạt</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="claim-table">
            <thead><tr><th>Phiếu</th><th>Nhà cung cấp</th><th>Mặt hàng</th><th>Lý do</th><th class="r">Số tiền</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr v-for="c in data.claims" :key="c.id">
                <td class="mono">{{ c.id }}<small>{{ c.poId }}</small></td><td>{{ c.supplierName }}</td>
                <td>{{ c.skuName }} {{ c.qty }} {{ c.unit }}</td><td>{{ c.note || c.reason }}</td>
                <td class="r">{{ fmt(c.amountVnd) }}</td>
                <td><span class="ops-pill" :class="c.status === 'deducted' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ CLAIM_LABEL[c.status] }}</span></td>
              </tr>
              <tr v-if="!data.claims.length"><td colspan="6" class="ops-muted">Chưa có khiếu nại.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { CLAIM_LABEL, PO_STATUS_LABEL as labels, dmy, stagePill } from '../../labels';

const router = useRouter();
const data = ref(null);
const error = ref('');

async function load() {
  try {
    data.value = await api.ops.procurement.payables(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 8000 });

const go = (poId) => router.push({ path: '/mua-hang', query: { po: poId } });
</script>
