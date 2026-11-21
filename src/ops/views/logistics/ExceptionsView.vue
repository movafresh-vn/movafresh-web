<template>
  <section>
    <h1>Giao hàng &amp; ngoại lệ</h1>
    <p class="ops-muted proc-note">
      Theo dõi các tuyến đang giao và xử lý thùng không giao được. Với mỗi ngoại lệ, chọn một trong ba cách: <b>giao lại khung sau</b>, <b>giữ lạnh ở kho phụ</b> hoặc <b>bù Fresh Credit</b>.
      Mọi cách đều báo sang app khách (thông báo và trạng thái trên trang tuần của khách).
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="ex-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="ex-ok">{{ ok }}</p>

    <section v-if="board" class="ops-card" aria-label="Tuyến đang giao">
      <div class="head-row">
        <h2 class="plan-h2">Tuyến của {{ board.day ? fmtDay(board.day) : 'ngày giao gần nhất' }}</h2>
        <span class="ops-muted">cập nhật theo app shipper</span>
      </div>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="ex-routes">
          <thead><tr><th>Tuyến</th><th>Khung giờ</th><th>Shipper</th><th class="r">Thùng</th><th class="r">Đã giao</th><th class="r">Không giao được</th><th>Trạng thái</th></tr></thead>
          <tbody>
            <tr v-for="r in routeRows" :key="r.id" :data-route="r.id">
              <td class="mono" :title="r.id">{{ r.label }}</td><td>{{ r.slot }}</td><td>{{ r.shipperName }}</td>
              <td class="r">{{ r.boxes }}</td><td class="r">{{ r.delivered }}</td><td class="r"><span :class="{ 'ops-error': r.failed }">{{ r.failed }}</span></td>
              <td><span class="ops-pill" :class="r.status === 'planned' ? 'ops-pill-warn' : 'ops-pill-ok'">{{ ROUTE_STATUS[r.status] }}</span></td>
            </tr>
            <tr v-if="!routeRows.length"><td colspan="7" class="ops-muted">Chưa có tuyến nào.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ops-card" aria-label="Ngoại lệ cần xử lý">
      <h2 class="plan-h2">Cần xử lý ({{ data ? data.open.length : 0 }})</h2>
      <p v-if="data && !data.open.length" class="ops-muted" data-testid="ex-none">Không có ngoại lệ nào đang chờ.</p>
      <div class="card-list">
        <article v-for="e in data ? data.open : []" :key="e.id" class="item-card attention" :data-exception="e.id" :data-order="e.orderId">
          <div class="head-row">
            <h3><span class="mono">{{ e.orderId }}</span> · {{ EXCEPTION_KIND[e.kind] }}</h3>
            <span class="ops-muted">{{ dt(e.createdAt) }}</span>
          </div>
          <p>{{ e.reason }}</p>
          <p class="ops-muted">{{ e.zoneName }}{{ e.ward ? ` · ${e.district}, ${e.ward}` : '' }} · {{ fmtDay(e.day) }} · {{ e.slotLabel }}</p>
          <div class="ex-actions">
            <div class="ex-redeliver">
              <label :for="`rd-${e.id}`">Giao lại vào</label>
              <select :id="`rd-${e.id}`" v-model="pickOpt[e.id]" class="ops-input ops-input-sm" data-testid="ex-option">
                <option v-for="o in e.redeliveryOptions" :key="o.value" :value="o.value">{{ o.sameDay ? 'Hôm đó' : fmtDay(o.day) }} · {{ o.label }}</option>
              </select>
              <button class="ops-btn ops-btn-primary" type="button" data-testid="ex-redeliver" :disabled="!e.redeliveryOptions.length" @click="redeliver(e)">Giao lại khung sau</button>
            </div>
            <button class="ops-btn" type="button" data-testid="ex-hold" @click="resolve(e, { kind: 'hold_cold' }, 'Đã giữ lạnh ở kho phụ, khách được báo.')">Giữ lạnh ở kho phụ</button>
            <button class="ops-btn ops-btn-danger" type="button" data-testid="ex-compensate" @click="compensate(e)">Bù Fresh Credit</button>
          </div>
        </article>
      </div>
      <p class="help">Giữ lạnh tối đa {{ data ? data.holdColdMaxHours : '' }} giờ. Bù Fresh Credit theo quy tắc {{ data ? Math.round(data.compensationPct * 100) : '' }}% giá trị đơn (vào ngăn khuyến mãi, không hoàn tiền mặt); điều phối không thấy số tiền đơn.</p>
    </section>

    <section v-if="data && data.held.length" class="ops-card" aria-label="Đang giữ lạnh" data-testid="ex-held">
      <h2 class="plan-h2">Đang giữ lạnh ở kho phụ ({{ data.held.length }})</h2>
      <div class="card-list">
        <article v-for="e in data.held" :key="e.id" class="item-card" :class="{ attention: e.holdExpired }" :data-exception="e.id">
          <div class="head-row">
            <h3><span class="mono">{{ e.orderId }}</span> · {{ EXCEPTION_KIND[e.kind] }}</h3>
            <span class="ops-pill" :class="e.holdExpired ? 'ops-pill-bad' : 'ops-pill-warn'">{{ e.holdExpired ? 'Quá hạn giữ lạnh' : 'Giữ tới ' + dt(e.heldUntil) }}</span>
          </div>
          <div class="ex-actions">
            <div class="ex-redeliver">
              <select v-model="pickOpt[e.id]" class="ops-input ops-input-sm" :aria-label="`Giao lại ${e.orderId}`" data-testid="ex-option">
                <option v-for="o in e.redeliveryOptions" :key="o.value" :value="o.value">{{ o.sameDay ? 'Hôm đó' : fmtDay(o.day) }} · {{ o.label }}</option>
              </select>
              <button class="ops-btn ops-btn-primary" type="button" data-testid="ex-redeliver" @click="redeliver(e)">Giao lại</button>
            </div>
            <button class="ops-btn ops-btn-danger" type="button" data-testid="ex-compensate" @click="compensate(e)">Bù Fresh Credit</button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="data && data.resolved.length" class="ops-card" aria-label="Đã xử lý">
      <h2 class="plan-h2">Đã xử lý gần đây</h2>
      <ul class="history" data-testid="ex-resolved">
        <li v-for="e in data.resolved" :key="e.id"><span class="mono">{{ e.orderId }}</span> · {{ EXCEPTION_KIND[e.kind] }} → <b>{{ RES[e.resolution.kind] }}</b><template v-if="e.resolution.kind === 'compensate'"> {{ fmt(e.resolution.compensationVnd) }}</template><template v-if="e.resolution.day"> ({{ fmtDay(e.resolution.day) }})</template> · {{ dt(e.resolution.at) }}</li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { EXCEPTION_KIND, ROUTE_STATUS, dt, logisticsError, routeLabel } from '../../logisticsUi';

