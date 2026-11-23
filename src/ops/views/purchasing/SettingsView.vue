<template>
  <section>
    <h1>Cài đặt mua hàng</h1>
    <p class="ops-muted proc-note">Mẫu bảng kê thu mua nông sản không hóa đơn do kế toán chọn. Hệ thống không viết cứng một mẫu: đổi lựa chọn ở đây thì các bảng kê lập sau theo mẫu mới, bảng kê đã lập giữ mẫu lúc lập.</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="set-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="set-msg">{{ msg }}</p>
    <section v-if="data" class="ops-card">
      <h2>Mẫu bảng kê thu mua</h2>
      <p v-if="!data.canEdit" class="alert alert-warn" data-testid="set-readonly">Bạn chỉ xem được. Kế toán hoặc admin mới đổi được mẫu.</p>
      <form novalidate @submit.prevent="save">
        <label v-for="t in data.templates" :key="t.id" class="check-row tpl" :data-template="t.id">
          <input v-model="form.statementTemplate" type="radio" name="tpl" :value="t.id" :disabled="!data.canEdit" />
          <span>
            <strong>{{ t.label }}</strong>
            <span class="ops-pill" :class="t.confirmed ? 'ops-pill-ok' : 'ops-pill-warn'">{{ t.confirmed ? 'Kế toán đã xác nhận' : 'Chờ kế toán xác nhận còn hiệu lực' }}</span>
            <small class="ops-muted">Tiêu đề: {{ t.title }}</small>
            <small v-if="t.legalNote" class="ops-muted">{{ t.legalNote }}</small>
          </span>
        </label>
        <template v-if="form.statementTemplate === 'custom'">
          <label for="s-title">Tiêu đề bảng kê</label>
          <input id="s-title" v-model="form.customTitle" class="ops-input" :disabled="!data.canEdit" data-testid="set-title" />
          <label for="s-note">Ghi chú / căn cứ pháp lý in cuối bảng kê</label>
          <textarea id="s-note" v-model="form.customNote" class="ops-input ops-textarea" rows="2" :disabled="!data.canEdit" data-testid="set-note"></textarea>
        </template>
        <button v-if="data.canEdit" class="ops-btn ops-btn-primary" type="submit" data-testid="set-save">Lưu cài đặt</button>
      </form>
    </section>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';

const data = ref(null);
const error = ref('');
const msg = ref('');
const form = reactive({ statementTemplate: 'internal', customTitle: '', customNote: '' });
let loaded = false;

async function load() {
  try {
    data.value = await api.ops.procurement.settings(ctx.value);
    if (!loaded) {
      Object.assign(form, data.value.settings);
      loaded = true;
    }
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 0 });

async function save() {
  msg.value = '';
  try {
    await api.ops.procurement.saveSettings(ctx.value, { ...form });
    msg.value = 'Đã lưu mẫu bảng kê thu mua.';
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<style scoped>
.tpl { align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--line-2); }
.tpl > span { display: flex; flex-direction: column; gap: 2px; }
</style>
