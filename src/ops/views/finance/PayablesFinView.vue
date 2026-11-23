<template>
  <section>
    <h1>Công nợ & đợt chi</h1>
    <p class="ops-muted fin-note">
      Hóa đơn nhà cung cấp (từ cổng hoặc mua hàng nhập tay) đã đối chiếu 3 chiều với PO và phiếu nhập ở phân hệ Mua hàng; khiếu nại phần không đạt đã trừ vào số phải trả.
      Tuổi nợ tính theo số ngày <strong>quá hạn</strong>. Đề xuất đợt chi gồm khoản quá hạn hoặc đến hạn trong {{ data ? data.payRun.leadDays : 3 }} ngày tới.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="ops-error" role="alert">{{ actionError }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="pay-msg">{{ msg }}</p>
    <template v-if="data">
      <section class="ops-card" aria-label="Tuổi nợ">
        <h2>Tuổi nợ phải trả</h2>
        <div class="fin-tiles" data-testid="aging">
          <div v-for="b in data.aging.buckets" :key="b.id" class="fin-tile" :class="b.id !== 'not_due' && b.count ? 'bad' : ''" :data-aging="b.id">
            <span class="n">{{ fmt(b.amountVnd) }}</span><strong>{{ b.label }}</strong><small>{{ b.count }} khoản</small>
          </div>
        </div>
        <dl class="kv">
          <div><dt>Đang nợ (đã đối chiếu)</dt><dd data-testid="open-total">{{ fmt(data.totals.openVnd) }}</dd></div>
          <div><dt>Quá hạn</dt><dd :class="{ 'diff-over': data.totals.overdueVnd }">{{ fmt(data.totals.overdueVnd) }}</dd></div>
          <div><dt>Chờ đối chiếu hóa đơn</dt><dd>{{ fmt(data.totals.waitingMatchVnd) }}</dd></div>
          <div><dt>Khiếu nại đã trừ vào công nợ</dt><dd>{{ fmt(data.totals.claimDeductedVnd) }}</dd></div>
          <div><dt>Khiếu nại chưa trừ</dt><dd>{{ fmt(data.totals.claimOpenVnd) }}</dd></div>
        </dl>
      </section>

      <section class="ops-card" aria-label="Đề xuất đợt chi">
        <div class="head-row">
          <h2>Đề xuất đợt chi ({{ fmtDay(data.today) }})</h2>
          <div class="fin-actions">
            <button class="ops-btn ops-btn-small" data-testid="pay-file" :disabled="!chosen.length" @click="exportFile">Tải file chi (CSV)</button>
            <button class="ops-btn ops-btn-primary ops-btn-small" data-testid="pay-run" :disabled="!chosen.length" @click="execute">Ghi đã chi {{ chosen.length ? `(${chosen.length})` : '' }}</button>
          </div>
        </div>
        <div class="fin-tools">
          <div>
            <label for="pm">Hình thức chi</label>
            <select id="pm" v-model="method" class="ops-input" data-testid="pay-method"><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option></select>
          </div>
          <p class="ops-muted" style="margin: 0">Đã chọn {{ chosen.length }} khoản, tổng <strong data-testid="chosen-total">{{ fmt(chosenTotal) }}</strong>.</p>
        </div>
        <p v-if="cashWarn" class="fin-warn" role="alert" data-testid="cash-warn">
          <strong>Cảnh báo:</strong> chi tiền mặt từ {{ fmt(data.cashLimitVnd) }} trở lên thì hóa đơn đầu vào KHÔNG được khấu trừ VAT (Luật Thuế GTGT 48/2024/QH15). Có {{ cashWarn }} khoản trong số đã chọn vượt ngưỡng: hãy chọn chuyển khoản, hệ thống sẽ không ghi chi tiền mặt cho các khoản đó.
        </p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="payrun-table">
            <thead><tr><th></th><th>PO · nhà cung cấp</th><th>Hóa đơn</th><th class="r">Phải trả</th><th>Hạn</th></tr></thead>
            <tbody>
              <tr v-for="i in data.payRun.items" :key="i.poId" :class="{ 'row-bad': i.daysOverdue > 0 }" :data-pay="i.poId">
                <td><label class="fin-check"><input v-model="sel[i.poId]" type="checkbox" :aria-label="`Chọn ${i.poId}`" /></label></td>
                <td><span class="po-id">{{ i.poId }}</span><small>{{ i.supplierName }}</small></td>
                <td>{{ i.invoiceNumber }}<small v-if="i.claimVnd">đã trừ khiếu nại {{ fmt(i.claimVnd) }}</small></td>
                <td class="r">{{ fmt(i.amountVnd) }}<small v-if="i.cashCheck.warn">≥ ngưỡng tiền mặt</small></td>
                <td>{{ dmy(i.dueDay) }}<small :class="{ 'diff-over': i.daysOverdue > 0 }">{{ i.daysOverdue > 0 ? `quá hạn ${i.daysOverdue} ngày` : i.daysOverdue === 0 ? 'đến hạn hôm nay' : `còn ${-i.daysOverdue} ngày` }}</small></td>
              </tr>
              <tr v-if="!data.payRun.items.length"><td colspan="5" class="ops-muted">Không có khoản nào cần chi trong kỳ.</td></tr>
            </tbody>
          </table>
        </div>
        <ul v-if="results.length" class="ops-list" data-testid="pay-results">
          <li v-for="r in results" :key="r.poId" :class="r.ok ? 'ops-ok' : 'ops-error'">{{ r.poId }}: {{ r.ok ? `đã ghi chi ${fmt(r.amountVnd)}` : r.message }}</li>
        </ul>
      </section>

      <section class="ops-card" aria-label="Công nợ từng PO">
        <h2>Công nợ từng PO</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="payable-table">
            <thead><tr><th>PO</th><th class="r">Đã giao</th><th>Hóa đơn</th><th class="r">Phải trả</th><th>Đến hạn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.poId">
                <td><span class="po-id">{{ r.poId }}</span><small>{{ r.supplierName }}</small></td>
                <td class="r">{{ fmt(r.deliveredVnd) }}<small v-if="r.claimVnd">khiếu nại −{{ fmt(r.claimVnd) }}</small></td>
                <td>{{ r.invoiceNumber || 'Chưa có' }}<small v-if="r.invoiceNumber">{{ fmt(r.invoiceVnd) }}</small></td>
                <td class="r">{{ r.payableVnd != null ? fmt(r.payableVnd) : '—' }}</td>
                <td>{{ r.dueAt ? dmy(r.dueAt) : '—' }}</td>
                <td><span class="ops-pill" :class="stagePill(r.stage)">{{ labels[r.stage] }}</span><small v-if="r.paidAt">trả {{ dmy(r.paidAt) }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="fin-grid2">
        <section class="ops-card" aria-label="Chờ đối chiếu">
          <h2>Hóa đơn chờ đối chiếu 3 chiều</h2>
          <p class="ops-muted">Việc đối chiếu làm ở Mua hàng → Đơn mua. Kế toán theo dõi ở đây.</p>
          <ul class="ops-list" data-testid="waiting-match">
            <li v-for="w in data.waitingMatch" :key="w.poId">{{ w.poId }} · {{ w.supplierName }} · {{ w.invoiceNumber }} · {{ fmt(w.invoiceVnd) }}
              <span class="ops-pill" :class="w.matchOk ? 'ops-pill-ok' : 'ops-pill-warn'">{{ w.matchOk ? 'khớp' : `${w.issues} chênh lệch` }}</span></li>
            <li v-if="!data.waitingMatch.length" class="ops-muted">Không có hóa đơn nào đang chờ.</li>
          </ul>
        </section>
        <section class="ops-card" aria-label="Khiếu nại">
          <h2>Khiếu nại trừ vào công nợ</h2>
          <div class="ops-table-wrap">
            <table class="ops-table" data-testid="claim-table">
              <thead><tr><th>Phiếu</th><th>Mặt hàng</th><th class="r">Số tiền</th><th>Trạng thái</th></tr></thead>
              <tbody>
                <tr v-for="c in data.claims" :key="c.id"><td class="mono">{{ c.id }}<small>{{ c.supplierName }}</small></td><td>{{ c.skuName }} {{ c.qty }} {{ c.unit }}</td><td class="r">{{ fmt(c.amountVnd) }}</td>
                  <td><span class="ops-pill" :class="c.status === 'deducted' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ CLAIM_LABEL[c.status] }}</span></td></tr>
                <tr v-if="!data.claims.length"><td colspan="4" class="ops-muted">Chưa có khiếu nại.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay } from '../../../shared/utils/time';
import { downloadText } from '../../download';
import { CLAIM_LABEL, PO_STATUS_LABEL as labels, dmy, stagePill } from '../../labels';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const error = ref('');
const msg = ref('');
const actionError = ref('');
const method = ref('bank_transfer');
const sel = reactive({});
const results = ref([]);

const chosen = computed(() => (data.value ? data.value.payRun.items.filter((i) => sel[i.poId]) : []));
const chosenTotal = computed(() => chosen.value.reduce((s, i) => s + i.amountVnd, 0));
const cashWarn = computed(() => (method.value === 'cash' ? chosen.value.filter((i) => i.cashCheck.warn).length : 0));

async function load() {
  try {
    data.value = await api.ops.finance.payables(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 8000 });

async function exportFile() {
  actionError.value = '';
  try {
    const f = await api.ops.finance.payRunFile(ctx.value, { poIds: chosen.value.map((i) => i.poId) });
    downloadText(f.filename, f.csv);
    msg.value = `Đã tải ${f.filename}: ${f.count} khoản, ${fmt(f.totalVnd)}. Tệp để kế toán nạp lên ngân hàng; chưa phải lệnh chi.`;
  } catch (e) {
    actionError.value = financeError(e);
  }
}

async function execute() {
  msg.value = '';
  actionError.value = '';
  try {
    const r = await api.ops.finance.executePayRun(ctx.value, { poIds: chosen.value.map((i) => i.poId), method: method.value });
    results.value = r.results;
    msg.value = `Đã ghi chi ${r.paid} khoản, tổng ${fmt(r.totalVnd)}.`;
    for (const x of r.results) if (x.ok) sel[x.poId] = false;
  } catch (e) {
    actionError.value = financeError(e);
  }
  await load();
}
</script>