const RES = { redeliver: 'Giao lại khung sau', hold_cold: 'Giữ lạnh', compensate: 'Bù Fresh Credit' };
const data = ref(null);
const board = ref(null);
const error = ref('');
const ok = ref('');
const pickOpt = reactive({});

async function load() {
  try {
    const [ex, rb] = await Promise.all([api.ops.logistics.exceptions(ctx.value), api.ops.routes.board(ctx.value, null)]);
    data.value = ex;
    for (const e of [...data.value.open, ...data.value.held]) if (!pickOpt[e.id] && e.redeliveryOptions.length) pickOpt[e.id] = e.redeliveryOptions[0].value;
    board.value = rb;
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 5000 });

const routeRows = computed(() =>
  board.value
    ? board.value.slots.flatMap((s) => s.routes.map((r) => ({
        id: r.id, label: routeLabel(r.id), slot: s.label, shipperName: r.shipperName, boxes: r.boxes, status: r.status,
        delivered: r.stops.filter((x) => x.status === 'delivered').length, failed: r.stops.filter((x) => x.status === 'failed').length
      })))
    : []
);

async function resolve(e, input, text) {
  error.value = '';
  ok.value = '';
  try {
    const r = await api.ops.logistics.resolveException(ctx.value, { id: e.id, ...input });
    ok.value = typeof text === 'function' ? text(r) : text;
  } catch (err) {
    error.value = logisticsError(err);
  }
  await load();
}

function redeliver(e) {
  const [day, slotId] = (pickOpt[e.id] || '').split('|');
  return resolve(e, { kind: 'redeliver', day, slotId }, `Đã xếp giao lại ${e.orderId}, khách được báo khung giờ mới. Lập tuyến cho khung đó để shipper giao.`);
}

function compensate(e) {
  return resolve(e, { kind: 'compensate' }, (r) => `Đã bù ${fmt(r.compensationVnd)} vào Fresh Credit của khách (đơn ${e.orderId}), khách được báo.`);
}
</script>
