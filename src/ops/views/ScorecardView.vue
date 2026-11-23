<template>
  <section class="proc fin">
    <h1>Giám sát nhà cung cấp</h1>
    <p class="ops-muted fin-note">
      Thẻ điểm tính từ PO, phiếu nhập và khiếu nại: giao đúng hạn, tỷ lệ đáp ứng PO, tỷ lệ đạt QC, chênh khối lượng, vượt nhiệt, khiếu nại. Điểm tổng 0–100 là bình quân có trọng số
      (chỉ các chỉ số đã có dữ liệu); dưới {{ data ? data.warnBelow : 80 }} thì cảnh báo. Chênh giá so với thị trường chỉ để xem, không vào điểm.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <div class="fin-tools">
      <div><label for="c-f">Từ ngày giao</label><input id="c-f" v-model="from" type="date" class="ops-input" /></div>
      <div><label for="c-t">Đến ngày</label><input id="c-t" v-model="to" type="date" class="ops-input" /></div>
      <button class="ops-btn ops-btn-small" @click="load">Lọc</button>
    </div>
    <template v-if="data">
      <section class="ops-card" aria-label="Thẻ điểm">
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="score-table">
            <thead>
              <tr>
                <th>Nhà cung cấp</th><th class="r">Điểm</th><th class="r">Giao đúng hạn</th><th class="r">Đáp ứng PO</th><th class="r">Đạt QC</th><th class="r">Chênh khối lượng</th><th class="r">Vượt nhiệt</th><th class="r">Khiếu nại</th><th class="r">Giá so thị trường</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data.rows" :key="r.supplierId" :class="{ 'row-bad': r.warn }" :data-supplier="r.supplierId">
                <td>{{ r.name }}<small>{{ r.poCount }} PO · {{ r.scoredPoCount }} đã có hàng / quá hạn</small></td>
                <td class="r"><span class="score" :class="{ warn: r.warn, none: r.score == null }" :data-score="r.supplierId">{{ r.score == null ? '—' : r.score.toFixed(0) }}</span></td>
                <td class="r">{{ pct(r.onTimeRate, 0) }}</td>
                <td class="r">{{ pct(r.fillRate, 0) }}</td>
                <td class="r">{{ pct(r.qcRate, 1) }}</td>
                <td class="r">{{ r.weightDiffPct == null ? '—' : `${r.weightDiffPct > 0 ? '+' : ''}${pct(r.weightDiffPct, 1)}` }}</td>
                <td class="r">{{ r.tempLines ? `${r.tempBreaches} / ${r.tempLines} dòng` : '—' }}</td>
                <td class="r">{{ r.claimCount }}<small v-if="r.claimVnd">{{ fmt(r.claimVnd) }}</small></td>
                <td class="r">{{ r.marketDiffPct == null ? '—' : `${r.marketDiffPct > 0 ? '+' : ''}${pct(r.marketDiffPct, 1)}` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ops-muted">Trọng số: <span v-for="(w, k) in data.weights" :key="k" class="fin-tag">{{ LABEL[k] }} {{ Math.round(w * 100) }}%</span></p>
      </section>

      <section v-if="issues.length" class="ops-card" aria-label="Chi tiết cần xem">
        <h2>Chi tiết cần xem</h2>
        <ul class="ops-list" data-testid="score-issues">
          <li v-for="(i, n) in issues" :key="n"><strong>{{ i.supplier }}</strong> · {{ i.poId }} · {{ i.type === 'late' ? 'Giao trễ' : 'Vượt nhiệt' }}: {{ i.note }}</li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { pct } from '../format';
import { ctx } from '../session';
import { useLive } from '../useLive';
import { financeError } from '../financeUi';

const LABEL = { onTime: 'đúng hạn', fill: 'đáp ứng', qc: 'QC', weight: 'khối lượng', temp: 'nhiệt độ', claims: 'khiếu nại' };
const data = ref(null);
const error = ref('');
const from = ref('');
const to = ref('');

const issues = computed(() => (data.value ? data.value.rows.flatMap((r) => r.issues.map((i) => ({ ...i, supplier: r.name }))) : []));

async function load() {
  try {
    data.value = await api.ops.monitoring.scorecard(ctx.value, { from: from.value || null, to: to.value || null });
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 10000 });
</script>
