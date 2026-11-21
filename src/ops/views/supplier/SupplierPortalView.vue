<template>
  <section class="sup-portal">
    <h1>Cổng nhà cung cấp</h1>
    <p v-if="error" class="ops-error" role="alert" data-testid="sp-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="sp-msg">{{ msg }}</p>

    <section v-if="isAdmin" class="ops-card">
      <label for="sp-as">Admin xem thử nhà cung cấp</label>
      <select id="sp-as" v-model="asId" class="ops-input" data-testid="sp-as" @change="load">
        <option value="" disabled>Chọn nhà cung cấp</option>
        <option v-for="s in SUPPLIER_LIST" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </section>

    <template v-if="d">
      <section class="ops-card">
        <h2 data-testid="sp-name">{{ d.supplier.name }}</h2>
        <p class="ops-muted tight">Bạn chỉ thấy dữ liệu của chính mình. Kỳ công nợ {{ d.profile ? d.profile.termDays : '' }} ngày.</p>
        <div v-if="d.certAlerts.length" class="alert-bad" role="alert" data-testid="sp-cert-alert">
          Giấy chứng nhận cần gia hạn:
          <ul><li v-for="a in d.certAlerts" :key="a.cert.id">{{ certType(a.cert.type) }} {{ a.cert.number }} · {{ a.state === 'expired' ? 'đã hết hạn' : `còn ${a.daysLeft} ngày` }} ({{ dmy(a.cert.expiresAt) }})</li></ul>
        </div>
        <div class="sup-kpis">
          <div class="sup-kpi"><span class="n" data-testid="kpi-confirm">{{ toConfirm.length }}</span>PO cần xác nhận</div>
          <div class="sup-kpi"><span class="n">{{ toInvoice.length }}</span>PO chờ hóa đơn</div>
          <div class="sup-kpi"><span class="n">{{ fmt(totals.delivered) }}</span>Đã giao</div>
          <div class="sup-kpi"><span class="n">{{ fmt(totals.owed) }}</span>MOVA còn phải trả</div>
        </div>
      </section>

      <div class="seg-tabs" role="tablist" aria-label="Mục của cổng nhà cung cấp">
        <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="seg-tab" :class="{ on: tab === t.id }" :aria-selected="tab === t.id" :data-sp-tab="t.id" @click="tab = t.id">
          {{ t.label }}<span v-if="t.badge" class="badge">{{ t.badge }}</span>
        </button>
      </div>

      <!-- ĐƠN HÀNG -->
      <div v-if="tab === 'po'" class="card-list" data-testid="sp-pos">
        <p v-if="!d.pos.length" class="ops-card ops-muted">Chưa có PO nào gửi cho bạn.</p>
        <article v-for="p in d.pos" :key="p.id" class="item-card" :class="{ attention: p.canConfirm }" :data-po="p.id">
          <div class="head-row"><h3>{{ p.id }}</h3><span class="ops-pill" :class="stagePill(p.stage)">{{ p.stageLabel }}</span></div>
          <p class="ops-muted tight">Giao {{ fmtDay(p.deliveryDay) }} · Tổng {{ fmt(p.totalVnd) }}</p>
          <ul class="item-lines">
            <li v-for="l in p.lines" :key="l.sku">
              <span>{{ l.name }}</span>
              <span>
                <template v-if="confirmedOf(p, l.sku) != null && confirmedOf(p, l.sku) < l.qty"><s>{{ qty(l.qty) }}</s> <strong class="diff-over">{{ qty(confirmedOf(p, l.sku)) }}</strong></template>
                <template v-else>{{ qty(l.qty) }}</template> {{ l.unit }}
              </span>
            </li>
          </ul>
          <p v-if="p.confirmation" class="tight">Bạn đã xác nhận <strong>{{ p.confirmation.result === 'short' ? `THIẾU ${Math.round(p.confirmation.shortPct * 100)}%` : 'đủ' }}</strong> lúc {{ fmtDeadline(new Date(p.confirmation.at)) }}.</p>

          <template v-if="p.canConfirm">
            <div class="btn-row">
              <button class="ops-btn ops-btn-primary" :data-confirm-full="p.id" @click="confirm(p, 'full')">Xác nhận đủ</button>
              <button class="ops-btn" :data-confirm-short="p.id" @click="shortOpen = shortOpen === p.id ? null : p.id">Xác nhận thiếu…</button>
            </div>
            <div v-if="shortOpen === p.id" class="gap-top" :data-short-panel="p.id">
              <p class="help">Chọn nhanh mức thiếu cho mọi mặt hàng, hoặc nhập số có thể giao của từng mặt hàng.</p>
              <div class="pct-row">
                <button v-for="pc in [5, 10, 20, 30]" :key="pc" type="button" class="ops-btn" :class="{ on: pctPick === pc }" :data-pct="pc" @click="setPct(p, pc)">Thiếu {{ pc }}%</button>
              </div>
              <div v-for="l in p.lines" :key="l.sku" class="gap-top">
                <label :for="`q-${p.id}-${l.sku}`">{{ l.name }} (đặt {{ qty(l.qty) }} {{ l.unit }}): giao được</label>
                <input :id="`q-${p.id}-${l.sku}`" v-model.number="short[l.sku]" type="number" min="0" :max="l.qty" step="0.1" class="ops-input" inputmode="decimal" :data-short-qty="l.sku" />
              </div>
              <label :for="`n-${p.id}`">Ghi chú cho MOVA</label>
              <input :id="`n-${p.id}`" v-model="shortNote" class="ops-input" placeholder="ví dụ: lô bò về trễ" data-testid="short-note" />
              <button class="ops-btn ops-btn-primary ops-btn-block" :data-send-short="p.id" @click="confirm(p, 'short')">Gửi xác nhận thiếu</button>
            </div>
          </template>
        </article>
      </div>

      <!-- DỰ BÁO VÀ LỊCH GIAO -->
      <template v-if="tab === 'forecast'">
        <section class="ops-card" data-testid="sp-forecast">
          <h2>Dự báo 4 tuần</h2>
          <template v-if="d.forecast">
            <p class="ops-muted">{{ d.forecast.note }} Gửi lúc {{ fmtDeadline(new Date(d.forecast.createdAt)) }}.</p>
            <div class="ops-table-wrap">
              <table class="ops-table week-table">
                <thead><tr><th>{{ d.forecast.rows.length ? 'Mặt hàng' : 'Số thùng' }}</th><th v-for="(w, i) in d.forecast.weeks" :key="w.start" class="r">Tuần {{ i + 1 }}<small>{{ dm(w.start) }}–{{ dm(w.end) }}</small></th></tr></thead>
                <tbody>
                  <tr v-for="r in d.forecast.rows" :key="r.sku"><td>{{ r.name }} <small>{{ r.unit }}</small></td><td v-for="(q, i) in r.qty" :key="i" class="r">{{ q ? q.toLocaleString('vi-VN') : '—' }}</td></tr>
                  <tr v-if="!d.forecast.rows.length"><td>Thùng giao trong tuần</td><td v-for="(b, i) in d.forecast.boxes" :key="i" class="r">{{ b }}</td></tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="ops-muted">MOVA chưa gửi dự báo cho bạn.</p>
        </section>
        <section class="ops-card" data-testid="sp-schedule">
          <h2>Lịch giao</h2>
          <ul class="history">
            <li v-for="(s, i) in d.schedule" :key="i"><strong>{{ shortDay(s.day) }}</strong> · {{ s.label }} · {{ s.detail }}<template v-if="s.at"> · {{ hhmm(s.at) }}</template></li>
            <li v-if="!d.schedule.length" class="ops-muted">Chưa có lịch giao.</li>
          </ul>
        </section>
      </template>

      <!-- HÓA ĐƠN -->
      <template v-if="tab === 'invoice'">
        <section v-for="p in toInvoice" :key="p.id" class="ops-card" :data-invoice-po="p.id">
          <h2>Gửi hóa đơn cho {{ p.id }}</h2>
          <p class="ops-muted">Giao {{ fmtDay(p.deliveryDay) }}. Hóa đơn nên khớp số hàng thực giao; MOVA đối chiếu với phiếu nhập và PO.</p>
          <form novalidate @submit.prevent="sendInvoice(p)">
            <label :for="`in-${p.id}`">Số hóa đơn</label>
            <input :id="`in-${p.id}`" v-model="inv[p.id].number" class="ops-input" data-testid="sp-inv-number" />
            <label :for="`id-${p.id}`">Ngày hóa đơn</label>
            <input :id="`id-${p.id}`" v-model="inv[p.id].issuedAt" type="date" class="ops-input" data-testid="sp-inv-date" />
            <div v-for="l in inv[p.id].lines" :key="l.sku" class="gap-top">
              <strong>{{ skuName(l.sku) }}</strong>
              <div class="inline-form">
                <div><label :for="`iq-${p.id}-${l.sku}`">Số lượng</label><input :id="`iq-${p.id}-${l.sku}`" v-model.number="l.qty" type="number" min="0" step="0.1" class="ops-input narrow" inputmode="decimal" :data-inv-qty="l.sku" /></div>
                <div><label :for="`ip-${p.id}-${l.sku}`">Đơn giá (đ)</label><input :id="`ip-${p.id}-${l.sku}`" v-model.number="l.unitPriceVnd" type="number" min="0" step="500" class="ops-input mid" inputmode="numeric" :data-inv-price="l.sku" /></div>
              </div>
            </div>
            <label>Ảnh / file hóa đơn</label>
            <FileInput v-model="inv[p.id].file" testid="sp-inv-file" />
            <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" data-testid="sp-inv-send">Gửi hóa đơn</button>
          </form>
        </section>
        <p v-if="!toInvoice.length" class="ops-card ops-muted">Không có PO nào đang chờ hóa đơn. PO cần hàng đã được kho phụ nhận mới gửi hóa đơn được.</p>
        <section class="ops-card" data-testid="sp-invoices">
          <h2>Hóa đơn đã gửi</h2>
          <ul class="history">
            <li v-for="i in d.invoices" :key="i.id"><strong>{{ i.number }}</strong> · {{ i.poId }} · {{ dmy(i.issuedAt) }} · {{ fmt(i.totalVnd) }}<template v-if="i.file"> · {{ i.file.name }}</template></li>
            <li v-if="!d.invoices.length" class="ops-muted">Chưa gửi hóa đơn nào.</li>
          </ul>
        </section>
      </template>

      <!-- CÔNG NỢ -->
      <template v-if="tab === 'debt'">
        <section class="ops-card" data-testid="sp-debt-totals">
          <div class="sup-kpis">
            <div class="sup-kpi"><span class="n">{{ fmt(totals.delivered) }}</span>Đã giao</div>
            <div class="sup-kpi"><span class="n">{{ fmt(totals.invoiced) }}</span>Đã nhận hóa đơn</div>
            <div class="sup-kpi"><span class="n">{{ fmt(totals.owed) }}</span>Chờ trả</div>
            <div class="sup-kpi"><span class="n">{{ fmt(totals.paid) }}</span>Đã trả</div>
          </div>
        </section>
        <div class="card-list" data-testid="sp-debt">
          <article v-for="r in d.payables" :key="r.poId" class="item-card" :data-debt="r.poId">
            <div class="head-row"><h3>{{ r.poId }}</h3><span class="ops-pill" :class="stagePill(r.stage)">{{ PO_STATUS_LABEL[r.stage] }}</span></div>
            <ul class="item-lines">
              <li><span>Đã giao</span><span>{{ fmt(r.deliveredVnd) }}</span></li>
              <li v-if="r.claimVnd"><span>Khiếu nại trừ công nợ</span><span class="diff-over">−{{ fmt(r.claimVnd) }}</span></li>
              <li><span>Hóa đơn</span><span>{{ r.invoiceNumber ? `${r.invoiceNumber} · ${fmt(r.invoiceVnd)}` : 'Chưa nhận' }}</span></li>
              <li><span>Đến hạn</span><span>{{ r.dueAt ? `${dmy(r.dueAt)}${r.status === 'matched' ? (r.daysToDue < 0 ? ` (quá ${-r.daysToDue} ngày)` : ` (còn ${r.daysToDue} ngày)`) : ''}` : 'Sau khi nhận hóa đơn' }}</span></li>
              <li><span>Đã trả</span><span>{{ r.paidAt ? `${fmt(r.paidVnd)} ngày ${dmy(r.paidAt)}` : 'Chưa trả' }}</span></li>
            </ul>
          </article>
          <p v-if="!d.payables.length" class="ops-card ops-muted">Chưa có công nợ.</p>
        </div>
      </template>

      <!-- KHIẾU NẠI -->
      <div v-if="tab === 'claims'" class="card-list" data-testid="sp-claims">
        <p v-if="!d.claims.length" class="ops-card ops-muted">Chưa có khiếu nại nào liên quan đến bạn.</p>
        <article v-for="c in d.claims" :key="c.id" class="item-card" :class="{ attention: c.status === 'open' }" :data-claim="c.id">
          <div class="head-row"><h3>{{ c.id }}</h3><span class="ops-pill" :class="c.status === 'deducted' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ CLAIM_LABEL[c.status] }}</span></div>
          <p class="tight">{{ c.skuName }} · {{ c.qty }} {{ c.unit }} không đạt · <strong>{{ fmt(c.amountVnd) }}</strong> trừ vào công nợ</p>
          <p class="ops-muted tight">PO {{ c.poId }} · {{ d.reasons[c.reason] }}{{ c.note ? `: ${c.note}` : '' }}</p>
          <p v-if="c.reply" class="tight">Phản hồi của bạn: {{ c.reply }}</p>
          <form v-else class="gap-top" novalidate @submit.prevent="reply(c)">
            <label :for="`rp-${c.id}`">Phản hồi cho MOVA</label>
            <input :id="`rp-${c.id}`" v-model="replies[c.id]" class="ops-input" :data-reply="c.id" />
            <button class="ops-btn" type="submit">Gửi phản hồi</button>
          </form>
        </article>
      </div>

      <!-- HỒ SƠ -->
      <template v-if="tab === 'profile' && d.profile">
        <section class="ops-card" data-testid="sp-profile">
          <h2>Hồ sơ của bạn</h2>
          <dl class="kv">
            <div><dt>Loại</dt><dd>{{ d.profile.kindLabel }}</dd></div>
            <div><dt>Mã số thuế</dt><dd>{{ d.profile.taxId || d.profile.cccd }}</dd></div>
            <div><dt>Địa chỉ</dt><dd>{{ d.profile.address }}</dd></div>
            <div><dt>Tài khoản nhận tiền</dt><dd>{{ d.profile.bank.bankName }} · {{ d.profile.bank.accountNo }}<br />{{ d.profile.bank.accountName }}</dd></div>
            <div><dt>Kỳ công nợ</dt><dd>{{ d.profile.termDays }} ngày</dd></div>
          </dl>
          <p class="help">Muốn đổi mã số thuế hoặc tài khoản ngân hàng, hãy liên hệ bộ phận mua hàng MOVA.</p>
          <form class="inline-form" novalidate @submit.prevent="saveContact">
            <div><label for="ct-n">Người liên hệ</label><input id="ct-n" v-model="contact.name" class="ops-input" /></div>
            <div><label for="ct-p">Điện thoại</label><input id="ct-p" v-model="contact.phone" class="ops-input" inputmode="tel" /></div>
            <button class="ops-btn" type="submit">Lưu liên hệ</button>
          </form>
        </section>
        <section class="ops-card">
          <h2>Giấy chứng nhận</h2>
          <ul class="cert-list">
            <li v-for="c in d.profile.certs" :key="c.id" :class="c.state"><strong>{{ c.typeLabel }}</strong> <span class="mono">{{ c.number }}</span> · hết hạn {{ dmy(c.expiresAt) }}
              <span class="ops-pill" :class="CERT_PILL[c.state]">{{ CERT_LABEL[c.state] }}{{ c.state === 'expiring' ? `, còn ${c.daysLeft} ngày` : '' }}</span></li>
            <li v-if="!d.profile.certs.length" class="ops-muted">Chưa có giấy chứng nhận.</li>
          </ul>
          <h3>Cập nhật giấy chứng nhận mới</h3>
          <form novalidate @submit.prevent="addCert">
            <label for="nc-t">Loại</label>
            <select id="nc-t" v-model="cert.type" class="ops-input"><option v-for="(l, k) in CERT_TYPES" :key="k" :value="k">{{ l }}</option></select>
            <label for="nc-n">Số giấy</label><input id="nc-n" v-model="cert.number" class="ops-input" />
            <label for="nc-e">Ngày hết hạn</label><input id="nc-e" v-model="cert.expiresAt" type="date" class="ops-input" />
            <button class="ops-btn ops-btn-block" type="submit">Thêm giấy</button>
          </form>
        </section>
      </template>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { SKUS, SUPPLIERS } from '../../../shared/data/catalog';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../../shared/utils/time';
