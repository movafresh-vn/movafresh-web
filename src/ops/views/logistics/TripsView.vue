<template>
  <section>
    <h1>Chuyến xe chặng dài</h1>
    <p class="ops-muted proc-note">
      Xe lạnh Đắk Lắk → kho phụ TP.HCM. Lập chuyến (nhà xe, biển số, sức chứa, chi phí); bảng kê thùng do xưởng quét lên xe; nhiệt độ ghi ở bốn mốc (xuất xưởng, nhận kho phụ, xuất kho phụ, lúc giao).
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="trip-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="trip-ok">{{ ok }}</p>

    <section v-if="data" class="ops-card ops-noprint chips-card" aria-label="Ngày giao">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in data.days" :key="d" class="chip" :class="{ on: d === data.day }" :data-day="d" @click="pick(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
    </section>

    <section v-for="t in data ? data.trips : []" :key="t.scope" class="ops-card trip-card2" :data-trip="t.tripId">
      <div class="head-row">
        <h2 class="plan-h2">{{ t.label }} · xe rời {{ hhmm(t.defaultDepartAt) }}</h2>
        <span class="ops-pill" :class="STATUS[t.status].pill" :data-status="t.status">{{ STATUS[t.status].label }}</span>
      </div>
      <dl class="kv">
        <div><dt>Số thùng chở</dt><dd>{{ t.boxes }} / {{ t.capacity }} <span v-if="t.overCapacity" class="ops-pill ops-pill-bad">vượt {{ t.overCapacity }} thùng</span></dd></div>
        <div><dt>Đã lên xe</dt><dd>{{ t.loaded }} / {{ t.boxes }}</dd></div>
        <div><dt>Giờ xuất bến</dt><dd>{{ t.depart ? dt(t.depart.at) : 'Chưa xuất' }}</dd></div>
        <div><dt>Số niêm phong</dt><dd class="mono">{{ t.depart ? t.depart.sealNo : '—' }}</dd></div>
        <div><dt>Chi phí chuyến</dt><dd>{{ fmt(t.costVnd) }} <small v-if="t.costEstimated" class="ops-muted">(mặc định, chưa nhập)</small></dd></div>
        <div><dt>Chi phí mỗi thùng của chuyến</dt><dd>{{ fmt(t.perBoxVnd) }}</dd></div>
      </dl>

      <h3>Nhiệt độ ở các mốc</h3>
      <ul class="temp-line" :data-testid="`temps-${t.tripId}`">
        <li :class="pointClass(t.points.factory_depart)"><b>Xuất xưởng</b> {{ pointText(t.points.factory_depart) }}</li>
        <li :class="pointClass(t.points.hub_receive)"><b>Nhận kho phụ</b> {{ pointText(t.points.hub_receive) }}</li>
        <li class="pt-na"><b>Xuất kho phụ</b> theo từng tuyến (xem tab Chuỗi lạnh)</li>
        <li class="pt-na"><b>Lúc giao</b> theo từng thùng (xem tab Chuỗi lạnh)</li>
      </ul>
      <p v-if="t.depart && t.depart.missing.length" class="ops-error">Xưởng xuất bến thiếu {{ t.depart.missing.length }} thùng: {{ t.depart.missing.join(', ') }}</p>
      <p v-if="t.arrival" class="ops-muted">
        Kho phụ nhận lúc {{ dt(t.arrival.closedAt) }}:
        <template v-if="t.arrival.missing.length"><b class="ops-error">thiếu {{ t.arrival.missing.length }}</b>, </template>
        <template v-if="t.arrival.damaged.length"><b class="ops-error">hỏng {{ t.arrival.damaged.length }}</b>, </template>
        <template v-if="t.arrival.extra.length"><b class="ops-error">thừa {{ t.arrival.extra.length }}</b>, </template>
        đủ {{ t.manifest.filter((m) => m.arrival === 'ok').length }} thùng.
      </p>

      <h3>Lập chuyến</h3>
      <form v-if="forms[t.scope]" class="field-grid" novalidate @submit.prevent="save(t)">
        <div>
          <label :for="`car-${t.tripId}`">Nhà xe</label>
          <input :id="`car-${t.tripId}`" v-model="forms[t.scope].carrier" class="ops-input" list="carriers" autocomplete="off" data-testid="trip-carrier" />
          <datalist id="carriers"><option v-for="c in data.carriers" :key="c.id" :value="c.name" /></datalist>
        </div>
        <div>
          <label :for="`plate-${t.tripId}`">Biển số xe</label>
          <input :id="`plate-${t.tripId}`" v-model="forms[t.scope].plate" class="ops-input mono" autocomplete="off" placeholder="47C-123.45" data-testid="trip-plate" />
        </div>
        <div>
          <label :for="`cap-${t.tripId}`">Sức chứa xe (thùng)</label>
          <input :id="`cap-${t.tripId}`" v-model.number="forms[t.scope].capacityBoxes" class="ops-input" type="number" min="1" inputmode="numeric" data-testid="trip-cap" />
        </div>
        <div>
          <label :for="`cost-${t.tripId}`">Chi phí chuyến (đ)</label>
          <input :id="`cost-${t.tripId}`" v-model.number="forms[t.scope].costVnd" class="ops-input" type="number" min="0" inputmode="numeric" data-testid="trip-cost" />
        </div>
        <div>
          <label :for="`note-${t.tripId}`">Ghi chú</label>
          <input :id="`note-${t.tripId}`" v-model="forms[t.scope].note" class="ops-input" />
        </div>
        <div class="trip-save"><button class="ops-btn ops-btn-primary" type="submit" data-testid="trip-save">{{ t.record ? 'Cập nhật chuyến' : 'Lập chuyến' }}</button></div>
      </form>
      <p v-if="t.record" class="ops-muted">Đã lập: {{ t.record.carrier }} · biển số <span class="mono">{{ t.record.plate }}</span> · sức chứa {{ t.record.capacityBoxes }} thùng.</p>

      <details class="impact-group" :open="t.boxes <= 12">
        <summary><strong>Bảng kê thùng ({{ t.manifest.length }})</strong> <span class="ops-muted">xưởng quét lên xe, kho phụ đối chiếu khi nhận</span></summary>
        <div class="ops-table-wrap">
          <table class="ops-table" :data-testid="`manifest-${t.tripId}`">
            <thead><tr><th>Mã đơn</th><th>Khu</th><th>Khung giờ</th><th class="r">Túi</th><th>Lên xe</th><th>Kho phụ nhận</th></tr></thead>
            <tbody>
              <tr v-for="m in t.manifest" :key="m.orderId">
                <td class="mono">{{ m.orderId }}</td><td>{{ zoneName(m.zoneId) }}</td><td>{{ slotLabel(m.zoneId, m.slotId) }}</td><td class="r">{{ m.bags }}</td>
                <td>{{ m.loadedAt ? hhmm(m.loadedAt) : '—' }}</td>
                <td><span v-if="m.arrival" class="ops-pill" :class="m.arrival === 'ok' ? 'ops-pill-ok' : 'ops-pill-bad'">{{ ARR[m.arrival] }}</span><span v-else class="ops-muted">—</span></td>
              </tr>
              <tr v-if="!t.manifest.length"><td colspan="6" class="ops-muted">Chuyến này chưa có thùng.</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </section>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { hhmm, shortDay } from '../../format';
import { dt, logisticsError, tempText } from '../../logisticsUi';
import { slotLabel, zoneName } from '../../factoryStore';

const STATUS = {
  unplanned: { label: 'Chưa lập chuyến', pill: 'ops-pill-warn' },
  planned: { label: 'Đã lập chuyến', pill: '' },
  loading: { label: 'Đang bốc hàng', pill: 'ops-pill-warn' },
  departed: { label: 'Đã xuất bến', pill: 'ops-pill-ok' },
  arrived: { label: 'Đã tới kho phụ', pill: 'ops-pill-ok' }
};
const ARR = { ok: 'Đủ', damaged: 'Hỏng', missing: 'Thiếu' };

const data = ref(null);
const error = ref('');
const ok = ref('');
const sel = ref(null);
const forms = reactive({});

async function load() {
  try {
    data.value = await api.ops.logistics.trips(ctx.value, sel.value);
    sel.value = data.value.day;
    for (const t of data.value.trips) {
      if (!forms[t.scope]) {
        forms[t.scope] = {
          carrier: t.record ? t.record.carrier : data.value.carriers[0].name,
          plate: t.record ? t.record.plate : '',
          capacityBoxes: t.record ? t.record.capacityBoxes : data.value.defaults.capacityBoxes,
          costVnd: t.record ? t.record.costVnd : data.value.defaults.costVnd,
          note: t.record ? t.record.note : ''
        };
      }
    }
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 8000 });

function pick(d) {
  sel.value = d;
  load();
}

async function save(t) {
  error.value = '';
  ok.value = '';
  try {
    const f = forms[t.scope];
    await api.ops.logistics.saveTrip(ctx.value, { day: data.value.day, tripId: t.tripId, ...f, capacityBoxes: Number(f.capacityBoxes), costVnd: Number(f.costVnd) });
    ok.value = `Đã lưu ${t.label}.`;
    delete forms[t.scope];
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}

const pointText = (list) => (list.length ? list.map((p) => `${p.cls === 'frozen' ? 'đông ' : ''}${tempText(p.tempC)}${p.ok ? '' : ' (vượt ngưỡng)'}`).join(' · ') : 'chưa có số đo');
const pointClass = (list) => (!list.length ? 'pt-na' : list.every((p) => p.ok) ? 'pt-ok' : 'pt-bad');
</script>
