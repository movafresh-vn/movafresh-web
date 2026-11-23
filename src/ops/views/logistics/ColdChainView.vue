<template>
  <section>
    <h1>Chuỗi lạnh</h1>
    <p class="ops-muted proc-note">
      Nhiệt độ ghi ở bốn mốc: xuất xưởng, nhận kho phụ, xuất kho phụ, lúc giao. Ngưỡng: ngăn mát {{ t.chill.min }}–{{ t.chill.max }}°C, ngăn đông ≤ {{ t.frozen.max }}°C.
      Số đo vượt ngưỡng thành cảnh báo; QC quyết định <b>giữ</b> hoặc <b>hủy</b>. Hủy thì mỗi thùng bị ảnh hưởng thành một ngoại lệ để điều phối giao lại hoặc bù.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="cc-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="cc-ok">{{ ok }}</p>

    <section v-if="data && data.days.length" class="ops-card ops-noprint chips-card" aria-label="Ngày giao">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in data.days" :key="d" class="chip" :class="{ on: d === data.day }" :data-day="d" @click="pick(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
    </section>

    <section v-if="data" class="ops-card" aria-label="Bốn mốc nhiệt độ">
      <h2 class="plan-h2">Bốn mốc nhiệt độ</h2>
      <ol class="chain cc-points" data-testid="cc-points">
        <li v-for="p in data.points" :key="p.point" :data-point="p.point">
          <p class="chain-title">{{ p.label }}</p>
          <p v-if="!byPoint[p.point].length" class="ops-muted">Chưa có số đo</p>
          <div v-else class="cc-pts">
            <span v-for="r in byPoint[p.point].slice(0, 6)" :key="r.id" class="ops-pill" :class="r.ok ? 'ops-pill-ok' : 'ops-pill-bad'">
              {{ r.cls === 'frozen' ? 'Đông' : 'Mát' }} {{ tempText(r.tempC) }}
            </span>
            <small v-if="byPoint[p.point].length > 6" class="ops-muted">+{{ byPoint[p.point].length - 6 }} số đo nữa</small>
          </div>
        </li>
      </ol>
    </section>

    <section class="ops-card" aria-label="Cảnh báo vượt ngưỡng">
      <h2 class="plan-h2">Cảnh báo vượt ngưỡng ({{ data ? data.alerts.length : 0 }})</h2>
      <p v-if="data && !data.alerts.length" class="ops-ok" data-testid="cc-none">Không có số đo nào vượt ngưỡng trong ngày này.</p>
      <div class="card-list">
        <article v-for="a in data ? data.alerts : []" :key="a.id" class="item-card" :class="{ attention: !a.decision }" :data-alert="a.id" :data-point="a.point">
          <div class="head-row">
            <h3>{{ a.pointLabel }} · {{ a.clsLabel }} <span class="ops-error">{{ tempText(a.tempC) }}</span></h3>
            <span class="ops-muted">{{ dt(a.at) }}</span>
          </div>
          <p>Ngưỡng {{ a.limit }} · {{ a.status === 'high' ? 'cao hơn ngưỡng' : 'thấp hơn ngưỡng' }} · ảnh hưởng {{ a.orders }} thùng ({{ refLabel(a) }}).</p>
          <template v-if="!a.decision">
            <label :for="`n-${a.id}`">Ghi chú của QC</label>
            <input :id="`n-${a.id}`" v-model="notes[a.id]" class="ops-input ops-input-sm" placeholder="Kiểm tra mùi, màu, nhiệt độ lõi…" />
            <div class="btn-row">
              <button class="ops-btn ops-btn-primary" type="button" data-testid="cc-keep" @click="decide(a, 'keep')">QC: Giữ hàng</button>
              <button class="ops-btn ops-btn-danger" type="button" data-testid="cc-discard" @click="decide(a, 'discard')">QC: Hủy hàng</button>
            </div>
          </template>
          <p v-else data-testid="cc-decided">
            <span class="ops-pill" :class="a.decision.decision === 'keep' ? 'ops-pill-ok' : 'ops-pill-bad'">QC {{ a.decision.decision === 'keep' ? 'giữ hàng' : 'hủy hàng' }}</span>
            {{ a.decision.note }} · {{ dt(a.decision.at) }}
          </p>
        </article>
      </div>
    </section>

    <section v-if="data" class="ops-card" aria-label="Mọi số đo">
      <h2 class="plan-h2">Mọi số đo trong ngày ({{ data.readings.length }})</h2>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="cc-readings">
          <thead><tr><th>Mốc</th><th>Tham chiếu</th><th>Ngăn</th><th class="r">Nhiệt độ</th><th>Giờ</th><th>Kết quả</th></tr></thead>
          <tbody>
            <tr v-for="r in data.readings" :key="r.id" :class="{ 'row-bad': !r.ok }">
              <td>{{ r.pointLabel }}</td><td class="mono">{{ r.ref }}</td><td>{{ r.clsLabel }}</td><td class="r">{{ tempText(r.tempC) }}</td><td>{{ dt(r.at) }}</td>
              <td><span class="ops-pill" :class="r.ok ? 'ops-pill-ok' : 'ops-pill-bad'">{{ r.ok ? 'Đạt' : 'Vượt ngưỡng ' + r.limit }}</span></td>
            </tr>
            <tr v-if="!data.readings.length"><td colspan="6" class="ops-muted">Chưa có số đo nào.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { shortDay } from '../../format';
import { dt, logisticsError, tempText } from '../../logisticsUi';

const t = BUSINESS.temperature;
const data = ref(null);
const error = ref('');
const ok = ref('');
const sel = ref(null);
const notes = reactive({});

async function load() {
  try {
    data.value = await api.ops.logistics.coldChain(ctx.value, { day: sel.value });
    sel.value = data.value.day;
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 6000 });

const byPoint = computed(() => {
  const out = { factory_depart: [], hub_receive: [], hub_dispatch: [], delivery: [] };
  for (const r of data.value ? data.value.readings : []) out[r.point].push(r);
  return out;
});

const refLabel = (a) => (a.point === 'delivery' ? `đơn ${a.ref}` : a.point === 'hub_dispatch' ? `tuyến ${a.ref}` : `chuyến ${String(a.ref).replace('|', ' · ')}`);

function pick(d) {
  sel.value = d;
  load();
}

async function decide(a, decision) {
  error.value = '';
  ok.value = '';
  try {
    const r = await api.ops.logistics.decideCold(ctx.value, { id: a.id, decision, note: notes[a.id] || '' });
    ok.value = decision === 'keep' ? 'QC đã quyết định giữ hàng.' : `QC đã quyết định hủy hàng; ${r.exceptions.length} thùng thành ngoại lệ chờ điều phối.`;
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}
</script>