import { ctx, session } from '../../session';
import { useLive } from '../../useLive';
import { dm, hhmm, shortDay } from '../../format';
import { CERT_LABEL, CERT_PILL, CLAIM_LABEL, PO_STATUS_LABEL, dmy, stagePill } from '../../labels';
import FileInput from '../../components/FileInput.vue';

const route = useRoute();
const d = ref(null);
const error = ref('');
const msg = ref('');
const tab = ref(route.query.po ? 'po' : 'po');
const asId = ref('');
const shortOpen = ref(null);
const shortNote = ref('');
const pctPick = ref(null);
const short = reactive({});
const inv = reactive({});
const replies = reactive({});
const contact = reactive({ name: '', phone: '' });
const cert = reactive({ type: 'attp', number: '', expiresAt: '' });

const CERT_TYPES = BUSINESS.suppliers.certTypes;
const SUPPLIER_LIST = Object.values(SUPPLIERS);
const isAdmin = computed(() => session.value.role === 'admin');
const certType = (k) => CERT_TYPES[k] || k;
const skuName = (k) => (SKUS[k] ? SKUS[k].name : k);
const qty = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('vi-VN');
const confirmedOf = (p, sku) => {
  const l = p.confirmation && p.confirmation.lines.find((x) => x.sku === sku);
  return l ? l.confirmedQty : null;
};

