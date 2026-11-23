<template>
  <section class="sp">
    <header class="ops-card sp-head">
      <BrandLogo class="ops-logo-sm" variant="onWhite" :width="84" />
      <h1>Giao hàng</h1>
      <p v-if="data && data.shipper" class="sp-who" data-testid="sp-who"><b>{{ data.shipper.name }}</b> · sức chở {{ data.shipper.capacityBoxes }} thùng / chuyến</p>
      <p v-if="data && data.day" class="ops-muted">{{ fmtDay(data.day) }}</p>
      <div v-if="!isShipper" class="sp-pick">
        <label for="sp-as">Xem thử app của shipper</label>
        <select id="sp-as" v-model="asId" class="ops-input" data-testid="sp-as" @change="load">
          <option value="" disabled>Chọn shipper</option>
          <option v-for="s in data ? data.shippers : []" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <p v-if="ctx && ctx.role === 'dispatch'" class="ops-muted">Điều phối chỉ xem, không thao tác thay shipper.</p>
      </div>
    </header>

    <p v-if="error" class="ops-error" role="alert" data-testid="sp-error">{{ error }}</p>
    <p v-if="toast" class="ops-ok sp-toast" role="status" data-testid="sp-toast">{{ toast }}</p>

    <section v-if="data && data.shipper && !data.routes.length" class="ops-card" data-testid="sp-empty">
      <h2>Chưa có tuyến nào</h2>
      <p class="ops-muted">Kho phụ xuất kho tuyến thì tuyến hiện ở đây, các điểm giao xếp sẵn theo thứ tự.</p>
    </section>

    <section v-for="r in data ? data.routes : []" :key="r.id" class="sp-route" :data-route="r.id">
      <div class="ops-card sp-route-head">
        <h2>{{ r.slotLabel }}</h2>
        <p class="ops-muted">Giao {{ hhmm(r.startAt) }}–{{ hhmm(r.endAt) }} · {{ r.boxes }} điểm · <span class="mono" :title="r.id">{{ routeLabel(r.id) }}</span></p>
        <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: r.stops.length ? Math.round(((r.done + r.failed) / r.stops.length) * 100) + '%' : '0%' }"></div></div>
        <p data-testid="sp-progress"><b>{{ r.done }}</b> đã giao · <b :class="{ 'ops-error': r.failed }">{{ r.failed }}</b> không giao được · {{ r.stops.length - r.done - r.failed }} còn lại</p>
        <p v-if="r.status === 'done'" class="ops-ok">Tuyến đã xong.</p>
      </div>

      <article v-for="st in r.stops" :key="st.orderId" class="ops-card sp-stop" :class="['s-' + st.status, { next: nextOf(r) === st.orderId }]" :data-stop="st.orderId">
        <div class="sp-stop-top">
          <span class="sp-seq">{{ st.seq }}</span>
          <div class="sp-who2">
            <strong data-testid="sp-name">{{ st.name }}</strong>
            <span class="mono ops-muted">{{ st.orderId }}</span>
          </div>
          <span class="ops-pill" :class="STOP_PILL[st.status]">{{ STOP_STATUS[st.status] }}</span>
        </div>
        <p class="sp-addr" data-testid="sp-address">{{ st.address }}<small v-if="st.ward"> · {{ st.ward }}</small></p>
        <p class="sp-phone">SĐT <b class="mono" data-testid="sp-phone">{{ st.phoneMasked }}</b> <small class="ops-muted">(che một phần, gọi qua tổng đài ẩn số)</small></p>
        <p v-if="st.recoverExpected" class="sp-recover" data-testid="sp-recover-hint">Thu lại lần giao trước: {{ st.recoverExpected.foam }} thùng xốp, {{ st.recoverExpected.gel }} túi gel</p>
        <p v-if="st.failReason" class="ops-error">Không giao được: {{ data.failReasons[st.failReason] }}. Điều phối sẽ xử lý.</p>
        <p v-if="st.recovered && (st.recovered.foam || st.recovered.gel)" class="ops-ok">Đã thu {{ st.recovered.foam }} thùng xốp, {{ st.recovered.gel }} túi gel.</p>
        <div v-if="st.status === 'delivered' && st.photo" class="sp-proof-photo" style="margin: 8px 0;">
          <PhotoThumbnail :photo="st.photo" alt="Ảnh bằng chứng giao hàng" cls="receipt-photo" />
        </div>

        <div class="sp-actions">
          <button class="ops-btn" type="button" :disabled="!canAct || st.status !== 'pending'" data-testid="sp-call" @click="call(st)">Gọi khách{{ st.calls ? ` (${st.calls})` : '' }}</button>
          <a class="ops-btn sp-maps" :href="st.mapsUrl" target="_blank" rel="noopener noreferrer" data-testid="sp-maps">Mở Google Maps</a>
        </div>
        <div v-if="st.status === 'pending' && canAct" class="sp-actions">
          <button class="ops-btn ops-btn-primary" type="button" data-testid="sp-deliver" @click="open(st, 'deliver')">Đã giao</button>
          <button class="ops-btn ops-btn-danger" type="button" data-testid="sp-fail" @click="open(st, 'fail')">Không giao được</button>
        </div>

        <!-- Đã giao: ảnh, nhiệt độ, thu hồi thùng xốp / túi gel -->
        <form v-if="active.orderId === st.orderId && active.mode === 'deliver'" class="sp-panel" novalidate data-testid="sp-deliver-form" @submit.prevent="deliver(st)">
          <h3>Xác nhận đã giao</h3>
          <label>Ảnh thùng hàng trước cửa {{ photoRequired(st) ? '(bắt buộc)' : '(tùy chọn: khách dặn không cần ảnh)' }}</label>
          <PhotoInput v-model="photo" testid="sp-photo" label="Chụp ảnh giao hàng" />
          <label :for="`tp-${st.orderId}`">Nhiệt độ thùng lúc giao (°C){{ data.deliveryTempRequired ? '' : ', tùy chọn' }}</label>
          <input :id="`tp-${st.orderId}`" v-model="tempC" class="ops-input" type="number" step="0.1" inputmode="decimal" data-testid="sp-temp" />
          <template v-if="data.recoveryEnabled">
            <p class="sp-rec-title">Thu lại thùng xốp và túi gel của lần giao trước</p>
            <div class="field-grid two">
              <div>
                <label :for="`rf-${st.orderId}`">Thùng xốp thu về</label>
                <input :id="`rf-${st.orderId}`" v-model.number="recFoam" class="ops-input" type="number" min="0" inputmode="numeric" data-testid="sp-foam" />
              </div>
              <div>
                <label :for="`rg-${st.orderId}`">Túi gel thu về</label>
                <input :id="`rg-${st.orderId}`" v-model.number="recGel" class="ops-input" type="number" min="0" inputmode="numeric" data-testid="sp-gel" />
              </div>
            </div>
            <p class="help">Khách đang giữ {{ st.recoverExpected ? st.recoverExpected.foam : 0 }} thùng xốp và {{ st.recoverExpected ? st.recoverExpected.gel : 0 }} túi gel từ lần giao trước.</p>
          </template>
          <p v-if="panelError" class="ops-error" role="alert" data-testid="sp-panel-error">{{ panelError }}</p>
          <div class="sp-actions">
            <button class="ops-btn ops-btn-primary" type="submit" data-testid="sp-deliver-ok" :disabled="busy">{{ busy ? 'Đang gửi…' : 'Xác nhận đã giao' }}</button>
            <button class="ops-btn" type="button" @click="close">Hủy</button>
          </div>
        </form>

        <!-- Không giao được -->
        <form v-if="active.orderId === st.orderId && active.mode === 'fail'" class="sp-panel" novalidate data-testid="sp-fail-form" @submit.prevent="fail(st)">
          <h3>Lý do không giao được</h3>
          <label v-for="(label, key) in data.failReasons" :key="key" class="check-row sp-reason">
            <input v-model="reason" type="radio" name="reason" :value="key" :data-reason="key" />
            <span>{{ label }}</span>
          </label>
          <p v-if="reason === 'unreachable' && st.calls < data.unreachableMinCalls" class="ops-error" data-testid="sp-call-hint">Gọi khách ít nhất {{ data.unreachableMinCalls }} lần trước khi báo không liên lạc được (đã gọi {{ st.calls }}).</p>
          <label :for="`fn-${st.orderId}`">Ghi chú</label>
          <input :id="`fn-${st.orderId}`" v-model="note" class="ops-input" placeholder="Ví dụ: gọi 2 lần không bắt máy" />
          <p v-if="panelError" class="ops-error" role="alert" data-testid="sp-panel-error">{{ panelError }}</p>
          <div class="sp-actions">
            <button class="ops-btn ops-btn-danger" type="submit" data-testid="sp-fail-ok" :disabled="busy">Xác nhận không giao được</button>
            <button class="ops-btn" type="button" @click="close">Hủy</button>
          </div>
          <p class="help">Khách được báo ngay. Điều phối sẽ chọn giao lại khung sau, giữ lạnh ở kho phụ hoặc bù Fresh Credit.</p>
        </form>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmtDay } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { hhmm } from '../../format';
