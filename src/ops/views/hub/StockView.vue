<template>
  <section>
    <h1>Tồn kho phụ</h1>
    <p class="ops-muted proc-note">Tồn theo lô và hạn dùng. Xuất theo FEFO: lô hết hạn sớm nhất xuất trước, bỏ qua lô đã quá hạn và lô đang bị giữ vì thu hồi. Xuất hủy có lý do được tính vào chi phí hao hụt.</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="st-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="st-msg">{{ msg }}</p>

    <template v-if="d">
      <section class="ops-card" aria-label="Tồn theo mặt hàng">
        <h2>Tồn theo mặt hàng</h2>
        <div class="stock-grid" data-testid="stock-summary">
          <div v-for="s in d.summary" :key="s.sku" class="stock-card" :class="{ bad: s.expired || s.held, warn: s.expiring }" :data-sum="s.sku">
            <strong>{{ s.name }}</strong>
            <span class="stock-n">{{ n(s.available) }} <small>{{ s.unit }}</small></span>
            <small>dùng được{{ s.nextExpiry ? ` · HSD gần nhất ${dmy(s.nextExpiry)}` : '' }}</small>
            <small v-if="s.expiring" class="diff-over">{{ n(s.expiring) }} sắp hết hạn</small>
            <small v-if="s.expired" class="diff-over">{{ n(s.expired) }} đã quá hạn</small>
            <small v-if="s.held" class="diff-over">{{ n(s.held) }} đang giữ (thu hồi)</small>
          </div>
        </div>
      </section>

      <section class="ops-card" aria-label="Xuất theo FEFO">
        <h2>Xuất kho theo FEFO</h2>
        <form class="inline-form" novalidate @submit.prevent="plan">
          <div><label for="x-sku">Mặt hàng</label>
            <select id="x-sku" v-model="x.sku" class="ops-input" data-testid="x-sku"><option value="" disabled>Chọn mặt hàng</option><option v-for="s in d.summary" :key="s.sku" :value="s.sku">{{ s.name }}</option></select>
          </div>
          <div><label for="x-qty">Số lượng</label><input id="x-qty" v-model.number="x.qty" type="number" min="0" step="0.1" class="ops-input narrow" data-testid="x-qty" /></div>
          <div><label for="x-ref">Xuất cho (ghi chú)</label><input id="x-ref" v-model="x.ref" class="ops-input" placeholder="ví dụ: ghép thùng sáng mai" /></div>
          <button class="ops-btn" type="submit" data-testid="x-plan">Xem lô sẽ xuất</button>
        </form>
        <div v-if="xp" class="gap-top" data-testid="x-plan-result">
          <table class="ops-table"><thead><tr><th>Lô</th><th class="r">Xuất</th><th>HSD</th></tr></thead>
            <tbody><tr v-for="a in xp.allocations" :key="a.stockId"><td class="mono">{{ a.lotCode }}</td><td class="r">{{ n(a.qty) }}</td><td>{{ dmy(a.expiresAt) }} <span class="ops-pill" :class="STOCK_PILL[a.state]">{{ STOCK_LABEL[a.state] }}</span></td></tr></tbody>
          </table>
          <p v-if="!xp.ok" class="ops-error">Kho chỉ đủ {{ n(x.qty - xp.shortfall) }}, thiếu {{ n(xp.shortfall) }}.</p>
          <button v-if="xp.ok" class="ops-btn ops-btn-primary" data-testid="x-issue" @click="issue">Xác nhận xuất {{ n(x.qty) }}</button>
        </div>
      </section>

      <section class="ops-card" aria-label="Tồn theo lô">
        <div class="head-row">
          <h2>Tồn theo lô và hạn dùng</h2>
          <div class="ops-actions tight">
            <button class="ops-btn ops-btn-small" data-testid="count-toggle" @click="toggleCount">{{ counting ? 'Hủy kiểm kê' : 'Kiểm kê' }}</button>
          </div>
        </div>
        <form v-if="counting" class="inline-form gap-top" novalidate @submit.prevent="saveCount">
          <div><label for="c-reason">Lý do chênh lệch</label>
            <select id="c-reason" v-model="countReason" class="ops-input" data-testid="count-reason"><option v-for="(t, k) in d.countReasons" :key="k" :value="k">{{ t }}</option></select>
          </div>
          <button class="ops-btn ops-btn-primary" type="submit" data-testid="count-save">Lưu kết quả kiểm kê</button>
          <span class="ops-muted">Nhập số đếm thực tế ở cột "Đếm" của từng lô; lô nào lệch sẽ được điều chỉnh và hao hụt tính vào chi phí.</span>
        </form>
        <div class="ops-table-wrap gap-top">
          <table class="ops-table" data-testid="lot-table">
            <thead><tr><th>FEFO</th><th>Mặt hàng / lô</th><th class="r">Tồn</th><th>Hạn dùng</th><th>Nhận lúc</th><th>Kho</th><th></th></tr></thead>
            <tbody>
              <template v-for="l in d.lots" :key="l.id">
                <tr :class="{ 'row-bad': l.state === 'expired' || l.state === 'held', 'row-warn': l.state === 'expiring' }" :data-lot="l.lotCode">
                  <td><span v-if="l.state === 'ok' || l.state === 'expiring'" class="fefo-rank" :title="`Thứ tự xuất ${l.fefoRank}`">{{ l.fefoRank }}</span><span v-else>—</span></td>
                  <td><strong>{{ l.name }}</strong><small class="mono">{{ l.lotCode }}</small><StickerTag :temp="l.temp" /></td>
                  <td class="r strong-n">{{ n(l.qty) }} {{ l.unit }}</td>
                  <td>{{ dmy(l.expiresAt) }}<small><span class="ops-pill" :class="STOCK_PILL[l.state]">{{ STOCK_LABEL[l.state] }}</span></small></td>
                  <td>{{ fmtDeadline(new Date(l.receivedAt)) }}</td>
                  <td>{{ l.location === 'hub' ? 'Kho phụ' : 'Xưởng' }}</td>
                  <td>
                    <input v-if="counting" v-model.number="counted[l.id]" type="number" min="0" step="0.1" class="ops-input ops-input-sm narrow" :aria-label="`Đếm lô ${l.lotCode}`" :data-count="l.id" />
                    <button v-else class="ops-btn ops-btn-small" :data-waste="l.id" @click="startWaste(l)">Xuất hủy</button>
                  </td>
                </tr>
                <tr v-if="w && w.id === l.id" :data-waste-form="l.id">
                  <td colspan="7">
                    <form class="inline-form" novalidate @submit.prevent="doWaste">
                      <div><label for="w-q">Số lượng hủy (tối đa {{ n(l.qty) }})</label><input id="w-q" v-model.number="w.qty" type="number" min="0" step="0.1" class="ops-input narrow" data-testid="w-qty" /></div>
                      <div><label for="w-r">Lý do</label>
                        <select id="w-r" v-model="w.reason" class="ops-input" data-testid="w-reason"><option value="" disabled>Chọn lý do</option><option v-for="(t, k) in d.wasteReasons" :key="k" :value="k">{{ t }}</option></select>
                      </div>
                      <div><label for="w-n">Ghi chú</label><input id="w-n" v-model="w.note" class="ops-input" /></div>
                      <button class="ops-btn ops-btn-danger" type="submit" data-testid="w-save">Xác nhận hủy</button>
                      <button class="ops-btn" type="button" @click="w = null">Thôi</button>
                    </form>
                  </td>
                </tr>
              </template>
              <tr v-if="!d.lots.length"><td colspan="7" class="ops-muted">Kho chưa có hàng.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ops-card" aria-label="Hao hụt">
        <h2>Chi phí hao hụt tháng {{ d.waste.month }}</h2>
        <p class="stock-n" data-testid="waste-total">{{ fmt(d.waste.totalVnd) }}</p>
        <ul class="history"><li v-for="r in d.waste.rows" :key="r.reason">{{ reasonLabel(r.reason) }}: <strong>{{ fmt(r.costVnd) }}</strong> ({{ r.count }} lần)</li><li v-if="!d.waste.rows.length" class="ops-muted">Chưa có hao hụt tháng này.</li></ul>
      </section>

      <section class="ops-card" aria-label="Xuất nhập gần đây">
        <h2>Xuất nhập gần đây</h2>
        <div class="ops-table-wrap">
          <table class="ops-table"><thead><tr><th>Lúc</th><th>Loại</th><th>Lô</th><th class="r">Số lượng</th><th>Lý do / tham chiếu</th></tr></thead>
            <tbody>
              <tr v-for="m in d.moves" :key="m.id"><td>{{ fmtDeadline(new Date(m.at)) }}</td><td>{{ KIND[m.kind] || m.kind }}</td><td class="mono">{{ m.lotCode }}</td><td class="r">{{ n(m.qty) }}</td><td>{{ reasonLabel(m.reason) || m.ref || '' }}<small v-if="m.costVnd">hao hụt {{ fmt(m.costVnd) }}</small></td></tr>
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
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { STOCK_LABEL, STOCK_PILL, dmy } from '../../labels';
import StickerTag from '../../components/StickerTag.vue';

