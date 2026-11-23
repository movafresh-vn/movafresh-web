<template>
  <section class="pb" aria-label="Giá trị gói 4 tuần">
    <!-- Khối Tổng gói trên cùng -->
    <div class="pb-title-row">
      <h3 class="pb-label">GÓI {{ quote.weeks }} TUẦN CỦA BẠN</h3>
      <span class="pb-tag">{{ totalMeals }} bữa • {{ totalServings }} suất</span>
    </div>

    <div class="pb-price-main">
      <p class="pb-value num">{{ fmt(quote.package_value_vnd) }}</p>
      <p class="pb-sub-line num">~{{ fmt(perServingList) }}/suất • {{ fmt(perMealList) }}/bữa</p>
    </div>

    <!-- Khối Banner ƯU ĐÃI TUẦN ĐẦU TIÊN -->
    <div class="pb-week1-box">
      <div class="banner-top">
        <span class="badge-deal">ƯU ĐÃI TUẦN ĐẦU TIÊN</span>
        <span v-if="week1Discount > 0" class="badge-discount num">Giảm {{ fmt(week1Discount) }}</span>
      </div>
      <div class="banner-price-row">
        <span class="strike num">{{ fmt(quote.weekly[0]?.list_vnd) }}</span>
        <span class="arrow">→</span>
        <b class="highlight num">{{ fmt(quote.week1_pay_vnd) }}</b>
      </div>
      <p class="banner-sub-rate num">~{{ fmt(week1ServingRate) }}/suất • {{ fmt(week1MealRate) }}/bữa</p>
    </div>

    <!-- 4 dòng chi tiết Tuần 1 – Tuần 4 (Bố cục 2 tầng sạch sẽ) -->
    <ol class="pb-weeks">
      <li v-for="w in quote.weekly" :key="w.week_index" class="week-row">
        <!-- Tầng 1 (Flex space-between): Trái = Tuần 1 (+ tag) | Phải = Gốc gạch ngang + Thực trả đóng khung -->
        <div class="week-tier-1">
          <div class="week-title-wrap">
            <span class="wk">Tuần {{ w.week_index + 1 }}</span>
            <span v-if="w.week_index === 0" class="deal-pill">Ưu đãi lớn</span>
          </div>
          <div class="week-price-wrap num">
            <span v-if="w.gift_vnd" class="strike small">{{ fmt(w.list_vnd) }}</span>
            <b class="pay-framed">{{ fmt(w.pay_vnd) }}</b>
          </div>
        </div>

        <!-- Tầng 2 (Flex space-between, chữ nhỏ 12px): Trái = Thẻ quà tặng | Phải = Đơn giá gọn 48.4k/suất • 96.8k/bữa -->
        <div class="week-tier-2">
          <span v-if="w.gift_vnd" class="gift-tag num">Thẻ quà tặng −{{ fmt(w.gift_vnd) }}</span>
          <span v-else class="normal-tag">Giá chuẩn</span>
          <span class="compact-rate num">
            {{ kFormat(weekServingRate(w.pay_vnd)) }}/suất • {{ kFormat(weekMealRate(w.pay_vnd)) }}/bữa
          </span>
        </div>
      </li>
    </ol>

    <!-- Giá mỗi bữa ăn trung bình -->
    <div class="pb-meal">
      <span class="meal-tag">Giá mỗi bữa ăn cả hộ</span>
      <p class="meal-calc">
        Gốc <s class="num">{{ fmt(quote.per_meal_list_vnd) }}</s> → Bạn chỉ trả
        <b class="num text-green">{{ fmt(quote.per_meal_pay_vnd) }}</b>
        <span class="serving-rate num"> (~{{ fmt(Math.round(quote.per_meal_pay_vnd / effectiveHouseholdSize)) }}/suất)</span>
      </p>
      <small class="muted">Đã gồm sơ chế sạch 100%, định lượng chuẩn &amp; gói xốt MOVA đặc biệt</small>
    </div>

    <!-- Nạp Fresh Credit -->
    <p class="pb-fc">
      💡 Nạp Fresh Credit nhận <b class="num">{{ fmt(quote.fresh_credit.credit_received_vnd) }}</b>,
      chỉ trả <b class="num">{{ fmt(quote.fresh_credit.pay_vnd) }}</b>
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { fmt } from '../../shared/utils/formatters';

const props = defineProps({
  quote: { type: Object, required: true },
  householdSize: { type: Number, default: 2 }
});

