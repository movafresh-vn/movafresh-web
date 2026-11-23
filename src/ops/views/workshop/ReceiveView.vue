<template>
  <section class="receive">
    <h1>Nhận nguyên liệu</h1>
    <p class="ops-muted">Chọn nguồn, nhập khối lượng và nhiệt độ, chụp 1 ảnh, chọn Đạt hoặc Không đạt. Hệ thống tạo MÃ LÔ nguyên liệu để gắn vào mẻ túi. Bò và gạo bắt buộc có lô.</p>

    <section v-if="done" class="ops-card receive-done" data-testid="receipt-done">
      <h2>{{ done.verdict === 'pass' ? 'Đã nhận. Mã lô:' : 'Đã ghi KHÔNG ĐẠT. Mã lô:' }}</h2>
      <p class="lot-code" data-testid="lot-code">{{ done.lotCode }}</p>
      <p class="ops-muted">{{ done.name }} · {{ done.weightKg }} kg · {{ done.tempC }}°C · {{ done.sourceName }}</p>
      <p v-if="donePending" class="ops-pill ops-pill-warn" data-testid="done-unsent">chưa gửi, sẽ tự gửi khi có mạng</p>
      <p v-else class="ops-pill ops-pill-ok">đã gửi</p>
      <div class="ops-actions">
        <button class="ops-btn ops-btn-primary" data-testid="receive-next" @click="done = null">Nhận lô khác</button>
        <RouterLink v-if="done.verdict === 'pass'" to="/xuong/dong-goi" class="ops-btn">Tới đóng gói</RouterLink>
      </div>
    </section>

    <form v-else class="ops-card" novalidate @submit.prevent="submit">
      <label for="r-sku">Nguyên liệu</label>
      <select id="r-sku" v-model="sku" class="ops-input" data-testid="r-sku">
        <option value="" disabled>Chọn nguyên liệu</option>
        <option v-for="s in skuOptions" :key="s.key" :value="s.key">{{ s.name }}{{ s.requiresLot ? ' (bắt buộc có lô)' : '' }}</option>
      </select>

      <label for="r-src">Nguồn (HTX / nông hộ / lò mổ)</label>
      <select id="r-src" v-model="sourceId" class="ops-input" :disabled="!sku" data-testid="r-source">
        <option value="" disabled>{{ sku ? 'Chọn nguồn' : 'Chọn nguyên liệu trước' }}</option>
        <option v-for="s in sourceOptions" :key="s.id" :value="s.id">{{ kindLabel[s.kind] }} · {{ s.name }}</option>
      </select>

      <div class="field-row">
        <div>
          <label for="r-kg">Khối lượng nhận (kg)</label>
          <input id="r-kg" v-model="weight" class="ops-input" type="number" inputmode="decimal" min="0" step="0.1" data-testid="r-weight" />
        </div>
        <div>
          <label for="r-temp">Nhiệt độ lúc nhận (°C)</label>
          <input id="r-temp" v-model="temp" class="ops-input" type="number" inputmode="decimal" step="0.1" data-testid="r-temp" />
        </div>
      </div>
      <p v-if="limitText" class="ops-muted" :class="{ 'ops-error': sku && tempChecked && !tempOk }" data-testid="temp-hint">{{ limitText }}</p>

      <template v-if="sku">
        <label for="r-lot">Mã lô đang nhận (nhập hoặc quét tem)</label>
        <input id="r-lot" v-model="lotInput" class="ops-input mono" autocomplete="off" autocapitalize="characters" spellcheck="false" :placeholder="expectedLot" data-testid="r-lot" @keydown.enter.prevent />
        <p v-if="lotInput && !lotCheck.ok" class="ops-error" role="alert" data-testid="lot-mismatch">{{ lotCheck.reason }}</p>
        <p v-else-if="lotCheck.ok" class="ops-pill ops-pill-ok" data-testid="lot-match">Mã lô khớp</p>
        <p v-else class="ops-muted">Chọn đúng nguyên liệu, nhập mã lô trên tem rồi mới chụp ảnh được.</p>

        <figure class="ref-photo" data-testid="ref-photo">
          <img v-if="refPhotoSrc && !refPhotoFailed" :src="refPhotoSrc" :alt="`Ảnh tham chiếu: ${SKUS[sku].name}`" @error="refPhotoFailed = true" />
          <figcaption class="ops-muted">Ảnh tham chiếu: {{ SKUS[sku].name }}{{ refPhotoSrc && !refPhotoFailed ? '' : ' (chưa có ảnh, đối chiếu theo tên)' }}</figcaption>
        </figure>
      </template>

      <label>Ảnh lô hàng (1 ảnh)</label>
      <PhotoInput v-if="lotCheck.ok" v-model="photo" testid="r-photo" />
      <p v-else class="ops-muted" data-testid="photo-locked">Cần mã lô khớp trước khi chụp ảnh.</p>

      <fieldset class="verdict">
        <legend>Kết luận</legend>
        <button type="button" class="ops-btn verdict-pass" :class="{ on: verdict === 'pass' }" :disabled="tempChecked && !tempOk" data-testid="verdict-pass" @click="verdict = 'pass'">Đạt</button>
        <button type="button" class="ops-btn verdict-fail" :class="{ on: verdict === 'fail' }" data-testid="verdict-fail" @click="verdict = 'fail'">Không đạt</button>
      </fieldset>
      <template v-if="verdict === 'fail'">
        <label for="r-reason">Lý do không đạt</label>
        <textarea id="r-reason" v-model="reason" class="ops-input ops-textarea" rows="2" data-testid="r-reason"></textarea>
      </template>

      <p v-if="error" class="ops-error" role="alert" data-testid="r-error">{{ error }}</p>
      <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" data-testid="r-submit">Tạo mã lô</button>
    </form>

    <section class="ops-card" aria-label="Các lô đã nhận">
      <h2>Lô đã nhận</h2>
      <ul class="receipt-list" data-testid="receipt-list">
        <li v-for="r in receiptRows" :key="r.lotCode" class="receipt" :class="{ fail: r.verdict === 'fail' }">
          <PhotoThumbnail v-if="r.photo" :photo="r.photo" alt="Ảnh lô hàng" cls="receipt-photo" />
          <div class="receipt-body">
            <div><strong class="mono">{{ r.lotCode }}</strong>
              <span class="ops-pill" :class="r.verdict === 'pass' ? 'ops-pill-ok' : 'ops-pill-bad'">{{ r.verdict === 'pass' ? 'Đạt' : 'Không đạt' }}</span>
              <span v-if="r.pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
            </div>
            <div>{{ r.name }} · {{ r.weightKg }} kg · {{ r.tempC }}°C</div>
            <div class="ops-muted">{{ kindLabel[r.sourceKind] }} · {{ r.sourceName }} · {{ fmtDeadline(new Date(r.at)) }}</div>
            <div v-if="r.verdict === 'fail'" class="ops-error">{{ r.failReason }}</div>
            <div v-else class="ops-muted">Đã dùng ≈ {{ r.usedKg }} kg · còn ≈ {{ Math.max(0, kg1(r.weightKg - r.usedKg)) }} kg</div>
          </div>
        </li>
        <li v-if="!receiptRows.length" class="ops-muted">Chưa nhận lô nào.</li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { fmtDeadline } from '../../../shared/utils/time';
