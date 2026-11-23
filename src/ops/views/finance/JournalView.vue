<template>
  <section>
    <h1>Xuất bút toán</h1>
    <p class="ops-muted fin-note">
      MOVA <strong>không tự viết phần mềm kế toán</strong>: chỉ giữ sổ phụ nghiệp vụ và xuất bút toán (CSV) để nhập vào phần mềm kế toán qua <strong>bảng ánh xạ tài khoản do kế toán cấu hình</strong> (tab Cài đặt).
      Mỗi chứng từ cân Nợ = Có. Doanh thu chỉ ghi khi đơn đã giao.
    </p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="msg" class="ops-ok" role="status" data-testid="exp-msg">{{ msg }}</p>
    <div class="fin-tools">
      <div>
        <label for="j-p">Kỳ</label>
        <select id="j-p" v-model="preset" class="ops-input" data-testid="j-preset" @change="applyPreset">
          <option value="all">Tất cả</option><option value="today">Hôm nay</option><option value="week">Tuần này (T2–CN)</option><option value="lastweek">Tuần trước</option><option value="custom">Tùy chọn</option>
        </select>
      </div>
      <div><label for="j-f">Từ ngày</label><input id="j-f" v-model="from" type="date" class="ops-input" @change="preset = 'custom'; load()" /></div>
      <div><label for="j-t">Đến ngày</label><input id="j-t" v-model="to" type="date" class="ops-input" @change="preset = 'custom'; load()" /></div>
    </div>
    <div v-if="data" class="fin-tools">
      <label v-for="g in data.groupList" :key="g.id" class="fin-check"><input v-model="groups" type="checkbox" :value="g.id" @change="load" /> {{ g.label }}</label>
    </div>

    <template v-if="data">
      <div class="fin-tiles">
        <div class="fin-tile"><span class="n">{{ data.entries.length }}</span><strong>Chứng từ</strong><small>trong kỳ đã chọn</small></div>
        <div class="fin-tile" data-testid="j-debit"><span class="n">{{ fmt(data.totals.debitVnd) }}</span><strong>Tổng Nợ</strong></div>
        <div class="fin-tile" data-testid="j-credit"><span class="n">{{ fmt(data.totals.creditVnd) }}</span><strong>Tổng Có</strong></div>
        <div class="fin-tile" :class="data.totals.balanced ? 'ok' : 'bad'" data-testid="j-balanced"><span class="n">{{ data.totals.balanced ? 'Cân' : 'LỆCH' }}</span><strong>Nợ = Có</strong><small>{{ data.totals.balanced ? 'mọi chứng từ cân' : `${data.totals.unbalanced.length} chứng từ lệch` }}</small></div>
      </div>
      <p v-if="data.unmapped.length" class="fin-info" data-testid="j-unmapped">
        Chưa ánh xạ tài khoản: <span v-for="k in data.unmapped" :key="k" class="fin-tag">{{ data.accountMap[k].label }}</span>. CSV vẫn xuất được, cột mã ghi <code>?khóa</code> để kế toán lọc và ánh xạ lại.
      </p>
      <p class="ops-muted" data-testid="j-treatment">Cách xử lý khuyến mãi đã dùng: <strong>{{ data.treatment === 'gross' ? 'gross (doanh thu khuyến mãi tách riêng, kèm chi phí khuyến mãi)' : 'net (doanh thu chỉ theo tiền thật; khuyến mãi dùng không hạch toán doanh thu)' }}</strong>.</p>

      <section class="ops-card" aria-label="Tải về">
        <div class="fin-actions">
          <button class="ops-btn ops-btn-primary" data-testid="dl-journal" :disabled="!data.entries.length" @click="downloadJournal">Tải CSV bút toán</button>
          <button class="ops-btn" data-testid="dl-statements" @click="downloadStatements">Tải CSV bảng kê thu mua nông sản</button>
        </div>
        <p class="ops-muted">Bảng kê thu mua nông sản của nông hộ không có hóa đơn: mẫu do kế toán chọn ở Mua hàng → Cài đặt (mọi mẫu đang chờ kế toán xác nhận còn hiệu lực).</p>
      </section>

      <section class="ops-card" aria-label="Chứng từ">
        <h2>Chứng từ</h2>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="j-table">
            <thead><tr><th>Số chứng từ</th><th>Nhóm · diễn giải</th><th>Tài khoản</th><th class="r">Nợ</th><th class="r">Có</th></tr></thead>
            <tbody>
              <template v-for="e in shown" :key="e.id">
                <tr class="fin-entry" :data-entry="e.id" :data-group="e.group">
                  <td class="mono">{{ e.id }}<small>{{ dmy(e.date) }}</small></td>
                  <td colspan="4"><span class="fin-tag">{{ e.groupLabel }}</span> {{ e.memo }}<small v-if="e.objectId" class="mono">{{ e.objectId }}</small></td>
                </tr>
                <tr v-for="(l, i) in e.lines" :key="e.id + i" class="fin-lines">
                  <td></td><td></td><td>{{ data.accountMap[l.account].code || `?${l.account}` }} · {{ data.accountMap[l.account].label }}</td>
                  <td class="r">{{ l.dr ? fmt(l.dr) : '' }}</td><td class="r">{{ l.cr ? fmt(l.cr) : '' }}</td>
                </tr>
              </template>
              <tr v-if="!data.entries.length"><td colspan="5" class="ops-muted">Không có chứng từ trong kỳ này.</td></tr>
            </tbody>
          </table>
        </div>
        <p v-if="data.entries.length > shown.length" class="ops-muted">Hiện {{ shown.length }} chứng từ mới nhất trong {{ data.entries.length }}. CSV tải về có đủ.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { addDays } from '../../../shared/utils/time';
