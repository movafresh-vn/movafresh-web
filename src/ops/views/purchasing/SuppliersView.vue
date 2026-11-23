<template>
  <section>
    <h1>Nhà cung cấp</h1>
    <p class="ops-muted proc-note">Hồ sơ nhà cung cấp, HTX, nông hộ, lò mổ, nhà xe, đội giao hàng và bao bì. Giấy chứng nhận ATTP / VietGAP được cảnh báo trước {{ data ? data.warnDays : 30 }} ngày hết hạn.</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="sup-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status">{{ msg }}</p>

    <template v-if="data">
      <section v-if="data.alerts.length" class="alert-bad" role="alert" data-testid="cert-alerts" aria-label="Cảnh báo giấy chứng nhận">
        <strong>{{ data.alerts.length }} giấy chứng nhận cần xử lý</strong>
        <ul>
          <li v-for="a in data.alerts" :key="a.cert.id">
            <a href="#" @click.prevent="open(a.supplierId)">{{ a.supplierName }}</a> · {{ a.typeLabel }} {{ a.cert.number }} ·
            <strong>{{ a.state === 'expired' ? `đã hết hạn ${-a.daysLeft} ngày` : `còn ${a.daysLeft} ngày (hết hạn ${dmy(a.cert.expiresAt)})` }}</strong>
          </li>
        </ul>
      </section>

      <section class="ops-card">
        <div class="head-row">
          <div class="inline-form">
            <div><label for="s-kind">Loại</label>
              <select id="s-kind" v-model="fKind" class="ops-input ops-input-sm" data-testid="s-kind"><option value="">Tất cả</option><option v-for="(l, k) in data.kinds" :key="k" :value="k">{{ l }}</option></select>
            </div>
          </div>
          <button class="ops-btn ops-btn-primary ops-btn-small" data-testid="s-new" @click="startNew">Thêm HTX / nông hộ / lò mổ</button>
        </div>
        <div class="ops-table-wrap gap-top">
          <table class="ops-table" data-testid="sup-table">
            <thead><tr><th>Nhà cung cấp</th><th>Loại</th><th>MST / CCCD</th><th class="r">Kỳ công nợ</th><th>Liên hệ</th><th>Giấy chứng nhận</th></tr></thead>
            <tbody>
              <tr v-for="s in rows" :key="s.id" class="row-click" :class="{ 'row-on': sel && sel.id === s.id }" :data-sup="s.id" tabindex="0" @click="open(s.id)" @keydown.enter="open(s.id)">
                <td><strong>{{ s.name }}</strong><small class="mono">{{ s.id }}{{ s.portal ? ' · có cổng' : '' }}</small></td>
                <td>{{ s.kindLabel }}</td>
                <td class="mono">{{ s.taxId || s.cccd }}</td>
                <td class="r">{{ s.termDays }} ngày</td>
                <td>{{ s.contact.name }}<small>{{ s.contact.phone }}</small></td>
                <td>
                  <span v-if="!s.certs.length" class="ops-muted">Chưa có</span>
                  <span v-for="c in s.certs" :key="c.id" class="ops-pill" :class="CERT_PILL[c.state]">{{ c.typeLabel }}: {{ CERT_LABEL[c.state] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="form" class="ops-card" aria-label="Hồ sơ nhà cung cấp" data-testid="sup-form">
        <div class="head-row">
          <h2>{{ form.id ? form.name : 'Nhà cung cấp mới' }}</h2>
          <button class="ops-btn ops-btn-small" @click="form = null">Đóng</button>
        </div>
        <form novalidate @submit.prevent="save">
          <div class="field-grid">
            <div><label for="f-kind">Loại</label>
              <select id="f-kind" v-model="form.kind" class="ops-input" :disabled="Boolean(form.id)" data-testid="f-kind"><option v-for="(l, k) in data.kinds" :key="k" :value="k" :disabled="!form.id && !['htx', 'nong_ho', 'lo_mo'].includes(k)">{{ l }}</option></select>
            </div>
            <div><label for="f-name">Tên</label><input id="f-name" v-model="form.name" class="ops-input" data-testid="f-name" /></div>
            <div v-if="form.kind === 'nong_ho'"><label for="f-cccd">Số CCCD (nông hộ)</label><input id="f-cccd" v-model="form.cccd" class="ops-input" inputmode="numeric" data-testid="f-cccd" /></div>
            <div v-else><label for="f-tax">Mã số thuế</label><input id="f-tax" v-model="form.taxId" class="ops-input" inputmode="numeric" data-testid="f-tax" /></div>
            <div><label for="f-addr">Địa chỉ</label><input id="f-addr" v-model="form.address" class="ops-input" /></div>
            <div><label for="f-bank">Ngân hàng</label><input id="f-bank" v-model="form.bank.bankName" class="ops-input" /></div>
            <div><label for="f-acc">Số tài khoản</label><input id="f-acc" v-model="form.bank.accountNo" class="ops-input" inputmode="numeric" data-testid="f-account" /></div>
            <div><label for="f-accn">Chủ tài khoản</label><input id="f-accn" v-model="form.bank.accountName" class="ops-input" /></div>
            <div><label for="f-term">Kỳ công nợ (ngày)</label><input id="f-term" v-model.number="form.termDays" type="number" min="0" max="120" class="ops-input" data-testid="f-term" /></div>
            <div><label for="f-cn">Người liên hệ</label><input id="f-cn" v-model="form.contact.name" class="ops-input" data-testid="f-contact" /></div>
            <div><label for="f-cp">Điện thoại</label><input id="f-cp" v-model="form.contact.phone" class="ops-input" inputmode="tel" data-testid="f-phone" /></div>
          </div>
          <p class="help">Kỳ công nợ mới áp dụng cho PO lập sau; PO đã lập giữ kỳ cũ. Mã số thuế và số tài khoản trong dữ liệu mẫu là số giả.</p>
          <button class="ops-btn ops-btn-primary" type="submit" data-testid="f-save">Lưu hồ sơ</button>
        </form>

        <template v-if="form.id">
          <h3>Giấy chứng nhận</h3>
          <ul class="cert-list" data-testid="cert-list">
            <li v-for="c in form.certs" :key="c.id" :class="c.state">
              <strong>{{ c.typeLabel }}</strong> <span class="mono">{{ c.number }}</span> · {{ c.issuer || 'chưa ghi nơi cấp' }} · hết hạn {{ dmy(c.expiresAt) }}
              <span class="ops-pill" :class="CERT_PILL[c.state]">{{ CERT_LABEL[c.state] }}{{ c.state === 'valid' ? '' : c.state === 'expired' ? ` ${-c.daysLeft} ngày` : `, còn ${c.daysLeft} ngày` }}</span>
              <button class="ops-btn ops-btn-small ops-btn-danger" @click="removeCert(c)">Xóa</button>
            </li>
            <li v-if="!form.certs.length" class="ops-muted">Chưa có giấy chứng nhận nào.</li>
          </ul>
          <form class="inline-form" novalidate @submit.prevent="addCert">
            <div><label for="c-type">Loại</label><select id="c-type" v-model="cert.type" class="ops-input" data-testid="c-type"><option v-for="(l, k) in data.certTypes" :key="k" :value="k">{{ l }}</option></select></div>
            <div><label for="c-no">Số giấy</label><input id="c-no" v-model="cert.number" class="ops-input" data-testid="c-number" /></div>
            <div><label for="c-iss">Nơi cấp</label><input id="c-iss" v-model="cert.issuer" class="ops-input" /></div>
            <div><label for="c-exp">Ngày hết hạn</label><input id="c-exp" v-model="cert.expiresAt" type="date" class="ops-input" data-testid="c-expires" /></div>
            <button class="ops-btn" type="submit" data-testid="c-add">Thêm giấy</button>
          </form>
        </template>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { CERT_LABEL, CERT_PILL, dmy } from '../../labels';

const data = ref(null);
const error = ref('');
const msg = ref('');
const fKind = ref('');
const form = ref(null);
const sel = ref(null);
const cert = reactive({ type: 'attp', number: '', issuer: '', expiresAt: '' });

const rows = computed(() => (data.value ? data.value.suppliers.filter((s) => !fKind.value || s.kind === fKind.value) : []));

async function load() {
  try {
    data.value = await api.ops.procurement.suppliers(ctx.value);
    if (sel.value) {
      const fresh = data.value.suppliers.find((s) => s.id === sel.value.id);
      // Làm mới danh sách giấy chứng nhận nhưng không ghi đè phần đang gõ trong form
      if (fresh && form.value && form.value.id === fresh.id) form.value.certs = fresh.certs;
    }
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 8000 });

const clone = (x) => JSON.parse(JSON.stringify(x));

function open(id) {
  const s = data.value.suppliers.find((x) => x.id === id);
  if (!s) return;
  sel.value = s;
  form.value = clone(s);
  msg.value = '';
}

function startNew() {
  sel.value = null;
  form.value = { id: null, kind: 'htx', name: '', taxId: '', cccd: '', address: '', bank: { bankName: '', accountNo: '', accountName: '' }, termDays: 15, contact: { name: '', phone: '' }, certs: [] };
}

async function save() {
  msg.value = '';
  try {
    const f = form.value;
    const saved = await api.ops.procurement.saveSupplier(ctx.value, { id: f.id, kind: f.kind, name: f.name, taxId: f.taxId, cccd: f.cccd, address: f.address, bank: f.bank, termDays: f.termDays, contact: f.contact });
    msg.value = `Đã lưu hồ sơ ${saved.name}.`;
    error.value = '';
    await load();
    open(saved.id);
  } catch (e) {
    error.value = e.message;
  }
}

async function addCert() {
  try {
    await api.ops.procurement.addCert(ctx.value, { supplierId: form.value.id, cert: { ...cert } });
    cert.number = '';
    cert.issuer = '';
    cert.expiresAt = '';
    msg.value = 'Đã thêm giấy chứng nhận.';
    error.value = '';
    await load();
    open(form.value.id);
  } catch (e) {
    error.value = e.message;
  }
}

async function removeCert(c) {
  try {
    await api.ops.procurement.removeCert(ctx.value, { supplierId: form.value.id, certId: c.id });
    await load();
    open(form.value.id);
  } catch (e) {
    error.value = e.message;
  }
}
</script>