import { SKUS } from '../../../shared/data/catalog';
import { sourcesForSku } from '../../../shared/data/sources';
import { checkLotCodeMatch, isTempOk, lotUsedKg, nextLotCode, referencePhotoPath } from '../../../shared/domain/factory';
import { BUSINESS } from '../../../shared/config/business';
import { apply, clientNow, hasUnsent } from '../../queue';
import { catalog, factory, snapshot } from '../../factoryStore';
import { photoSrc } from '../../../shared/api/uploads';
import { sourceKindLabel as kindLabel } from '../../format';
import PhotoInput from '../../components/PhotoInput.vue';
import PhotoThumbnail from '../../components/PhotoThumbnail.vue';

const sku = ref('');
const sourceId = ref('');
const weight = ref('');
const temp = ref('');
const photo = ref('');
const verdict = ref('');
const reason = ref('');
const error = ref('');
const done = ref(null);

const kg1 = (n) => Math.round(n * 10) / 10;
const donePending = computed(() => Boolean(done.value) && hasUnsent((a) => a.type === 'receipt' && a.lotCode === done.value.lotCode));

const skuOptions = computed(() =>
  Object.values(SKUS)
    .filter((s) => s.supplierId === 'S-FACTORY' && s.id !== 'BB-THUNG-01')
    .map((s) => ({ key: s.id, name: s.name, requiresLot: Boolean(s.requiresLot) }))
);
const sourceOptions = computed(() => (sku.value ? sourcesForSku(sku.value) : []));

