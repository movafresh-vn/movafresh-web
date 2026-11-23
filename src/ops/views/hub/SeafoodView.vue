<template>
  <section>
    <h1>Ghép hải sản</h1>
    <p class="ops-muted proc-note">
      Hải sản mua ở cảng Vũng Tàu / Phan Thiết nên ghép tại kho phụ, không đi xe từ Đắk Lắk. Với mỗi thùng có hải sản: bỏ túi hải sản vào thùng, tích từng túi, rồi chốt thùng.
      Kho tự trừ tồn theo lô hết hạn sớm nhất (FEFO) và ghi lô đã dùng để truy xuất.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="sf-error">{{ error }}</p>

    <section v-if="data && data.days.length" class="ops-card ops-noprint chips-card" aria-label="Ngày giao">
      <div class="daytrip-row">
        <span class="daytrip-label">Ngày giao</span>
        <div class="chips">
          <button v-for="d in data.days" :key="d" class="chip" :class="{ on: d === data.day }" :data-day="d" @click="pick(d)">{{ shortDay(d) }}</button>
        </div>
      </div>
    </section>
    <section v-else-if="data" class="ops-card" data-testid="sf-none">
      <h2>Chưa có ngày nào chốt sổ</h2>
      <p class="ops-muted">Ghép hải sản cho các đơn đã chốt sổ và đã về kho phụ.</p>
    </section>

    <section v-if="data && data.day" class="ops-card" aria-label="Tiến độ">
      <h2 class="plan-h2">{{ data.orders.length }} thùng có hải sản · đã ghép {{ data.packed }}</h2>
      <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: data.orders.length ? Math.round((data.packed / data.orders.length) * 100) + '%' : '0%' }"></div></div>
      <p v-if="!data.orders.length" class="ops-muted">Ngày này không có thùng nào có hải sản.</p>
    </section>

    <section v-for="o in data ? data.orders : []" :key="o.orderId" class="ops-card sf-order" :class="{ done: o.packed }" :data-order="o.orderId">
      <div class="head-row">
        <h3 class="mono">{{ o.orderId }}</h3>
        <span class="ops-muted">{{ o.zoneName }} · {{ o.slotLabel }}</span>
        <span v-if="o.packed" class="ops-pill ops-pill-ok">Đã ghép xong</span>
        <span v-else-if="!o.atHub" class="ops-pill ops-pill-bad" :data-wait="o.arrival">{{ ARRIVAL[o.arrival] }}</span>
        <span v-else-if="o.complete" class="ops-pill ops-pill-warn">Đủ túi, chờ chốt</span>
        <span v-else class="ops-pill ops-pill-warn">Đang ghép</span>
      </div>
      <ul class="count-list">
        <li v-for="it in o.items" :key="it.key" class="sf-item" :class="{ 'count-done': it.done >= it.bags }">
          <div class="count-name"><strong>{{ it.name }}</strong><StickerTag :temp="it.temp" /></div>
          <div class="ops-muted">{{ it.bags }} túi × {{ it.bagGrams }}g</div>
          <div class="sf-count" :aria-label="`Đã tích ${it.done} trên ${it.bags} túi`"><span class="count-done-n" data-testid="sf-done">{{ it.done }}</span> / {{ it.bags }}</div>
          <div v-if="!o.packed" class="btn-row sf-actions">
            <button class="ops-btn count-btn" type="button" :disabled="!o.atHub || it.done <= 0" data-testid="sf-minus" @click="tick(o, it, it.done - 1)">−1</button>
            <button class="ops-btn count-btn ops-btn-primary" type="button" :disabled="!o.atHub || it.done >= it.bags" data-testid="sf-plus" @click="tick(o, it, it.done + 1)">+1 túi</button>
            <button class="ops-btn count-btn" type="button" :disabled="!o.atHub || it.done >= it.bags" data-testid="sf-full" @click="tick(o, it, it.bags)">Đủ</button>
          </div>
        </li>
      </ul>
      <div v-if="!o.packed" class="btn-row">
        <button class="ops-btn ops-btn-primary" type="button" :disabled="!o.atHub || !o.complete" data-testid="sf-close" @click="closeBox(o)">Chốt thùng hải sản</button>
      </div>
      <p v-else class="ops-muted">
        Lô đã dùng: <template v-if="o.lots.length"><span v-for="(l, i) in o.lots" :key="l.lotCode + i" class="mono">{{ i ? ', ' : '' }}{{ l.lotCode }} ({{ l.qty }} kg)</span></template><template v-else>không trừ tồn kho</template>.
        <b v-if="o.shortKg" class="ops-error"> Tồn kho thiếu {{ o.shortKg }} kg so với đơn (kiểm kê lại tồn).</b>
      </p>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { shortDay } from '../../format';
import { logisticsError } from '../../logisticsUi';
import StickerTag from '../../components/StickerTag.vue';

const ARRIVAL = { waiting: 'Thùng chưa về kho phụ', missing: 'Thùng thiếu', damaged: 'Thùng hỏng', ok: 'Đã về kho phụ' };
const data = ref(null);
const error = ref('');
const sel = ref(null);

async function load() {
  try {
    data.value = await api.ops.hub.seafood(ctx.value, sel.value);
    sel.value = data.value.day;
  } catch (e) {
    error.value = logisticsError(e);
  }
}
useLive(load, { every: 7000 });

function pick(d) {
  sel.value = d;
  load();
}

async function act(fn) {
  error.value = '';
  try {
    await fn();
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}
const tick = (o, it, count) => act(() => api.ops.hub.tickSeafood(ctx.value, { orderId: o.orderId, key: it.key, count }));
const closeBox = (o) => act(() => api.ops.hub.closeSeafood(ctx.value, { orderId: o.orderId }));
</script>