import { STOP_PILL, STOP_STATUS, logisticsError, photoRequired, routeLabel } from '../../logisticsUi';
import PhotoInput from '../../components/PhotoInput.vue';
import BrandLogo from '../../../components/common/BrandLogo.vue';
import PhotoThumbnail from '../../components/PhotoThumbnail.vue';

const data = ref(null);
const error = ref('');
const toast = ref('');
const panelError = ref('');
const asId = ref('');
const active = reactive({ orderId: '', mode: '' });
const photo = ref('');
const tempC = ref('');
const recFoam = ref(0);
const recGel = ref(0);
const reason = ref('');
const note = ref('');
const busy = ref(false);

const isShipper = computed(() => Boolean(ctx.value && ctx.value.role === 'shipper'));
const canAct = computed(() => Boolean(ctx.value && ['shipper', 'admin'].includes(ctx.value.role)));

async function load() {
  try {
    data.value = await api.ops.shipper.board(ctx.value, { asShipperId: asId.value || null });
    if (!isShipper.value && !asId.value && data.value.shippers.length) {
      asId.value = data.value.shippers[0].id;
      data.value = await api.ops.shipper.board(ctx.value, { asShipperId: asId.value });
    }
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(() => {
  if (!active.orderId) load();
}, { every: 6000 });

const nextOf = (r) => (r.stops.find((s) => s.status === 'pending') || {}).orderId;
const who = () => (isShipper.value ? {} : { asShipperId: asId.value });

function open(st, mode) {
  active.orderId = st.orderId;
  active.mode = mode;
  photo.value = '';
  tempC.value = '';
  recFoam.value = st.recoverExpected ? st.recoverExpected.foam : 0;
  recGel.value = st.recoverExpected ? st.recoverExpected.gel : 0;
  reason.value = '';
  note.value = '';
  panelError.value = '';
  toast.value = '';
}
async function close() {
  active.orderId = '';
  active.mode = '';
  await load();
}

async function call(st) {
  error.value = '';
  try {
    await api.ops.shipper.callCustomer(ctx.value, { orderId: st.orderId, ...who() });
    toast.value = `Đang kết nối cuộc gọi tới ${st.name} (${st.phoneMasked}) qua tổng đài ẩn số; lượt gọi đã được ghi lại.`;
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}

// Ảnh bằng chứng: bắt buộc trừ khi hướng dẫn giao của khách nói không cần (máy chủ báo qua st.photoRequired). Máy chủ vẫn là nơi quyết định cuối cùng.
async function deliver(st) {
  panelError.value = '';
  if (busy.value) return;
  if (photoRequired(st) && !photo.value) {
    panelError.value = 'Cần chụp ảnh thùng hàng trước cửa để xác nhận đã giao.';
    return;
  }
  const t = tempC.value === '' || !Number.isFinite(Number(tempC.value)) ? null : Number(tempC.value);
  if (data.value.deliveryTempRequired && t === null) {
    panelError.value = 'Nhập nhiệt độ thùng lúc giao.';
    return;
  }
  busy.value = true;
  try {
    const r = await api.ops.shipper.deliver(ctx.value, {
      orderId: st.orderId,
      photo: photo.value || null,
      tempC: t,
      recovered: data.value.recoveryEnabled ? { foam: Number(recFoam.value) || 0, gel: Number(recGel.value) || 0 } : null,
      ...who()
    });
    toast.value = `Đã giao ${st.orderId}. Khách nhận thông báo${photo.value ? ' kèm ảnh' : ''}.${r && r.recovered && (r.recovered.foam || r.recovered.gel) ? ` Đã thu ${r.recovered.foam} thùng xốp, ${r.recovered.gel} túi gel.` : ''}`;
    await close();
  } catch (e) {
    panelError.value = logisticsError(e);
  } finally {
    busy.value = false;
  }
}

async function fail(st) {
  panelError.value = '';
  if (busy.value) return;
  if (!reason.value) {
    panelError.value = 'Chọn lý do không giao được.';
    return;
  }
  busy.value = true;
  try {
    await api.ops.shipper.fail(ctx.value, { orderId: st.orderId, reason: reason.value, note: note.value, ...who() });
    toast.value = `Đã báo ${st.orderId} không giao được. Khách đã được báo, điều phối sẽ xử lý.`;
    await close();
  } catch (e) {
    panelError.value = logisticsError(e);
  } finally {
    busy.value = false;
  }
}
</script>
