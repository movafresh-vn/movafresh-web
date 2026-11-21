<template>
  <section class="rb">
    <p v-if="error" class="ops-error" role="alert" data-testid="rb-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="rb-ok">{{ ok }}</p>

    <section v-if="board && board.days.length" class="ops-card ops-noprint chips-card" aria-label="Ngày giao">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in board.days" :key="d" class="chip" :class="{ on: d === board.day }" :data-day="d" @click="pick(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
    </section>
    <section v-else-if="board" class="ops-card" data-testid="rb-none">
      <h2>Chưa có ngày nào chốt sổ</h2>
      <p class="ops-muted">Tuyến chỉ lập cho các đơn đã chốt sổ và đã về kho phụ (xe lạnh đã nhận xong).</p>
    </section>

    <section v-if="board && board.day && mode === 'plan'" class="alert-ok mock-note" data-testid="mock-note">
      <strong>Lập tuyến theo cụm.</strong> {{ board.engine }}
    </section>

    <section v-for="s in board ? board.slots : []" :key="s.slotId" class="ops-card rb-slot" :class="{ 'ops-noprint': sheet }" :data-slot="s.slotId">
      <div class="head-row">
        <h2 class="plan-h2">{{ s.label }}</h2>
        <span class="ops-muted">Xuất kho trước {{ hhmm(s.dispatchBy) }} · giao {{ hhmm(s.startAt) }}–{{ hhmm(s.endAt) }}</span>
      </div>
      <p class="rb-counts">
        <span class="ops-pill ops-pill-ok" data-testid="rb-eligible">{{ s.eligible }} thùng sẵn sàng lên tuyến</span>
        <span v-if="s.routes.length" class="ops-pill">{{ s.routes.length }} tuyến · {{ s.totalBoxes }} thùng</span>
        <span v-for="(n, reason) in waitCounts(s)" :key="reason" class="ops-pill ops-pill-warn" :data-wait="reason">{{ n }} thùng: {{ WAIT_REASON[reason] }}</span>
      </p>

      <div v-if="canPlan && hasPlanned(s) === false && s.eligible > 0" class="rb-plan">
        <fieldset v-if="mode === 'plan'" class="rb-shippers">
          <legend class="ops-muted">Shipper chạy khung này (sức chở thùng / chuyến)</legend>
          <label v-for="sh in board.shippers" :key="sh.id" class="check-row">
            <input v-model="chosen" type="checkbox" :value="sh.id" :disabled="s.busyShippers.includes(sh.id)" :data-shipper="sh.id" />
            <span>{{ sh.name }} ({{ sh.capacityBoxes }})</span>
          </label>
        </fieldset>
        <button class="ops-btn ops-btn-primary" type="button" data-testid="rb-plan" @click="plan(s)">Lập tuyến tự động</button>
      </div>
      <div v-else-if="canPlan && hasPlanned(s) && mode === 'plan'" class="rb-plan">
        <button class="ops-btn" type="button" data-testid="rb-replan" @click="plan(s)">Lập lại các tuyến chưa xuất kho</button>
      </div>
      <p v-if="unassigned[s.slotId] && unassigned[s.slotId].length" class="alert-bad" role="alert" data-testid="rb-unassigned">
        {{ unassigned[s.slotId].length }} thùng chưa xếp được vì shipper đã đủ sức chở: {{ unassigned[s.slotId].map((u) => u.orderId).join(', ') }}. Thêm shipper hoặc dời sang khung khác.
      </p>

      <article v-for="r in s.routes" :key="r.id" class="rb-route" :class="'st-' + r.status" :data-route="r.id">
        <div class="head-row">
          <h3 class="mono" :title="r.id">{{ routeLabel(r.id) }}</h3>
          <span class="ops-pill" :class="r.status === 'planned' ? 'ops-pill-warn' : 'ops-pill-ok'">{{ ROUTE_STATUS[r.status] }}</span>
        </div>
        <p class="rb-meta">
          <b>{{ r.shipperName }}</b> · {{ r.boxes }} / {{ r.capacityBoxes }} thùng
          · ước tính {{ r.estMinutes }} phút <span v-if="!r.fitsWindow" class="ops-pill ops-pill-bad">dài hơn khung giờ</span>
          <span v-if="r.mock" class="ops-pill" title="Thứ tự điểm theo cụm khu - phường, chưa tối ưu theo bản đồ">cụm khu</span>
        </p>
        <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: Math.min(100, Math.round((r.boxes / r.capacityBoxes) * 100)) + '%' }"></div></div>

        <div class="ops-table-wrap">
          <table class="ops-table rb-stops">
            <thead>
              <tr>
                <th>#</th><th>Mã đơn</th><th>Khu · phường</th>
                <th v-if="withRecipient">Người nhận</th>
                <th>Trạng thái</th>
                <th v-if="mode === 'sort'">Chia / kệ</th>
                <th v-if="mode === 'plan'">Chuyển tuyến</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="st in r.stops" :key="st.orderId" :data-stop="st.orderId">
                <td>{{ st.seq }}</td>
                <td class="mono">{{ st.orderId }}</td>
                <td>{{ st.district }}<small>{{ st.ward }}</small></td>
                <td v-if="withRecipient">
                  <template v-if="st.recipient"><strong>{{ st.recipient.name }}</strong><small>{{ st.recipient.address }}</small><small>{{ st.recipient.phone }}</small></template>
                </td>
                <td><span class="ops-pill" :class="STOP_PILL[st.status]">{{ STOP_STATUS[st.status] || st.status }}</span></td>
                <td v-if="mode === 'sort'" class="rb-sort">
                  <template v-if="r.status === 'planned'">
                    <input v-model="loc[st.orderId]" class="ops-input ops-input-sm" :aria-label="`Kệ của ${st.orderId}`" placeholder="Kệ" :disabled="!!st.sorted" data-testid="rb-loc" />
                    <button v-if="!st.sorted" class="ops-btn ops-btn-small" type="button" data-testid="rb-sort-one" @click="sortOne(r, st)">Chia</button>
                    <button v-else class="ops-btn ops-btn-small ops-btn-primary" type="button" :title="'Bỏ chia'" data-testid="rb-unsort" @click="unsort(r, st)">✓ {{ st.sorted.location || 'đã chia' }}</button>
                  </template>
                  <span v-else class="ops-muted">{{ st.sorted ? st.sorted.location || 'đã chia' : '' }}</span>
                </td>
                <td v-if="mode === 'plan'">
                  <select v-if="r.status === 'planned' && plannedOthers(s, r).length" class="ops-input ops-input-sm" :aria-label="`Chuyển ${st.orderId}`" data-testid="rb-move" @change="move(st, $event)">
                    <option value="">Giữ nguyên</option>
                    <option v-for="o in plannedOthers(s, r)" :key="o.id" :value="o.id">{{ o.shipperName }} ({{ o.boxes }}/{{ o.capacityBoxes }})</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="mode === 'sort' && r.status === 'planned'" class="btn-row">
          <button class="ops-btn" type="button" data-testid="rb-sort-all" @click="sortAll(r)">Chia hết {{ r.stops.length - r.sortedCount }} thùng còn lại vào tuyến</button>
          <button v-if="canPrint" class="ops-btn" type="button" data-testid="rb-sheet" @click="openSheet(r)">Phiếu tuyến để in</button>
        </div>
        <div v-else-if="mode === 'sort' && canPrint" class="btn-row">
          <button class="ops-btn" type="button" data-testid="rb-sheet" @click="openSheet(r)">Phiếu tuyến để in</button>
        </div>

        <!-- Xuất kho -->
        <form v-if="mode === 'dispatch' && r.status === 'planned'" class="rb-dispatch" novalidate @submit.prevent="dispatch(r)">
          <p v-if="r.sortedCount < r.stops.length" class="ops-error" data-testid="rb-unsorted">Còn {{ r.stops.length - r.sortedCount }} thùng chưa chia vào tuyến (vào Chia khung/tuyến).</p>
          <div class="field-grid">
            <div>
              <label :for="`dt-${r.id}`">Nhiệt độ ngăn mát lúc xuất kho (°C)</label>
              <input :id="`dt-${r.id}`" v-model="temp[r.id]" class="ops-input" type="number" step="0.1" inputmode="decimal" data-testid="rb-temp" />
              <p class="help" :class="{ 'ops-error': tempBad(temp[r.id], 'chill') }">Ngưỡng ngăn mát {{ chill.min }}–{{ chill.max }}°C. Vượt ngưỡng vẫn xuất được nhưng thành cảnh báo cho QC.</p>
            </div>
            <div>
              <label :for="`df-${r.id}`">Nhiệt độ ngăn đông (°C, tùy chọn)</label>
              <input :id="`df-${r.id}`" v-model="tempF[r.id]" class="ops-input" type="number" step="0.1" inputmode="decimal" data-testid="rb-temp-frozen" />
              <p class="help" :class="{ 'ops-error': tempBad(tempF[r.id], 'frozen') }">Ngưỡng ngăn đông ≤ {{ frozen.max }}°C.</p>
            </div>
          </div>
          <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" :disabled="r.sortedCount < r.stops.length" data-testid="rb-dispatch">Xuất kho · giao cho {{ r.shipperName }}</button>
        </form>
        <p v-else-if="mode === 'dispatch' && r.dispatchedAt" class="ops-muted">
          Xuất kho lúc {{ dt(r.dispatchedAt) }} · nhiệt độ {{ tempText(r.dispatchTempC) }}.
          Đã giao {{ r.stops.filter((x) => x.status === 'delivered').length }} / {{ r.stops.length }}.
        </p>
      </article>
      <p v-if="!s.routes.length && !s.eligible && !Object.keys(waitCounts(s)).length" class="ops-muted">Khung này không có thùng nào.</p>
    </section>

    <RouteSheet v-if="sheet" :sheet="sheet" @close="sheet = null" />
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../shared/api';
import { BUSINESS } from '../../shared/config/business';
import { ctx, session } from '../session';
import { useLive } from '../useLive';
import { hhmm, shortDay } from '../format';
import { ROUTE_STATUS, STOP_PILL, STOP_STATUS, WAIT_REASON, dt, logisticsError, routeLabel, tempText } from '../logisticsUi';
import RouteSheet from './RouteSheet.vue';

