<template>
  <section class="late">
    <h1>Thanh toán muộn</h1>
    <p class="ops-muted">
      Tiền về <strong>sau khi lô giao đã khóa</strong> không tự vào lô. Admin quyết định: nhận vào lô (khi lô còn ở trạng thái Đã chốt và chu kỳ còn chỗ)
      hoặc từ chối để đơn dời sang ngày giao kế tiếp còn chỗ, tiền đi theo đơn. Không còn ngày nào thì hoàn vào Fresh Credit. Khách được báo mọi quyết định.
      Nếu chưa ai quyết định tới lúc bắt đầu sơ chế, hệ thống tự xử lý như từ chối.
    </p>

    <div class="chips" role="tablist" aria-label="Lọc theo trạng thái">
      <button v-for="f in FILTERS" :key="f.key" class="chip" :class="{ on: filter === f.key }" :data-filter="f.key" @click="setFilter(f.key)">{{ f.label }}</button>
    </div>

    <p v-if="error" class="ops-error" role="alert" data-testid="late-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="late-msg">{{ msg }}</p>

    <ul class="late-list" data-testid="late-list">
      <li v-for="ex in rows" :key="ex.id" class="ops-card late-row" :data-exception="ex.id">
        <header>
          <strong>Khoản #{{ ex.id }}</strong>
          <span class="ops-pill" :class="isPending(ex) ? 'ops-pill-warn' : 'ops-pill-ok'" data-testid="late-status">{{ statusLabel(ex.status) }}</span>
        </header>
        <dl class="late-meta">
          <div><dt>Số tiền</dt><dd>{{ fmt(ex.amount_vnd) }}</dd></div>
          <div><dt>Nguồn</dt><dd>{{ sourceLabel(ex.source) }}</dd></div>
          <div><dt>Lô</dt><dd class="mono">{{ ex.batch_id }}</dd></div>
          <div><dt>Về lúc</dt><dd>{{ fmtDeadline(new Date(ex.created_at)) }}</dd></div>
        </dl>
        <p v-if="ex.reason" class="ops-muted">Lý do: {{ ex.reason }}</p>

        <template v-if="isPending(ex)">
          <label :for="`late-reason-${ex.id}`">Lý do quyết định (ghi nhật ký)</label>
          <input :id="`late-reason-${ex.id}`" v-model="reasons[ex.id]" class="ops-input" autocomplete="off" data-testid="late-reason" />
          <div class="ops-actions">
            <button class="ops-btn ops-btn-primary" :disabled="busyId === ex.id" data-testid="late-accept" @click="decide(ex, 'accept')">Nhận vào lô</button>
            <button class="ops-btn ops-btn-danger" :disabled="busyId === ex.id" data-testid="late-reject" @click="decide(ex, 'reject')">Từ chối (dời ngày / hoàn Fresh Credit)</button>
          </div>
        </template>
        <p v-else class="ops-muted" data-testid="late-outcome">{{ OUTCOME_TEXT[ex.status] }}</p>
      </li>
      <li v-if="loaded && !rows.length" class="ops-muted" data-testid="late-empty">Không có khoản nào.</li>
    </ul>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { fmtDeadline } from '../../shared/utils/time';
import { ctx } from '../session';
import { useLive } from '../useLive';
import { OUTCOME_TEXT, decisionError, isPending, outcomeText, sourceLabel, statusLabel } from '../latePayments';

const FILTERS = [
  { key: 'pending_review', label: 'Chờ duyệt' },
  { key: 'all', label: 'Tất cả' }
];

const filter = ref('pending_review');
const list = ref([]);
const loaded = ref(false);
const error = ref('');
const msg = ref('');
const busyId = ref(0);
const reasons = reactive({});

const rows = computed(() => list.value);

async function load() {
  try {
    list.value = await api.ops.paymentExceptions.list(ctx.value, filter.value === 'all' ? null : filter.value);
    error.value = '';
  } catch (e) {
    error.value = decisionError(e);
  } finally {
    loaded.value = true;
  }
}

function setFilter(f) {
  filter.value = f;
  return load();
}

async function decide(ex, kind) {
  const reason = String(reasons[ex.id] || '').trim();
  if (!reason) {
    error.value = 'Nhập lý do quyết định.';
    return;
  }
  busyId.value = ex.id;
  error.value = '';
  msg.value = '';
  try {
    const r = kind === 'accept' ? await api.ops.paymentExceptions.accept(ctx.value, ex.id, reason) : await api.ops.paymentExceptions.reject(ctx.value, ex.id, reason);
    msg.value = `Khoản #${ex.id}: ${outcomeText(r) || 'đã xử lý.'}`;
    reasons[ex.id] = '';
  } catch (e) {
    error.value = decisionError(e);
  } finally {
    busyId.value = 0;
    await load();
  }
}

useLive(load, { every: 6000 });
</script>

<style scoped>
.late-list { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 12px; }
.late-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin: 8px 0; }
.late-meta dt { font-size: 12px; color: var(--muted, #666); }
.late-meta dd { margin: 0; font-weight: 600; }
.late-row header { display: flex; align-items: center; gap: 8px; }
</style>