// B14: mã lô đang nhận do hệ thống cấp, người nhận phải nhập/quét đúng mã trên tem mới chụp ảnh được.
const lotInput = ref('');
const knownLotCodes = () => [...(snapshot.value ? snapshot.value.lotCodes : []), ...factory.value.receipts.map((r) => r.lotCode)];
const expectedLot = computed(() => (sku.value ? nextLotCode(sku.value, knownLotCodes(), clientNow()) : ''));
const lotCheck = computed(() => checkLotCodeMatch(expectedLot.value, lotInput.value));
const refPhotoFailed = ref(false);
const refPhotoSrc = computed(() => {
  const p = referencePhotoPath(sku.value);
  return p ? `${import.meta.env.BASE_URL || '/'}${p}` : '';
});
watch(sku, () => {
  lotInput.value = '';
  photo.value = '';
  refPhotoFailed.value = false;
});

const tempChecked = computed(() => temp.value !== '' && Number.isFinite(Number(temp.value)));
const tempOk = computed(() => (sku.value && tempChecked.value ? isTempOk(sku.value, Number(temp.value)) : true));
const limitText = computed(() => {
  if (!sku.value) return '';
  const t = SKUS[sku.value].temp;
  if (t === 'chill') return `Nguyên liệu ngăn mát: nhiệt độ nhận phải từ ${BUSINESS.temperature.chill.max}°C trở xuống mới chọn được Đạt.`;
  if (t === 'frozen') return `Nguyên liệu ngăn đông: nhiệt độ nhận phải từ ${BUSINESS.temperature.frozen.max}°C trở xuống mới chọn được Đạt.`;
  return 'Nguyên liệu nhiệt độ thường: không giới hạn nhiệt độ nhận.';
});

const receiptRows = computed(() => {
  const f = factory.value;
  const cat = catalog.value;
  return [...f.receipts]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((r) => ({
      ...r,
      name: (cat && cat.items[r.sku] && cat.items[r.sku].name) || r.sku,
      usedKg: lotUsedKg(r.lotCode, f.batches, r.sku),
      pending: hasUnsent((a) => a.type === 'receipt' && a.lotCode === r.lotCode)
    }));
});

function reset() {
  sku.value = '';
  sourceId.value = '';
  weight.value = '';
  temp.value = '';
  photo.value = '';
  lotInput.value = '';
  verdict.value = '';
  reason.value = '';
  error.value = '';
}

function submit() {
  error.value = '';
  const w = Number(weight.value);
  const t = Number(temp.value);
  if (!sku.value) return (error.value = 'Chọn nguyên liệu.');
  if (!sourceId.value) return (error.value = 'Chọn nguồn nguyên liệu.');
  if (!(w > 0)) return (error.value = 'Nhập khối lượng nhận (lớn hơn 0).');
  if (temp.value === '' || !Number.isFinite(t)) return (error.value = 'Nhập nhiệt độ lúc nhận.');
  if (!lotCheck.value.ok) return (error.value = lotCheck.value.reason);
  if (!photo.value) return (error.value = 'Chụp 1 ảnh lô hàng.');
  if (!verdict.value) return (error.value = 'Chọn Đạt hoặc Không đạt.');
  if (verdict.value === 'pass' && !tempOk.value) return (error.value = 'Nhiệt độ vượt ngưỡng nên không thể chọn Đạt.');
  if (verdict.value === 'fail' && !reason.value.trim()) return (error.value = 'Ghi lý do không đạt.');

  const at = clientNow();
  const lotCode = nextLotCode(sku.value, knownLotCodes(), at);
  // Giữ đúng mã lô đã đối chiếu (đổi tháng giữa chừng thì bắt nhập lại, không âm thầm đổi mã)
  if (!checkLotCodeMatch(lotCode, lotInput.value).ok) return (error.value = 'Mã lô đã đổi, nhập lại mã lô trên tem.');
  const src = sourceOptions.value.find((s) => s.id === sourceId.value);
  apply('receipt', { at, sku: sku.value, sourceId: sourceId.value, weightKg: w, tempC: t, photo: photo.value, verdict: verdict.value, failReason: reason.value.trim(), lotCode });
  done.value = { lotCode, verdict: verdict.value, name: SKUS[sku.value].name, weightKg: w, tempC: t, sourceName: src ? src.name : '' };
  reset();
}
</script>

<style scoped>
.ref-photo { margin: 8px 0 12px; }
.ref-photo img { display: block; max-width: 100%; max-height: 180px; border-radius: 8px; object-fit: cover; margin-bottom: 4px; }
</style>
