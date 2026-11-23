<template>
  <section class="yield">
    <div class="ops-noprint">
      <h1>Sản lượng thực tế</h1>
      <p class="ops-muted">
        Nhập khối lượng nguyên liệu thô nhận vào và thành phẩm sau sơ chế. Hệ thống so với hệ số chuẩn của nguyên liệu;
        <strong>lệch quá {{ LIMIT }}%</strong> thì gắn cờ để quản đốc xem lại hao hụt.
      </p>
    </div>

    <form class="ops-card ops-noprint" novalidate @submit.prevent="submit">
      <h2>Ghi sản lượng cho {{ selDay ? fmtDay(selDay) : '…' }}</h2>
      <label for="y-sku">Nguyên liệu</label>
      <select id="y-sku" v-model="skuId" class="ops-input" data-testid="y-sku">
        <option value="" disabled>Chọn nguyên liệu</option>
        <option v-for="i in skuOptions" :key="i.key" :value="i.key">{{ i.name }} ({{ i.key }})</option>
      </select>
      <div class="field-row">
        <div>
          <label for="y-raw">Thô nhận vào (kg)</label>
          <input id="y-raw" v-model="rawKg" class="ops-input" type="number" inputmode="decimal" min="0" step="any" data-testid="y-raw" />
        </div>
        <div>
          <label for="y-net">Thành phẩm (kg)</label>
          <input id="y-net" v-model="netKg" class="ops-input" type="number" inputmode="decimal" min="0" step="any" data-testid="y-net" />
        </div>
      </div>
      <label for="y-lot">Mã lô (nếu có)</label>
      <input id="y-lot" v-model="lot" class="ops-input" autocomplete="off" placeholder="MOVA-TRACE-BO-202611-0001" data-testid="y-lot" />
      <label for="y-note">Ghi chú</label>
      <input id="y-note" v-model="note" class="ops-input" autocomplete="off" />
      <p v-if="error" class="ops-error" role="alert" data-testid="y-error">{{ error }}</p>
      <p v-if="last" :class="last.flagged ? 'ops-error' : 'ops-ok'" role="status" data-testid="y-result">
        Đã ghi: thực tế {{ last.actualPct }}% so với chuẩn {{ last.standardPct }}% (lệch {{ signed(last.variancePct) }}%).
        <strong v-if="last.flagged">ĐÃ GẮN CỜ hao hụt.</strong>
      </p>
      <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" :disabled="busy" data-testid="y-submit">Ghi sản lượng</button>
    </form>

    <section class="ops-card" aria-label="Nhật ký sản lượng">
      <h2>Nhật ký sản lượng</h2>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="y-table">
          <thead><tr><th>Nguyên liệu</th><th class="r">Thô (kg)</th><th class="r">Thành phẩm (kg)</th><th class="r">Thực tế</th><th class="r">Chuẩn</th><th class="r">Lệch</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" :class="{ flagged: r.flagged }" :data-yield="r.id">
              <td><strong>{{ nameOf(r.skuId) }}</strong> <span class="mono ops-muted">{{ r.skuId }}</span></td>
              <td class="r">{{ r.rawKg }}</td>
              <td class="r">{{ r.netKg }}</td>
              <td class="r">{{ r.actualPct }}%</td>
              <td class="r">{{ r.standardPct }}%</td>
              <td class="r">{{ signed(r.variancePct) }}%</td>
              <td><span v-if="r.flagged" class="ops-pill ops-pill-bad" data-testid="y-flag">Lệch &gt; {{ LIMIT }}%</span></td>
            </tr>
            <tr v-if="!rows.length"><td colspan="7" class="ops-muted">Chưa có bản ghi cho ngày này.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../../../shared/api';
import { fmtDay } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { catalog, selDay } from '../../factoryStore';
import { checkYieldInput, describeYield, toGrams } from '../../yieldRules';

const LIMIT = 5;
const skuId = ref('');
const rawKg = ref('');
const netKg = ref('');
const lot = ref('');
const note = ref('');
const error = ref('');
const busy = ref(false);
const last = ref(null);
const list = ref([]);

const skuOptions = computed(() => (catalog.value ? Object.values(catalog.value.items).filter((i) => i.type === 'sku' && !i.hub) : []));
const nameOf = (id) => (catalog.value && catalog.value.items[id] ? catalog.value.items[id].name : id);
const rows = computed(() => list.value.map(describeYield));
const signed = (n) => (n > 0 ? `+${n}` : String(n));

async function load() {
  if (!selDay.value) return;
  try {
    list.value = await api.ops.factory.yieldLogs(ctx.value, selDay.value);
  } catch (e) {
    error.value = e.message;
  }
}

async function submit() {
  error.value = '';
  last.value = null;
  const bad = checkYieldInput({ skuId: skuId.value, rawKg: rawKg.value, netKg: netKg.value });
  if (bad) return (error.value = bad);
  if (!selDay.value) return (error.value = 'Chưa có ngày giao đã chốt.');
  busy.value = true;
  try {
    const row = await api.ops.factory.yieldLog(ctx.value, {
      date: selDay.value, skuId: skuId.value, rawReceivedG: toGrams(rawKg.value), netPreppedG: toGrams(netKg.value),
      lotQrCode: lot.value.trim() || null, note: note.value.trim() || null
    });
    last.value = describeYield(row);
    rawKg.value = '';
    netKg.value = '';
    note.value = '';
    await load();
  } catch (e) {
    error.value = e.code === 'LOT_NOT_FOUND' ? 'Không tìm thấy mã lô này.' : e.message;
  } finally {
    busy.value = false;
  }
}

watch(selDay, load);
useLive(load, { every: 8000 });
</script>

<style scoped>
tr.flagged td { background: rgba(200, 40, 40, 0.08); }
</style>
