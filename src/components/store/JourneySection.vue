<template>
  <section class="journey" id="hanh-trinh">
    <div class="wrap">
      <div class="sec-h">
        <h2>Từ Đắk Lắk đến bếp nhà bạn</h2>
        <p>Nhà máy sơ chế theo đơn đã trả tiền, xe lạnh chạy xuyên đêm thẳng về TP.HCM, nên nguyên liệu tới tay bạn còn tươi.</p>
      </div>
      <ol class="steps">
        <li v-for="(s, i) in steps" :key="s.title">
          <span class="dot">{{ i + 1 }}</span>
          <span class="when">{{ s.when }}</span>
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
  padding: 32px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--card);
}

.sec-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.sec-h h2 {
  font-size: clamp(22px, 2.8vw, 30px);
  font-weight: 800;
}

.sec-h p {
  color: var(--muted);
  max-width: 56ch;
  font-size: 14.5px;
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
  content: "";
  position: absolute;
  left: 24px;
  right: 24px;
  top: 22px;
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--green) 0 8px, transparent 8px 14px);
  opacity: .5;
}

.steps li {
  position: relative;
}

.steps .dot {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--green);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--green-d);
  position: relative;
  z-index: 1;
}

.steps li:last-child .dot {
  background: var(--green-d);
  color: var(--white);
}

.steps .when {
  display: block;
  margin-top: 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--orange-ink);
}

.steps b {
  display: block;
  font-size: 15.5px;
  margin-top: 2px;
}

.steps p {
  font-size: 13.5px;
  color: var(--muted);
  margin-top: 4px;
}

@media (max-width: 820px) {
  .steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .steps::before {
    left: 21px;
    right: auto;
    top: 20px;
    bottom: 20px;
    width: 2px;
    height: auto;
    background: repeating-linear-gradient(180deg, var(--green) 0 8px, transparent 8px 14px);
  }
  .steps li {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    column-gap: 14px;
  }
  .steps .when {
    margin-top: 0;
  }
  .steps li > *:not(.dot) {
    grid-column: 2;
  }
  .steps .dot {
    grid-row: 1 / span 3;
  }
}
</style>
