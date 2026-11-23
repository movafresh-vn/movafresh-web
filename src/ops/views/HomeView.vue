<template>
  <section class="proc fin">
    <h1>Tổng quan</h1>
    <p class="ops-muted fin-note">
      Dành cho founder: tiền vào / ra của tuần {{ o ? `${dmy(o.week.from)} – ${dmy(o.week.to)}` : '' }}, nợ Fresh Credit, tỷ lệ bao phủ, margin, giữ chân, giao đúng giờ và hao hụt.
      Số liệu đọc từ sổ nghiệp vụ trên máy chủ nên cập nhật theo giờ máy chủ.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>

    <template v-if="o">
      <section v-if="o.alerts.length" class="ops-card" aria-label="Cần chú ý" data-testid="alerts">
        <h2>Cần chú ý</h2>
        <ul class="ops-list">
          <li v-for="a in o.alerts" :key="a.id" :data-alert="a.id"><RouterLink :to="a.href">{{ a.text }}</RouterLink></li>
        </ul>
      </section>

      <section v-if="tile" class="fin-tiles" aria-label="Sổ Fresh Credit">
        <div class="fin-tile" :class="tile.tone === 'unknown' ? '' : tile.tone" data-testid="ov-integrity" :data-tone="tile.tone">
          <span class="n">{{ tile.big }}</span><strong>{{ tile.title }}</strong><small>{{ tile.detail }}</small>
        </div>
      </section>

      <h2>Dòng tiền và nghĩa vụ</h2>
      <div class="fin-tiles">
        <div class="fin-tile" data-testid="ov-in"><span class="n fin-pos">{{ fmt(o.cash.inVnd) }}</span><strong>Tiền vào tuần này</strong><small>nạp, chuyển khoản, trừ thẻ</small></div>
        <div class="fin-tile" data-testid="ov-out"><span class="n fin-neg">{{ fmt(o.cash.outVnd) }}</span><strong>Tiền ra tuần này</strong><small>trả nhà cung cấp, hoàn khách, mua nông sản</small></div>
        <div class="fin-tile" data-testid="ov-liability"><span class="n">{{ fmt(o.liability.realVnd) }}</span><strong>Nợ Fresh Credit</strong><small>tiền thật chưa dùng · khuyến mãi treo {{ fmt(o.liability.promoVnd) }}</small></div>
        <div class="fin-tile" :class="o.coverage.alert ? 'bad' : 'ok'" data-testid="ov-coverage"><span class="n">{{ o.coverage.ratio == null ? '—' : o.coverage.ratio.toFixed(2).replace('.', ',') }}</span><strong>Tỷ lệ bao phủ</strong><small>tiền mặt {{ fmt(o.cash.cashVnd) }} ÷ nợ Fresh Credit</small></div>
      </div>

      <h2>Chất lượng vận hành</h2>
      <div class="fin-tiles">
        <div class="fin-tile" :class="o.margin ? (o.margin.marginPct != null && o.margin.marginPct < o.margin.minPct ? 'bad' : 'ok') : ''" data-testid="ov-margin">
          <span class="n">{{ o.margin ? pct(o.margin.marginPct) : '—' }}</span><strong>Margin tuần</strong>
          <small>{{ o.margin ? `tuần ${dmy(o.margin.weekStart)}${o.margin.isThisWeek ? '' : ' (tuần gần nhất có đơn giao)'} · ${o.margin.boxes} thùng` : 'chưa có đơn giao ở các tuần thường' }} · chu kỳ đầu tính riêng (kéo khách {{ fmt(o.firstCycle.acquisitionCostVnd) }})</small>
        </div>
        <div class="fin-tile" data-testid="ov-retention"><span class="n">{{ pct(o.retention.pct, 0) }}</span><strong>Tỷ lệ giữ chân</strong><small>{{ o.retention.decided ? `${o.retention.renewed} gia hạn / ${o.retention.decided} gói đã kết thúc chu kỳ hoặc dừng` : `chưa có gói nào kết thúc chu kỳ · ${o.retention.activeSubs} gói đang chạy` }} · mục tiêu ≥ {{ Math.round(o.retention.target * 100) }}%</small></div>
        <div class="fin-tile" data-testid="ov-ontime"><span class="n">{{ pct(o.onTime.pct, 0) }}</span><strong>Giao đúng giờ</strong><small>{{ o.onTime.delivered ? `${o.onTime.delivered} điểm đã giao` : 'chưa có điểm nào đã giao' }}</small></div>
        <div class="fin-tile" data-testid="ov-waste"><span class="n">{{ fmt(o.waste.costVnd) }}</span><strong>Hao hụt tháng {{ o.waste.month }}</strong><small>{{ o.waste.pct == null ? 'chưa có hàng nhận trong tháng' : `${pct(o.waste.pct)} giá trị hàng đã nhận` }}</small></div>
      </div>

      <div class="fin-tiles">
        <div class="fin-tile" :class="o.payables.overdueVnd ? 'bad' : ''" data-testid="ov-payables"><span class="n">{{ fmt(o.payables.openVnd) }}</span><strong>Công nợ nhà cung cấp</strong><small>quá hạn {{ fmt(o.payables.overdueVnd) }}</small></div>
      </div>
    </template>

    <h2>Phân hệ</h2>
    <div class="ops-grid">
      <RouterLink v-for="m in modules" :key="m.path" :to="m.path" class="ops-card ops-link">
        <strong>{{ m.title }}</strong>
        <span class="ops-muted">{{ m.note }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { dmy } from '../labels';
import { pct } from '../format';
import { session, ctx } from '../session';
import { modulesFor } from '../modules';
import { useLive } from '../useLive';
import { financeError, integrityTile } from '../financeUi';

const o = ref(null);
const integrity = ref(null);
const error = ref('');
const tile = computed(() => (o.value ? integrityTile(integrity.value) : null));
const modules = computed(() => (session.value ? modulesFor(session.value.role).filter((m) => m.name !== 'overview') : []));

async function load() {
  try {
    o.value = await api.ops.overview.founder(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
  // Ô sổ Fresh Credit: không có quyền hoặc lỗi mạng thì hiện "chưa kiểm được", không làm hỏng cả trang tổng quan.
  try {
    integrity.value = await api.ops.finance.integrity(ctx.value);
  } catch {
    integrity.value = null;
  }
}
useLive(load, { every: 8000 });
</script>