const toConfirm = computed(() => (d.value ? d.value.pos.filter((p) => p.canConfirm) : []));
const toInvoice = computed(() => (d.value ? d.value.pos.filter((p) => p.canInvoice && !d.value.invoices.some((i) => i.poId === p.id)) : []));
const totals = computed(() => {
  const rows = d.value ? d.value.payables : [];
  return {
    delivered: rows.reduce((s, r) => s + r.deliveredVnd, 0),
    invoiced: rows.reduce((s, r) => s + (r.invoiceNumber ? r.invoiceVnd || 0 : 0), 0),
    owed: rows.filter((r) => r.status === 'matched').reduce((s, r) => s + (r.payableVnd || 0), 0),
    paid: rows.reduce((s, r) => s + (r.paidVnd || 0), 0)
  };
});
const tabs = computed(() => [
  { id: 'po', label: 'Đơn hàng', badge: toConfirm.value.length || 0 },
  { id: 'forecast', label: 'Dự báo & lịch giao', badge: 0 },
  { id: 'invoice', label: 'Hóa đơn', badge: toInvoice.value.length || 0 },
  { id: 'debt', label: 'Công nợ', badge: 0 },
  { id: 'claims', label: 'Khiếu nại', badge: d.value ? d.value.claims.filter((c) => c.status === 'open').length : 0 },
  { id: 'profile', label: 'Hồ sơ', badge: 0 }
]);