const props = defineProps({ mode: { type: String, default: 'plan' } }); // plan | sort | dispatch

const chill = BUSINESS.temperature.chill;
const frozen = BUSINESS.temperature.frozen;
const board = ref(null);
const error = ref('');
const ok = ref('');
const sel = ref(null);
const chosen = ref([]);
let chosenInit = false;
const unassigned = reactive({});
const loc = reactive({});
const temp = reactive({});
const tempF = reactive({});
const sheet = ref(null);

const role = computed(() => (session.value ? session.value.role : ''));
const canPlan = computed(() => ['dispatch', 'hub', 'admin'].includes(role.value));
const canPrint = computed(() => ['hub', 'admin'].includes(role.value));
const withRecipient = computed(() => Boolean(board.value && board.value.canSeeRecipient) && props.mode !== 'plan');

async function load() {
  try {
    board.value = await api.ops.routes.board(ctx.value, sel.value);
    sel.value = board.value.day;
    if (!chosenInit && board.value.shippers) {
      chosen.value = board.value.shippers.map((x) => x.id);
      chosenInit = true;
    }
    for (const s of board.value.slots) {
      s.routes.forEach((r, i) => {
        for (const st of r.stops) if (loc[st.orderId] === undefined) loc[st.orderId] = defaultLoc(s, r, i);
      });
    }
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 5000 });

