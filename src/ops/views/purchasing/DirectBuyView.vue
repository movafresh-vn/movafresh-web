<template>
  <section>
    <div class="ops-noprint">
      <h1>Mua nông sản trực tiếp</h1>
      <p class="ops-muted proc-note">Mua từ nông hộ / HTX không có hóa đơn thì lập bảng kê thu mua. Mẫu bảng kê do kế toán chọn ở Cài đặt (đang dùng: <strong data-testid="tpl-name">{{ tplLabel }}</strong>). Chỉ nông sản tươi chưa qua chế biến.</p>
      <p v-if="error" class="ops-error" role="alert" data-testid="dp-error">{{ error }}</p>
      <p v-if="msg" class="ops-ok" role="status" data-testid="dp-msg">{{ msg }}</p>

      <section v-if="data" class="ops-card">
        <h2>Lập bảng kê</h2>
        <form novalidate @submit.prevent="record">
          <label for="d-sel">Người bán đã có hồ sơ (tùy chọn)</label>
          <select id="d-sel" v-model="sellerId" class="ops-input" data-testid="d-seller-select" @change="pickSeller">
            <option value="">Nhập người bán mới</option>
            <option v-for="s in data.sellers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <div class="field-grid">
            <div><label for="d-name">Họ tên người bán</label><input id="d-name" v-model="seller.name" class="ops-input" data-testid="d-name" /></div>
            <div><label for="d-cccd">Số CCCD</label><input id="d-cccd" v-model="seller.cccd" class="ops-input" inputmode="numeric" data-testid="d-cccd" /></div>
            <div><label for="d-addr">Địa chỉ</label><input id="d-addr" v-model="seller.address" class="ops-input" data-testid="d-address" /></div>
            <div><label for="d-phone">Điện thoại</label><input id="d-phone" v-model="seller.phone" class="ops-input" inputmode="tel" /></div>
          </div>

          <h3>Hàng mua</h3>
          <div v-for="(it, i) in items" :key="i" class="inline-form gap-top" :data-item="i">
            <div><label :for="`d-sku-${i}`">Mặt hàng</label>
              <select :id="`d-sku-${i}`" v-model="it.sku" class="ops-input" :data-testid="`d-sku-${i}`"><option v-for="s in data.agriSkus" :key="s.id" :value="s.id">{{ s.name }}</option></select>
            </div>
            <div><label :for="`d-q-${i}`">Số lượng (kg)</label><input :id="`d-q-${i}`" v-model.number="it.qty" type="number" min="0" step="0.1" class="ops-input narrow" :data-testid="`d-qty-${i}`" /></div>
            <div><label :for="`d-p-${i}`">Đơn giá (đ/kg)</label><input :id="`d-p-${i}`" v-model.number="it.unitPriceVnd" type="number" min="0" step="500" class="ops-input mid" :data-testid="`d-price-${i}`" /></div>
            <button v-if="items.length > 1" type="button" class="ops-btn ops-btn-small ops-btn-danger" @click="items.splice(i, 1)">Bỏ dòng</button>
          </div>
          <div class="ops-actions"><button type="button" class="ops-btn ops-btn-small" data-testid="d-add" @click="addItem">+ Thêm mặt hàng</button></div>
          <p class="strong-n" data-testid="d-total">Tổng: {{ fmt(total) }}</p>

          <div class="inline-form">
            <div><label for="d-pay">Thanh toán</label>
              <select id="d-pay" v-model="method" class="ops-input" data-testid="d-method"><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option></select>
            </div>
            <label class="check-row"><input v-model="intoStock" type="checkbox" data-testid="d-stock" /> Nhập kho luôn</label>
            <div v-if="intoStock"><label for="d-loc">Về kho</label>
              <select id="d-loc" v-model="location" class="ops-input"><option value="hub">Kho phụ TP.HCM</option><option value="factory">Xưởng Đắk Lắk</option></select>
            </div>
          </div>
          <p v-if="method === 'cash'" class="help">Chi tiền mặt từ {{ fmt(data.cashLimitVnd) }} trở lên mất quyền khấu trừ VAT đầu vào, hệ thống chặn.</p>
          <div class="ops-actions">
            <button type="button" class="ops-btn" data-testid="d-preview" @click="preview">Xem trước bảng kê</button>
            <button type="submit" class="ops-btn ops-btn-primary" data-testid="d-record">Lập bảng kê</button>
          </div>
        </form>
      </section>

      <section v-if="data" class="ops-card">
        <h2>Bảng kê đã lập</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="dp-table">
            <thead><tr><th>Số</th><th>Người bán</th><th>Mẫu</th><th class="r">Tổng</th><th></th></tr></thead>
            <tbody>
              <tr v-for="p in data.purchases" :key="p.id" :data-purchase="p.id">
                <td class="mono">{{ p.id }}<small>{{ fmtDeadline(new Date(p.at)) }}</small></td><td>{{ p.statement.seller.name }}</td>
                <td>{{ p.statement.templateLabel }}</td><td class="r">{{ fmt(p.statement.totalVnd) }}</td>
                <td><button class="ops-btn ops-btn-small" @click="show(p.statement)">Xem / in</button></td>
              </tr>
              <tr v-if="!data.purchases.length"><td colspan="5" class="ops-muted">Chưa lập bảng kê nào.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div v-if="sheet" class="ops-actions">
        <button class="ops-btn ops-btn-primary" data-testid="d-print" @click="printSheet">In bảng kê {{ sheet.number }}</button>
        <button class="ops-btn" @click="sheet = null">Đóng bản xem</button>
      </div>
    </div>

    <section v-if="sheet" class="ops-card ops-print-block doc-sheet" data-testid="stmt-sheet">
      <p v-if="!sheet.templateConfirmed" class="help ops-noprint">Mẫu "{{ sheet.templateLabel }}" chưa được kế toán xác nhận còn hiệu lực.</p>
      <h2 class="doc-title">{{ sheet.title }}</h2>
      <p class="doc-sub">Số {{ sheet.number }} · Ngày {{ fmtDate(new Date(sheet.at === '(chưa lưu)' ? Date.now() : sheet.at)) }}</p>
      <p><strong>Người bán:</strong> {{ sheet.seller.name }} · CCCD {{ sheet.seller.cccd }}<br /><strong>Địa chỉ:</strong> {{ sheet.seller.address }}<template v-if="sheet.seller.phone"> · ĐT {{ sheet.seller.phone }}</template></p>
      <p><strong>Người mua:</strong> Công ty MOVA Fresh · hình thức thanh toán: {{ sheet.method === 'cash' ? 'tiền mặt' : 'chuyển khoản' }}</p>
      <table class="doc-table">
        <thead><tr><th>STT</th><th>Tên hàng</th><th>ĐVT</th><th class="r">Số lượng</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead>
        <tbody>
          <tr v-for="l in sheet.items" :key="l.no"><td>{{ l.no }}</td><td>{{ l.name }}</td><td>{{ l.unit }}</td><td class="r">{{ l.qty.toLocaleString('vi-VN') }}</td><td class="r">{{ fmt(l.unitPriceVnd) }}</td><td class="r">{{ fmt(l.amountVnd) }}</td></tr>
          <tr><td colspan="5" class="r"><strong>Tổng cộng</strong></td><td class="r"><strong>{{ fmt(sheet.totalVnd) }}</strong></td></tr>
        </tbody>
      </table>
      <p><strong>Bằng chữ:</strong> {{ sheet.totalWords }}</p>
      <p v-if="sheet.legalNote">{{ sheet.legalNote }}</p>
      <div class="sign-row"><div v-for="s in sheet.signatures" :key="s">{{ s }}</div></div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDate, fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';

