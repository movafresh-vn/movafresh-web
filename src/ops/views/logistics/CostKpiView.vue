<template>
  <section>
    <h1>Chi phí &amp; KPI</h1>
    <p class="ops-muted proc-note">
      Chi phí logistics mỗi thùng = (xe chặng dài + kho phụ + chặng cuối) / số thùng của ngày giao. Con số này tự đẩy sang Tài chính (<code>db.logisticsCosts</code>). Số tiền chưa nhập dùng mức mặc định trong cấu hình và được đánh dấu "dự kiến".
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="ck-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="ck-ok">{{ ok }}</p>

    <section v-if="kpi" class="ops-card" aria-label="KPI">
      <h2 class="plan-h2">KPI (tất cả các ngày đã giao)</h2>
      <div class="ops-grid kpi-grid" data-testid="kpis">
        <div class="plan-kpi" data-kpi="onTime"><span class="ops-stat-n">{{ pctText(kpi.onTimePct) }}</span><span class="ops-muted">Đúng giờ <small>(giao trong khung)</small></span></div>
        <div class="plan-kpi" data-kpi="fail"><span class="ops-stat-n">{{ pctText(kpi.failPct) }}</span><span class="ops-muted">Giao thất bại <small>({{ kpi.failedAttempts }} lần hụt)</small></span></div>
        <div class="plan-kpi" data-kpi="pph"><span class="ops-stat-n">{{ dec(kpi.stopsPerHour) }}</span><span class="ops-muted">Điểm giao / giờ / tuyến</span></div>
        <div class="plan-kpi" data-kpi="spr"><span class="ops-stat-n">{{ dec(kpi.stopsPerRoute) }}</span><span class="ops-muted">Điểm giao / tuyến <small>(mục tiêu cao, ví dụ 15 thay vì 3)</small></span></div>
        <div class="plan-kpi" data-kpi="bpt"><span class="ops-stat-n">{{ dec(kpi.boxesPerTruck) }}</span><span class="ops-muted">Thùng / xe chặng dài</span></div>
        <div class="plan-kpi" data-kpi="cpb"><span class="ops-stat-n">{{ kpi.costPerBoxVnd == null ? '—' : fmt(kpi.costPerBoxVnd) }}</span><span class="ops-muted">Chi phí / thùng</span></div>
        <div class="plan-kpi" data-kpi="breach"><span class="ops-stat-n" :class="{ 'ops-error': kpi.tempBreaches }">{{ kpi.tempBreaches }}</span><span class="ops-muted">Lần vượt nhiệt</span></div>
        <div v-if="kpi.recovery.enabled" class="plan-kpi" data-kpi="recovery">
          <span class="ops-stat-n">{{ pctText(kpi.recoveryPct) }}</span>
          <span class="ops-muted">Thu hồi thùng xốp <small>({{ kpi.recovery.backFoam }} / {{ kpi.recovery.outFoam }} thùng, {{ kpi.recovery.backGel }} túi gel)</small></span>
        </div>
      </div>
      <p v-if="kpi.deliveredStops === 0" class="ops-muted">Chưa có điểm giao nào hoàn tất, các tỷ lệ hiện "—" cho tới khi shipper giao hàng.</p>
    </section>

    <section v-if="data && data.days.length" class="ops-card ops-noprint chips-card" aria-label="Ngày giao">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in data.days" :key="d" class="chip" :class="{ on: d === data.day }" :data-day="d" @click="pick(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
    </section>

    <template v-if="data && data.detail">
      <section class="ops-card" aria-label="Chi phí mỗi thùng">
        <div class="head-row">
          <h2 class="plan-h2">Chi phí ngày {{ fmtDay(data.day) }}</h2>
          <span class="ops-pill" :class="data.detail.status === 'final' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ data.detail.status === 'final' ? 'Đã chốt (mọi tuyến xong)' : 'Tạm tính (còn tuyến chưa xong)' }}</span>
        </div>
        <dl class="kv" data-testid="cost-summary">
          <div><dt>Số thùng</dt><dd>{{ data.detail.boxes }}</dd></div>
          <div><dt>Xe chặng dài</dt><dd>{{ fmt(data.detail.parts.longHaulVnd) }} <small class="ops-muted">({{ fmt(data.detail.perBox.longHaulVnd) }}/thùng)</small></dd></div>
          <div><dt>Kho phụ</dt><dd>{{ fmt(data.detail.parts.hubVnd) }} <small class="ops-muted">({{ fmt(data.detail.perBox.hubVnd) }}/thùng)</small></dd></div>
          <div><dt>Chặng cuối</dt><dd>{{ fmt(data.detail.parts.lastMileVnd) }} <small class="ops-muted">({{ fmt(data.detail.perBox.lastMileVnd) }}/thùng)</small></dd></div>
          <div><dt>Tổng</dt><dd>{{ fmt(data.detail.totalVnd) }}</dd></div>
          <div><dt>Chi phí logistics mỗi thùng</dt><dd class="strong-n" data-testid="cost-per-box">{{ fmt(data.detail.perBoxVnd) }}</dd></div>
        </dl>
      </section>

      <section class="ops-card" aria-label="Theo chuyến xe">
        <h2 class="plan-h2">Theo chuyến xe chặng dài</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="cost-trips">
            <thead><tr><th>Chuyến</th><th class="r">Thùng</th><th class="r">Chi phí</th><th class="r">Mỗi thùng</th><th></th></tr></thead>
            <tbody>
              <tr v-for="t in data.detail.trips" :key="t.scope"><td>{{ t.label }}</td><td class="r">{{ t.boxes }}</td><td class="r">{{ fmt(t.costVnd) }}</td><td class="r">{{ fmt(t.perBoxVnd) }}</td><td><span v-if="t.estimated" class="ops-pill ops-pill-warn">dự kiến</span></td></tr>
            </tbody>
          </table>
        </div>
        <p class="help">Nhập giá thật ở tab Chuyến xe.</p>
      </section>

      <form class="ops-card" novalidate aria-label="Chi phí kho phụ theo ngày" @submit.prevent="saveHub">
        <h2 class="plan-h2">Theo ngày kho phụ <span v-if="data.detail.hub.estimated" class="ops-pill ops-pill-warn">dự kiến</span></h2>
        <div class="field-grid">
          <div v-for="f in HUB_FIELDS" :key="f.k">
            <label :for="`h-${f.k}`">{{ f.label }} (đ)</label>
            <input :id="`h-${f.k}`" v-model.number="hub[f.k]" class="ops-input" type="number" min="0" inputmode="numeric" :data-testid="`hub-${f.k}`" />
          </div>
        </div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="hub-save">Lưu chi phí kho phụ ngày này</button>
      </form>

      <section class="ops-card" aria-label="Theo điểm giao">
        <h2 class="plan-h2">Theo tuyến và điểm giao</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="cost-routes">
            <thead><tr><th>Tuyến</th><th>Shipper</th><th class="r">Điểm giao</th><th class="r">Lần hụt</th><th class="r">Chi phí tuyến</th><th class="r">Mỗi điểm giao</th></tr></thead>
            <tbody>
              <tr v-for="r in data.detail.routes" :key="r.routeId"><td class="mono" :title="r.routeId">{{ routeLabel(r.routeId) }}</td><td>{{ shipperName(r.shipperId) }}</td><td class="r">{{ r.stops }}</td><td class="r">{{ r.failedAttempts }}</td><td class="r">{{ fmt(r.costVnd) }}</td><td class="r">{{ fmt(r.perStopVnd) }}</td></tr>
              <tr v-if="!data.detail.routes.length"><td colspan="6" class="ops-muted">Chưa lập tuyến nào cho ngày này.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="help">Chặng cuối = {{ fmt(data.defaults.lastMile.routeBaseVnd) }} mỗi tuyến + {{ fmt(data.defaults.lastMile.perStopVnd) }} mỗi điểm giao + {{ fmt(data.defaults.lastMile.perFailedAttemptVnd) }} mỗi lần giao hụt (giả định, chỉnh ở cấu hình).</p>
      </section>
    </template>

    <section v-if="data" class="ops-card" aria-label="Đã đẩy sang Tài chính">
      <h2 class="plan-h2">Đã đẩy sang Tài chính</h2>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="cost-published">
          <thead><tr><th>Ngày giao</th><th class="r">Thùng</th><th class="r">Tổng</th><th class="r">Mỗi thùng</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
          <tbody>
            <tr v-for="c in data.published" :key="c.day"><td>{{ shortDay(c.day) }}</td><td class="r">{{ c.boxes }}</td><td class="r">{{ fmt(c.totalVnd) }}</td><td class="r">{{ fmt(c.perBoxVnd) }}</td><td>{{ c.status === 'final' ? 'Đã chốt' : 'Tạm tính' }}</td><td>{{ dt(c.updatedAt) }}</td></tr>
            <tr v-if="!data.published.length"><td colspan="6" class="ops-muted">Chưa có ngày nào được tính chi phí (cần lập chuyến, lập tuyến hoặc nhập chi phí kho phụ).</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { shortDay } from '../../format';
import { dec, dt, logisticsError, pctText, routeLabel } from '../../logisticsUi';

const HUB_FIELDS = [
  { k: 'laborVnd', label: 'Nhân công kho' },
  { k: 'rentVnd', label: 'Thuê kho lạnh' },
  { k: 'iceVnd', label: 'Đá khô / túi gel' },
  { k: 'otherVnd', label: 'Chi phí khác' }
];

const data = ref(null);
const kpi = ref(null);
const error = ref('');
const ok = ref('');
const sel = ref(null);
const hub = reactive({ laborVnd: 0, rentVnd: 0, iceVnd: 0, otherVnd: 0 });
let hubFor = '';

const shipperName = (id) => (BUSINESS.logistics.shippers.find((s) => s.id === id) || {}).name || id;

async function load() {
  try {
    const [costs, k] = await Promise.all([api.ops.logistics.costs(ctx.value, sel.value), api.ops.logistics.kpis(ctx.value, {})]);
    data.value = costs;
    sel.value = data.value.day;
    data.value.defaults = { ...data.value.defaults };
    kpi.value = k;
    if (data.value.detail && hubFor !== data.value.day) {
      hubFor = data.value.day;
      for (const f of HUB_FIELDS) hub[f.k] = data.value.detail.hub[f.k] || 0;
    }
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 6000 });
watch(sel, () => { hubFor = ''; });

function pick(d) {
  sel.value = d;
  hubFor = '';
  load();
}

async function saveHub() {
  error.value = '';
  ok.value = '';
  try {
    await api.ops.logistics.saveHubCost(ctx.value, {
      day: data.value.day,
      laborVnd: Math.round(Number(hub.laborVnd) || 0), rentVnd: Math.round(Number(hub.rentVnd) || 0), iceVnd: Math.round(Number(hub.iceVnd) || 0), otherVnd: Math.round(Number(hub.otherVnd) || 0)
    });
    ok.value = 'Đã lưu chi phí kho phụ và cập nhật chi phí mỗi thùng.';
    hubFor = '';
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}
</script>
