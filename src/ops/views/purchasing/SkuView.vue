<template>
  <section>
    <h1>Danh mục SKU</h1>
    <p class="ops-muted proc-note">Mã, quy cách, nhóm nhiệt (màu sticker dán trên túi), hạn dùng, nhóm thuế, tỷ lệ thu hồi sơ chế chuẩn và các món dùng SKU.</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <section class="ops-card">
      <div class="inline-form">
        <div><label for="k-q">Tìm theo tên hoặc mã</label><input id="k-q" v-model="q" class="ops-input ops-input-sm" data-testid="sku-search" /></div>
        <div><label for="k-t">Nhóm nhiệt</label>
          <select id="k-t" v-model="temp" class="ops-input ops-input-sm" data-testid="sku-temp"><option value="">Tất cả</option><option value="chill">Ngăn mát</option><option value="frozen">Ngăn đông</option><option value="ambient">Thường</option></select>
        </div>
      </div>
      <div class="ops-table-wrap gap-top">
        <table class="ops-table" data-testid="sku-table">
          <thead><tr><th>SKU</th><th>Quy cách</th><th>Nhóm nhiệt</th><th class="r">Hạn dùng</th><th>Nhóm thuế</th><th class="r">Thu hồi sơ chế</th><th>Món dùng SKU</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" :data-sku="r.id">
              <td><strong>{{ r.name }}</strong><small class="mono">{{ r.id }} · {{ r.supplierName }}</small><span v-if="r.requiresLot" class="ops-pill">bắt buộc có lô</span></td>
              <td>{{ r.spec }}</td>
              <td><StickerTag :temp="r.temp" /></td>
              <td class="r">{{ r.shelfDays }} ngày</td>
              <td>{{ r.taxLabel }}<small>{{ r.taxRate == null ? 'thuế suất chờ kế toán' : `${Math.round(r.taxRate * 100)}%${r.taxConfirmed ? '' : ' (chưa xác nhận)'}` }}</small></td>
              <td class="r">{{ Math.round(r.yield * 100) }}%</td>
              <td>
                <details v-if="r.dishes.length"><summary>{{ r.dishes.length }} món</summary><ul class="history"><li v-for="d in r.dishes" :key="d.id">{{ d.name }}</li></ul></details>
                <span v-else class="ops-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import StickerTag from '../../components/StickerTag.vue';

const all = ref([]);
const error = ref('');
onMounted(async () => {
  try {
    all.value = await api.ops.procurement.skuCatalog(ctx.value);
  } catch (e) {
    error.value = e.message;
  }
});
const q = ref('');
const temp = ref('');
const rows = computed(() => {
  const t = q.value.trim().toLowerCase();
  return all.value.filter((r) => (!temp.value || r.temp === temp.value) && (!t || r.name.toLowerCase().includes(t) || r.id.toLowerCase().includes(t)));
});
</script>
