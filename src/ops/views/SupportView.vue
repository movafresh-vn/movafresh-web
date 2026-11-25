<template>
  <section>
    <h1>Yêu cầu hỗ trợ khách hàng</h1>
    <p class="ops-muted">Chỉ admin được xem. Danh sách ghi nhận yêu cầu, chưa theo dõi trạng thái xử lý.</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <button class="ops-btn" type="button" :disabled="busy" @click="load()">Làm mới</button>
    <ul class="requests">
      <li v-for="r in rows" :key="r.id" class="ops-card">
        <strong>#{{ r.id }} · {{ labels[r.category] }}</strong>
        <p>Khách: {{ r.user_id }} · {{ fmtDeadline(new Date(r.created_at)) }}</p>
        <p class="message">{{ r.message }}</p>
      </li>
    </ul>
    <p v-if="loaded && !rows.length && !error" class="ops-muted">Chưa có yêu cầu.</p>
    <button v-if="cursor" class="ops-btn" type="button" :disabled="busy" @click="load(cursor)">Xem thêm</button>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../shared/api';
import { fmtDeadline } from '../../shared/utils/time';
import { ctx } from '../session';
import { financeError } from '../financeUi';

const labels = { address_change: 'Đổi địa chỉ', damaged_goods: 'Hàng hỏng', other: 'Khác' };
const rows = ref([]);
const cursor = ref(null);
const error = ref('');
const busy = ref(false);
const loaded = ref(false);

async function load(next = null) {
  busy.value = true;
  error.value = '';
  try {
    const data = await api.ops.supportRequests(ctx.value, next);
    rows.value = next ? [...rows.value, ...data.requests] : data.requests;
    cursor.value = data.next_cursor;
  } catch (e) {
    error.value = financeError(e);
  } finally {
    loaded.value = true;
    busy.value = false;
  }
}
load();
</script>

<style scoped>
.requests { list-style: none; padding: 0; display: grid; gap: 12px; }
.message { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
