<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="season-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng"><X :size="18" aria-hidden="true" /></button>
      <h2 id="season-title" class="pl-h2">{{ offer.title }}</h2>

      <template v-if="picks.length">
        <p class="pl-lead">Nguyên liệu đang vào mùa, Đầu bếp MOVA gợi ý cho thực đơn của bạn:</p>
        <ul class="picks" data-testid="seasonal-picks">
          <li v-for="p in picks" :key="p.dish.id">
            <b>{{ p.dish.name }}</b>
            <small class="muted">Nguyên liệu mùa: {{ p.ingredient }}</small>
          </li>
        </ul>
      </template>

      <p class="pl-note">{{ offer.body }}</p>

      <div class="btns">
        <button class="pl-btn primary" type="button" data-testid="lock-menu-accept" @click="$emit('accept')">{{ offer.accept }}</button>
        <button class="pl-btn" type="button" @click="$emit('decline')">{{ offer.decline }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next';
import { LOCK_MENU_OFFER } from '../../shared/domain/campaign';

// Popup chiến dịch: chỉ được mở khi chiến dịch đang chạy (cha kiểm campaignActive). Chấp nhận = gửi lock_menu khi tạo gói.
defineProps({
  picks: { type: Array, default: () => [] }, // [{ dish, ingredient }] từ seasonalDishes()
  offer: { type: Object, default: () => LOCK_MENU_OFFER }
});
defineEmits(['accept', 'decline', 'close']);
</script>

<style scoped>
.box { max-width: 500px; padding: 26px 20px; display: grid; gap: 14px; }
.picks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.picks li { display: grid; gap: 2px; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 12px; background: var(--green-soft); }
.btns { display: grid; gap: 10px; }
</style>
