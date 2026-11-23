<template>
  <section class="proc fin">
    <nav class="ops-subnav ops-noprint" aria-label="Tài chính & kế toán">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">
        {{ t.title }}<span v-if="badge[t.key]" class="lg-badge" :data-badge="t.key">{{ badge[t.key] }}</span>
      </RouterLink>
    </nav>
    <RouterView />
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { api } from '../../../shared/api';
import { ctx } from '../../session';
import { useLive } from '../../useLive';

const tabs = [
  { key: 'credit', to: '/tai-chinh', title: 'Sổ Fresh Credit' },
  { key: 'bank', to: '/tai-chinh/thu-tien', title: 'Thu tiền & đối soát' },
  { key: 'revenue', to: '/tai-chinh/doanh-thu', title: 'Doanh thu & hóa đơn' },
  { key: 'margin', to: '/tai-chinh/gia-von', title: 'Giá vốn & margin' },
  { key: 'costing', to: '/tai-chinh/gia-von-mon', title: 'Giá vốn món' },
  { key: 'payables', to: '/tai-chinh/cong-no', title: 'Công nợ & đợt chi' },
  { key: 'cashflow', to: '/tai-chinh/dong-tien', title: 'Dòng tiền' },
  { key: 'journal', to: '/tai-chinh/xuat-but-toan', title: 'Xuất bút toán' },
  { key: 'settings', to: '/tai-chinh/cai-dat', title: 'Cài đặt' }
];

// Số việc đang chờ kế toán: giao dịch chờ khớp tay, yêu cầu điều chỉnh chờ duyệt
const badge = reactive({ bank: 0, credit: 0 });

useLive(async () => {
  try {
    const [rec, cred] = await Promise.all([api.ops.finance.reconciliation(ctx.value), api.ops.finance.creditSummary(ctx.value)]);
    badge.bank = rec.queue.length;
    badge.credit = cred.pendingAdjustments;
  } catch {
    // dữ liệu chưa sẵn: bỏ số
  }
});
</script>