const defaultLoc = (s, r, i) => `K-${s.slotId.slice(0, 1).toUpperCase()}${i + 1}`;
const hasPlanned = (s) => s.routes.some((r) => r.status === 'planned');
const plannedOthers = (s, r) => s.routes.filter((o) => o.status === 'planned' && o.id !== r.id);
const waitCounts = (s) => {
  const out = {};
  for (const w of s.waiting) out[w.reason] = (out[w.reason] || 0) + 1;
  return out;
};
const tempBad = (v, cls) => {
  if (v === '' || v == null || !Number.isFinite(Number(v))) return false;
  const n = Number(v);
  return cls === 'frozen' ? n > frozen.max : n > chill.max || n < chill.min;
};

function pick(d) {
  sel.value = d;
  load();
}

async function run(fn, okText) {
  error.value = '';
  ok.value = '';
  try {
    const r = await fn();
    if (okText) ok.value = typeof okText === 'function' ? okText(r) : okText;
    return r;
  } catch (e) {
    error.value = logisticsError(e);
    return null;
  } finally {
    await load();
  }
}

async function plan(s) {
  const shipperIds = props.mode === 'plan' ? chosen.value : null;
  const r = await run(() => api.ops.routes.plan(ctx.value, { day: board.value.day, slotId: s.slotId, shipperIds }), (x) => `Đã lập ${x.routes.length} tuyến cho ${x.totalBoxes - x.unassigned.length} thùng.`);
  if (r) unassigned[s.slotId] = r.unassigned;
}

async function move(st, ev) {
  const to = ev.target.value;
  if (!to) return;
  await run(() => api.ops.routes.moveStop(ctx.value, { orderId: st.orderId, toRouteId: to }), `Đã chuyển ${st.orderId} sang tuyến ${routeLabel(to)}.`);
}

const sortOne = (r, st) => run(() => api.ops.hub.sortBox(ctx.value, { routeId: r.id, orderId: st.orderId, location: loc[st.orderId] || '' }));
const unsort = (r, st) => run(() => api.ops.hub.sortBox(ctx.value, { routeId: r.id, orderId: st.orderId, clear: true }));
async function sortAll(r) {
  await run(async () => {
    for (const st of r.stops) if (!st.sorted) await api.ops.hub.sortBox(ctx.value, { routeId: r.id, orderId: st.orderId, location: loc[st.orderId] || '' });
  }, `Đã chia đủ ${r.stops.length} thùng vào tuyến ${routeLabel(r.id)}.`);
}

async function openSheet(r) {
  sheet.value = await run(() => api.ops.hub.routeSheet(ctx.value, r.id));
}

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

async function dispatch(r) {
  const tempC = num(temp[r.id]);
  if (tempC === null) {
    error.value = logisticsError({ code: 'TEMP_REQUIRED' });
    return;
  }
  await run(() => api.ops.hub.dispatchRoute(ctx.value, { routeId: r.id, tempC, frozenTempC: num(tempF[r.id]) }), (x) =>
    `Đã xuất kho tuyến ${routeLabel(x.routeId)}, ${r.shipperName} nhận tuyến; khách được báo "đang giao".${x.breaches.length ? ' Nhiệt độ vượt ngưỡng: đã tạo cảnh báo cho QC.' : ''}`
  );
}
</script>
