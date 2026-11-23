<template>
  <section class="ops-card ops-print-block doc-sheet route-sheet" data-testid="route-sheet">
    <div class="ops-actions ops-noprint">
      <button class="ops-btn ops-btn-primary" type="button" data-testid="print-sheet" @click="print">In phiếu tuyến</button>
      <button class="ops-btn" type="button" @click="$emit('close')">Đóng</button>
    </div>
    <h2 class="doc-title">PHIẾU TUYẾN GIAO HÀNG</h2>
    <p class="doc-sub">Mã tuyến <span class="mono" :title="sheet.id">{{ routeLabel(sheet.id) }}</span> · {{ fmtDay(sheet.day) }} · {{ sheet.slotLabel }}</p>
    <dl class="kv">
      <div><dt>Shipper</dt><dd>{{ sheet.shipperName }}</dd></div>
      <div><dt>Số thùng</dt><dd>{{ sheet.boxes }}</dd></div>
      <div><dt>Ước tính</dt><dd>{{ sheet.estMinutes }} phút</dd></div>
      <div><dt>In lúc</dt><dd>{{ fmtDeadline(new Date(sheet.printedAt)) }}</dd></div>
    </dl>
    <table class="doc-table">
      <thead>
        <tr><th>#</th><th>Mã đơn</th><th>Người nhận</th><th>Địa chỉ</th><th>SĐT</th><th>Phường</th><th class="r">Túi mát / đông</th><th>Kệ</th><th>Ký nhận</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in sheet.stops" :key="s.orderId">
          <td>{{ s.seq }}</td>
          <td class="mono">{{ s.orderId }}</td>
          <td>{{ s.recipient ? s.recipient.name : '' }}</td>
          <td>{{ s.recipient ? s.recipient.address : '' }}</td>
          <td class="mono">{{ s.recipient ? s.recipient.phone : '' }}</td>
          <td>{{ s.ward }}</td>
          <td class="r">{{ s.bagsByTemp ? `${s.bagsByTemp.chill} / ${s.bagsByTemp.frozen}` : '' }}<span v-if="s.seafood"> · hải sản</span></td>
          <td>{{ s.location }}</td>
          <td class="sign-cell"></td>
        </tr>
      </tbody>
    </table>
    <p v-if="sheet.mock" class="doc-sub">Thứ tự điểm theo cụm khu - phường ({{ sheet.engine }}).</p>
    <div class="sign-row">
      <div>Thủ kho phụ<br /><small>(ký, ghi họ tên)</small></div>
      <div>Shipper<br /><small>(ký, ghi họ tên)</small></div>
      <div>Điều phối<br /><small>(ký, ghi họ tên)</small></div>
    </div>
  </section>
</template>

<script setup>
import { fmtDay, fmtDeadline } from '../../shared/utils/time';
import { routeLabel } from '../logisticsUi';

defineProps({ sheet: { type: Object, required: true } });
defineEmits(['close']);

function print() {
  window.print();
}
</script>
