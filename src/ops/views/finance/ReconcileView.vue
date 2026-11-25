<template>
  <section>
    <h1>Thu tiền & đối soát</h1>
    <p class="ops-muted fin-note">
      Tiền khách chuyển khoản (VietQR) về <strong>{{ data ? `${data.bank.bankName} ${data.bank.accountNo}` : '' }}</strong>. Mỗi giao dịch ngân hàng (webhook) tự khớp theo <strong>mã đối soát trong nội dung chuyển khoản</strong>
      (<span class="mono">MOVA…</span> của gói đăng ký, <span class="mono">NAP…</span> của lần nạp). Không thấy mã, lệch số tiền hoặc mã đã khớp trước đó thì vào <strong>hàng chờ khớp tay</strong>.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="ops-error" role="alert" data-testid="rec-error">{{ actionError }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="rec-msg">{{ msg }}</p>
    <template v-if="data">
      <div class="fin-tiles">
        <div class="fin-tile"><span class="n">{{ data.totals.received }} / {{ data.totals.expected }}</span><strong>Khoản đã có tiền về</strong><small>tự khớp {{ data.totals.autoMatched }} · khớp tay {{ data.totals.manualMatched }}</small></div>
        <div class="fin-tile" :class="data.totals.waitingVnd ? 'warn' : ''"><span class="n">{{ fmt(data.totals.waitingVnd) }}</span><strong>Đang chờ tiền về</strong><small>{{ data.waiting.length }} khoản</small></div>
        <div class="fin-tile" :class="data.totals.queue ? 'bad' : 'ok'" data-testid="queue-count"><span class="n">{{ data.totals.queue }}</span><strong>Hàng chờ khớp tay</strong><small>giao dịch cần kế toán xử lý</small></div>
        <div class="fin-tile"><span class="n">{{ fmt(data.cards.totals.netVnd) }}</span><strong>Thẻ: thực nhận sau phí</strong><small>phí cổng {{ fmt(data.cards.totals.feeVnd) }}</small></div>
      </div>

      <section class="ops-card" aria-label="Yêu cầu hoàn tiền">
        <h2>Yêu cầu hoàn tiền đang chờ</h2>
        <p class="ops-muted">Hiển thị tối đa 200 yêu cầu gần hạn nhất. Đối soát từng nguồn và thực hiện hoàn bên ngoài trước khi xác nhận toàn bộ; thao tác này không chuyển tiền.</p>
        <p v-if="!data.refunds" class="fin-warn">Máy chủ chưa hỗ trợ danh sách hoàn tiền; không thể đối soát tại đây.</p>
        <p v-else-if="!data.refunds.length" class="ops-muted">Không có yêu cầu hoàn tiền đang chờ.</p>
        <div v-for="r in data.refunds || []" :key="r.id" class="impact-order" :data-refund="r.id">
          <strong>{{ fmt(r.amountVnd) }}</strong> · yêu cầu <span class="mono">{{ r.id }}</span> · hạn {{ r.dueBy }}
          <div class="ops-muted">Khách: {{ r.customerId }} · gói: {{ r.subscriptionId }}</div>
          <ul v-if="r.sources.length">
            <li v-for="s in r.sources" :key="`${s.weekId}:${s.type}`">
              {{ s.type }} · {{ fmt(s.amountVnd) }} · tuần {{ s.weekId }}
              <span v-if="s.bankTransactionId"> · giao dịch ngân hàng {{ s.bankTransactionId }}</span>
              <span v-if="s.cardProviderRef"> · mã thẻ {{ s.cardProviderRef }}</span>
              <strong v-if="s.reconciliationRequired"> · cần đối soát thủ công</strong>
            </li>
          </ul>
          <p v-if="r.unallocatedVnd > 0" class="fin-warn">Chưa xác định nguồn cho {{ fmt(r.unallocatedVnd) }}. Phải đối soát lịch sử thủ công trước khi hoàn.</p>
          <div class="fin-tools">
            <div><label :for="`refund-ref-${r.id}`">Mã chứng từ hoàn</label><input :id="`refund-ref-${r.id}`" v-model="refundReference[r.id]" class="ops-input" maxlength="200" /></div>
            <div><label :for="`refund-note-${r.id}`">Ghi chú đối soát các nguồn</label><input :id="`refund-note-${r.id}`" v-model="refundNote[r.id]" class="ops-input" maxlength="500" /></div>
            <button class="ops-btn ops-btn-primary" :disabled="refundBusy[r.id] || !refundReference[r.id]?.trim() || !refundNote[r.id]?.trim()" @click="confirmRefund(r)">Xác nhận đã hoàn toàn bộ</button>
          </div>
        </div>
      </section>

      <section v-if="data.refundConfirmations" class="ops-card" aria-label="Lịch sử xác nhận hoàn tiền">
        <h2>Lịch sử xác nhận hoàn tiền</h2>
        <p class="ops-muted">Tối đa 100 xác nhận gần đây. Đây là ghi nhận thao tác thủ công, không phải xác nhận từ ngân hàng.</p>
        <div v-for="r in data.refundConfirmations" :key="r.id" class="impact-order">
          <strong>{{ fmt(r.amountVnd) }}</strong> · yêu cầu {{ r.id }} · khách {{ r.customerId }}
          <div>Chứng từ: {{ r.reference }} · {{ r.note }}</div>
          <div class="ops-muted">{{ r.actorRole }} · {{ r.actorId }} · {{ fmtDeadline(new Date(r.confirmedAt)) }}</div>
        </div>
        <p v-if="!data.refundConfirmations.length" class="ops-muted">Chưa có xác nhận thủ công.</p>
      </section>

      <section class="ops-card" aria-label="Khoản chờ tiền về">
        <div class="head-row">
          <h2>Khoản chờ tiền về</h2>
        </div>
        <p class="ops-muted">Các khoản có mã đối soát nhưng chưa thấy tiền trong sao kê. Tiền về qua webhook ngân hàng tự khớp; nếu webhook chậm, kế toán nhập dòng sao kê ở mục bên dưới.</p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="receipt-table">
            <thead><tr><th>Thời điểm</th><th>Khách</th><th>Mã đối soát</th><th class="r">Số tiền</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in data.receipts" :key="r.ledgerId" :data-receipt="r.ledgerId" :data-state="r.state">
                <td>{{ fmtDeadline(new Date(r.at)) }}</td>
                <td class="mono">{{ r.customerId }}</td>
                <td class="mono">{{ r.ref }}<small>{{ r.kind === 'topup' ? 'nạp Fresh Credit' : 'chuyển khoản trọn gói' }}</small></td>
                <td class="r">{{ fmt(r.amountVnd) }}</td>
                <td>
                  <span class="ops-pill" :class="r.state === 'received' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ r.state === 'received' ? (r.matchedBy === 'manual' ? 'Đã khớp tay' : 'Đã khớp tự động') : 'Chờ tiền về' }}</span>
                  <small v-if="r.diffVnd">lệch {{ signedVnd(r.diffVnd) }}</small>
                </td>
                <td></td>
              </tr>
              <tr v-if="!data.receipts.length"><td colspan="6" class="ops-muted">Chưa có khoản nào cần đối soát.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Nhập dòng sao kê">
        <h2>Nhập dòng sao kê</h2>
        <p class="ops-muted">Chỉ dùng khi ngân hàng chưa gửi webhook: dòng nhập đi cùng đường với webhook (mã giao dịch trùng thì không ghi hai lần).</p>
        <form class="fin-tools" data-testid="import-form" @submit.prevent="importLine">
          <div><label for="imp-txn">Mã giao dịch</label><input id="imp-txn" v-model="line.txnId" class="ops-input" placeholder="để trống: tự sinh" /></div>
          <div><label for="imp-amount">Số tiền (đ)</label><input id="imp-amount" v-model.number="line.amountVnd" class="ops-input" type="number" min="1" step="1" required /></div>
          <div style="flex: 1 1 260px"><label for="imp-content">Nội dung chuyển khoản</label><input id="imp-content" v-model="line.content" class="ops-input" style="width: 100%" /></div>
          <button class="ops-btn ops-btn-primary" type="submit" data-testid="import-submit" :disabled="!(line.amountVnd > 0)">Nhập</button>
        </form>
      </section>

      <section class="ops-card" aria-label="Hàng chờ khớp tay">
        <h2>Hàng chờ khớp tay</h2>
        <div v-if="!data.queue.length" class="ops-muted" data-testid="queue-empty">Không có giao dịch nào chờ khớp tay.</div>
        <div v-for="q in data.queue" :key="q.id" class="impact-order" :data-queue="q.id">
          <div class="head-row">
            <div>
              <strong>{{ fmt(q.amountVnd) }}</strong> · <span class="mono">{{ q.txnId }}</span> · {{ fmtDeadline(new Date(q.at)) }}
              <div class="ops-muted">Nội dung: "{{ q.content }}"</div>
              <div class="fin-warn" style="margin: 6px 0">{{ q.statusLabel }}: {{ q.reason }}</div>
            </div>
          </div>
          <div class="fin-tools">
            <div style="flex: 1 1 260px">
              <label :for="`m-${q.id}`">Khớp với khoản</label>
              <select :id="`m-${q.id}`" v-model="pick[q.id]" class="ops-input" style="width: 100%" :data-pick="q.id">
                <option value="">— chọn khoản chờ tiền về —</option>
                <option v-for="w in data.waiting" :key="w.ledgerId" :value="w.ledgerId">{{ w.customerId }} · {{ w.ref }} · {{ fmt(w.amountVnd) }}</option>
              </select>
            </div>
            <div style="flex: 1 1 200px"><label :for="`n-${q.id}`">Ghi chú / lý do</label><input :id="`n-${q.id}`" v-model="note[q.id]" class="ops-input" style="width: 100%" :data-note="q.id" /></div>
            <button class="ops-btn ops-btn-primary" :data-match="q.id" :disabled="!pick[q.id]" @click="match(q)">Khớp</button>
            <button class="ops-btn" :data-ignore="q.id" @click="ignore(q)">Không phải của MOVA</button>
          </div>
          <p v-if="q.suggestion" class="ops-muted">Gợi ý: {{ q.suggestion.customerId }} · {{ q.suggestion.ref }} · chờ {{ fmt(q.suggestion.amountVnd) }}</p>
        </div>
      </section>

      <section class="ops-card" aria-label="Sao kê ngân hàng">
        <h2>Giao dịch ngân hàng đã nhận</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="bank-table">
            <thead><tr><th>Thời điểm</th><th>Nội dung chuyển khoản</th><th class="r">Số tiền</th><th>Kết quả</th></tr></thead>
            <tbody>
              <tr v-for="t in data.txns" :key="t.id" :data-txn="t.id" :data-status="t.status">
                <td>{{ fmtDeadline(new Date(t.at)) }}<small class="mono">{{ t.txnId }}</small></td>
                <td>{{ t.content }}</td>
                <td class="r">{{ fmt(t.amountVnd) }}</td>
                <td>
                  <span class="ops-pill" :class="{ 'ops-pill-ok': t.status === 'matched', 'ops-pill-warn': t.status === 'amount_diff', 'ops-pill-bad': t.status === 'unmatched' }">{{ t.statusLabel }}</span>
                  <small v-if="t.customerId">{{ t.customerId }} · {{ t.ledgerRef }} · {{ t.matchedBy === 'auto' ? 'tự động' : 'khớp tay' }}</small><small v-if="t.note">{{ t.note }}</small>
                </td>
              </tr>
              <tr v-if="!data.txns.length"><td colspan="4" class="ops-muted">Chưa nhận giao dịch nào.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Thu tiền qua thẻ">
        <h2>Thu tiền qua thẻ</h2>
        <p class="ops-muted">Phí cổng thanh toán = {{ (data.card.feePct * 100).toFixed(1).replace('.', ',') }}% + {{ fmt(data.card.feeFixedVnd) }} mỗi lần (giả định, chờ cổng thanh toán xác nhận); tiền về sau {{ data.card.settleDays }} ngày.</p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="card-table">
            <thead><tr><th>Lần trừ</th><th>Khách</th><th class="r">Số tiền</th><th class="r">Phí cổng</th><th class="r">Thực nhận</th><th>Ngày tiền về</th></tr></thead>
            <tbody>
              <tr v-for="c in data.cards.success" :key="c.ledgerId">
                <td><span class="ops-pill ops-pill-ok">Thành công</span><small>{{ fmtDeadline(new Date(c.at)) }}</small></td>
                <td class="mono">{{ c.customerId }}<small>{{ c.orderId }}</small></td>
                <td class="r">{{ fmt(c.amountVnd) }}</td><td class="r">{{ fmt(c.feeVnd) }}</td><td class="r">{{ fmt(c.netVnd) }}</td>
                <td>{{ fmtDate(new Date(c.settleAt)) }}<small>{{ c.settled ? 'đã về' : 'đang về' }}</small></td>
              </tr>
              <tr v-for="f in data.cards.failed" :key="f.orderId" class="row-bad">
                <td><span class="ops-pill ops-pill-bad">Thất bại</span><small>{{ fmtDeadline(new Date(f.at)) }}</small></td>
                <td class="mono">{{ f.customerId }}<small>{{ f.orderId }}</small></td>
                <td class="r">{{ fmt(f.amountVnd) }}</td><td class="r">—</td><td class="r">—</td>
                <td>{{ f.reason }}<small>{{ f.open ? 'chưa trừ lại được' : 'đã trừ lại thành công' }}</small></td>
              </tr>
              <tr v-if="!data.cards.success.length && !data.cards.failed.length"><td colspan="6" class="ops-muted">Chưa có lần trừ thẻ nào.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDate, fmtDeadline } from '../../../shared/utils/time';
