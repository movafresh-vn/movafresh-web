<template>
  <section>
    <h1>Truy xuất nguồn gốc</h1>
    <p class="ops-muted proc-note">Đi ngược từ mã QR hoặc mã lô: nguồn (HTX / hộ) → mẻ sơ chế → túi → thùng → đơn → khách. Có thể dán cả đường dẫn QR (…/q/MOVA-TRACE-…) hoặc mã mẻ (B-…).</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="tr-error">{{ error }}</p>

    <section class="ops-card">
      <form class="inline-form" novalidate @submit.prevent="search(code)">
        <div><label for="t-code">Mã QR / mã lô / mã mẻ</label><input id="t-code" v-model="code" class="ops-input mono" style="min-width: 280px" placeholder="MOVA-TRACE-BO-202611-0912" data-testid="tr-code" /></div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="tr-go">Truy xuất</button>
      </form>
      <label for="t-pick">Hoặc chọn một lô đang có</label>
      <select id="t-pick" class="ops-input" data-testid="tr-pick" @change="pickLot($event.target.value)">
        <option value="">Chọn lô…</option>
        <option v-for="l in lots" :key="l.lotCode" :value="l.lotCode">{{ l.lotCode }} · {{ l.skuName }} · {{ l.orders }} đơn{{ l.recalled ? ' · ĐÃ THU HỒI' : '' }}</option>
      </select>
    </section>

    <template v-if="t">
      <ol class="chain" data-testid="chain">
        <li data-step="code">
          <p class="chain-title">1 · Mã QR / lô</p>
          <strong class="mono mono-wrap" data-testid="tr-lot">{{ t.lotCode }}</strong>
          <span v-if="t.source && t.source.sample" class="ops-pill">dữ liệu mẫu</span>
          <div>{{ t.skuName }} <span class="mono ops-muted">{{ t.sku }}</span></div>
          <p v-if="t.via === 'batch'" class="ops-muted tight">Tìm từ mã mẻ {{ code.toUpperCase() }}.</p>
          <div class="ops-actions">
            <a :href="qrUrl" target="_blank" rel="noopener" class="ops-btn ops-btn-small">Xem trang khách quét QR</a>
            <RouterLink :to="{ path: '/kho/thu-hoi', query: { lot: t.lotCode } }" class="ops-btn ops-btn-small ops-btn-danger" data-testid="tr-recall-link">Thu hồi lô này</RouterLink>
          </div>
          <p v-for="r in t.recalls" :key="r.id" class="alert-bad tight">Lô này có đợt thu hồi <strong>{{ r.id }}</strong> ({{ r.status === 'open' ? 'đang mở' : 'đã đóng' }}).</p>
        </li>

        <li data-step="source">
          <p class="chain-title">2 · Nguồn</p>
          <template v-if="t.source">
            <strong data-testid="tr-source">{{ t.source.name }}</strong>
            <dl class="kv">
              <div><dt>Địa điểm</dt><dd>{{ t.source.location }}</dd></div>
              <div><dt>Loại nguồn</dt><dd>{{ KIND[t.source.kind] || '—' }}</dd></div>
              <div><dt>Ngày giết mổ / thu hoạch</dt><dd>{{ t.source.harvestAt ? fmtDeadline(new Date(t.source.harvestAt)) : 'Chưa ghi' }}</dd></div>
              <div><dt>Ngày sơ chế</dt><dd>{{ t.source.processedAt ? fmtDeadline(new Date(t.source.processedAt)) : 'Chưa ghi' }}</dd></div>
              <div><dt>Xác nhận chéo</dt><dd data-testid="tr-peer">{{ t.source.peerValidations }} hộ lân cận<template v-if="t.source.lastPeerCheck"> · gần nhất {{ fmtDeadline(new Date(t.source.lastPeerCheck)) }}</template></dd></div>
              <div><dt>Cán bộ MOVA kiểm</dt><dd>{{ t.source.inspectorVerified ? 'Đã kiểm' : 'Chưa kiểm' }}</dd></div>
              <div v-if="t.source.trustScore != null"><dt>Điểm tin cậy</dt><dd>{{ t.source.trustScore }}</dd></div>
            </dl>
          </template>
          <p v-else class="ops-muted">Lô này chưa có hồ sơ nguồn.</p>
          <p v-if="t.receipt" class="ops-muted tight">Xưởng nhận {{ t.receipt.weightKg }} kg lúc {{ fmtDeadline(new Date(t.receipt.at)) }}, {{ t.receipt.tempC }}°C.</p>
        </li>

        <li data-step="batch">
          <p class="chain-title">3 · Mẻ sơ chế</p>
          <div v-if="t.batches.length" class="ops-table-wrap">
            <table class="ops-table" data-testid="tr-batches">
              <thead><tr><th>Mẻ</th><th class="r">Túi</th><th>Đóng lúc</th><th>HSD</th><th>Chuyến</th></tr></thead>
              <tbody><tr v-for="b in t.batches" :key="b.id"><td class="mono">{{ b.id }}</td><td class="r">{{ b.bags }} × {{ b.bagGrams }}g</td><td>{{ fmtDeadline(new Date(b.producedAt)) }}</td><td>{{ b.expiresAt ? dmy(b.expiresAt) : '—' }}</td><td>{{ b.scope }}</td></tr></tbody>
            </table>
          </div>
          <p v-else class="ops-muted">Chưa có mẻ túi nào dùng lô này.</p>
        </li>

        <li data-step="bags">
          <p class="chain-title">4 · Túi và thùng</p>
          <p class="tight"><strong>{{ t.bagsMade }}</strong> túi ({{ t.kgMade }} kg thành phẩm) đã làm; <strong>{{ t.bagsInOrders }}</strong> túi nằm trong thùng của <strong>{{ t.counts.total }}</strong> đơn (một đơn một thùng).</p>
          <p v-if="t.stock.length" class="tight">Còn ở kho: <template v-for="s in t.stock" :key="s.id"><span class="ops-pill" :class="s.heldBy ? 'ops-pill-bad' : ''">{{ s.qty }} {{ s.unit }} ({{ s.location === 'hub' ? 'kho phụ' : 'xưởng' }}{{ s.heldBy ? ', đang giữ' : '' }})</span> </template></p>
        </li>

        <li data-step="orders">
          <p class="chain-title">5 · Đơn bị ảnh hưởng theo trạng thái</p>
          <div class="group-tabs">
            <button v-for="g in GROUPS" :key="g.id" type="button" class="group-card" :class="[`group-${g.id}`, { on: grp === g.id }]" :data-group="g.id" @click="grp = grp === g.id ? '' : g.id">
              <span class="n" :data-count="g.id">{{ t.counts[g.id] }}</span>{{ g.label }}
            </button>
          </div>
          <div class="ops-table-wrap">
            <table class="ops-table" data-testid="tr-orders">
              <thead><tr><th>Đơn (thùng)</th><th>Giao</th><th>Trạng thái</th><th class="r">Túi lô này</th><th>Thùng</th><th>6 · Khách / người nhận</th></tr></thead>
              <tbody>
                <tr v-for="o in shownOrders" :key="o.orderId" :data-order="o.orderId">
                  <td class="mono">{{ o.orderId }}</td>
                  <td>{{ dm(o.deliveryDay) }}<small>{{ zoneName(o.zoneId) }} · {{ slotLabel(o.zoneId, o.slotId) }}</small></td>
                  <td><span class="ops-pill" :class="`group-pill-${o.group}`">{{ o.groupLabel }}</span><small>{{ STATUS[o.status] || o.status }}</small></td>
                  <td class="r">{{ o.bags }}<small>{{ o.batchIds.join(', ') }}</small></td>
                  <td><small>{{ o.box.packedAt ? 'Đã đóng' : 'Chưa đóng' }}{{ o.box.loadedAt ? ' · đã lên xe' : '' }}</small></td>
                  <td>
                    <template v-if="o.recipient">{{ o.recipient.name }}<small>{{ o.recipient.address }} · {{ o.recipient.phone }}</small></template>
                    <span v-else class="ops-muted">Ẩn (chỉ kho phụ xem được người nhận)</span>
                  </td>
                </tr>
                <tr v-if="!shownOrders.length"><td colspan="6" class="ops-muted">Không có đơn nào.</td></tr>
              </tbody>
            </table>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../../shared/api';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { dm } from '../../format';
