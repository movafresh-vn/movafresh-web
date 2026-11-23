<template>
  <section>
    <h1>Bảng giá nhà cung cấp</h1>
    <p class="ops-muted proc-note">Giá theo ngày hiệu lực: PO lấy giá có hiệu lực tại ngày giao. {{ data ? data.marketNote : '' }}</p>
    <p v-if="error" class="ops-error" role="alert" data-testid="price-error">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status">{{ msg }}</p>

    <template v-if="data">
      <section class="ops-card">
        <h2>Đặt giá mới</h2>
        <form class="inline-form" novalidate @submit.prevent="add(false)">
          <div><label for="n-sku">SKU</label>
            <select id="n-sku" v-model="n.sku" class="ops-input" data-testid="n-sku"><option v-for="r in data.rows" :key="r.sku" :value="r.sku">{{ r.name }}</option></select>
          </div>
          <div><label for="n-price">Giá (đ / {{ unitOf }})</label><input id="n-price" v-model.number="n.priceVnd" type="number" min="0" step="500" class="ops-input" data-testid="n-price" /></div>
          <div><label for="n-from">Hiệu lực từ ngày</label><input id="n-from" v-model="n.effectiveFrom" type="date" class="ops-input" data-testid="n-from" /></div>
          <div><label for="n-note">Ghi chú</label><input id="n-note" v-model="n.note" class="ops-input" /></div>
          <button class="ops-btn ops-btn-primary" type="submit" data-testid="n-save">Lưu giá</button>
        </form>
        <div v-if="flagged.length" class="alert-warn gap-top" role="alert" data-testid="price-flagged">
          <p><strong>Giá này làm {{ flagged.length }} món vượt trần giá vốn 35%:</strong></p>
          <ul class="history"><li v-for="f in flagged" :key="f.dish_id">{{ f.name || f.dish_id }}<template v-if="f.food_cost_bp != null"> · giá vốn {{ (Number(f.food_cost_bp) / 100).toFixed(1) }}%</template></li></ul>
          <div class="ops-actions">
            <button class="ops-btn ops-btn-primary" type="button" data-testid="price-confirm" @click="confirmAdd">Vẫn lưu giá</button>
            <button class="ops-btn" type="button" data-testid="price-cancel" @click="cancelAdd">Hủy</button>
          </div>
        </div>
      </section>

      <section class="ops-card">
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="price-table">
            <thead><tr><th>SKU</th><th>Nhà cung cấp</th><th class="r">Giá hiện hành</th><th>Hiệu lực từ</th><th class="r">Giá thị trường</th><th class="r">Chênh</th><th></th></tr></thead>
            <tbody>
              <template v-for="r in data.rows" :key="r.sku">
                <tr :class="{ 'row-warn': r.warn }" :data-price-row="r.sku">
                  <td><strong>{{ r.name }}</strong><small class="mono">{{ r.sku }}</small></td>
                  <td>{{ r.supplierName }}</td>
                  <td class="r strong-n">{{ fmt(r.priceVnd) }}<small>/ {{ r.unit }}</small></td>
                  <td>{{ dmy(r.effectiveFrom) }}<small v-if="r.upcoming.length">sắp tới: {{ r.upcoming.map((u) => `${fmt(u.priceVnd)} từ ${dmy(u.effectiveFrom)}`).join('; ') }}</small></td>
                  <td class="r">{{ r.marketVnd ? fmt(r.marketVnd) : '—' }}</td>
                  <td class="r" :class="r.warn ? 'diff-over' : 'diff-ok'" :data-diff="r.sku">
                    <template v-if="r.diffPct != null">{{ r.diffVnd > 0 ? '+' : '' }}{{ fmt(r.diffVnd) }}<small>{{ r.diffPct > 0 ? '+' : '' }}{{ (r.diffPct * 100).toFixed(1) }}%{{ r.warn ? ' cao hơn thị trường' : '' }}</small></template>
                  </td>
                  <td><button class="ops-btn ops-btn-small" :data-history="r.sku" @click="toggle(r.sku)">{{ openSku === r.sku ? 'Ẩn lịch sử' : 'Lịch sử giá' }}</button></td>
                </tr>
                <tr v-if="openSku === r.sku" :data-history-rows="r.sku">
                  <td colspan="7">
                    <table class="ops-table"><thead><tr><th>Hiệu lực từ</th><th class="r">Giá</th><th>Ghi chú</th><th>Nhập lúc</th></tr></thead>
                      <tbody>
                        <tr v-for="h in r.history" :key="h.id">
                          <td>{{ dmy(h.effectiveFrom) }}<span v-if="h.effectiveFrom > data.today" class="ops-pill ops-pill-warn">chưa hiệu lực</span><span v-else-if="h.effectiveFrom === r.effectiveFrom" class="ops-pill ops-pill-ok">đang dùng</span></td>
                          <td class="r">{{ fmt(h.priceVnd) }}</td><td>{{ h.note }}</td><td>{{ fmtDeadline(new Date(h.createdAt)) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { SKUS } from '../../../shared/data/catalog';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDeadline } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { dmy } from '../../labels';

const data = ref(null);
const error = ref('');
const msg = ref('');
const openSku = ref(null);
const n = reactive({ sku: 'NL-BO-01', priceVnd: null, effectiveFrom: '', note: '' });
const unitOf = computed(() => (SKUS[n.sku] ? SKUS[n.sku].unit : 'kg'));

async function load() {
  try {
    data.value = await api.ops.procurement.prices(ctx.value);
    if (!n.effectiveFrom) n.effectiveFrom = data.value.today;
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}
useLive(load, { every: 10000 });

const toggle = (sku) => {
  openSku.value = openSku.value === sku ? null : sku;
};

// Giá mới làm một số món vượt trần giá vốn 35%: máy chủ trả CONFIRM_REQUIRED kèm danh sách món. Hiện danh sách, chờ xác nhận rồi gửi lại.
const flagged = ref([]);

async function add(confirm = false) {
  msg.value = '';
  try {
    await api.ops.procurement.addPrice(ctx.value, { sku: n.sku, priceVnd: n.priceVnd, effectiveFrom: n.effectiveFrom, note: n.note, confirm });
    msg.value = `Đã lưu giá mới cho ${SKUS[n.sku].name}, hiệu lực từ ${dmy(n.effectiveFrom)}.`;
    error.value = '';
    flagged.value = [];
    n.priceVnd = null;
    n.note = '';
    openSku.value = n.sku;
    await load();
  } catch (e) {
    if (e && e.code === 'CONFIRM_REQUIRED') {
      flagged.value = (e.details && e.details.newly_flagged) || [];
      error.value = '';
      return;
    }
    flagged.value = [];
    error.value = e.message;
  }
}
const confirmAdd = () => add(true);
const cancelAdd = () => {
  flagged.value = [];
};
</script>
