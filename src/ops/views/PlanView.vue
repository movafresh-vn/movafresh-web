<template>
  <section class="plan">
    <div class="ops-noprint">
      <h1>Kế hoạch &amp; chốt sổ</h1>
      <p class="ops-muted">Nhà máy cần làm bao nhiêu cho ngày giao đã chọn (số đã chốt sau giờ chốt sổ) và dự kiến 4 tuần tới từ các gói đang chạy.</p>
      <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    </div>

    <template v-if="ov">
      <section class="ops-card ops-noprint" aria-label="Chọn ngày giao">
        <div class="daytrip-row">
          <span class="daytrip-label">Ngày giao</span>
          <div class="chips" data-testid="plan-days">
            <button v-for="d in ov.days" :key="d.day" class="chip" :class="{ on: d.day === ov.day }" :data-day="d.day" @click="load(d.day)">
              {{ shortDay(d.day) }}
              <small>{{ d.closed ? 'đã chốt' : 'dự kiến' }}</small>
            </button>
          </div>
        </div>
      </section>

      <template v-if="ov.detail">
        <section class="ops-card ops-noprint" aria-label="Trạng thái chốt sổ">
          <div class="plan-status">
            <div>
              <h2 class="plan-h2">{{ fmtDay(ov.detail.day) }}</h2>
              <p v-if="ov.detail.closed" class="plan-closed" data-testid="plan-status">
                <span class="ops-pill ops-pill-ok">ĐÃ CHỐT SỔ</span>
                lúc {{ fmtDeadline(new Date(ov.detail.closedAt)) }}
              </p>
              <p v-else class="plan-open" data-testid="plan-status">
                <span class="ops-pill ops-pill-warn">CHƯA CHỐT</span>
                Chốt sổ lúc <strong>{{ fmtDeadline(new Date(ov.detail.cutoffAt)) }}</strong>. Số dưới đây là dự kiến.
              </p>
            </div>
          </div>
          <div class="ops-grid plan-kpis">
            <div class="ops-stat plan-kpi">
              <span class="ops-stat-n" data-testid="kpi-boxes">{{ ov.detail.boxes }}</span>
              <span>{{ ov.detail.closed ? 'Đơn (thùng) đã chốt' : 'Đơn (thùng) dự kiến' }}</span>
            </div>
            <div class="ops-stat plan-kpi">
              <span class="ops-stat-n" data-testid="kpi-skipped">{{ ov.detail.counts.skippedUnpaid }}</span>
              <span>Đơn tạm hoãn vì chưa trả tiền</span>
            </div>
            <div v-if="!ov.detail.closed" class="ops-stat plan-kpi">
              <span class="ops-stat-n" data-testid="kpi-risk">{{ ov.detail.counts.chargeFailed }}</span>
              <span>Đơn đang trừ tiền lỗi (sẽ tạm hoãn nếu chưa trả trước giờ chốt)</span>
            </div>
            <div v-if="!ov.detail.closed" class="ops-stat plan-kpi">
              <span class="ops-stat-n">{{ ov.detail.counts.awaitingCharge }}</span>
              <span>Đơn chờ tới mốc trừ tiền</span>
            </div>
            <div class="ops-stat plan-kpi">
              <span class="ops-stat-n">{{ ov.skippedTotal }}</span>
              <span>Tạm hoãn vì chưa trả tiền (mọi ngày đã chốt)</span>
            </div>
          </div>
        </section>

        <section class="ops-card ops-noprint" aria-label="Chốt sổ một chạm" data-testid="cutoff-card">
          <h2 class="plan-h2">Chốt sổ <span class="ops-pill" :class="cs.phase === 'open' ? 'ops-pill-warn' : 'ops-pill-ok'" data-testid="batch-status">{{ phaseLabel }}</span></h2>
          <p class="ops-muted">
            Giờ chốt sổ: <strong data-testid="cutoff-at">{{ fmtDeadline(new Date(ov.detail.cutoffAt)) }}</strong>.
            Chốt sổ khóa các đơn đã trả tiền, bóc BOM ra gram thô chính xác, lập lệnh mua cho Đắk Lắk và chia tuyến. Tiền về sau khi đã chốt không tự vào lô: admin duyệt ở mục Thanh toán muộn.
          </p>
          <p v-if="cs.pendingExceptions" class="ops-error" data-testid="pending-exceptions">
            Có {{ cs.pendingExceptions }} khoản thanh toán muộn chờ duyệt. <RouterLink to="/thanh-toan-tre">Mở hàng chờ</RouterLink>
          </p>
          <template v-if="can('batchLock') && cs.canLock">
            <label v-if="cs.needsReason" for="lock-reason">Chưa tới giờ chốt sổ. Lý do chốt sớm (bắt buộc, được ghi nhật ký)</label>
            <input v-if="cs.needsReason" id="lock-reason" v-model="lockReason" class="ops-input" autocomplete="off" data-testid="lock-reason" />
            <div class="ops-actions">
              <button class="ops-btn ops-btn-primary" :disabled="busy" data-testid="lock-batch" @click="lock">{{ cs.needsReason ? 'Chốt sớm' : 'Chốt sổ ngay' }}</button>
            </div>
          </template>
          <div v-if="cs.canStartPrep && can('startPrep')" class="ops-actions">
            <button class="ops-btn ops-btn-primary" :disabled="busy" data-testid="start-prep" @click="startPrep">Bắt đầu sơ chế</button>
          </div>
          <div v-if="batch && cs.phase !== 'open'" class="ops-actions">
            <button class="ops-btn" :disabled="busy" data-testid="po-csv" @click="downloadPo">Tải lệnh mua (CSV, kg thô chính xác)</button>
          </div>
          <p v-if="msg" class="ops-ok" role="status" data-testid="cutoff-msg">{{ msg }}</p>
          <p v-if="actionError" class="ops-error" role="alert" data-testid="cutoff-error">{{ actionError }}</p>
        </section>

        <section class="ops-card ops-noprint" aria-label="Nhu cầu theo SKU">
          <h2 class="plan-h2">
            Nhu cầu theo SKU
            <span class="ops-pill" :class="ov.detail.closed ? 'ops-pill-ok' : 'ops-pill-warn'">{{ ov.detail.closed ? 'ĐÃ CHỐT' : 'DỰ KIẾN' }}</span>
          </h2>
          <div class="ops-table-wrap">
            <table class="ops-table" data-testid="sku-table">
              <thead><tr><th>Nguyên liệu</th><th class="r">Túi chuẩn</th><th class="r">kg</th></tr></thead>
              <tbody>
                <tr v-for="r in skuRows" :key="r.key">
                  <td>
                    <strong>{{ r.name }}</strong> <span class="mono ops-muted">{{ r.key }}</span>
                    <StickerTag :temp="r.temp" />
                  </td>
                  <td class="r">{{ r.bags }} × {{ r.bagGrams }}g</td>
                  <td class="r"><strong>{{ kg(r.kg) }}</strong></td>
                </tr>
                <tr v-for="r in ov.detail.hub" :key="r.key">
                  <td><strong>{{ r.name }}</strong> <span class="mono ops-muted">{{ r.key }}</span> <span class="ops-pill">Kho phụ ghép</span></td>
                  <td class="r">—</td><td class="r"><strong>{{ kg(r.kg) }}</strong></td>
                </tr>
                <tr v-for="r in sauceRows" :key="r.key">
                  <td><strong>{{ r.name }}</strong> <span class="mono ops-muted">{{ r.key }}</span> <StickerTag temp="chill" /></td>
                  <td class="r">{{ r.bags }} × {{ r.bagGrams }}g</td><td class="r">{{ kg((r.bags * r.bagGrams) / 1000) }}</td>
                </tr>
                <tr v-if="!skuRows.length"><td colspan="3" class="ops-muted">Chưa có đơn cho ngày này.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ops-card ops-noprint" aria-label="Phiếu sản xuất">
          <h2 class="plan-h2">Phiếu sản xuất</h2>
          <p class="ops-muted">Theo mẫu BATCH-TEST của nhà máy: 3 bảng (nguyên liệu Đắk Lắk, xốt, hải sản kho phụ).
            {{ ov.sheet.status === 'closed' ? 'Số liệu đã chốt, in gửi quản đốc.' : 'Chưa chốt sổ nên đây là bản nháp dự kiến.' }}</p>
          <div class="ops-actions">
            <button class="ops-btn ops-btn-primary" data-testid="open-sheet" @click="showSheet = !showSheet">{{ showSheet ? 'Ẩn phiếu' : 'Xem phiếu sản xuất' }}</button>
            <button class="ops-btn" data-testid="print-sheet" @click="printSheet">In phiếu sản xuất</button>
          </div>
        </section>
        <section v-if="showSheet" class="ops-card ops-print-block sheet-card">
          <ProductionSheet :sheet="ov.sheet" />
        </section>
      </template>

      <section class="ops-card ops-noprint" aria-label="Dự kiến 4 tuần">
        <h2 class="plan-h2">Dự kiến 4 tuần <span class="ops-pill ops-pill-warn">DỰ KIẾN</span></h2>
        <p class="ops-muted">Cộng từ các gói đang chạy (kg nguyên liệu sơ chế). Phần ngày đã chốt sổ ghi riêng. Cột cuối là năng lực xưởng đã xác nhận cho tuần sau.</p>
        <div class="ops-table-wrap">
          <table class="ops-table week-table" data-testid="week-table">
            <thead>
              <tr>
                <th class="sticky">Nguyên liệu</th>
                <th v-for="(w, i) in ov.weeks" :key="w.start" class="r">
                  Tuần {{ i + 1 }}<small>{{ dm(w.start) }}–{{ dm(w.end) }}</small><small>{{ w.boxes }} thùng</small>
                </th>
                <th>Xưởng báo (tuần 2)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ov.weekRows" :key="r.key">
                <td class="sticky"><strong>{{ r.name }}</strong> <StickerTag :temp="r.temp" /><span v-if="r.hub" class="ops-pill">Kho phụ</span></td>
                <td v-for="(v, i) in r.kg" :key="i" class="r">
                  <strong>{{ kg(v) }}</strong>
                  <small v-if="r.closedKg[i] > 0" class="ops-muted">chốt {{ kg(r.closedKg[i]) }}</small>
                </td>
                <td>
                  <template v-if="r.hub">—</template>
                  <template v-else>
                    <span v-if="cap(r.key) && cap(r.key).status === 'ok'" class="ops-pill ops-pill-ok">Đủ năng lực</span>
                    <span v-else-if="cap(r.key)" class="ops-pill ops-pill-bad">Thiếu {{ cap(r.key).shortBags }} túi</span>
                    <span v-else class="ops-muted">Chưa báo</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 class="plan-h3">Gói xốt (số túi)</h3>
        <div class="ops-table-wrap">
          <table class="ops-table week-table">
            <thead><tr><th class="sticky">Mã xốt</th><th v-for="(w, i) in ov.weeks" :key="w.start" class="r">Tuần {{ i + 1 }}</th></tr></thead>
            <tbody>
              <tr v-for="r in ov.weekSauces" :key="r.key">
                <td class="sticky"><strong>{{ r.name }}</strong> <span class="mono ops-muted">{{ r.key }}</span></td>
                <td v-for="(v, i) in r.bags" :key="i" class="r">{{ v }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { api } from '../../shared/api';
import { fmtDay, fmtDeadline, serverNow } from '../../shared/utils/time';
import { can, ctx } from '../session';
import { useLive } from '../useLive';
import { downloadText, poCsvName, withBom } from '../download';
import { cutoffState, lockErrorMessage, lockRequest, lockSummary } from '../planning/cutoff';
import { dm, kg, shortDay } from '../format';
import StickerTag from '../components/StickerTag.vue';
import ProductionSheet from '../components/ProductionSheet.vue';

const ov = ref(null);
const error = ref('');
const showSheet = ref(false);
let day = null;

const batch = ref(null);
const lockReason = ref('');
const busy = ref(false);
const msg = ref('');
const actionError = ref('');

async function load(d = day) {
  try {
    const o = await api.ops.planning.overview(ctx.value, d);
    ov.value = o;
    day = o.day;
    // Lô của ngày đang xem (trạng thái chốt sổ thật nằm ở máy chủ); chưa có lô = chưa ai chốt
    const list = await api.ops.batches.list(ctx.value);
    batch.value = list.find((b) => b.delivery_date === o.day) || null;
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

const cs = computed(() => cutoffState({ batch: batch.value, cutoffAt: ov.value && ov.value.detail ? ov.value.detail.cutoffAt : null, now: serverNow() }));
const phaseLabel = computed(() => ({ open: 'CHƯA CHỐT', locked: 'ĐÃ CHỐT', prepping: 'ĐANG SƠ CHẾ', closed: 'ĐÃ ĐÓNG' })[cs.value.phase]);

async function run(fn, okText) {
  busy.value = true;
  msg.value = '';
  actionError.value = '';
  try {
    const r = await fn();
    msg.value = typeof okText === 'function' ? okText(r) : okText;
    await load();
  } catch (e) {
    actionError.value = lockErrorMessage(e);
  } finally {
    busy.value = false;
  }
}

const lock = () => {
  let body;
  try {
    body = lockRequest({ date: day, early: cs.value.early, reason: lockReason.value });
  } catch (e) {
    actionError.value = e.message;
    return;
  }
  return run(() => api.ops.batches.lock(ctx.value, body), (r) => lockSummary(r));
};
const startPrep = () => run(() => api.ops.batches.startPrep(ctx.value, day), 'Đã bắt đầu sơ chế.');

async function downloadPo() {
  busy.value = true;
  actionError.value = '';
  try {
    downloadText(poCsvName(day), withBom(await api.ops.batches.purchaseOrdersCsv(ctx.value, day)));
  } catch (e) {
    actionError.value = lockErrorMessage(e);
  } finally {
    busy.value = false;
  }
}

const skuRows = computed(() => (ov.value && ov.value.detail ? ov.value.detail.items.filter((i) => i.type === 'sku') : []));
const sauceRows = computed(() => (ov.value && ov.value.detail ? ov.value.detail.items.filter((i) => i.type === 'sauce') : []));
const cap = (key) => {
  const w = ov.value && ov.value.weeks[1];
  return w && ov.value.capacity[w.start] ? ov.value.capacity[w.start][key] : null;
};

async function printSheet() {
  showSheet.value = true;
  await nextTick();
  window.print();
}

useLive(() => load(), { every: 6000 });
</script>
