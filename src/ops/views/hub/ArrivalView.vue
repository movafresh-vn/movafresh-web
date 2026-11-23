<template>
  <section>
    <h1>Nhận xe lạnh từ Đắk Lắk</h1>
    <p class="ops-muted proc-note">
      Đối chiếu từng thùng với bảng kê của xưởng: quét hoặc tích thùng nhận được. Thùng có trong bảng kê mà không về là <b>thiếu</b>, thùng không có trong bảng kê là <b>thừa</b>, thùng về bị hư là <b>hỏng</b>.
      Đo nhiệt độ, chụp ảnh rồi chốt. Thiếu và hỏng thành ngoại lệ cho điều phối xử lý.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="arr-error">{{ error }}</p>

    <section v-if="data && data.days.length" class="ops-card ops-noprint chips-card" aria-label="Ngày giao và chuyến xe">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in data.days" :key="d" class="chip" :class="{ on: d === data.day }" :data-day="d" @click="pickDay(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
      <div class="daytrip-row">
        <span class="daytrip-label">Chuyến xe</span>
        <div class="chips">
          <button v-for="t in data.trips" :key="t.scope" class="chip" :class="{ on: cur && t.scope === cur.scope }" :data-trip="t.tripId" @click="selTrip = t.tripId">
            {{ t.label }} <small>{{ t.manifest.length }} thùng</small><em v-if="t.closed" class="chip-tag">đã nhận xong</em>
          </button>
        </div>
      </div>
    </section>
    <section v-else-if="data" class="ops-card" data-testid="arr-none">
      <h2>Chưa có xe nào xuất bến</h2>
      <p class="ops-muted">Xe lạnh xuất bến từ xưởng Đắk Lắk (màn Xuất xe của xưởng) thì bảng kê hiện ở đây.</p>
    </section>

    <template v-if="cur">
      <section class="ops-card" aria-label="Thông tin chuyến xe">
        <div class="head-row">
          <h2 class="plan-h2">{{ cur.label }} · xuất bến {{ dt(cur.departedAt) }}</h2>
          <span class="ops-pill" :class="cur.closed ? 'ops-pill-ok' : 'ops-pill-warn'">{{ cur.closed ? 'Đã chốt nhận xe' : 'Đang nhận' }}</span>
        </div>
        <dl class="kv">
          <div><dt>Nhiệt độ lúc xuất xưởng</dt><dd>{{ tempText(cur.tempC) }} <span v-if="!cur.tempOk" class="ops-pill ops-pill-bad">vượt ngưỡng</span></dd></div>
          <div><dt>Số niêm phong</dt><dd class="mono">{{ cur.sealNo }}</dd></div>
          <div><dt>Nhà xe / biển số</dt><dd>{{ cur.carrier ? `${cur.carrier.carrier} · ${cur.carrier.plate}` : 'Điều phối chưa lập chuyến' }}</dd></div>
          <div><dt>Thùng trên bảng kê</dt><dd>{{ cur.manifest.length }}</dd></div>
        </dl>
        <p v-if="cur.expectedMissing.length" class="ops-error">Xưởng xuất bến thiếu {{ cur.expectedMissing.length }} thùng: {{ cur.expectedMissing.join(', ') }}</p>
      </section>

      <template v-if="!cur.closed">
        <section class="ops-card" aria-label="Quét thùng">
          <div class="head-row">
            <h2 class="plan-h2">Tích thùng nhận được <small class="ops-muted">{{ counts.ok + counts.damaged }} / {{ cur.manifest.length }}</small></h2>
            <button class="ops-btn ops-btn-small" type="button" data-testid="arr-all" @click="tickAll">Tích hết thùng chưa nhận</button>
          </div>
          <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: pct + '%' }"></div></div>
          <form class="scan-form" @submit.prevent="scan">
            <label for="arr-scan">Quét hoặc nhập mã thùng rồi bấm Enter (mã không có trong bảng kê sẽ ghi là thừa)</label>
            <div class="scan-row">
              <input id="arr-scan" v-model="code" class="ops-input" autocomplete="off" autocapitalize="characters" placeholder="ORD-00012" data-testid="arr-scan" />
              <button class="ops-btn ops-btn-primary" type="submit" data-testid="arr-scan-go">Nhận</button>
            </div>
            <p v-if="scanMsg" class="scan-msg" :class="scanOk ? 'ops-ok' : 'ops-error'" role="status" data-testid="arr-scan-msg">{{ scanMsg }}</p>
          </form>

          <ul class="load-list" data-testid="arr-list">
            <li v-for="m in cur.manifest" :key="m.orderId" class="load-row" :class="{ on: m.state === 'ok', bad: m.state === 'damaged' }" :data-order="m.orderId">
              <div class="load-info">
                <strong class="mono">{{ m.orderId }}</strong>
                <span class="ops-muted">{{ m.zoneName }} · {{ m.slotLabel }}</span>
                <span v-if="m.seafood" class="ops-pill">có hải sản</span>
                <span v-if="m.state === 'ok'" class="ops-pill ops-pill-ok">Đã nhận</span>
                <span v-else-if="m.state === 'damaged'" class="ops-pill ops-pill-bad">Hỏng</span>
                <span v-else class="ops-pill ops-pill-warn">Chưa nhận</span>
              </div>
              <div class="btn-row load-actions">
                <button class="ops-btn load-btn" :class="{ 'ops-btn-primary': m.state !== 'ok' }" type="button" data-testid="arr-ok" @click="mark(m, m.state === 'ok' ? 'clear' : 'ok')">{{ m.state === 'ok' ? 'Bỏ tích' : 'Nhận' }}</button>
                <button class="ops-btn ops-btn-danger load-btn" type="button" data-testid="arr-damaged" @click="mark(m, m.state === 'damaged' ? 'clear' : 'damaged')">{{ m.state === 'damaged' ? 'Bỏ hỏng' : 'Hỏng' }}</button>
              </div>
            </li>
          </ul>
          <div v-if="cur.extra.length" class="alert-bad" data-testid="arr-extra">
            <strong>Thừa {{ cur.extra.length }} thùng không có trong bảng kê:</strong> {{ cur.extra.join(', ') }}
            <button v-for="x in cur.extra" :key="x" class="ops-btn ops-btn-small" type="button" @click="removeExtra(x)">Bỏ {{ x }}</button>
          </div>
        </section>

        <section v-if="missing.length || counts.damaged || cur.extra.length" class="alert-bad" role="alert" data-testid="arr-warning">
          <strong>Cảnh báo chưa khớp bảng kê:</strong>
          <ul>
            <li v-if="missing.length" data-testid="arr-missing">Thiếu {{ missing.length }} thùng: {{ missing.map((m) => m.orderId).join(', ') }}</li>
            <li v-if="counts.damaged">Hỏng {{ counts.damaged }} thùng</li>
            <li v-if="cur.extra.length">Thừa {{ cur.extra.length }} thùng</li>
          </ul>
          Khi chốt, mỗi thùng thiếu hoặc hỏng thành một ngoại lệ để điều phối xử lý (giao lại, giữ lạnh hoặc bù Fresh Credit). Ảnh lúc nhận được lưu vào sổ bàn giao.
        </section>

        <form class="ops-card" novalidate data-testid="arr-form" @submit.prevent="close">
          <h2 class="plan-h2">Đo nhiệt độ và chốt</h2>
          <div class="field-grid">
            <div>
              <label for="arr-temp">Nhiệt độ thùng xe ngăn mát lúc nhận (°C)</label>
              <input id="arr-temp" v-model="tempC" class="ops-input" type="number" step="0.1" inputmode="decimal" data-testid="arr-temp" />
              <p class="help" :class="{ 'ops-error': tempBad(tempC, 'chill') }">Ngưỡng ngăn mát {{ chill.min }}–{{ chill.max }}°C.</p>
            </div>
            <div>
              <label for="arr-temp-f">Nhiệt độ ngăn đông (°C, tùy chọn)</label>
              <input id="arr-temp-f" v-model="frozenC" class="ops-input" type="number" step="0.1" inputmode="decimal" data-testid="arr-temp-frozen" />
              <p class="help" :class="{ 'ops-error': tempBad(frozenC, 'frozen') }">Ngưỡng ngăn đông ≤ {{ frozen.max }}°C.</p>
            </div>
          </div>
          <label>Ảnh xe / thùng lúc nhận (bắt buộc: là sổ bàn giao chuỗi lạnh bất biến của kho phụ)</label>
          <PhotoInput v-model="photo" testid="arr-photo" />
          <label for="arr-note">Ghi chú</label>
          <input id="arr-note" v-model="note" class="ops-input" />
          <p v-if="closeError" class="ops-error" role="alert" data-testid="arr-close-error">{{ closeError }}</p>
          <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" data-testid="arr-close" :disabled="closing">{{ closing ? 'Đang chốt…' : 'Chốt nhận xe' }}</button>
        </form>
      </template>

      <section v-else class="ops-card" data-testid="arr-result">
        <h2 class="plan-h2">Kết quả nhận xe lúc {{ dt(cur.result.closedAt) }}</h2>
        <p>Nhiệt độ ngăn mát <b>{{ tempText(cur.result.tempC) }}</b><template v-if="cur.result.frozenTempC != null">, ngăn đông <b>{{ tempText(cur.result.frozenTempC) }}</b></template>.</p>
        <div v-if="cur.result.photo" class="arrival-photo-wrap" style="margin: 8px 0;">
          <PhotoThumbnail :photo="typeof cur.result.photo === 'string' ? cur.result.photo : ''" alt="Ảnh xe / thùng lúc nhận" cls="receipt-photo" />
        </div>
        <p v-if="cur.result.missing.length" class="ops-error" data-testid="arr-result-missing">Thiếu {{ cur.result.missing.length }} thùng: {{ cur.result.missing.join(', ') }}. Đã chuyển cho điều phối xử lý.</p>
        <p v-if="resultDamaged.length" class="ops-error">Hỏng {{ resultDamaged.length }} thùng: {{ resultDamaged.join(', ') }}.</p>
        <p v-if="cur.extra.length" class="ops-error">Thừa {{ cur.extra.length }} thùng: {{ cur.extra.join(', ') }}.</p>
        <p v-if="!cur.result.missing.length && !resultDamaged.length && !cur.extra.length" class="ops-ok">Nhận đủ {{ cur.manifest.length }} thùng, khớp bảng kê.</p>
        <p class="ops-muted">Tiếp theo: <RouterLink to="/kho/ghep-hai-san">ghép hải sản</RouterLink>, rồi <RouterLink to="/kho/chia-tuyen">chia khung giờ / tuyến</RouterLink>.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { evaluateTemp } from '../../../shared/domain/logistics';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { shortDay } from '../../format';
