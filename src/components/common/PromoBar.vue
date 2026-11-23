<template>
  <div class="promo" role="note">
    <div class="wrap">
      <span>
        Đăng ký gói {{ weeks }} tuần, nhận thẻ quà tặng đến <b class="num">{{ fmt(giftMax) }}</b>, chia theo từng tuần.
      </span>
      <router-link to="/plans" class="go">Thiết kế thực đơn</router-link>
    </div>
  </div>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';
import { fmt } from '../../shared/utils/formatters';

const weeks = BUSINESS.subscription.minWeeks;
const giftMax = BUSINESS.incentives.giftCardWeeklyVnd.reduce((a, b) => a + b, 0);
</script>

<style scoped>
.promo { background: var(--green-d); color: var(--white); font-size: 15px; }
.promo .wrap { display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap; padding-top: 8px; padding-bottom: 8px; text-align: center; }
.go { color: var(--white); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; min-height: 28px; display: inline-flex; align-items: center; }
</style>
