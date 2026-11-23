<template>
  <section>
    <h1>Dự báo 4 tuần gửi nhà cung cấp</h1>
    <p class="ops-muted proc-note">{{ data ? data.note : '' }} Số lượng là nguyên liệu thô cần đặt (đã tính tỷ lệ thu hồi sơ chế và dự phòng hao hụt).</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="fc-msg">{{ msg }}</p>
    <template v-if="data">
      <div class="ops-actions ops-noprint">
        <button v-if="canWrite" class="ops-btn ops-btn-primary" data-testid="fc-send" @click="send">Gửi dự báo cho mọi nhà cung cấp</button>
      </div>
      <section v-for="s in data.suppliers" :key="s.supplierId" class="ops-card" :data-fc="s.supplierId">
        <div class="head-row">
          <h2>{{ s.supplierName }}</h2>
          <span class="ops-pill" :class="s.lastSentAt ? 'ops-pill-ok' : 'ops-pill-warn'">{{ s.lastSentAt ? `Đã gửi ${fmtDeadline(new Date(s.lastSentAt))}` : 'Chưa gửi' }}</span>
        </div>
        <div class="ops-table-wrap">
          <table class="ops-table week-table">
            <thead>
              <tr>
                <th>{{ s.rows.length ? 'Mặt hàng' : 'Số thùng' }}</th>
                <th v-for="(w, i) in s.weeks" :key="w.start" class="r">Tuần {{ i + 1 }}<small>{{ dm(w.start) }}–{{ dm(w.end) }}</small></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in s.rows" :key="r.sku"><td>{{ r.name }} <small class="mono">{{ r.unit }}</small></td><td v-for="(q, i) in r.qty" :key="i" class="r">{{ q ? q.toLocaleString('vi-VN') : '—' }}</td></tr>
              <tr v-if="!s.rows.length"><td>Thùng giao trong tuần</td><td v-for="(b, i) in s.boxes" :key="i" class="r">{{ b }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx, session } from '../../session';
import { useLive } from '../../useLive';
import { dm } from '../../format';

const data = ref(null);
const error = ref('');
const msg = ref('');
const canWrite = computed(() => Boolean(session.value && ['purchasing', 'admin'].includes(session.value.role)));

async function load() {
  try {
    data.value = await api.ops.procurement.forecast(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 10000 });

async function send() {
  try {
    const r = await api.ops.procurement.sendForecast(ctx.value);
    msg.value = `Đã gửi dự báo cho ${r.sent.length} nhà cung cấp. Họ xem trên cổng nhà cung cấp, không ràng buộc mua.`;
    error.value = '';
    await load();
  } catch (e) {
    error.value = e.message;
  }
}
</script>
