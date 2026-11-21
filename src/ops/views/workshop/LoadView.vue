<template>
  <section class="load">
    <div class="ops-noprint">
      <h1>Xuất xe</h1>
      <p class="ops-muted">Quét hoặc tích từng thùng lên xe, ghi nhiệt độ thùng xe và số niêm phong rồi xuất bến. Thiếu thùng thì hệ thống cảnh báo.</p>
    </div>

    <template v-if="tripInfo">
      <section class="ops-card ops-noprint" aria-label="Lên xe">
        <h2>{{ tripInfo.label }} · xe rời {{ hhmm(tripInfo.departAt) }} <small class="ops-muted">{{ loadedCount }} / {{ rows.length }} thùng đã lên xe</small></h2>
        <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: pct + '%' }"></div></div>

        <form v-if="!state.departedAt" class="scan-form" @submit.prevent="scanSubmit">
          <label for="scan">Quét hoặc nhập mã đơn rồi bấm Enter</label>
          <div class="scan-row">
            <input id="scan" ref="scanEl" v-model="scan" class="ops-input" autocomplete="off" autocapitalize="characters" placeholder="ORD-00012" data-testid="scan" />
            <button class="ops-btn ops-btn-primary" type="submit" data-testid="scan-go">Lên xe</button>
          </div>
          <p v-if="scanMsg" class="scan-msg" :class="scanOk ? 'ops-ok' : 'ops-error'" role="status" data-testid="scan-msg">{{ scanMsg }}</p>
        </form>

        <ul class="load-list" data-testid="load-list">
          <li v-for="r in rows" :key="r.list.orderId" class="load-row" :class="{ on: r.loadedAt }" :data-order="r.list.orderId">
            <div class="load-info">
              <strong class="mono">{{ r.list.orderId }}</strong>
              <span class="ops-muted">{{ zoneName(r.list.zoneId) }} · {{ slotLabel(r.list.zoneId, r.list.slotId) }}</span>
              <span v-if="!r.packed" class="ops-pill ops-pill-bad">Chưa đóng thùng</span>
              <span v-else-if="r.loadedAt" class="ops-pill ops-pill-ok">Đã lên xe</span>
              <span v-else class="ops-pill ops-pill-warn">Chờ lên xe</span>
              <span v-if="r.pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
            </div>
            <button
              class="ops-btn load-btn" :class="{ 'ops-btn-primary': !r.loadedAt }" :disabled="!!state.departedAt || (!r.packed && !r.loadedAt)" data-testid="load-btn"
              @click="toggle(r)"
            >{{ r.loadedAt ? 'Bỏ khỏi xe' : 'Lên xe' }}</button>
          </li>
          <li v-if="!rows.length" class="ops-muted">Chuyến này chưa có thùng.</li>
        </ul>

        <div v-if="missing.length && !state.departedAt" class="alert alert-warn" role="alert" data-testid="missing-warning">
          <strong>Thiếu {{ missing.length }} thùng chưa lên xe:</strong>
          {{ missing.map((m) => m.list.orderId).join(', ') }}
        </div>
      </section>

      <section v-if="!state.departedAt" class="ops-card ops-noprint" aria-label="Xuất xe">
        <h2>Xuất bến</h2>
        <div class="field-row">
          <div>
            <label for="d-temp">Nhiệt độ thùng xe (°C)</label>
            <input id="d-temp" v-model="tempC" class="ops-input" type="number" inputmode="decimal" step="0.1" data-testid="d-temp" />
          </div>
          <div>
            <label for="d-seal">Số niêm phong</label>
            <input id="d-seal" v-model="sealNo" class="ops-input" autocomplete="off" data-testid="d-seal" />
          </div>
        </div>
        <label>Ảnh thùng xe và nhiệt kế (bắt buộc)</label>
        <PhotoInput v-model="photo" label="Chụp ảnh thùng xe + nhiệt kế" testid="d-photo" />
        <p class="ops-muted">Giờ xuất ghi tự động lúc bấm Xuất xe (theo đồng hồ nghiệp vụ). Thùng xe lạnh phải từ {{ chillMax }}°C trở xuống.</p>
        <p v-if="tempCheck && Number(tempC) > chillMax" class="ops-error" role="alert">Nhiệt độ thùng xe đang cao hơn {{ chillMax }}°C. Kiểm tra máy lạnh trước khi xuất.</p>
        <label v-if="missing.length" class="check-row">
          <input v-model="confirmMissing" type="checkbox" data-testid="confirm-missing" />
          <span>Vẫn xuất xe, thiếu {{ missing.length }} thùng</span>
        </label>
        <p v-if="error" class="ops-error" role="alert" data-testid="d-error">{{ error }}</p>
        <button class="ops-btn ops-btn-primary ops-btn-block" data-testid="depart" @click="depart">Xuất xe</button>
      </section>

      <section v-else class="ops-card ops-noprint" aria-label="Đã xuất xe">
        <h2><span class="ops-pill ops-pill-ok">ĐÃ XUẤT BẾN</span> lúc {{ fmtDeadline(new Date(state.departedAt)) }}</h2>
        <p>Nhiệt độ thùng xe {{ state.tempC }}°C · niêm phong <strong class="mono">{{ state.sealNo }}</strong>
          <span v-if="state.tempOk === false" class="ops-pill ops-pill-bad">vượt {{ chillMax }}°C</span></p>
        <p v-if="state.missing.length" class="ops-error">Thiếu {{ state.missing.length }} thùng khi xuất: {{ state.missing.join(', ') }}</p>
      </section>

      <section v-if="loadedCount" class="ops-card ops-noprint">
        <div class="ops-actions">
          <button class="ops-btn" data-testid="show-manifest" @click="manifest = !manifest">{{ manifest ? 'Ẩn bảng kê' : 'Xem bảng kê chuyến' }}</button>
        </div>
      </section>

      <section v-if="manifest && loadedCount" class="ops-card ops-print-block manifest" data-testid="manifest">
        <div class="ops-actions ops-noprint"><button class="ops-btn ops-btn-primary" data-testid="print-manifest" @click="printManifest">In bảng kê</button></div>
        <h2 class="manifest-title">BẢNG KÊ CHUYẾN XE · {{ tripInfo.label }}</h2>
        <dl class="sheet-meta manifest-meta">
          <div><dt>Ngày giao</dt><dd>{{ fmtDay(selDay) }}</dd></div>
          <div><dt>Xe rời</dt><dd>{{ hhmm(tripInfo.departAt) }}</dd></div>
          <div><dt>Giờ xuất</dt><dd>{{ state.departedAt ? fmtDeadline(new Date(state.departedAt)) : 'Chưa xuất' }}</dd></div>
          <div><dt>Nhiệt độ thùng xe</dt><dd>{{ state.tempC != null ? `${state.tempC}°C` : '—' }}</dd></div>
          <div><dt>Số niêm phong</dt><dd>{{ state.sealNo || '—' }}</dd></div>
          <div><dt>Số thùng</dt><dd>{{ loadedCount }} / {{ rows.length }}</dd></div>
        </dl>
        <table class="sheet-table">
          <thead><tr><th>#</th><th>Mã đơn</th><th>Khu</th><th>Khung giờ</th><th class="r">Túi mát (xanh lá)</th><th class="r">Túi đông (xanh dương)</th><th class="r">Túi thường</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in loadedRows" :key="r.list.orderId">
              <td>{{ i + 1 }}</td><td class="mono">{{ r.list.orderId }}</td><td>{{ zoneName(r.list.zoneId) }}</td><td>{{ slotLabel(r.list.zoneId, r.list.slotId) }}</td>
              <td class="r">{{ r.list.bagsByTemp.chill }}</td><td class="r">{{ r.list.bagsByTemp.frozen }}</td><td class="r">{{ r.list.bagsByTemp.ambient }}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="4"><strong>Cộng</strong></td><td class="r">{{ sumTemp('chill') }}</td><td class="r">{{ sumTemp('frozen') }}</td><td class="r">{{ sumTemp('ambient') }}</td></tr></tfoot>
        </table>
        <p v-if="(state.departedAt ? state.missing : missing.map((m) => m.list.orderId)).length" class="manifest-missing">
          Thiếu: {{ (state.departedAt ? state.missing : missing.map((m) => m.list.orderId)).join(', ') }}
        </p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { fmtDay, fmtDeadline } from '../../../shared/utils/time';
