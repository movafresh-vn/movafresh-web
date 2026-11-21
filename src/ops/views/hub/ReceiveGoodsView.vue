<template>
  <section>
    <h1>Nhận hàng tại kho phụ</h1>
    <p class="ops-muted proc-note">Xe nhà máy và hải sản về kho phụ TP.HCM: đối chiếu PO, ghi số lượng đạt / không đạt, nhiệt độ, ảnh và lý do. Có phiếu nhập; phần không đạt thành phiếu khiếu nại và trừ vào công nợ nhà cung cấp.</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="rc-error">{{ error }}</p>

    <section v-if="done" class="ops-card" data-testid="rc-done">
      <h2>Đã lập phiếu nhập <span class="mono" data-testid="rc-id">{{ done.receipt.id }}</span></h2>
      <p>PO chuyển sang <strong>{{ done.complete ? 'Nhận đủ' : 'Nhận một phần' }}</strong>.
        <template v-if="done.claims.length">Có {{ done.claims.length }} phiếu khiếu nại, tổng <strong>{{ fmt(done.claims.reduce((s, c) => s + c.amountVnd, 0)) }}</strong>, sẽ trừ vào công nợ.</template>
      </p>
      <ul class="history">
        <li v-for="l in done.receipt.lines" :key="l.sku">{{ l.name }}: đạt {{ l.acceptedQty }} {{ l.unit }}<template v-if="l.rejectedQty"> · không đạt {{ l.rejectedQty }}</template><template v-if="l.lotCode"> · lô <span class="mono">{{ l.lotCode }}</span></template></li>
      </ul>
      <div class="ops-actions"><button class="ops-btn ops-btn-primary" data-testid="rc-next" @click="done = null">Nhận tiếp</button></div>
    </section>

    <template v-else>
      <section class="ops-card" aria-label="PO chờ nhận">
        <h2>PO chờ nhận</h2>
        <div v-if="!pos.length" class="ops-muted" data-testid="rc-none">Chưa có PO nào đã gửi nhà cung cấp. Mua hàng duyệt và gửi PO thì PO hiện ở đây.</div>
        <div class="card-list">
          <button v-for="p in pos" :key="p.id" type="button" class="item-card po-pick" :class="{ attention: p.confirmedShort, 'row-on': sel && sel.id === p.id }" :data-receive-po="p.id" @click="pick(p)">
            <h3>{{ p.id }}</h3>
            <span>{{ p.supplierName }} · giao {{ dm(p.deliveryDay) }}</span>
            <span class="ops-pill" :class="stagePill(p.status)">{{ p.stageLabel }}</span>
            <span v-if="p.confirmedShort" class="ops-pill ops-pill-bad">NCC xác nhận thiếu</span>
            <span class="ops-muted">{{ p.lines.length }} mặt hàng</span>
          </button>
        </div>
      </section>

      <form v-if="sel" class="ops-card" novalidate data-testid="rc-form" @submit.prevent="submit">
        <h2>{{ sel.id }} · {{ sel.supplierName }}</h2>
        <div v-for="l in lines" :key="l.sku" class="rc-line" :data-line="l.sku">
          <div class="head-row">
            <strong>{{ l.name }} <span class="mono ops-muted">{{ l.sku }}</span></strong>
            <span><StickerTag :temp="l.temp" /> <span class="ops-pill">Cần {{ l.targetQty }} {{ l.unit }}, còn {{ l.remaining }}</span></span>
          </div>
          <div class="field-grid">
            <div><label :for="`a-${l.sku}`">Đạt ({{ l.unit }})</label><input :id="`a-${l.sku}`" v-model.number="f[l.sku].accepted" type="number" min="0" step="0.1" inputmode="decimal" class="ops-input" :data-testid="`acc-${l.sku}`" /></div>
            <div><label :for="`r-${l.sku}`">Không đạt ({{ l.unit }})</label><input :id="`r-${l.sku}`" v-model.number="f[l.sku].rejected" type="number" min="0" step="0.1" inputmode="decimal" class="ops-input" :data-testid="`rej-${l.sku}`" /></div>
            <div v-if="l.temp !== 'ambient'">
              <label :for="`t-${l.sku}`">Nhiệt độ lúc nhận (°C)</label>
              <input :id="`t-${l.sku}`" v-model="f[l.sku].temp" type="number" step="0.1" inputmode="decimal" class="ops-input" :data-testid="`temp-${l.sku}`" />
              <p class="help" :class="{ 'ops-error': tempBad(l) }">{{ tempHint(l) }}</p>
            </div>
            <div v-if="Number(f[l.sku].rejected) > 0">
              <label :for="`w-${l.sku}`">Lý do không đạt</label>
              <select :id="`w-${l.sku}`" v-model="f[l.sku].reason" class="ops-input" :data-testid="`reason-${l.sku}`"><option value="" disabled>Chọn lý do</option><option v-for="(t, k) in reasons" :key="k" :value="k">{{ t }}</option></select>
            </div>
            <div v-if="Number(f[l.sku].accepted) > 0">
              <label :for="`l-${l.sku}`">Mã lô {{ l.requiresLot ? '(bắt buộc, mã truy xuất)' : '(để trống: kho tự tạo)' }}</label>
              <input :id="`l-${l.sku}`" v-model="f[l.sku].lotCode" class="ops-input mono" :list="`lots-${l.sku}`" :data-testid="`lot-${l.sku}`" />
              <datalist :id="`lots-${l.sku}`"><option v-for="c in lotsFor(l.sku)" :key="c" :value="c" /></datalist>
            </div>
            <div v-if="Number(f[l.sku].accepted) > 0">
              <label :for="`e-${l.sku}`">Hạn dùng</label>
              <input :id="`e-${l.sku}`" v-model="f[l.sku].expiresAt" type="date" class="ops-input" :data-testid="`exp-${l.sku}`" />
              <p class="help">Để trống thì tính theo hạn dùng chuẩn của SKU.</p>
            </div>
          </div>
        </div>
        <label>Ảnh hàng nhận {{ anyRejected ? '(bắt buộc vì có hàng không đạt)' : '(tùy chọn)' }}</label>
        <PhotoInput v-model="photo" testid="rc-photo" />
        <label for="rc-note">Ghi chú</label>
        <input id="rc-note" v-model="note" class="ops-input" />
        <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" data-testid="rc-submit">Lập phiếu nhập</button>
      </form>
    </template>

    <section class="ops-card" aria-label="Phiếu nhập gần đây">
      <h2>Phiếu nhập gần đây</h2>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="rc-list">
          <thead><tr><th>Phiếu</th><th>PO / nhà cung cấp</th><th>Nội dung</th></tr></thead>
          <tbody>
            <tr v-for="r in receipts" :key="r.id">
              <td class="mono">{{ r.id }}<small>{{ fmtDeadline(new Date(r.receivedAt)) }}</small></td>
              <td>{{ r.poId }}<small>{{ r.supplierName }}</small></td>
              <td>{{ r.lines.map((l) => `${l.name} ${l.acceptedQty}${l.rejectedQty ? ` (−${l.rejectedQty} không đạt)` : ''}`).join('; ') }}</td>
            </tr>
            <tr v-if="!receipts.length"><td colspan="3" class="ops-muted">Chưa có phiếu nhập.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { RECEIPT_REASONS } from '../../../shared/domain/procurement';
