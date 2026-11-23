<template>
  <article class="box-label" data-testid="box-label">
    <header class="box-label-head">
      <div class="box-label-code" data-testid="box-code">{{ list.orderId }}</div>
      <div class="box-label-qr"><QrCode :value="list.orderId" label="Mã vạch đơn" /></div>
    </header>
    <dl class="box-label-info">
      <div><dt>Khu</dt><dd>{{ zone }}</dd></div>
      <div><dt>Khung giờ giao</dt><dd>{{ slot }}</dd></div>
      <div><dt>Ngày giao</dt><dd>{{ fmtDay(list.deliveryDay) }}</dd></div>
      <div><dt>Chuyến xe</dt><dd>{{ tripLabel }}</dd></div>
      <div v-if="lab"><dt>Batch_ID</dt><dd class="mono" data-testid="label-batch">{{ lab.batchId }}</dd></div>
      <div v-if="lab"><dt>Route_ID</dt><dd class="mono" data-testid="label-route">{{ lab.routeId || '—' }}</dd></div>
      <div v-if="lab"><dt>Lot_IDs</dt><dd class="mono" data-testid="label-lots">{{ lab.lotIds.length ? lab.lotIds.join(', ') : '—' }}</dd></div>
    </dl>
    <div class="box-label-bags">
      <div v-for="g in groups" :key="g.temp" class="box-label-bag" :class="`box-bag-${g.color}`">
        <span class="box-bag-swatch" aria-hidden="true"></span>
        <span class="box-bag-text">{{ g.text }}</span>
        <strong class="box-bag-n">{{ g.n }} túi</strong>
      </div>
      <div class="box-label-total">Tổng {{ list.workshopBags }} túi</div>
    </div>
    <p v-if="hubBags" class="box-label-hub">Kho phụ TP.HCM ghép thêm hải sản vào thùng này.</p>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import QrCode from '../../components/common/QrCode.vue';
import { BUSINESS } from '../../shared/config/business';
import { fmtDay } from '../../shared/utils/time';
import { labels, slotLabel, zoneName } from '../factoryStore';
import { hhmm } from '../format';

// Nhãn thùng của xưởng chỉ có mã đơn, khu, khung giờ và số túi mỗi màu: KHÔNG có tên, SĐT, địa chỉ khách.
const props = defineProps({
  list: { type: Object, required: true },
  trip: { type: Object, default: null }
});

const TEXT = { chill: 'Sticker xanh lá (ngăn mát)', frozen: 'Sticker xanh dương (ngăn đông)', ambient: 'Không dán sticker (nhiệt độ thường)' };
const groups = computed(() =>
  ['chill', 'frozen', 'ambient']
    .filter((t) => props.list.bagsByTemp[t] > 0)
    .map((t) => ({ temp: t, n: props.list.bagsByTemp[t], text: TEXT[t], color: (BUSINESS.stickers[t] && BUSINESS.stickers[t].color) || 'none' }))
);
// Order_Code, Batch_ID, Route_ID, Lot_IDs của máy chủ (GET /ops/batches/:date/labels). Không bao giờ có tên, SĐT, địa chỉ khách.
const lab = computed(() => labels.value[props.list.orderId] || null);
const zone = computed(() => zoneName(props.list.zoneId));
const slot = computed(() => slotLabel(props.list.zoneId, props.list.slotId));
const tripLabel = computed(() => (props.trip ? `${props.trip.label} · xe rời ${hhmm(props.trip.departAt)}` : props.list.tripId));
const hubBags = computed(() => props.list.items.some((i) => i.hub));
</script>
