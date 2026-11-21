<template>
  <section class="week">
    <h1>7 ngày tới</h1>
    <p class="ops-muted">Nhu cầu dự kiến theo mặt hàng, số túi mỗi ngày (ngày chưa chốt sổ là số dự kiến). Với tuần sau, báo xưởng đủ năng lực hay thiếu bao nhiêu túi.</p>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>

    <template v-if="fc">
      <section class="ops-card" aria-label="7 ngày tới">
        <h2>Từ {{ shortDay(fc.days[0].day) }} đến {{ shortDay(fc.days[6].day) }}</h2>
        <div class="strip-head" aria-hidden="true">
          <span class="strip-name"></span>
          <span v-for="d in fc.days" :key="d.day" class="strip-day" :class="{ closed: d.closed }">
            {{ shortDay(d.day).split(' ')[0] }}<small>{{ dm(d.day) }}</small>
          </span>
        </div>
        <div class="strip-boxes">
          <span class="strip-name">Số thùng</span>
          <span v-for="d in fc.days" :key="d.day" class="strip-cell">{{ d.boxes || '·' }}</span>
        </div>
        <div v-for="r in fc.rows" :key="r.key" class="strip-row" :data-key="r.key">
          <span class="strip-name">
            <strong>{{ r.name }}</strong>
            <StickerTag :temp="r.temp" />
          </span>
          <span v-for="d in fc.days" :key="d.day" class="strip-cell" :class="{ 'strip-zero': !r.perDay[d.day] }">{{ r.perDay[d.day] || '·' }}</span>
        </div>
        <p class="ops-muted">Số trong bảng là số túi ({{ legend }}). Ngày có nền xanh đã chốt sổ.</p>
      </section>

      <section class="ops-card" aria-label="Tuần sau">
        <h2>Tuần sau ({{ dm(fc.nextWeek.start) }} – {{ dm(fc.nextWeek.end) }}) <small class="ops-muted">{{ fc.nextWeekBoxes }} thùng dự kiến</small></h2>
        <div v-for="r in nextRows" :key="r.key" class="cap-row" :data-key="r.key">
          <div class="cap-info">
            <strong>{{ r.name }}</strong> <StickerTag :temp="r.temp" />
            <div class="ops-muted" data-testid="cap-need">{{ r.nextWeekBags }} túi × {{ r.bagGrams }}g = {{ kg((r.nextWeekBags * r.bagGrams) / 1000) }} kg</div>
          </div>
          <div class="cap-state">
            <span v-if="state(r.key) && state(r.key).status === 'ok'" class="ops-pill ops-pill-ok">Đủ năng lực</span>
            <span v-else-if="state(r.key)" class="ops-pill ops-pill-bad">Thiếu {{ state(r.key).shortBags }} túi</span>
            <span v-if="pending(r.key)" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
          </div>
          <div class="cap-actions">
            <button class="ops-btn" data-act="ok" @click="setOk(r.key)">Đủ năng lực</button>
            <button class="ops-btn ops-btn-danger" data-act="short" @click="openShort(r.key)">Báo thiếu</button>
          </div>
          <form v-if="editKey === r.key" class="cap-edit" @submit.prevent="saveShort(r)">
            <label :for="`short-${r.key}`">Thiếu bao nhiêu túi (tối đa {{ r.nextWeekBags }})?</label>
            <input :id="`short-${r.key}`" v-model.number="shortBags" class="ops-input" type="number" inputmode="numeric" min="1" :max="r.nextWeekBags" data-testid="short-input" />
            <p v-if="formError" class="ops-error" role="alert">{{ formError }}</p>
            <div class="ops-actions">
              <button class="ops-btn ops-btn-primary" type="submit" data-testid="short-save">Lưu báo thiếu</button>
              <button class="ops-btn" type="button" @click="editKey = ''">Hủy</button>
            </div>
          </form>
        </div>
        <p v-if="!nextRows.length" class="ops-muted">Tuần sau chưa có đơn dự kiến.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { apply, hasUnsent, onQueueChange, online, pendingOps } from '../../queue';
import { overlayFactory, emptyFactory } from '../../../shared/domain/factory';
import { dm, kg, shortDay } from '../../format';
import StickerTag from '../../components/StickerTag.vue';

const fc = ref(null);
const error = ref('');
const editKey = ref('');
const shortBags = ref(1);
const formError = ref('');
const legend = 'túi cỡ chuẩn của xưởng';

async function load() {
  if (!online.value && fc.value) return; // mất mạng: giữ dữ liệu đã tải, lớp phủ lo phần chưa gửi
  try {
    fc.value = await api.ops.factory.forecast(ctx.value);
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

const nextRows = computed(() => (fc.value ? fc.value.rows.filter((r) => r.nextWeekBags > 0) : []));

// Năng lực đã xác nhận + thao tác chưa gửi
const capacity = computed(() => {
  if (!fc.value) return {};
  const base = emptyFactory();
  base.capacity[fc.value.nextWeek.start] = fc.value.capacity;
  return overlayFactory(base, pendingOps.value).capacity[fc.value.nextWeek.start] || {};
});
const state = (key) => capacity.value[key] || null;
const pending = (key) => hasUnsent((a) => a.type === 'capacity' && a.key === key && a.weekStart === (fc.value && fc.value.nextWeek.start));

const setOk = (key) => apply('capacity', { weekStart: fc.value.nextWeek.start, key, status: 'ok' });
function openShort(key) {
  editKey.value = key;
  shortBags.value = 1;
  formError.value = '';
}
function saveShort(r) {
  const n = Math.round(Number(shortBags.value));
  if (!Number.isFinite(n) || n < 1) {
    formError.value = 'Nhập số túi thiếu (từ 1 trở lên).';
    return;
  }
  apply('capacity', { weekStart: fc.value.nextWeek.start, key: r.key, status: 'short', shortBags: n });
  editKey.value = '';
}

let off = null;
onMounted(() => {
  load();
  off = onQueueChange(() => online.value && load());
});
onBeforeUnmount(() => off && off());
</script>