async function load() {
  if (isAdmin.value && !asId.value) return;
  try {
    d.value = await api.ops.supplierPortal.overview(ctx.value, { asSupplierId: asId.value || null });
    for (const p of d.value.pos) {
      if (!inv[p.id] && p.canInvoice) inv[p.id] = { number: '', issuedAt: d.value.now.slice(0, 10), file: null, lines: p.lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPriceVnd: l.unitPriceVnd })) };
    }
    if (d.value.profile && !contact.name) Object.assign(contact, d.value.profile.contact);
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 7000 });
watch(() => route.query.po, (v) => { if (v) tab.value = 'po'; });

const as = () => ({ asSupplierId: asId.value || null });

async function guard(fn, ok) {
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

function setPct(p, pc) {
  pctPick.value = pc;
  for (const l of p.lines) short[l.sku] = Math.round(l.qty * (1 - pc / 100) * 10) / 10;
}

function confirm(p, result) {
  if (result === 'short') {
    const lines = p.lines.map((l) => ({ sku: l.sku, confirmedQty: short[l.sku] != null && short[l.sku] !== '' ? short[l.sku] : l.qty }));
    guard(() => api.ops.supplierPortal.confirmPo(ctx.value, { poId: p.id, result: 'short', lines, note: shortNote.value, ...as() }), `Đã gửi xác nhận THIẾU cho ${p.id}. MOVA sẽ điều chỉnh các đơn bị ảnh hưởng.`);
    shortOpen.value = null;
    shortNote.value = '';
    pctPick.value = null;
  } else {
    guard(() => api.ops.supplierPortal.confirmPo(ctx.value, { poId: p.id, result: 'full', ...as() }), `Đã xác nhận đủ ${p.id}.`);
  }
}

function sendInvoice(p) {
  const f = inv[p.id];
  guard(
    () => api.ops.supplierPortal.submitInvoice(ctx.value, { poId: p.id, number: f.number, issuedAt: f.issuedAt, lines: f.lines.map((l) => ({ ...l })), file: f.file, ...as() }),
    `Đã gửi hóa đơn ${f.number} cho ${p.id}.`
  );
}

function reply(c) {
  guard(() => api.ops.supplierPortal.replyClaim(ctx.value, { claimId: c.id, reply: replies[c.id], ...as() }), 'Đã gửi phản hồi.');
}

const saveContact = () => guard(() => api.ops.supplierPortal.updateContact(ctx.value, { name: contact.name, phone: contact.phone, ...as() }), 'Đã lưu thông tin liên hệ.');
function addCert() {
  guard(() => api.ops.supplierPortal.addCert(ctx.value, { cert: { ...cert }, ...as() }), 'Đã thêm giấy chứng nhận.');
  cert.number = '';
  cert.expiresAt = '';
}
</script>