const data = ref(null);
const error = ref('');
const msg = ref('');
const sheet = ref(null);
const sellerId = ref('');
const seller = reactive({ name: '', cccd: '', address: '', phone: '' });
const items = ref([{ sku: 'NL-KHOAI-01', qty: null, unitPriceVnd: null }]);
const method = ref('bank_transfer');
const intoStock = ref(true);
const location = ref('hub');
const tplId = ref(BUSINESS.purchasing.defaultStatementTemplate);

const tplLabel = computed(() => (BUSINESS.purchasing.statementTemplates[tplId.value] || {}).label || '');
const total = computed(() => items.value.reduce((s, it) => s + Math.round((Number(it.qty) || 0) * (Number(it.unitPriceVnd) || 0)), 0));

async function load() {
  try {
    data.value = await api.ops.procurement.directPurchases(ctx.value);
    tplId.value = (await api.ops.procurement.settings(ctx.value)).settings.statementTemplate;
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 0 });

function pickSeller() {
  const s = data.value.sellers.find((x) => x.id === sellerId.value);
  if (s) Object.assign(seller, { name: s.name, cccd: s.cccd || '', address: s.address, phone: s.phone || '' });
}

const addItem = () => items.value.push({ sku: data.value.agriSkus[0].id, qty: null, unitPriceVnd: null });
const payload = () => ({ seller: { ...seller }, items: items.value.map((i) => ({ ...i })), method: method.value, intoStock: intoStock.value, location: location.value });

async function preview() {
  msg.value = '';
  try {
    sheet.value = await api.ops.procurement.previewStatement(ctx.value, payload());
    error.value = '';
  } catch (e) {
    error.value = e.message;
    sheet.value = null;
  }
}

async function record() {
  msg.value = '';
  try {
    const p = await api.ops.procurement.recordDirectPurchase(ctx.value, payload());
    sheet.value = p.statement;
    msg.value = `Đã lập bảng kê ${p.id}${p.stockIds.length ? ` và nhập kho ${p.stockIds.length} lô` : ''}.`;
    error.value = '';
    items.value = [{ sku: 'NL-KHOAI-01', qty: null, unitPriceVnd: null }];
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

const show = (st) => {
  sheet.value = st;
};

async function printSheet() {
  await nextTick();
  window.print();
}
</script>
