<template>
  <section>
    <h1 class="ops-noprint">Chia khung giờ / tuyến</h1>
    <p class="ops-muted proc-note ops-noprint">
      Thùng đã về kho phụ và ghép xong hải sản được chia theo khung giờ rồi theo tuyến của shipper. Mỗi thùng chia xong thì cất vào kho lạnh ở kệ ghi bên cạnh, rồi in phiếu tuyến cho shipper.
      Muốn lập hoặc chỉnh tuyến thì dùng nút lập tuyến ngay đây hoặc ở Logistics.
    </p>
    <RouteBoard mode="sort" />
  </section>
</template>

<script setup>
import RouteBoard from '../../components/RouteBoard.vue';
</script>