const effectiveHouseholdSize = computed(() => props.householdSize || 2);
const mealsCount = computed(() => props.quote.meals_per_week || 5);
const weeksCount = computed(() => props.quote.weeks || 4);

const totalMeals = computed(() => weeksCount.value * mealsCount.value);
const totalServings = computed(() => totalMeals.value * effectiveHouseholdSize.value);

const perMealList = computed(() => props.quote.per_meal_list_vnd);
const perServingList = computed(() => Math.round(perMealList.value / effectiveHouseholdSize.value));

const week1List = computed(() => props.quote.weekly[0]?.list_vnd || 0);
const week1Pay = computed(() => props.quote.week1_pay_vnd || 0);
const week1Discount = computed(() => {
  return (props.quote.weekly[0]?.gift_vnd || 0) || Math.max(0, week1List.value - week1Pay.value);
});

const week1MealRate = computed(() => Math.round(week1Pay.value / mealsCount.value));
const week1ServingRate = computed(() => Math.round(week1MealRate.value / effectiveHouseholdSize.value));

function weekMealRate(vnd) {
  return Math.round(vnd / mealsCount.value);
}

function weekServingRate(vnd) {
  return Math.round(weekMealRate(vnd) / effectiveHouseholdSize.value);
}

function kFormat(vnd) {
  if (!vnd) return '0k';
  const val = vnd / 1000;
  const rounded = Math.round(val * 10) / 10;
  return `${rounded}k`;
}
</script>

<style scoped>
.pb {
  background: var(--card);
  border: 1.5px solid var(--green);
  border-radius: 18px;
  padding: 18px;
  display: grid;
  gap: 12px;
}

.pb-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pb-label {
  font-size: 14px;
  font-weight: 800;
  color: var(--green-d);
  text-transform: uppercase;
  letter-spacing: .03em;
  margin: 0;
}
.pb-tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.pb-price-main {
  display: grid;
  gap: 2px;
}
.pb-value {
  font-size: clamp(30px, 5vw, 36px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.02em;
  color: var(--ink);
  margin: 0;
}
.pb-sub-line {
  font-size: 14px;
  color: var(--ink-2);
  font-weight: 600;
  margin: 0;
}

/* Banner Tuần 1 */
.pb-week1-box {
  background: var(--amber-soft);
  border: 1px solid var(--amber-soft);
  border-radius: 12px;
  padding: 10px 14px;
  display: grid;
  gap: 4px;
}
.banner-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.badge-deal {
  font-size: 11px;
  font-weight: 800;
  color: var(--red-orange-d);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-discount {
  font-size: 11px;
  font-weight: 800;
  color: var(--white);
  background: var(--orange);
  padding: 1px 7px;
  border-radius: 99px;
}
.banner-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}
.strike {
  text-decoration: line-through;
  color: var(--muted);
}
.strike.small {
  font-size: 12px;
  margin-right: 6px;
}
.arrow {
  color: var(--muted);
  font-size: 13px;
}
.highlight {
  font-size: 20px;
  color: var(--red-orange-d);
}
.banner-sub-rate {
  font-size: 13px;
  font-weight: 600;
  color: var(--red-orange-d);
  margin: 0;
}

/* 4 tuần chi tiết - 2 tầng */
.pb-weeks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.week-row {
  display: grid;
  gap: 3px;
  padding: 7px 0;
  border-top: 1px solid var(--line-2);
}
.week-tier-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.week-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.week-row .wk {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
}
.deal-pill {
  font-size: 10px;
  font-weight: 800;
  background: var(--amber-soft);
  color: var(--red-orange-d);
  padding: 1px 6px;
  border-radius: 4px;
}
.week-price-wrap {
  display: flex;
  align-items: baseline;
}
.pay-framed {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 2px 7px;
  border-radius: 6px;
}

.week-tier-2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.gift-tag {
  color: var(--green-d);
  font-weight: 700;
}
.normal-tag {
  color: var(--muted);
}
.compact-rate {
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}

/* Giá mỗi bữa */
.pb-meal {
  font-size: 13px;
  border-top: 1px solid var(--line-2);
  padding-top: 8px;
  display: grid;
  gap: 3px;
}
.meal-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}
.meal-calc {
  margin: 0;
  line-height: 1.4;
}
.text-green {
  color: var(--green-d);
  font-size: 15px;
}
.serving-rate {
  font-weight: 600;
  color: var(--ink-2);
}

/* Fresh Credit */
.pb-fc {
  font-size: 13px;
  border-top: 1px solid var(--line-2);
  padding-top: 8px;
  margin: 0;
  color: var(--green-d);
  line-height: 1.4;
}
</style>