<template>
  <section>
    <h1>Yêu cầu hỗ trợ khách hàng</h1>
    <p class="ops-muted">Chỉ admin được xem và phản hồi. Mọi cập nhật trạng thái và phản hồi đều lưu lịch sử người xử lý và thông báo tới đúng khách hàng.</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <button class="ops-btn" type="button" :disabled="busy" @click="load()">Làm mới</button>
    <ul class="requests">
      <li v-for="r in rows" :key="r.id" class="ops-card">
        <strong>#{{ r.id }} · {{ labels[r.category] }} · {{ statusLabels[r.status] || r.status }}</strong>
        <p>Khách: {{ r.user_id }} · {{ fmtDeadline(new Date(r.created_at)) }}</p>
        <p class="message">{{ r.message }}</p>
        <p v-if="r.reply_message" class="ops-muted">
          Phản hồi gần nhất ({{ r.handled_at ? fmtDeadline(new Date(r.handled_at)) : '' }}): {{ r.reply_message }}
        </p>
        <form class="reply-form" @submit.prevent="sendReply(r)">
          <select v-model="drafts[r.id].status" class="ops-input" :disabled="saving[r.id]">
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã xử lý</option>
          </select>
          <textarea v-model.trim="drafts[r.id].reply_message" class="ops-input" maxlength="2000" placeholder="Nhập kết quả phản hồi gửi khách..." required :disabled="saving[r.id]" />
          <p v-if="rowErrors[r.id]" class="ops-error" role="alert">{{ rowErrors[r.id] }}</p>
          <p v-if="rowOk[r.id]" role="status">{{ rowOk[r.id] }}</p>
          <button class="ops-btn primary" type="submit" :disabled="saving[r.id] || !drafts[r.id].reply_message">
            {{ saving[r.id] ? 'Đang gửi...' : 'Cập nhật & thông báo khách' }}
          </button>
        </form>
      </li>
    </ul>
    <p v-if="loaded && !rows.length && !error" class="ops-muted">Chưa có yêu cầu.</p>
    <button v-if="cursor" class="ops-btn" type="button" :disabled="busy" @click="load(cursor)">Xem thêm</button>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../shared/api';
import { newKey } from '../../shared/api/http';
import { fmtDeadline } from '../../shared/utils/time';
import { ctx } from '../session';
import { financeError } from '../financeUi';

const labels = { address_change: 'Đổi địa chỉ', damaged_goods: 'Hàng hỏng', other: 'Khác' };
const statusLabels = { open: 'Chờ tiếp nhận', in_progress: 'Đang xử lý', resolved: 'Đã xử lý' };
const rows = ref([]);
const cursor = ref(null);
const error = ref('');
const busy = ref(false);
const loaded = ref(false);
const drafts = reactive({});
const saving = reactive({});
const rowErrors = reactive({});
const rowOk = reactive({});
const pendingKeys = {};

function ensureDraft(r) {
  if (!drafts[r.id]) {
    drafts[r.id] = { status: r.status === 'resolved' ? 'resolved' : 'in_progress', reply_message: r.reply_message || '' };
  }
}

async function load(next = null) {
  busy.value = true;
  error.value = '';
  try {
    const data = await api.ops.supportRequests(ctx.value, next);
    rows.value = next ? [...rows.value, ...data.requests] : data.requests;
    for (const r of rows.value) ensureDraft(r);
    cursor.value = data.next_cursor;
  } catch (e) {
    error.value = financeError(e);
  } finally {
    loaded.value = true;
    busy.value = false;
  }
}

async function sendReply(r) {
  const d = drafts[r.id];
  if (!d || !d.reply_message || saving[r.id]) return;
  saving[r.id] = true;
  rowErrors[r.id] = '';
  rowOk[r.id] = '';
  pendingKeys[r.id] ||= newKey();
  try {
    const res = await api.ops.replySupportRequest(ctx.value, {
      id: r.id,
      status: d.status,
      reply_message: d.reply_message,
      key: pendingKeys[r.id]
    });
    r.status = res.status;
    r.reply_message = res.reply_message;
    r.handled_by = res.handled_by;
    r.handled_by_role = res.handled_by_role;
    r.handled_at = res.handled_at;
    delete pendingKeys[r.id];
    rowOk[r.id] = 'Đã cập nhật trạng thái và gửi thông báo tới khách hàng.';
  } catch (e) {
    rowErrors[r.id] = financeError(e);
  } finally {
    saving[r.id] = false;
  }
}
load();
</script>

<style scoped>
.requests { list-style: none; padding: 0; display: grid; gap: 12px; }
.message { white-space: pre-wrap; overflow-wrap: anywhere; }
.reply-form { display: grid; gap: 8px; margin-top: 8px; }
</style>
