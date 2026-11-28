<template>
  <section class="how" id="cach-hoat-dong">
    <div class="wrap">
      <div class="sec-h">
        <span class="how-kicker">QUY TRÌNH 3 BƯỚC ĐƠN GIẢN</span>
        <h2>Cách hoạt động</h2>
        <p>Ba bước đơn giản. Bạn thấy thực đơn của mình trước khi trả tiền.</p>
      </div>
      <ol class="cards">
        <li
          v-for="(item, idx) in items"
          :key="item.num"
          class="how-card"
          :style="tilts[idx].cardStyle()"
          @pointermove="tilts[idx].onPointerMove"
          @pointerleave="tilts[idx].onPointerLeave"
        >
          <div class="card-glare" aria-hidden="true"></div>
          <div class="card-head">
            <span class="n">{{ item.num }}</span>
            <span class="step-tag">{{ item.tag }}</span>
          </div>
          <b>{{ item.title }}</b>
          <p>{{ item.desc }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';
import { use3dTilt } from '../../composables/use3dTilt';

const weeks = BUSINESS.subscription.defaultWeeks;

const items = [
  {
    num: 1,
    tag: '2 phút khảo sát',
    title: 'Kể về nhà bạn',
    desc: 'Hai phút, vài câu hỏi: nhà mấy người, ai cần lưu ý, kiêng món gì, mỗi tuần nấu mấy bữa.'
  },
  {
    num: 2,
    tag: 'Tuyển chọn riêng',
    title: 'Xem thực đơn do Đầu bếp tuyển chọn cho bạn',
    desc: 'Mâm cơm Việt đủ món đạm, rau, canh, tinh bột, trái cây. Đổi món, thêm đạm hay thêm một bữa Tây ngay trên màn hình.'
  },
  {
    num: 3,
    tag: `Ổn định ${weeks} tuần`,
    title: `Trả trước gói ${weeks} tuần, nhận tận cửa`,
    desc: 'Chọn ngày và khung giờ giao. Trả bằng Fresh Credit, chuyển khoản một lần, hoặc liên kết thẻ để tự trừ từng tuần.'
  }
];

const tilts = [
  use3dTilt({ maxTilt: 5, glareOpacity: 0.1 }),
  use3dTilt({ maxTilt: 5, glareOpacity: 0.1 }),
  use3dTilt({ maxTilt: 5, glareOpacity: 0.1 })
];
</script>

<style scoped>
.how {
  padding: 52px 0 48px;
  background: var(--cream-warm);
}

.sec-h {
  margin-bottom: 24px;
}

.how-kicker {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--green-d);
  background: var(--green-soft);
  border-radius: 999px;
  padding: 5px 12px;
  margin-bottom: 10px;
}

.sec-h h2 {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  color: var(--ink);
}

.sec-h p {
  color: var(--muted);
  font-size: 16px;
  margin-top: 6px;
}

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.how-card {
  position: relative;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 24px;
  display: grid;
  gap: 10px;
  align-content: start;
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease;
  will-change: transform;
}

.how-card:hover {
  border-color: var(--harvest-gold);
  box-shadow: var(--shadow-md);
}

.card-glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle 220px at var(--glare-x, 50%) var(--glare-y, 50%),
    rgba(255, 255, 255, var(--glare-o, 0)),
    transparent 70%
  );
  z-index: 1;
}

.card-head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.n {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--harvest-gold);
  color: var(--text-on-yellow);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 19px;
  box-shadow: 0 4px 10px rgba(217, 175, 8, 0.28);
}

.step-tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--red-orange-d);
  background: var(--orange-soft);
  padding: 4px 10px;
  border-radius: 999px;
}

.cards b {
  position: relative;
  z-index: 2;
  font-size: 18px;
  color: var(--ink);
}

.cards p {
  position: relative;
  z-index: 2;
  font-size: 15.5px;
  color: var(--muted);
  line-height: 1.5;
}

@media (max-width: 860px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .how-card {
    transition: none;
    transform: none !important;
  }
}
</style>