import { dmy } from '../../labels';
import { slotLabel, zoneName } from '../../factoryStore';

const route = useRoute();
const code = ref(route.query.lot || '');
const t = ref(null);
const lots = ref([]);
const error = ref('');
const grp = ref('');

const GROUPS = [
  { id: 'not_shipped', label: 'Chưa xuất kho' },
  { id: 'in_transit', label: 'Đang giao' },
  { id: 'delivered', label: 'Đã giao' }
];
const KIND = { htx: 'Hợp tác xã', nong_ho: 'Nông hộ', lo_mo: 'Lò mổ' };
const STATUS = { locked: 'Đã chốt sổ', in_production: 'Đang sản xuất', shipped: 'Đang giao', delivered: 'Đã giao' };

const shownOrders = computed(() => (t.value ? t.value.orders.filter((o) => !grp.value || o.group === grp.value) : []));
const qrUrl = computed(() => `${window.location.origin}/q/${t.value ? t.value.lotCode : ''}`);

async function search(c) {
  error.value = '';
  t.value = null;
  grp.value = '';
  if (!String(c || '').trim()) {
    error.value = 'Nhập mã QR, mã lô hoặc mã mẻ.';
    return;
  }
  try {
    t.value = await api.ops.hub.trace(ctx.value, c);
  } catch (e) {
    error.value = e.message;
  }
}

function pickLot(v) {
  if (!v) return;
  code.value = v;
  search(v);
}

onMounted(async () => {
  try {
    lots.value = await api.ops.hub.traceLots(ctx.value);
  } catch (e) {
    error.value = e.message;
  }
  if (code.value) await search(code.value);
});
</script>

<style scoped>
.group-pill-not_shipped { background: var(--amber-soft); color: var(--amber); }
.group-pill-in_transit { background: var(--sticker-blue-soft); color: var(--blue-ink); }
.group-pill-delivered { background: var(--red-soft); color: var(--red); }
</style>
