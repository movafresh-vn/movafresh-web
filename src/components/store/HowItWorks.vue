<template>
  <section class="how" id="cach-hoat-dong">
    <div class="wrap">
      <div class="sec-h">
        <h2>Cách hoạt động</h2>
        <p>Ba bước đơn giản. Bạn thấy thực đơn của mình trước khi trả tiền.</p>
      </div>
      <ol class="cards">
        <li>
          <span class="n">1</span>
          <b>Kể về nhà bạn</b>
          <p>Hai phút, vài câu hỏi: nhà mấy người, ai cần lưu ý, kiêng món gì, mỗi tuần nấu mấy bữa.</p>
        </li>
        <li>
          <span class="n">2</span>
          <b>Xem thực đơn do Đầu bếp tuyển chọn cho bạn</b>
          <p>Mâm cơm Việt đủ món đạm, rau, canh, tinh bột, trái cây. Đổi món, thêm đạm hay thêm một bữa Tây ngay trên màn hình.</p>
        </li>
        <li>
          <span class="n">3</span>
          <b>Trả trước gói {{ weeks }} tuần, nhận tận cửa</b>
          <p>Chọn ngày và khung giờ giao. Trả bằng Fresh Credit, chuyển khoản một lần, hoặc liên kết thẻ để tự trừ từng tuần.</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';

const weeks = BUSINESS.subscription.defaultWeeks;
</script>

<style scoped>
.how { padding: 40px 0 8px; }
.sec-h { margin-bottom: 18px; }
.sec-h h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; }
.sec-h p { color: var(--muted); font-size: 16px; margin-top: 4px; }
.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.cards li { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px; display: grid; gap: 8px; align-content: start; }
.n { width: 40px; height: 40px; border-radius: 50%; background: var(--green-d); color: var(--white); display: grid; place-items: center; font-weight: 800; font-size: 18px; }
.cards b { font-size: 18px; }
.cards p { font-size: 16px; color: var(--muted); }
@media (max-width: 820px) { .cards { grid-template-columns: minmax(0, 1fr); } }
</style>