import { weekStartOf } from '../../../shared/domain/financeRevenue';
import { downloadText } from '../../download';
import { dmy } from '../../labels';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { financeError } from '../../financeUi';

const data = ref(null);
const error = ref('');
const msg = ref('');
const preset = ref('all');
const from = ref('');
const to = ref('');
const groups = ref([]);

const shown = computed(() => (data.value ? data.value.entries.slice(-60).reverse() : []));
const query = () => ({ from: from.value || null, to: to.value || null, groups: groups.value.length ? groups.value : null });

async function load() {
  try {
    data.value = await api.ops.finance.journal(ctx.value, query());
    error.value = '';
  } catch (e) {
    error.value = financeError(e);
  }
}
useLive(load, { every: 10000 });

async function applyPreset() {
  // Hôm nay theo giờ nghiệp vụ của máy chủ, không theo máy
  const today = (await api.ops.finance.cashflow(ctx.value)).today;
  if (preset.value === 'all') { from.value = ''; to.value = ''; }
  if (preset.value === 'today') { from.value = today; to.value = today; }
  if (preset.value === 'week') { from.value = weekStartOf(today); to.value = addDays(weekStartOf(today), 6); }
  if (preset.value === 'lastweek') { from.value = addDays(weekStartOf(today), -7); to.value = addDays(weekStartOf(today), -1); }
  await load();
}

async function downloadJournal() {
  try {
    const f = await api.ops.finance.journalCsv(ctx.value, query());
    downloadText(f.filename, f.csv);
    msg.value = `Đã tải ${f.filename}: ${f.count} chứng từ, ${f.totals.balanced ? 'cân Nợ = Có' : 'CÓ CHỨNG TỪ LỆCH'}${f.unmapped.length ? `, ${f.unmapped.length} tài khoản chưa ánh xạ` : ''}.`;
  } catch (e) {
    error.value = financeError(e);
  }
}

async function downloadStatements() {
  try {
    const f = await api.ops.finance.statementsCsv(ctx.value);
    downloadText(f.filename, f.csv);
    msg.value = `Đã tải ${f.filename}: ${f.count} bảng kê.`;
  } catch (e) {
    error.value = financeError(e);
  }
}

</script>