import { BUSINESS } from '../../../shared/config/business';
import { boxProgress } from '../../../shared/domain/factory';
import { apply, hasUnsent } from '../../queue';
import { boxes, loadState as state, scope, selDay, slotLabel, tripInfo, tripOrders, zoneName } from '../../factoryStore';
import { hhmm } from '../../format';
import PhotoInput from '../../components/PhotoInput.vue';
import { checkDepart, departOp } from '../../departRules';

const chillMax = BUSINESS.temperature.chill.max;
const scan = ref('');
const scanMsg = ref('');
const scanOk = ref(false);
const tempC = ref('');
const sealNo = ref('');
const photo = ref('');
const confirmMissing = ref(false);
const error = ref('');
const manifest = ref(false);
const scanEl = ref(null);

const rows = computed(() =>
  boxes.value.map(({ list, box, loadedAt }) => ({
    list, box, loadedAt,
    packed: boxProgress(list, box).packed,
    pending: hasUnsent((a) => a.type === 'load' && a.orderId === list.orderId)
  }))
);
const loadedRows = computed(() => rows.value.filter((r) => r.loadedAt));
const loadedCount = computed(() => loadedRows.value.length);
const missing = computed(() => rows.value.filter((r) => !r.loadedAt));
const pct = computed(() => (rows.value.length ? Math.round((loadedCount.value / rows.value.length) * 100) : 0));
const tempCheck = computed(() => tempC.value !== '' && Number.isFinite(Number(tempC.value)));
const sumTemp = (t) => loadedRows.value.reduce((s, r) => s + r.list.bagsByTemp[t], 0);

