<template>
  <section id="danh-gia" class="pl-card rate" aria-labelledby="rate-title">
    <h2 id="rate-title" class="pl-h2">Món vừa giao, bạn thấy sao?</h2>
    <p class="pl-note">Một chạm là xong. Bếp dùng đánh giá để chỉnh vị xốt cho những tuần sau.</p>

    <div v-for="o in orders" :key="o.order_id" class="lot">
      <h3>Giao {{ o.delivery_label }}</h3>
      <ul class="dishes">
        <li v-for="d in o.dishes" :key="d.dish_id" class="dish">
          <div class="row">
            <span class="dn">{{ d.name }}</span>
            <span class="thumbs">
              <button type="button" class="thumb" :class="{ on: d.rating?.thumb === 'up' }" :aria-pressed="Boolean(d.rating?.thumb === 'up')" :aria-label="`Thích ${d.name}`" @click="rate(o, d, { thumb: 'up' })">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4v-9h3zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/></svg>
              </button>
              <button type="button" class="thumb down" :class="{ on: d.rating?.thumb === 'down' }" :aria-pressed="Boolean(d.rating?.thumb === 'down')" :aria-label="`Chưa thích ${d.name}`" @click="rate(o, d, { thumb: 'down' })">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 13V4h3v9h-3zM17 13l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 4H17"/></svg>
              </button>
            </span>
          </div>
          <div v-if="d.sauce_code" class="taste">
            <div class="grp" role="group" :aria-label="`Vị ${d.sauce_name}`">
              <span class="gl">Xốt: {{ d.sauce_name }}</span>
              <button v-for="s in SALT" :key="s.id" type="button" class="pl-chip sm" :class="{ on: d.rating?.sauce_salt === s.id }" :aria-pressed="Boolean(d.rating?.sauce_salt === s.id)" @click="rate(o, d, { sauce_salt: s.id })">{{ s.label }}</button>
            </div>
            <div class="grp" role="group" aria-label="Độ cay">
              <span class="gl">Cay</span>
              <button v-for="s in SPICE" :key="s.id" type="button" class="pl-chip sm" :class="{ on: d.rating?.spice === s.id }" :aria-pressed="Boolean(d.rating?.spice === s.id)" @click="rate(o, d, { spice: s.id })">{{ s.label }}</button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { api } from '../../shared/api';
import { useMovaStore } from '../../stores/useMovaStore';

defineProps({ orders: { type: Array, required: true } });
const emit = defineEmits(['rated']);
const store = useMovaStore();

const SALT = [{ id: 'salty', label: 'Mặn' }, { id: 'ok', label: 'Vừa' }, { id: 'bland', label: 'Nhạt' }];
const SPICE = [{ id: 'low', label: 'Ít' }, { id: 'ok', label: 'Vừa' }, { id: 'high', label: 'Nhiều' }];

async function rate(order, dish, patch) {
  const res = await api.customer.rateDish({ order_id: order.order_id, dish_id: dish.dish_id, ...patch });
  if (res.status === 'error') {
    store.toast(res.error.message);
    return;
  }
  dish.rating = { thumb: res.data.thumb, sauce_salt: res.data.sauce_salt, spice: res.data.spice };
  // Máy chủ nhận một đánh giá đủ ba phần: chấm đủ thích, vị xốt và độ cay thì mới gửi.
  if (!res.data.complete) {
    store.toast('Chọn thêm vị xốt và độ cay để gửi đánh giá');
    return;
  }
  dish.rated = true;
  store.toast('Đã lưu đánh giá, cảm ơn bạn');
  emit('rated');
}
</script>

<style scoped>
.rate { display: grid; gap: 14px; }
.lot { display: grid; gap: 8px; }
h3 { font-size: 17px; font-weight: 800; }
.dishes { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.dish { border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; display: grid; gap: 8px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dn { font-size: 16px; font-weight: 600; }
.thumbs { display: flex; gap: 8px; flex-shrink: 0; }
.thumb {
  width: 48px; height: 48px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--white); color: var(--muted);
  display: grid; place-items: center;
}
.thumb:hover { background: var(--line-2); }
.thumb.on { background: var(--green-soft); border-color: var(--green); color: var(--green-d); }
.thumb.down.on { background: var(--orange-soft); border-color: var(--orange); color: var(--orange-ink); }
.taste { display: grid; gap: 6px; }
.grp { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.gl { font-size: 15px; color: var(--muted); min-width: 100%; }
.pl-chip.sm { min-height: 44px; padding: 8px 16px; font-size: 16px; text-align: center; flex: 1; border-radius: 12px; }
@media (min-width: 641px) {
  .gl { min-width: 0; margin-right: 4px; }
  .pl-chip.sm { flex: 0 0 auto; }
}
</style>