import { signedVnd } from '../../format';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const error = ref('');
const msg = ref('');
const actionError = ref('');
const pick = reactive({});
const note = reactive({});
const refundReference = reactive({});
const refundNote = reactive({});
const refundBusy = reactive({});
const line = reactive({ txnId: '', amountVnd: null, content: '' });

async function load() {
  try {
    data.value = await api.ops.finance.reconciliation(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 6000 });

async function run(fn, okText) {
  msg.value = '';
  actionError.value = '';
  try {
    const r = await fn();
    msg.value = okText(r);
  } catch (e) {
    actionError.value = financeError(e);
  }
  await load();
}

const importLine = () =>
  run(
    () => api.ops.finance.bankWebhook(ctx.value, { txnId: line.txnId.trim() || undefined, amountVnd: line.amountVnd, content: line.content }),
    (r) => {
      const t = r.txn;
      line.txnId = '';
      line.amountVnd = null;
      line.content = '';
      return r.duplicate ? `Giao dịch ${t.txnId} đã có từ trước, không ghi lại.` : `Đã nhập ${fmt(t.amountVnd)}: ${t.statusLabel}.`;
    }
  );
const match = (q) =>
  run(
    () => api.ops.finance.manualMatch(ctx.value, { bankId: q.id, ledgerId: pick[q.id], note: note[q.id] || '' }),
    () => `Đã khớp tay giao dịch ${q.txnId}.`
  );
const ignore = (q) => run(() => api.ops.finance.ignoreBankTxn(ctx.value, { bankId: q.id, note: note[q.id] || '' }), () => `Đã loại giao dịch ${q.txnId}.`);
async function confirmRefund(r) {
  if (!window.confirm('Xác nhận đã đối soát và hoàn TOÀN BỘ yêu cầu này bên ngoài hệ thống?')) return;
  refundBusy[r.id] = true;
  try {
    await run(
      () => api.ops.finance.confirmRefund(ctx.value, { id: r.id, reference: refundReference[r.id].trim(), note: refundNote[r.id].trim() }),
      (result) => result.duplicate ? `Yêu cầu ${r.id} đã được xác nhận trước đó.` : `Đã ghi nhận hoàn tiền cho yêu cầu ${r.id}.`
    );
  } finally {
    refundBusy[r.id] = false;
  }
}
</script>