function load(orderId, loaded) {
  apply('load', { scope: scope.value, orderId, loaded });
}
const toggle = (r) => load(r.list.orderId, !r.loadedAt);

function scanSubmit() {
  const code = scan.value.trim().toUpperCase().replace(/^MOVA-BOX[:/]/, '');
  scan.value = '';
  if (!code) return;
  const r = rows.value.find((x) => x.list.orderId.toUpperCase() === code);
  scanOk.value = false;
  if (!r) scanMsg.value = `${code}: không thuộc ${tripInfo.value.label} ngày này.`;
  else if (!r.packed) scanMsg.value = `${r.list.orderId}: thùng chưa đóng xong, không lên xe được.`;
  else if (r.loadedAt) scanMsg.value = `${r.list.orderId}: đã lên xe rồi.`;
  else {
    load(r.list.orderId, true);
    scanOk.value = true;
    scanMsg.value = `${r.list.orderId}: đã lên xe (${zoneName(r.list.zoneId)}).`;
  }
  if (scanEl.value) scanEl.value.focus();
}

function depart() {
  error.value = '';
  const bad = checkDepart({ tempC: tempC.value, sealNo: sealNo.value, photo: photo.value, loadedCount: loadedCount.value, missingCount: missing.value.length, confirmMissing: confirmMissing.value });
  if (bad) return (error.value = bad);
  // Rule 7: sổ bàn giao chuỗi lạnh = nhiệt độ + ảnh + giờ. Ảnh (data URL) được hàng đợi tải lên kho trước khi gửi thao tác.
  apply('depart', departOp({
    scope: scope.value, tempC: tempC.value, sealNo: sealNo.value, photo: photo.value, confirmMissing: confirmMissing.value,
    expected: tripOrders.value.map((o) => o.orderId)
  }));
  photo.value = '';
  manifest.value = true;
}

function printManifest() {
  window.print();
}
</script>
