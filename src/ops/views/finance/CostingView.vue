<template>
  <section class="costing">
    <h1>Giá vốn món</h1>
    <p class="ops-muted">
      Giá vốn tính động: Σ (gram tịnh ÷ hệ số sơ chế × giá nguyên liệu mới nhất) + bao bì + nhân công. Không có giá vốn lưu cố định trên món:
      đổi giá nguyên liệu là số ở đây đổi theo. Món có <strong>food cost trên {{ view.maxPct }}%</strong> giá bán bị cờ đỏ.
    </p>

    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>

    <div class="ops-grid">
      <div class="ops-stat"><span class="ops-stat-n" data-testid="cost-flagged">{{ view.flagged }}</span><span>món vượt {{ view.maxPct }}%</span></div>
      <div class="ops-stat"><span class="ops-stat-n">{{ all.dishes.length }}</span><span>món đang bán</span></div>
    </div>

    <label class="check-row"><input v-model="onlyFlagged" type="checkbox" data-testid="cost-only" /> <span>Chỉ hiện món vượt ngưỡng</span></label>

    <div class="ops-table-wrap">
      <table class="ops-table" data-testid="cost-table">
        <thead><tr><th>Món</th><th class="r">Giá bán</th><th class="r">Nguyên liệu</th><th class="r">Bao bì</th><th class="r">Nhân công</th><th class="r">Food cost</th><th></th></tr></thead>
        <tbody>
          <tr v-for="d in view.dishes" :key="d.id" :class="{ over: d.over }" :data-dish="d.id">
            <td><strong>{{ d.name }}</strong> <span class="mono ops-muted">{{ d.id }}</span></td>
            <td class="r">{{ fmt(d.priceVnd) }}</td>
            <td class="r">{{ fmt(d.ingredientVnd) }}</td>
            <td class="r">{{ fmt(d.packagingVnd) }}</td>
            <td class="r">{{ fmt(d.laborVnd) }}</td>
            <td class="r"><strong :class="{ 'cost-bad': d.over }" data-testid="cost-pct">{{ d.foodCostPct }}%</strong></td>
            <td>
              <span v-if="d.over" class="ops-pill ops-pill-bad" data-testid="cost-flag">Vượt {{ view.maxPct }}%</span>
              <span v-if="d.missingPrices.length" class="ops-pill ops-pill-warn" :title="d.missingPrices.join(', ')">Thiếu giá {{ d.missingPrices.length }} nguyên liệu</span>
            </td>
          </tr>
          <tr v-if="!view.dishes.length"><td colspan="7" class="ops-muted">Không có món nào.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { costingView } from '../../costingView';

const data = ref(null);
const error = ref('');
const onlyFlagged = ref(false);

const all = computed(() => costingView(data.value));
const view = computed(() => costingView(data.value, { onlyFlagged: onlyFlagged.value }));

async function load() {
  try {
    data.value = await api.ops.costing.dishes(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

useLive(load, { every: 15000 });
</script>

<style scoped>
tr.over td { background: rgba(200, 40, 40, 0.08); }
.cost-bad { color: #b3261e; }
</style>
