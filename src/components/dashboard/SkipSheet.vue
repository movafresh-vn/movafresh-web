<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="skip-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng"><X :size="18" aria-hidden="true" /></button>
      <h2 id="skip-title" class="pl-h2">Tạm hoãn Tuần {{ week.number }}</h2>

      <p v-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>
      <p v-else-if="!preview" class="pl-note">Đang tính toán lịch giao mới...</p>
      <template v-else>
        <p class="pl-lead">Thực đơn tuần này không mất. MOVA dời nguyên cả tuần xuống cuối gói và giữ ưu đãi.</p>
        <div class="pl-panel good">
          <p v-for="d in preview.new_deliveries" :key="d.delivery_date">Giao lại: <b>{{ d.delivery_label }}</b></p>
          <p>Các tuần sau giữ nguyên ngày giao. Gói kéo dài thêm một tuần.</p>
          <p v-if="preview.keeps_discount_vnd > 0" class="num">Ưu đãi {{ fmt(preview.keeps_discount_vnd) }} của tuần này vẫn còn.</p>
          <p>Sau lần này bạn còn {{ preview.skips_left }} lượt tạm hoãn trong chu kỳ.</p>
        </div>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <div class="btns">
          <button class="pl-btn primary" type="button" :disabled="busy" @click="confirm">Xác nhận tạm hoãn</button>
          <button class="pl-btn" type="button" @click="$emit('close')">Giữ nguyên tuần này</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { X } from 'lucide-vue-next';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const props = defineProps({ week: { type: Object, required: true } });
const emit = defineEmits(['close', 'done']);
const store = useMovaStore();

const req = { subscription_id: props.week.subscription_id, week_index: props.week.week_index };
const loadError = ref('');
const preview = ref(null);
const error = ref('');
const busy = ref(false);

onMounted(async () => {
  const p = await api.customer.previewSkip(req);
  if (p.status === 'error') loadError.value = p.error?.message || 'Không thể tải thông tin tạm hoãn';
  else preview.value = p.data;
});

async function confirm() {
  busy.value = true;
  const r = await api.customer.skipWeek(req);
  busy.value = false;
  if (r.status === 'error') {
    error.value = r.error?.message || 'Có lỗi xảy ra khi tạm hoãn';
    return;
  }
  await store.refresh();
  const newDateLabel = r.data.new_deliveries?.[0]?.delivery_label || r.data.new_week?.delivery_date || '';
  store.toast(`Đã tạm hoãn tuần ${props.week.number}${newDateLabel ? ', giao lại ' + newDateLabel : ''}`);
  emit('done', r.data);
}
</script>

<style scoped>
.box { max-width: 500px; padding: 26px 20px; display: grid; gap: 14px; }
.btns { display: grid; gap: 10px; }
</style>
