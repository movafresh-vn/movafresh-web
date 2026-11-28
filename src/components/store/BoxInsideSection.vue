<template>
  <section class="box" id="ben-trong">
    <div class="wrap">
      <div class="sec-h">
        <div>
          <span class="box-kicker">TRẢI NGHIỆM BÓC HỘP TRỰC QUAN 3D</span>
          <h2>Bên trong hộp MOVA</h2>
        </div>
        <p>Mỗi bữa là một bộ đủ để nấu ngay. Bạn chỉ cần chảo, bếp và 15 phút.</p>
      </div>

      <div class="box-layout">
        <!-- Mô hình hộp 3D MOVA tương tác theo cuộn trang / chạm -->
        <div class="box-3d-col">
          <MovaBox3D />
        </div>

        <!-- 4 lớp nguyên liệu với hình ảnh thực tế sắc nét -->
        <div class="boxgrid">
          <div class="bx">
            <div class="bx-media">
              <img :src="imgProtein" alt="Đạm sơ chế sạch định lượng chuẩn" class="bx-photo" loading="lazy" decoding="async" />
              <span class="bx-tag">Hút chân không</span>
            </div>
            <b>Đạm sơ chế sạch</b>
            <p>Thịt, cá cắt miếng chuẩn cỡ, định lượng đúng số người ăn. Mở hộp ra là nấu.</p>
          </div>

          <div class="bx">
            <div class="bx-media is-cutout">
              <img :src="imgGreens" alt="Rau củ sơ chế và trái cây theo mùa" class="bx-photo" loading="lazy" decoding="async" />
              <span class="bx-tag">Rửa sạch 100%</span>
            </div>
            <b>Rau củ và trái cây</b>
            <p>Rau củ rửa sạch, cắt sẵn; trái cây theo mùa. Nấu xong là có mâm cơm đủ sắc.</p>
          </div>

          <div class="bx">
            <div class="bx-media">
              <img :src="imgSauce" alt="Gói xốt MOVA đặc biệt chuẩn vị" class="bx-photo" loading="lazy" decoding="async" />
              <span class="bx-tag">Độc quyền MOVA</span>
            </div>
            <b>Gói xốt MOVA đặc biệt</b>
            <p>Mỗi món một gói xốt đặc biệt của MOVA. Mắm, muối, đường, dầu ăn bếp nhà bạn đã có nên MOVA không đóng kèm.</p>
          </div>

          <div class="bx">
            <div class="bx-media">
              <img :src="imgColdbox" alt="Nông sản giữ lạnh 0-4°C với đá gel -18°C" class="bx-photo" loading="lazy" decoding="async" />
              <span class="bx-tag cold"><Snowflake :size="13" aria-hidden="true" /> -18°C · 0–4°C</span>
            </div>
            <b>Thùng giữ nhiệt &amp; đá gel -18°C</b>
            <p>Đá gel cấp đông −18°C giữ thực phẩm trong khoảng 0–4°C suốt 16 giờ xuyên đêm.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Snowflake } from 'lucide-vue-next';
import MovaBox3D from './MovaBox3D.vue';
import { figmaImg } from '../../shared/utils/assets';

const imgProtein = figmaImg('brand-salmon-plate.webp');
const imgGreens = figmaImg('produce-basket-cutout.png');
const imgSauce = figmaImg('brand-chef-bowls.webp');
const imgColdbox = figmaImg('brand-farm-harvest.webp');
</script>

<style scoped>
.box {
  padding: 52px 0;
  background: var(--harvest-gold);
  color: var(--text-on-yellow);
  border-top: 1px solid rgba(40, 37, 31, 0.12);
  border-bottom: 1px solid rgba(40, 37, 31, 0.12);
}

.sec-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.box-kicker {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  background: rgba(40, 37, 31, 0.12);
  color: var(--text-on-yellow);
  border-radius: 999px;
  padding: 4px 12px;
  margin-bottom: 8px;
}

.sec-h h2 {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  color: var(--text-on-yellow);
}

.sec-h p {
  color: rgba(40, 37, 31, 0.9);
  max-width: 52ch;
  font-size: 15.5px;
  font-weight: 500;
}

.box-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 22px;
  align-items: stretch;
}

.box-3d-col {
  min-width: 0;
}

.boxgrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  min-width: 0;
}

.bx {
  border: 1px solid rgba(40, 37, 31, 0.14);
  border-radius: 20px;
  padding: 14px 16px 18px;
  background: var(--card);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bx:hover {
  transform: translate3d(0, -3px, 0);
  box-shadow: var(--shadow-md);
}

.bx-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 14px;
  overflow: hidden;
  background: var(--cream-warm);
  border: 1px solid var(--line-2);
  margin-bottom: 13px;
}

.bx-media.is-cutout {
  background: linear-gradient(145deg, var(--green-tint) 0%, var(--cream-warm) 100%);
  padding: 8px;
}

.bx-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.bx-media.is-cutout .bx-photo {
  object-fit: contain;
}

.bx:hover .bx-photo {
  transform: scale(1.03);
}

.bx-tag {
  position: absolute;
  left: 9px;
  bottom: 9px;
  background: rgba(24, 32, 27, 0.84);
  color: var(--text-on-dark);
  backdrop-filter: blur(6px);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.bx-tag.cold {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(29, 111, 165, 0.92);
}

.bx b {
  display: block;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}

.bx p {
  font-size: 14px;
  color: var(--muted);
  margin-top: 6px;
  line-height: 1.48;
}

@media (max-width: 980px) {
  .box-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .box {
    padding: 36px 0;
  }
  .boxgrid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bx,
  .bx-photo {
    transition: none;
  }
}
</style>
