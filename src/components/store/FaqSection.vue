<template>
  <section class="faq" id="hoi-dap">
    <div class="wrap" style="max-width: 860px">
      <div class="sec-h">
        <h2>Hỏi đáp thường gặp</h2>
      </div>
      <details v-for="f in faqs" :key="f.q">
        <summary>{{ f.q }}</summary>
        <p>{{ f.a }}</p>
      </details>
    </div>
  </section>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';

const t = BUSINESS.timings;
const pad = (n) => String(n).padStart(2, '0');
const cutoff = `${pad(t.cutoffHour)}:${pad(t.cutoffMinute)}`;
const weeks = BUSINESS.subscription.minWeeks;

const faqs = [
  {
    q: 'Nguyên liệu từ Đắk Lắk chở xuống Sài Gòn có còn tươi không?',
    a: `Nhà máy sơ chế theo đơn đã trả tiền, đóng thùng giữ nhiệt rồi lên xe lạnh chạy xuyên đêm, tới kho TP.HCM lúc ${pad(t.hubArrivalHour)}:00 sáng. Nếu thùng hàng tới tay bạn không còn lạnh, MOVA hoàn lại giá trị bữa đó vào Fresh Credit.`
  },
  {
    q: `Vì sao phải đăng ký gói ${weeks} tuần và trả trước?`,
    a: `MOVA chỉ sơ chế khi đơn đã được trả tiền, nên nguyên liệu luôn tươi và không bị bỏ phí. Bốn tuần cũng đủ để cả nhà quen nếp nấu cơm nhà. Bạn trả một lần, hoặc để thẻ tự trừ từng tuần trước giờ giao ${t.chargeBeforeDeliveryHours} giờ.`
  },
  {
    q: 'Fresh Credit là gì, có rút tiền được không?',
    a: 'Fresh Credit là điểm bữa ăn trả trước, chỉ dùng để đổi bữa ăn tại MOVA. Điểm không rút ra tiền mặt và không chuyển cho người khác. Nếu bạn dừng gói, phần tiền bạn đã nạp mà chưa dùng được hoàn lại; phần thưởng thì không hoàn.'
  },
  {
    q: 'Tôi đổi món hoặc hoãn một tuần như thế nào?',
    a: `Bạn đổi món hoặc hoãn tuần trước giờ chốt sổ của chuyến giao (mặc định ${cutoff}, ${t.cutoffDaysBeforeDelivery} ngày trước ngày giao). App luôn ghi ngày giờ cụ thể, ví dụ "trước 08:00 Thứ Sáu 27/11", không ghi chung chung.`
  },
  {
    q: 'Trong hộp có mắm, muối, đường, dầu ăn không?',
    a: 'Không. Bếp nhà bạn đã có sẵn. Hộp MOVA gồm đạm, rau củ, tinh bột, trái cây sơ chế sạch, định lượng đúng số người, cùng gói xốt MOVA đặc biệt riêng cho từng món.'
  },
  {
    q: 'Nhà tôi có người cần ăn ít tinh bột hoặc hạn chế đường thì sao?',
    a: 'Bạn nói với MOVA ngay ở câu hỏi đầu tiên. Đầu bếp MOVA sẽ thiết kế món ít tinh bột, hạn chế đường, đổi cơm sang khoai khi cần. Đây là thực đơn dinh dưỡng cho bữa cơm nhà, không thay thế điều trị của bác sĩ.'
  }
];
</script>

<style scoped>
.faq { padding: 40px 0 60px; }
.sec-h { margin-bottom: 16px; }
.sec-h h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; }
.faq details { background: var(--card); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 10px; }
.faq summary { list-style: none; cursor: pointer; padding: 16px 18px; min-height: 52px; font-weight: 700; font-size: 17px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: "+"; font-size: 24px; line-height: 1; color: var(--green-d); font-weight: 500; }
.faq details[open] summary::after { content: "−"; }
.faq details p { padding: 0 18px 16px; color: var(--muted); max-width: 72ch; font-size: 16px; }
</style>
