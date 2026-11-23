<template>
  <section>
    <h1>Cài đặt tài chính</h1>
    <p class="ops-muted fin-note">
      Chế độ kế toán đổi từ năm 2026 (Thông tư 99/2025/TT-BTC thay Thông tư 200) nên <strong>không có số tài khoản nào được viết cứng</strong>. Kế toán nhập mã tài khoản của phần mềm kế toán đang dùng cho từng khóa dưới đây.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="ops-error" role="alert" data-testid="fs-error">{{ actionError }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="fs-msg">{{ msg }}</p>
    <template v-if="data">
      <section class="ops-card">
        <h2>Số dư đầu kỳ và hóa đơn</h2>
        <form class="fin-tools" novalidate @submit.prevent="saveGeneral">
          <div><label for="s-cash">Số dư tiền đầu kỳ (đ)</label><input id="s-cash" v-model.number="form.openingCashVnd" type="number" min="0" step="100000" class="ops-input" :disabled="!data.canEdit" data-testid="fs-cash" /></div>
          <div>
            <label for="s-issue">Xuất hóa đơn điện tử</label>
            <select id="s-issue" v-model="form.issueOn" class="ops-input" :disabled="!data.canEdit || data.issueOnLocked" data-testid="fs-issue">
              <option value="delivery">Khi giao hàng (theo tiền thật đã dùng)</option><option value="topup">Khi nhận tiền (nạp, chuyển khoản, trừ thẻ)</option>
            </select>
          </div>
          <button v-if="data.canEdit" class="ops-btn ops-btn-primary" type="submit" data-testid="fs-save-general">Lưu</button>
        </form>
        <p v-if="data.issueOnLocked" class="ops-muted">Đã có hóa đơn xuất ra nên không đổi thời điểm xuất được, tránh xuất hai lần cho cùng một khoản tiền.</p>
        <p class="ops-muted">Cách xử lý khuyến mãi đã dùng (cấu hình <code>finance.promoTreatment</code>): <strong>{{ data.promoTreatment }}</strong>.</p>
      </section>

      <section class="ops-card">
        <h2>Bảng ánh xạ tài khoản</h2>
        <form novalidate @submit.prevent="saveMap">
          <div class="ops-table-wrap">
            <table class="ops-table" data-testid="map-table">
              <thead><tr><th>Khóa nội bộ</th><th>Ý nghĩa</th><th>Mã tài khoản trong phần mềm kế toán</th></tr></thead>
              <tbody>
                <tr v-for="a in data.accountMap" :key="a.key">
                  <td class="mono">{{ a.key }}</td><td>{{ a.label }}</td>
                  <td><input v-model.trim="map[a.key]" class="ops-input ops-input-sm" :disabled="!data.canEdit" :aria-label="`Mã tài khoản cho ${a.label}`" :data-map="a.key" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button v-if="data.canEdit" class="ops-btn ops-btn-primary gap-top" type="submit" data-testid="fs-save-map">Lưu bảng ánh xạ</button>
        </form>
      </section>

      <section class="ops-card">
        <h2>Thuế suất theo nhóm hàng</h2>
        <p class="ops-muted">Cấu hình trong <code>BUSINESS.tax.groups</code>; kế toán xác nhận trước khi dùng kê khai. Giá bán và giá mua coi như đã gồm VAT.</p>
        <ul class="ops-list">
          <li v-for="g in data.taxGroups" :key="g.id">{{ g.label }}: {{ g.rate == null ? 'chưa xác định' : `${Math.round(g.rate * 100)}%` }}
            <span class="ops-pill" :class="g.confirmed ? 'ops-pill-ok' : 'ops-pill-warn'">{{ g.confirmed ? 'đã xác nhận' : 'chưa xác nhận' }}</span></li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const error = ref('');
const msg = ref('');
const actionError = ref('');
const form = reactive({ openingCashVnd: 0, issueOn: 'delivery' });
const map = reactive({});
let loaded = false;

async function load() {
  try {
    data.value = await api.ops.finance.settings(ctx.value);
    if (!loaded) {
      form.openingCashVnd = data.value.openingCashVnd;
      form.issueOn = data.value.issueOn;
      for (const a of data.value.accountMap) map[a.key] = a.code;
      loaded = true;
    }
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 0 });

async function save(input, okText) {
  msg.value = '';
  actionError.value = '';
  try {
    await api.ops.finance.saveSettings(ctx.value, input);
    msg.value = okText;
  } catch (e) {
    actionError.value = financeError(e);
  }
  loaded = false;
  await load();
}

const saveGeneral = () => save({ openingCashVnd: Number(form.openingCashVnd), issueOn: form.issueOn }, 'Đã lưu cài đặt.');
const saveMap = () => save({ accountMap: { ...map } }, 'Đã lưu bảng ánh xạ tài khoản. CSV bút toán xuất sau đó dùng các mã này.');
</script>
