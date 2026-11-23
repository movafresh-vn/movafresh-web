<template>
  <section>
    <div class="ops-noprint">
      <h1>Thu hồi lô</h1>
      <p class="ops-muted proc-note">Chọn lô nguyên liệu có vấn đề: hệ thống liệt kê mọi đơn chứa lô theo trạng thái (chưa xuất / đang giao / đã giao). Giữ hàng, báo khách, bù Fresh Credit, hủy tồn kho đang giữ, rồi in báo cáo thu hồi.</p>
      <p v-if="error" class="ops-error" role="alert" data-testid="rcl-error">{{ error }}</p>
      <p v-if="msg" class="ops-ok" role="status" data-testid="rcl-msg">{{ msg }}</p>

      <section class="ops-card" aria-label="Tạo đợt thu hồi">
        <h2>Tạo đợt thu hồi</h2>
        <form novalidate @submit.prevent="create">
          <label for="n-lot">Lô cần thu hồi</label>
          <select id="n-lot" v-model="form.lotCode" class="ops-input" data-testid="rcl-lot">
            <option value="" disabled>Chọn lô…</option>
            <option v-for="l in lots" :key="l.lotCode" :value="l.lotCode" :disabled="l.recalled">{{ l.lotCode }} · {{ l.skuName }} · {{ l.orders }} đơn{{ l.recalled ? ' · đã có đợt thu hồi' : '' }}</option>
          </select>
          <label for="n-reason">Lý do thu hồi</label>
          <input id="n-reason" v-model="form.reason" class="ops-input" placeholder="ví dụ: kết quả test nhanh tồn dư kháng sinh dương tính" data-testid="rcl-reason" />
          <button class="ops-btn ops-btn-danger" type="submit" data-testid="rcl-create">Tạo đợt thu hồi</button>
        </form>
      </section>

      <section class="ops-card" aria-label="Các đợt thu hồi">
        <h2>Các đợt thu hồi</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="rcl-list">
            <thead><tr><th>Đợt</th><th>Lô</th><th class="r">Chưa xuất</th><th class="r">Đang giao</th><th class="r">Đã giao</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr v-for="r in recalls" :key="r.id" class="row-click" :class="{ 'row-on': cur && cur.recall.id === r.id }" :data-recall="r.id" tabindex="0" @click="open(r.id)" @keydown.enter="open(r.id)">
                <td class="mono">{{ r.id }}<small>{{ fmtDeadline(new Date(r.createdAt)) }}</small></td>
                <td class="mono">{{ r.lotCode }}<small>{{ r.skuName }} · {{ r.reason }}</small></td>
                <td class="r">{{ r.counts.not_shipped }}</td><td class="r">{{ r.counts.in_transit }}</td><td class="r">{{ r.counts.delivered }}</td>
                <td><span class="ops-pill" :class="r.status === 'open' ? 'ops-pill-bad' : 'ops-pill-ok'">{{ r.status === 'open' ? 'Đang mở' : 'Đã đóng' }}</span></td>
              </tr>
              <tr v-if="!recalls.length"><td colspan="6" class="ops-muted">Chưa có đợt thu hồi nào.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <template v-if="cur">
        <section class="ops-card" aria-label="Chi tiết đợt thu hồi" :data-detail="cur.recall.id">
          <div class="head-row">
            <h2>{{ cur.recall.id }} · lô <span class="mono mono-wrap">{{ cur.recall.lotCode }}</span></h2>
            <span class="ops-pill" :class="cur.recall.status === 'open' ? 'ops-pill-bad' : 'ops-pill-ok'">{{ cur.recall.status === 'open' ? 'Đang mở' : 'Đã đóng' }}</span>
          </div>
          <p class="tight">{{ cur.skuName }} · lý do: <strong>{{ cur.recall.reason }}</strong></p>
          <p v-if="cur.source" class="ops-muted tight">Nguồn: {{ cur.source.name }}, {{ cur.source.location }}</p>

          <div class="group-tabs">
            <button v-for="g in cur.groups" :key="g.id" type="button" class="group-card" :class="[`group-${g.id}`, { on: grp === g.id }]" :data-rgroup="g.id" @click="grp = grp === g.id ? '' : g.id">
              <span class="n" :data-rcount="g.id">{{ g.count }}</span>{{ g.label }}
              <small>giữ {{ g.held }} · báo {{ g.notified }} · bù {{ g.compensated }}</small>
            </button>
          </div>
          <dl class="kv">
            <div><dt>Đơn bị ảnh hưởng</dt><dd data-testid="rcl-total">{{ cur.totals.orders }}</dd></div>
            <div><dt>Tồn kho đang giữ</dt><dd>{{ cur.totals.stockHeld }} lô</dd></div>
            <div><dt>Đã bù Fresh Credit</dt><dd data-testid="rcl-comp">{{ fmt(cur.totals.compensationVnd) }}</dd></div>
            <div><dt>Hao hụt hủy tồn kho</dt><dd>{{ fmt(cur.totals.stockWasteVnd) }}</dd></div>
          </dl>

          <div v-if="cur.recall.status === 'open'" class="ops-actions">
            <button class="ops-btn" data-testid="act-hold" :disabled="!count('not_shipped')" @click="act(() => api.ops.hub.holdOrders(ctx, { recallId: cur.recall.id }), (r) => `Đã giữ ${r.held} đơn chưa xuất kho, các đơn này không lên xe được.`)">Giữ hàng ({{ count('not_shipped') }} đơn chưa xuất)</button>
            <button class="ops-btn" data-testid="act-notify" @click="act(() => api.ops.hub.notifyCustomers(ctx, { recallId: cur.recall.id }), (r) => `Đã báo ${r.notified} khách.`)">Báo khách</button>
            <template v-if="cur.canCompensate">
              <input v-model.number="compAmount" type="number" min="0" step="1000" class="ops-input ops-input-sm mid" placeholder="Mức bù chung (để trống: theo giá món)" aria-label="Mức bù chung" data-testid="comp-amount" />
              <button class="ops-btn" data-testid="act-comp" @click="act(() => api.ops.hub.compensate(ctx, { recallId: cur.recall.id, amountVnd: compAmount === '' || compAmount == null ? null : compAmount }), (r) => `Đã bù ${fmt(r.totalVnd)} cho ${r.compensated} đơn.`)">Bù Fresh Credit (đang giao + đã giao)</button>
            </template>
            <button class="ops-btn" data-testid="act-waste" :disabled="!cur.totals.stockHeld" @click="act(() => api.ops.hub.wasteHeldStock(ctx, { recallId: cur.recall.id }), (r) => `Đã hủy ${r.lots} lô tồn kho, hao hụt ${fmt(r.costVnd)}.`)">Hủy tồn kho đang giữ</button>
            <button class="ops-btn ops-btn-primary" data-testid="act-print" @click="printReport">In báo cáo thu hồi</button>
          </div>
          <div v-else class="ops-actions"><button class="ops-btn ops-btn-primary" data-testid="act-print" @click="printReport">In báo cáo thu hồi</button></div>
          <p v-if="!cur.canCompensate && cur.recall.status === 'open'" class="help">Bù Fresh Credit là tiền của MOVA nên chỉ mua hàng hoặc admin bấm. Kho phụ giữ hàng và báo khách.</p>
        </section>

        <section class="ops-card" aria-label="Đơn bị ảnh hưởng">
          <h2>Đơn bị ảnh hưởng{{ grp ? ` · ${GROUP[grp]}` : '' }}</h2>
          <div class="ops-table-wrap">
            <table class="ops-table recall-orders" data-testid="rcl-orders">
              <thead><tr><th>Đơn</th><th>Giao</th><th>Trạng thái</th><th>Món có nguyên liệu lô</th><th>Đã xử lý</th><th>Người nhận</th></tr></thead>
              <tbody>
                <tr v-for="o in shown" :key="o.orderId" :data-rorder="o.orderId">
                  <td class="mono">{{ o.orderId }}</td>
                  <td>{{ dm(o.deliveryDay) }}<small>{{ zoneName(o.zoneId) }} · {{ slotLabel(o.zoneId, o.slotId) }}</small></td>
                  <td><span class="ops-pill" :class="`group-pill-${o.group}`">{{ o.groupLabel }}</span></td>
                  <td>
                    {{ o.dishes.join('; ') }}
                    <template v-if="o.group === 'not_shipped' && cur.recall.status === 'open'">
                      <div v-for="h in o.suggestions" :key="`${h.mealIndex}-${h.kind}`" class="impact-hit">
                        <small>Bữa {{ h.mealIndex + 1 }}: {{ h.dishName }} →</small>
                        <template v-if="h.options.length">
                          <select v-model="picks[`${o.orderId}|${h.mealIndex}|${h.kind}`]" class="ops-input ops-input-sm" :aria-label="`Món thay cho ${h.dishName}`">
                            <option v-for="op in h.options" :key="op.dishId" :value="op.dishId">{{ op.name }} ({{ op.priceDeltaVnd > 0 ? '+' : '' }}{{ fmt(op.priceDeltaVnd) }})</option>
                          </select>
                          <button class="ops-btn ops-btn-small" :data-swap="`${o.orderId}-${h.mealIndex}`" @click="swap(o, h)">Đổi món</button>
                        </template>
                        <small v-else class="ops-error">Không có món thay</small>
                      </div>
                    </template>
                  </td>
                  <td>
                    <span v-if="o.heldAt" class="ops-pill ops-pill-warn">đã giữ</span>
                    <span v-if="o.notifiedAt" class="ops-pill ops-pill-ok">đã báo khách</span>
                    <span v-if="o.compensation" class="ops-pill ops-pill-ok">bù {{ fmt(o.compensation.amountVnd) }}</span>
                  </td>
                  <td><template v-if="o.recipient">{{ o.recipient.name }}<small>{{ o.recipient.address }} · {{ o.recipient.phone }}</small></template><span v-else class="ops-muted">Ẩn</span></td>
                </tr>
                <tr v-if="!shown.length"><td colspan="6" class="ops-muted">Không có đơn nào.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="cur.recall.status === 'open'" class="ops-card" aria-label="Đóng đợt">
          <h2>Đóng đợt thu hồi</h2>
          <form class="inline-form" novalidate @submit.prevent="close">
            <div><label for="c-note">Ghi chú kết thúc</label><input id="c-note" v-model="closeNote" class="ops-input" style="min-width: 260px" data-testid="close-note" /></div>
            <label class="ops-check" for="c-release"><input id="c-release" v-model="releaseStock" type="checkbox" data-testid="close-release" /> Lô đã kiểm an toàn: nhả luôn tồn kho đang giữ</label>
            <button class="ops-btn" type="submit" data-testid="act-close">Đóng đợt (bỏ giữ các đơn)</button>
          </form>
        </section>

        <section class="ops-card" aria-label="Nhật ký">
          <h2>Nhật ký việc đã làm</h2>
          <ul class="history" data-testid="rcl-log"><li v-for="(l, i) in cur.recall.log" :key="i"><strong>{{ LOG[l.action] || l.action }}</strong> · {{ fmtDeadline(new Date(l.at)) }} · {{ l.detail }}</li></ul>
        </section>
      </template>
    </div>

    <!-- Báo cáo thu hồi in được -->
    <section v-if="cur && showReport" class="ops-card ops-print-block doc-sheet" data-testid="recall-report">
      <h2 class="doc-title">BÁO CÁO THU HỒI LÔ NGUYÊN LIỆU</h2>
      <p class="doc-sub">Đợt {{ cur.recall.id }} · lập {{ fmtDeadline(new Date(now)) }}</p>
      <dl class="kv">
        <div><dt>Mã lô / QR</dt><dd class="mono">{{ cur.recall.lotCode }}</dd></div>
        <div><dt>Mặt hàng</dt><dd>{{ cur.skuName }}</dd></div>
        <div><dt>Tạo đợt lúc</dt><dd>{{ fmtDeadline(new Date(cur.recall.createdAt)) }}</dd></div>
        <div><dt>Trạng thái</dt><dd>{{ cur.recall.status === 'open' ? 'Đang xử lý' : `Đã đóng ${fmtDeadline(new Date(cur.recall.closedAt))}` }}</dd></div>
      </dl>
      <p><strong>Lý do thu hồi:</strong> {{ cur.recall.reason }}</p>
      <template v-if="cur.source">
        <h3>Nguồn gốc</h3>
        <p>{{ cur.source.name }}, {{ cur.source.location }}. Ngày giết mổ / thu hoạch: {{ cur.source.harvestAt ? fmtDeadline(new Date(cur.source.harvestAt)) : 'chưa ghi' }}. Xác nhận chéo: {{ cur.source.peerValidations }} hộ lân cận.</p>
      </template>
      <h3>Mẻ sơ chế và tồn kho</h3>
      <table class="doc-table"><thead><tr><th>Mẻ</th><th class="r">Số túi</th><th>Đóng lúc</th><th>Chuyến</th></tr></thead>
        <tbody><tr v-for="b in cur.batches" :key="b.id"><td>{{ b.id }}</td><td class="r">{{ b.bags }} × {{ b.bagGrams }}g</td><td>{{ fmtDeadline(new Date(b.producedAt)) }}</td><td>{{ b.scope }}</td></tr><tr v-if="!cur.batches.length"><td colspan="4">Chưa có mẻ nào.</td></tr></tbody>
      </table>
      <p>Tồn kho phụ bị giữ: {{ cur.totals.stockHeld }} lô; đã hủy, chi phí hao hụt {{ fmt(cur.totals.stockWasteVnd) }}.</p>
      <h3>Đơn bị ảnh hưởng</h3>
      <table class="doc-table">
        <thead><tr><th>Nhóm</th><th class="r">Số đơn</th><th class="r">Đã giữ</th><th class="r">Đã báo khách</th><th class="r">Đã bù</th></tr></thead>
        <tbody>
          <tr v-for="g in cur.groups" :key="g.id"><td>{{ g.label }}</td><td class="r">{{ g.count }}</td><td class="r">{{ g.held }}</td><td class="r">{{ g.notified }}</td><td class="r">{{ g.compensated }}</td></tr>
          <tr><td><strong>Tổng</strong></td><td class="r"><strong>{{ cur.totals.orders }}</strong></td><td class="r">{{ cur.totals.held }}</td><td class="r">{{ cur.totals.notified }}</td><td class="r">{{ cur.totals.compensated }}</td></tr>
        </tbody>
      </table>
      <table class="doc-table recall-orders">
        <thead><tr><th>Đơn</th><th>Giao</th><th>Khu · khung giờ</th><th>Trạng thái</th><th>Món ảnh hưởng</th><th>Xử lý</th></tr></thead>
        <tbody>
          <tr v-for="o in cur.orders" :key="o.orderId">
            <td>{{ o.orderId }}</td><td>{{ dm(o.deliveryDay) }}</td><td>{{ zoneName(o.zoneId) }} · {{ slotLabel(o.zoneId, o.slotId) }}</td><td>{{ o.groupLabel }}</td><td>{{ o.dishes.join('; ') }}</td>
            <td>{{ [o.heldAt ? 'giữ hàng' : '', o.notifiedAt ? 'đã báo khách' : '', o.compensation ? `bù ${fmt(o.compensation.amountVnd)}` : ''].filter(Boolean).join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p><strong>Chi phí:</strong> bù Fresh Credit {{ fmt(cur.totals.compensationVnd) }} + hao hụt tồn kho {{ fmt(cur.totals.stockWasteVnd) }} = <strong>{{ fmt(cur.totals.costVnd) }}</strong>.</p>
      <h3>Nhật ký</h3>
      <ul><li v-for="(l, i) in cur.recall.log" :key="i">{{ fmtDeadline(new Date(l.at)) }} · {{ LOG[l.action] || l.action }} · {{ l.detail }}</li></ul>
      <div class="sign-row"><div>Kho phụ</div><div>Mua hàng</div><div>Quản lý / Founder</div></div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx as ctxRef } from '../../session';
import { useLive } from '../../useLive';
import { dm } from '../../format';
import { slotLabel, zoneName } from '../../factoryStore';

const route = useRoute();
const ctx = computed(() => ctxRef.value);
const recalls = ref([]);
const lots = ref([]);
const cur = ref(null);
const curId = ref(null);
const error = ref('');
const msg = ref('');
const grp = ref('');
const form = reactive({ lotCode: route.query.lot || '', reason: '' });
const compAmount = ref('');
const closeNote = ref('');
// Mặc định đóng đợt vẫn GIỮ tồn kho của lô (an toàn thực phẩm); chỉ nhả khi người đóng xác nhận lô đã an toàn.
const releaseStock = ref(false);
const picks = reactive({});
const showReport = ref(false);
const now = ref(new Date().toISOString());

const GROUP = { not_shipped: 'Chưa xuất kho', in_transit: 'Đang giao', delivered: 'Đã giao' };
const LOG = { create: 'Tạo đợt', hold: 'Giữ hàng', notify: 'Báo khách', compensate: 'Bù Fresh Credit', waste: 'Hủy tồn kho', close: 'Đóng đợt' };

const shown = computed(() => (cur.value ? cur.value.orders.filter((o) => !grp.value || o.group === grp.value) : []));
const count = (g) => (cur.value ? cur.value.groups.find((x) => x.id === g).count : 0);

async function load() {
  try {
    [recalls.value, lots.value] = await Promise.all([api.ops.hub.recalls(ctx.value), api.ops.hub.traceLots(ctx.value)]);
    if (curId.value) {
      cur.value = await api.ops.hub.recall(ctx.value, curId.value);
      for (const o of cur.value.orders) for (const h of o.suggestions) { const k = `${o.orderId}|${h.mealIndex}|${h.kind}`; if (!picks[k]) picks[k] = h.suggestedDishId; }
    }
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 7000 });
watch(() => route.query.lot, (v) => { if (v) form.lotCode = v; });

async function open(id) {
  curId.value = id;
  grp.value = '';
  showReport.value = false;
  msg.value = '';
  await load();
}

async function create() {
  msg.value = '';
  error.value = '';
  try {
    const r = await api.ops.hub.createRecall(ctx.value, { lotCode: form.lotCode, reason: form.reason });
    form.reason = '';
    await open(r.id);
    msg.value = `Đã tạo đợt thu hồi ${r.id}. Tồn kho của lô đã bị giữ, FEFO không xuất lô này nữa.`;
  } catch (e) {
    error.value = e.message;
    const dup = e && e.code === 'RECALL_EXISTS' && e.details && e.details.recallId;
    if (dup) await open(dup);
  }
}

async function act(fn, text) {
  msg.value = '';
  error.value = '';
  try {
    const r = await fn();
    msg.value = text(r);
  } catch (e) {
    error.value = e.message;
  }
  await load();
}

function swap(o, h) {
  act(() => api.ops.substituteDish(ctx.value, { orderId: o.orderId, mealIndex: h.mealIndex, kind: h.kind, toDishId: picks[`${o.orderId}|${h.mealIndex}|${h.kind}`], reason: `Thu hồi lô ${cur.value.recall.lotCode}` }), () => `Đã đổi món cho đơn ${o.orderId}, bù phần chênh và báo khách.`);
}

function close() {
  act(() => api.ops.hub.closeRecall(ctx.value, { recallId: cur.value.recall.id, note: closeNote.value, releaseStock: releaseStock.value }), () => (releaseStock.value ? 'Đã đóng đợt thu hồi, các đơn hết bị giữ và tồn kho của lô được nhả.' : 'Đã đóng đợt thu hồi, các đơn hết bị giữ. Tồn kho của lô vẫn được giữ.'));
}

async function printReport() {
  now.value = new Date().toISOString();
  showReport.value = true;
  await nextTick();
  window.print();
}
</script>

<style scoped>
.group-pill-not_shipped { background: var(--amber-soft); color: var(--amber); }
.group-pill-in_transit { background: var(--sticker-blue-soft); color: var(--blue-ink); }
.group-pill-delivered { background: var(--red-soft); color: var(--red); }
</style>