import { dt, logisticsError, tempText } from '../../logisticsUi';
import PhotoInput from '../../components/PhotoInput.vue';
import PhotoThumbnail from '../../components/PhotoThumbnail.vue';

const chill = BUSINESS.temperature.chill;
const frozen = BUSINESS.temperature.frozen;
const data = ref(null);
const error = ref('');
const selDay = ref(null);
const selTrip = ref(null);
const code = ref('');
const scanMsg = ref('');
const scanOk = ref(false);
const tempC = ref('');
const frozenC = ref('');
const photo = ref('');
const note = ref('');
const closeError = ref('');
const closing = ref(false);

async function load() {
  try {
    data.value = await api.ops.hub.arrivals(ctx.value, selDay.value);
    selDay.value = data.value.day;
    if (!data.value.trips.some((t) => t.tripId === selTrip.value)) {
      const next = data.value.trips.find((t) => !t.closed) || data.value.trips[0];
      selTrip.value = next ? next.tripId : null;
    }
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 7000 });

const cur = computed(() => (data.value ? data.value.trips.find((t) => t.tripId === selTrip.value) || null : null));
const counts = computed(() => ({
  ok: cur.value ? cur.value.manifest.filter((m) => m.state === 'ok').length : 0,
  damaged: cur.value ? cur.value.manifest.filter((m) => m.state === 'damaged').length : 0
}));
const missing = computed(() => (cur.value ? cur.value.manifest.filter((m) => !m.state) : []));
const pct = computed(() => (cur.value && cur.value.manifest.length ? Math.round(((counts.value.ok + counts.value.damaged) / cur.value.manifest.length) * 100) : 0));
const resultDamaged = computed(() => (cur.value ? cur.value.manifest.filter((m) => m.state === 'damaged').map((m) => m.orderId) : []));
const tempBad = (v, cls) => v !== '' && v != null && Number.isFinite(Number(v)) && !evaluateTemp(cls, Number(v)).ok;