import { isTempOk } from '../../../shared/domain/factory';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { dm } from '../../format';
import { stagePill } from '../../labels';
import PhotoInput from '../../components/PhotoInput.vue';
import StickerTag from '../../components/StickerTag.vue';

const pos = ref([]);
const receipts = ref([]);
const lotList = ref([]);
const sel = ref(null);
const f = reactive({});
const photo = ref('');
const note = ref('');
const error = ref('');
const done = ref(null);
const reasons = RECEIPT_REASONS;

const lines = computed(() => (sel.value ? sel.value.lines.filter((l) => l.remaining > 0 || true) : []));
const anyRejected = computed(() => lines.value.some((l) => Number(f[l.sku] && f[l.sku].rejected) > 0));
const lotsFor = (sku) => lotList.value.filter((l) => l.sku === sku).map((l) => l.lotCode);

function tempHint(l) {
  const t = BUSINESS.temperature;
  return l.temp === 'frozen' ? `Ngăn đông: phải ≤ ${t.frozen.max}°C mới nhận đạt` : `Ngăn mát: phải ≤ ${t.chill.max}°C mới nhận đạt`;
}
const tempBad = (l) => {
  const v = f[l.sku] && f[l.sku].temp;
  return v !== '' && v != null && !isTempOk(l.sku, Number(v), BUSINESS) && Number(f[l.sku].accepted) > 0;
};

async function load() {
  try {
    pos.value = await api.ops.hub.receivable(ctx.value);
    receipts.value = await api.ops.hub.receipts(ctx.value, { limit: 8 });
    // Danh sách lô để gán cho SKU bắt buộc có lô. Kho phụ chưa có quyền đọc sổ lô (chỉ xưởng và admin): khi đó nhập mã lô bằng tay.
    try {
      lotList.value = (await api.ops.listLots(ctx.value)).map((l) => ({ sku: l.sku, lotCode: l.qr_code }));
    } catch {
      lotList.value = [];
    }
    if (sel.value) {
      const fresh = pos.value.find((p) => p.id === sel.value.id);
      if (!fresh) sel.value = null;
    }
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 8000 });

function pick(p) {
  sel.value = p;
  error.value = '';
  for (const l of p.lines) f[l.sku] = { accepted: l.remaining > 0 ? l.remaining : null, rejected: null, temp: '', reason: '', lotCode: '', expiresAt: '' };
  photo.value = '';
  note.value = '';
}

async function submit() {
  error.value = '';
  try {
    const payload = lines.value
      .filter((l) => Number(f[l.sku].accepted) > 0 || Number(f[l.sku].rejected) > 0)
      .map((l) => {
        const x = f[l.sku];
        return {
          sku: l.sku, acceptedQty: Number(x.accepted) || 0, rejectedQty: Number(x.rejected) || 0,
          tempC: x.temp === '' || x.temp == null ? undefined : Number(x.temp), reason: x.reason, lotCode: x.lotCode, expiresAt: x.expiresAt || undefined
        };
      });
    const res = await api.ops.hub.receive(ctx.value, { poId: sel.value.id, lines: payload, photo: photo.value, note: note.value });
    const full = res.receipt;
    done.value = { ...res, receipt: full };
    sel.value = null;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<style scoped>
.rc-line { padding: 12px 0; border-top: 1px solid var(--line-2); }
.po-pick { text-align: left; font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 4px; color: var(--ink); }
.po-pick.row-on { border-color: var(--green); background: var(--green-soft); }
</style>