const d = ref(null);
const error = ref('');
const msg = ref('');
const x = reactive({ sku: '', qty: null, ref: '' });
const xp = ref(null);
const w = ref(null);
const counting = ref(false);
const counted = reactive({});
const countReason = ref('count');
const KIND = { receive: 'Nhập', issue: 'Xuất FEFO', waste: 'Xuất hủy', count: 'Kiểm kê' };

const n = (v) => (Math.round((v || 0) * 100) / 100).toLocaleString('vi-VN');
const reasonLabel = (k) => (d.value && (d.value.wasteReasons[k] || d.value.countReasons[k])) || '';

async function load() {
  try {
    d.value = await api.ops.hub.stock(ctx.value);
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 8000 });

async function run(fn, ok) {
  msg.value = '';
  error.value = '';
  try {
    await fn();
    msg.value = ok;
  } catch (e) {
    error.value = e.message;
  }
  await load();
}

async function plan() {
  error.value = '';
  xp.value = null;
  try {
    xp.value = await api.ops.hub.fefoPlan(ctx.value, { sku: x.sku, qty: x.qty });
    if (!xp.value.allocations.length) error.value = 'Không có lô nào dùng được để xuất.';
  } catch (e) {
    error.value = e.message;
  }
}

async function issue() {
  const qty = x.qty;
  await run(() => api.ops.hub.issue(ctx.value, { sku: x.sku, qty, ref: x.ref }), `Đã xuất ${n(qty)} theo FEFO, trừ đúng các lô hết hạn trước.`);
  xp.value = null;
  if (!error.value) x.qty = null;
}

const startWaste = (l) => {
  w.value = { id: l.id, qty: l.qty, reason: '', note: '' };
};
async function doWaste() {
  await run(() => api.ops.hub.waste(ctx.value, { stockId: w.value.id, qty: w.value.qty, reason: w.value.reason, note: w.value.note }), 'Đã xuất hủy, tính vào chi phí hao hụt.');
  if (!error.value) w.value = null;
}

function toggleCount() {
  counting.value = !counting.value;
  if (counting.value) for (const l of d.value.lots) counted[l.id] = l.qty;
}
async function saveCount() {
  try {
    const r = await api.ops.hub.count(ctx.value, { counted: { ...counted }, reason: countReason.value });
    msg.value = r.diffs.length ? `Đã điều chỉnh ${r.diffs.length} lô theo kết quả kiểm kê.` : 'Kiểm kê khớp, không có lô nào lệch.';
    error.value = '';
    counting.value = false;
  } catch (e) {
    error.value = e.message;
  }
  await load();
}
</script>