watch(selTrip, () => {
  scanMsg.value = '';
  closeError.value = '';
});

function pickDay(d) {
  selDay.value = d;
  selTrip.value = null;
  load();
}

async function act(fn) {
  error.value = '';
  try {
    return await fn();
  } catch (e) {
    error.value = logisticsError(e);
    return null;
  } finally {
    await load();
  }
}

const mark = (m, state) => act(() => api.ops.hub.scanArrival(ctx.value, { scope: cur.value.scope, code: m.orderId, state }));
const removeExtra = (x) => act(() => api.ops.hub.scanArrival(ctx.value, { scope: cur.value.scope, code: x, state: 'clear' }));
async function tickAll() {
  await act(async () => {
    for (const m of cur.value.manifest) if (!m.state) await api.ops.hub.scanArrival(ctx.value, { scope: cur.value.scope, code: m.orderId, state: 'ok' });
  });
}

async function scan() {
  const c = code.value.trim();
  code.value = '';
  if (!c) return;
  const r = await act(() => api.ops.hub.scanArrival(ctx.value, { scope: cur.value.scope, code: c, state: 'ok' }));
  scanOk.value = Boolean(r) && r.result === 'ok';
  if (!r) scanMsg.value = `${c}: không ghi được.`;
  else if (r.result === 'extra') scanMsg.value = `${r.code}: THỪA, không có trong bảng kê của ${cur.value.label}.`;
  else scanMsg.value = `${r.code}: đã nhận.`;
}

async function close() {
  closeError.value = '';
  if (closing.value) return;
  // Ảnh dỡ hàng LUÔN bắt buộc: nó là dòng sổ bàn giao chuỗi lạnh (nhiệt độ + ảnh + người + giờ) mở khóa bước thùng vào kho phụ.
  if (tempC.value === '' || !Number.isFinite(Number(tempC.value))) {
    closeError.value = 'Nhập nhiệt độ ngăn mát lúc nhận.';
    return;
  }
  if (!photo.value) {
    closeError.value = 'Cần chụp ảnh xe / thùng lúc nhận trước khi chốt.';
    return;
  }
  closing.value = true;
  try {
    await api.ops.hub.closeArrival(ctx.value, {
      scope: cur.value.scope,
      tempC: Number(tempC.value),
      frozenTempC: frozenC.value === '' || !Number.isFinite(Number(frozenC.value)) ? null : Number(frozenC.value),
      photo: photo.value,
      note: note.value
    });
    tempC.value = '';
    frozenC.value = '';
    photo.value = '';
    note.value = '';
  } catch (e) {
    closeError.value = logisticsError(e);
  } finally {
    closing.value = false;
  }
  await load();
}
</script>
