<template>
  <section class="ops-card">
    <h1>{{ mod.title }}</h1>
    <p class="ops-muted">{{ mod.note }}</p>
    <p class="ops-badge">Giao diện đầy đủ sẽ làm ở {{ mod.build }}</p>

    <h2>Dữ liệu API trả về cho vai trò "{{ session.label }}"</h2>
    <p class="ops-muted">Dữ liệu đã lọc theo vai trò ở tầng API, để kiểm tra trước khi dựng giao diện.</p>

    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <template v-else-if="preview">
      <p><strong>{{ preview.total }}</strong> bản ghi</p>
      <pre class="ops-pre">{{ preview.sample }}</pre>
    </template>
    <p v-else class="ops-muted">Không có dữ liệu xem trước.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../shared/api';
import { session, ctx } from '../session';

const route = useRoute();
const mod = computed(() => route.meta.module);
const preview = ref(null);
const error = ref('');

async function load() {
  error.value = '';
  preview.value = null;
  const kind = mod.value.preview;
  try {
    let list = null;
    if (kind === 'orders') list = await api.ops.listOrders(ctx.value);
    else if (kind === 'plans') list = await api.ops.listProductionPlans(ctx.value);
    else if (kind === 'pos') list = await api.ops.listPurchaseOrders(ctx.value);
    else if (kind === 'suppliers') list = await api.ops.listSuppliers(ctx.value);
    else if (kind === 'summary') list = [await api.ops.summary(ctx.value)];
    if (list) preview.value = { total: list.length, sample: JSON.stringify(list.slice(0, 2), null, 2) };
  } catch (e) {
    error.value = e.message;
  }
}

watch(() => route.fullPath, load, { immediate: true });
</script>
