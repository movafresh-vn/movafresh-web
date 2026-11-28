<template>
  <section class="journey" id="hanh-trinh">
    <div class="wrap">
      <!-- Top Figma Value Ribbon (Butter Cream on Deep Olive) -->
      <div class="value-ribbon" role="list" aria-label="6 cam kết từ trại tới bếp">
        <div v-for="v in highlights" :key="v.label" class="ribbon-item" role="listitem">
          <span class="ribbon-icon" aria-hidden="true">{{ v.icon }}</span>
          <span>{{ v.label }}</span>
        </div>
      </div>

      <div class="sec-h">
        <div>
          <span class="olive-kicker">CHUỖI CUNG ỨNG LẠNH KHÉP KÍN</span>
          <h2>Từ Đắk Lắk đến bếp nhà bạn</h2>
        </div>
        <p>Nhà máy sơ chế theo đơn đã trả tiền, xe lạnh chạy xuyên đêm thẳng về TP.HCM, nên nguyên liệu tới tay bạn còn tươi.</p>
      </div>

      <ol class="steps">
        <li
          v-for="(s, i) in steps"
          :key="s.title"
          class="step-card"
          :class="{ 'is-last': i === steps.length - 1 }"
        >
          <div class="step-top">
            <span class="dot">{{ i + 1 }}</span>
            <span class="when">{{ s.when }}</span>
          </div>
          <b>{{ s.title }}</b>
          <p>{{ s.text }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';

const t = BUSINESS.timings;
const pad = (n) => String(n).padStart(2, '0');
const slotLabels = [...new Set(BUSINESS.zones.flatMap((z) => z.slots.map((s) => s.label)))];

const highlights = [
  { icon: '🥬', label: 'Sơ chế sạch 100%' },
  { icon: '❄️', label: 'Xe lạnh 0–4°C Đắk Lắk' },
  { icon: '🍳', label: 'Nấu gọn 15 phút – 1 chảo' },
  { icon: '🥣', label: 'Gói xốt MOVA định lượng' },
  { icon: '🕒', label: 'Khung giờ xanh tiết kiệm' },
  { icon: '📋', label: 'Chốt giờ giao minh bạch' }
];

// Mọi mốc giờ lấy từ cấu hình vận hành
const steps = [
  {
    when: `${pad(t.cutoffHour)}:${pad(t.cutoffMinute)}, ${t.cutoffDaysBeforeDelivery} ngày trước ngày giao`,
    title: 'Bạn chốt thực đơn',
    text: 'Thực đơn do Đầu bếp thiết kế riêng cho nhà bạn. Bạn đổi món thoải mái cho tới giờ chốt sổ của chuyến giao; app luôn ghi rõ ngày giờ cụ thể.'
  },
  {
    when: 'Tại Đắk Lắk',
    title: 'Sơ chế và đóng gói',
    text: 'Nhà máy cắt, định lượng đúng số người ăn nhà bạn, đóng kèm gói xốt MOVA đặc biệt riêng.'
  },
  {
    when: `${pad(t.truckDepartHour)}:00 ngày trước tới ${pad(t.hubArrivalHour)}:00 sáng`,
    title: 'Xe lạnh xuyên đêm',
    text: 'Một chuyến xe lạnh chạy thẳng từ Đắk Lắk về kho TP.HCM, giữ nguyên chuỗi lạnh suốt hành trình.'
  },
  {
    when: 'Giao tận cửa',
    title: 'Shipper giao đúng khung giờ',
    text: `Bạn chọn khung giờ tiện nhất: ${slotLabels.join('; ')}. MOVA báo lại trước ${BUSINESS.timings.remindBeforeDeliveryHours} giờ.`
  }
];
</script>

<style scoped>
.journey {
  padding: 40px 0 48px;
  background: var(--forest);
  color: var(--text-on-olive);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.value-ribbon {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  background: var(--butter);
  color: var(--text-on-yellow);
  border-radius: 16px;
  padding: 10px 14px;
  margin-bottom: 28px;
  box-shadow: var(--shadow-sm);
}

.ribbon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  text-align: center;
  line-height: 1.25;
}

.ribbon-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.sec-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.olive-kicker {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--butter);
  margin-bottom: 6px;
}

.sec-h h2 {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  color: var(--text-on-olive);
}

.sec-h p {
  color: rgba(255, 255, 255, 0.88);
  max-width: 54ch;
  font-size: 15px;
  line-height: 1.5;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  position: relative;
}

.steps::before {
  content: '';
  position: absolute;
  left: 36px;
  right: 36px;
  top: 42px;
  height: 2px;
  background: repeating-linear-gradient(90deg, rgba(248, 237, 189, 0.65) 0 8px, transparent 8px 14px);
}

.step-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  padding: 18px;
  transition: transform 0.22s ease, background-color 0.22s ease, border-color 0.22s ease;
}

.step-card:hover {
  transform: translate3d(0, -4px, 0);
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(248, 237, 189, 0.55);
}

.step-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.steps .dot {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--forest-d);
  border: 2px solid var(--butter);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--butter);
  flex-shrink: 0;
}

.step-card.is-last .dot {
  background: var(--harvest-gold);
  border-color: var(--harvest-gold);
  color: var(--text-on-yellow);
}

.steps .when {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--butter);
  line-height: 1.3;
}

.steps b {
  display: block;
  font-size: 16.5px;
  font-weight: 800;
  color: var(--text-on-olive);
}

.steps p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
  margin-top: 6px;
  line-height: 1.48;
}

@media (max-width: 1020px) {
  .value-ribbon {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .steps::before {
    display: none;
  }
}

@media (max-width: 640px) {
  .value-ribbon {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-items: start;
  }
  .ribbon-item {
    justify-content: flex-start;
    text-align: left;
  }
  .steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .step-card {
    transition: none;
  }
}
</style>
