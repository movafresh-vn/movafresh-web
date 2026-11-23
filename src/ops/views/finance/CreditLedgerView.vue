<template>
  <section>
    <h1>Sổ Fresh Credit</h1>
    <p class="ops-muted fin-note">
      Sổ phụ theo từng bút, hai ngăn: <strong>tiền thật</strong> (khách đã nạp, hoàn được khi dừng gói) và <strong>khuyến mãi</strong> (thưởng nạp, thưởng hồ sơ, chia sẻ, giới thiệu, bù sự cố; không hoàn).
      Thứ tự trừ khi trả tuần giao: {{ orderText }} (cấu hình <code>credit.spendOrder</code>). Đây là sổ nghiệp vụ, không phải sổ kế toán; bút toán xuất ở tab "Xuất bút toán".
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <template v-if="sum">
      <div class="fin-tiles">
        <div class="fin-tile" data-testid="liability-real"><span class="n">{{ fmt(sum.liabilityRealVnd) }}</span><strong>Nợ Fresh Credit</strong><small>phần tiền thật chưa dùng</small></div>
        <div class="fin-tile" data-testid="promo-outstanding"><span class="n">{{ fmt(sum.promoOutstandingVnd) }}</span><strong>Khuyến mãi còn treo</strong><small>không hoàn khi dừng gói</small></div>
        <div class="fin-tile"><span class="n">{{ fmt(sum.totalVnd) }}</span><strong>Tổng số dư khách</strong><small>{{ sum.customers.length }} khách có bút</small></div>
        <div class="fin-tile" :class="sum.drift.length ? 'bad' : 'ok'"><span class="n">{{ sum.drift.length ? `${sum.drift.length} khách lệch` : 'Khớp' }}</span><strong>Sổ so với số dư thực</strong><small>sổ dựng từ từng bút</small></div>
      </div>

      <section class="ops-card" aria-label="Các nhóm bút">
        <h2>Các nhóm bút</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="group-table">
            <thead><tr><th>Nhóm</th><th class="r">Số bút</th><th class="r">Tiền thật</th><th class="r">Khuyến mãi</th></tr></thead>
            <tbody>
              <tr v-for="g in sum.groups" :key="g.id" class="row-click" :class="{ 'row-on': group === g.id }" :data-group="g.id" tabindex="0" @click="setGroup(g.id)" @keydown.enter="setGroup(g.id)">
                <td>{{ g.label }}</td><td class="r">{{ g.count }}</td>
                <td class="r" :class="cls(g.realVnd)">{{ signedVnd(g.realVnd) }}</td><td class="r" :class="cls(g.promoVnd)">{{ signedVnd(g.promoVnd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="fin-grid2">
        <section class="ops-card" aria-label="Số dư theo khách">
          <h2>Số dư theo khách</h2>
          <p class="ops-muted">Chỉ có mã khách (kế toán không xem tên, số điện thoại, địa chỉ). Bấm một khách để xem từng bút kèm số dư chạy.</p>
          <div class="ops-table-wrap" style="max-height: 360px; overflow-y: auto">
            <table class="ops-table" data-testid="customer-table">
              <thead><tr><th>Mã khách</th><th class="r">Tiền thật</th><th class="r">Khuyến mãi</th></tr></thead>
              <tbody>
                <tr v-for="c in sum.customers" :key="c.customerId" class="row-click" :class="{ 'row-on': customerId === c.customerId }" :data-customer="c.customerId" tabindex="0" @click="pick(c.customerId)" @keydown.enter="pick(c.customerId)">
                  <td class="mono" :title="c.customerId">{{ c.customerCode || c.customerId }}</td><td class="r">{{ fmt(c.realVnd) }}</td><td class="r">{{ fmt(c.promoVnd) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ops-card" aria-label="Điều chỉnh">
          <h2>Điều chỉnh Fresh Credit</h2>
          <p class="ops-muted">Kế toán đề nghị, <strong>admin duyệt</strong> thì mới đổi số dư và ghi bút. Người đề nghị không tự duyệt.</p>
          <form v-if="adj && adj.canRequest" class="fin-tools" novalidate @submit.prevent="request">
            <div><label for="a-c">Mã khách</label><input id="a-c" v-model.trim="form.customerId" class="ops-input" placeholder="bấm một khách ở bảng bên" data-testid="adj-customer" /></div>
            <div>
              <label for="a-b">Ngăn</label>
              <select id="a-b" v-model="form.bucket" class="ops-input" data-testid="adj-bucket"><option value="real">Tiền thật</option><option value="promo">Khuyến mãi</option></select>
            </div>
            <div><label for="a-d">Số tiền (+ cộng, − trừ)</label><input id="a-d" v-model.number="form.deltaVnd" type="number" step="1000" class="ops-input" data-testid="adj-amount" /></div>
            <div style="flex: 1 1 220px"><label for="a-r">Lý do</label><input id="a-r" v-model="form.reason" class="ops-input" style="width: 100%" data-testid="adj-reason" /></div>
            <button class="ops-btn ops-btn-primary" type="submit" data-testid="adj-submit">Gửi đề nghị</button>
          </form>
          <p v-if="msg" class="ops-ok" role="status" data-testid="adj-msg">{{ msg }}</p>
          <p v-if="adjError" class="ops-error" role="alert" data-testid="adj-error">{{ adjError }}</p>
          <div class="ops-table-wrap">
            <table class="ops-table" data-testid="adj-table">
              <thead><tr><th>Khách</th><th>Ngăn</th><th class="r">Số tiền</th><th>Lý do</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                <tr v-for="a in adj ? adj.list : []" :key="a.id" :data-adj="a.id">
                  <td class="mono">{{ a.customerId }}</td><td>{{ a.bucket === 'real' ? 'Tiền thật' : 'Khuyến mãi' }}</td>
                  <td class="r" :class="cls(a.deltaVnd)">{{ signedVnd(a.deltaVnd) }}</td><td>{{ a.reason }}</td>
                  <td><span class="ops-pill" :class="{ 'ops-pill-warn': a.status === 'pending', 'ops-pill-ok': a.status === 'approved', 'ops-pill-bad': a.status === 'rejected' }">{{ STATUS[a.status] }}</span></td>
                  <td>
                    <div v-if="a.status === 'pending' && adj.canApprove" class="fin-actions">
                      <button class="ops-btn ops-btn-primary" :data-approve="a.id" @click="decide(a, true)">Duyệt</button>
                      <button class="ops-btn" :data-reject="a.id" @click="decide(a, false)">Từ chối</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!adj || !adj.list.length"><td colspan="6" class="ops-muted">Chưa có yêu cầu điều chỉnh.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section v-if="ledger" class="ops-card" aria-label="Sổ từng bút">
        <div class="head-row">
          <h2>{{ customerId ? `Sổ của ${customerId}` : 'Sổ từng bút (mới nhất trước)' }}</h2>
          <div class="fin-actions">
            <button v-if="customerId || group" class="ops-btn ops-btn-small" data-testid="clear-filter" @click="clear">Bỏ lọc</button>
          </div>
        </div>
        <p v-if="ledger.balance" class="ops-muted">Số dư hiện tại: tiền thật <strong>{{ fmt(ledger.balance.real) }}</strong>, khuyến mãi <strong>{{ fmt(ledger.balance.promo) }}</strong>.</p>
        <p class="ops-muted">Hiện {{ ledger.rows.length }} / {{ ledger.total }} bút{{ group ? ` (nhóm: ${groupLabel})` : '' }}.</p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="ledger-table">
            <thead><tr><th>Thời điểm</th><th>Khách</th><th>Loại bút</th><th class="r">Tiền thật</th><th class="r">Khuyến mãi</th><th v-if="customerId" class="r">Số dư sau bút</th></tr></thead>
            <tbody>
              <tr v-for="r in ledger.rows" :key="r.id" :data-kind="r.kind">
                <td>{{ fmtDeadline(new Date(r.at)) }}<small class="mono">{{ r.id }}</small></td>
                <td class="mono">{{ r.customerId }}<small v-if="r.orderId">{{ r.orderId }}</small></td>
                <td>
                  {{ r.label }}<small v-if="r.ref" class="mono">mã {{ r.ref }}</small><small v-if="r.note">{{ r.note }}</small>
                  <small v-if="r.backfill" class="ops-muted">bút dựng lại (đầu kỳ)</small><small v-if="r.approvedBy">đã duyệt bởi {{ r.approvedBy }}</small>
                </td>
                <td class="r" :class="cls(r.realVnd)">{{ r.direct ? '—' : signedVnd(r.realVnd) }}</td>
                <td class="r" :class="cls(r.promoVnd)">{{ r.direct ? '—' : signedVnd(r.promoVnd) }}</td>
                <td v-if="customerId" class="r">{{ r.balanceAfter ? `${fmt(r.balanceAfter.real)} + ${fmt(r.balanceAfter.promo)}` : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ops-muted">Dòng "—": thu tiền trực tiếp cho tuần giao (thẻ, chuyển khoản trọn gói) nên không đi qua số dư Fresh Credit.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDeadline } from '../../../shared/utils/time';
import { signedVnd } from '../../format';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const STATUS = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const sum = ref(null);
const adj = ref(null);
const ledger = ref(null);
const error = ref('');
const msg = ref('');
const adjError = ref('');
const group = ref(null);
const customerId = ref(null);
const form = reactive({ customerId: '', bucket: 'real', deltaVnd: 0, reason: '' });

const cls = (n) => (n > 0 ? 'fin-pos' : n < 0 ? 'fin-neg' : '');
const orderText = computed(() => (sum.value ? sum.value.spendOrder.map((b) => (b === 'real' ? 'tiền thật' : 'khuyến mãi')).join(' trước, rồi ') : ''));
const groupLabel = computed(() => ((sum.value && sum.value.groupList.find((g) => g.id === group.value)) || {}).label || '');

async function load() {
  try {
    const q = { customerId: customerId.value, group: group.value, limit: 120 };
    [sum.value, adj.value, ledger.value] = await Promise.all([api.ops.finance.creditSummary(ctx.value), api.ops.finance.adjustments(ctx.value), api.ops.finance.creditLedger(ctx.value, q)]);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 8000 });

const setGroup = (id) => { group.value = group.value === id ? null : id; load(); };
const pick = (id) => { customerId.value = customerId.value === id ? null : id; if (customerId.value) form.customerId = customerId.value; load(); };
const clear = () => { group.value = null; customerId.value = null; load(); };

async function request() {
  msg.value = '';
  adjError.value = '';
  try {
    const a = await api.ops.finance.requestAdjustment(ctx.value, { customerId: form.customerId, bucket: form.bucket, deltaVnd: Number(form.deltaVnd), reason: form.reason });
    msg.value = `Đã gửi đề nghị ${a.id}, chờ admin duyệt.`;
    form.reason = '';
    form.deltaVnd = 0;
  } catch (e) {
    adjError.value = financeError(e);
  }
  await load();
}

async function decide(a, approve) {
  msg.value = '';
  adjError.value = '';
  try {
    await api.ops.finance.decideAdjustment(ctx.value, { id: a.id, approve });
    msg.value = approve ? `Đã duyệt ${a.id}: số dư và sổ đã cập nhật.` : `Đã từ chối ${a.id}.`;
  } catch (e) {
    adjError.value = financeError(e);
  }
  await load();
}
</script>
