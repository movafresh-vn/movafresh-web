<template>
  <section class="samples" id="mam-com-mau">
    <div class="wrap">
      <div class="sec-h">
        <span class="samples-kicker">THỰC ĐƠN ĐẶC SẢN VÙNG MIỀN</span>
        <h2>Vài mâm cơm mẫu chuẩn Đầu bếp MOVA</h2>
        <p>Chỉ để bạn hình dung. Thực đơn thật của nhà bạn do Đầu bếp MOVA tuyển chọn theo khẩu vị và thể trạng riêng của gia đình.</p>
      </div>

      <!-- Banner giới thiệu sơ chế & nấu 15 phút - 1 chảo -->
      <div class="video-card">
        <div
          class="video-banner"
          role="button"
          tabindex="0"
          aria-label="Xem hướng dẫn nấu 15 phút 1 chảo"
          @click="showVideoModal = true"
          @keydown.enter="showVideoModal = true"
          @keydown.space.prevent="showVideoModal = true"
        >
          <span class="watermark" aria-hidden="true">FRESH</span>
          <div class="video-overlay">
            <div class="play-btn-pulse" aria-hidden="true">
              <span class="play-icon">▶</span>
            </div>
            <div class="video-caption">
              <span class="v-badge">BẾP MOVA TRỰC QUAN</span>
              <h3 class="v-title">Sơ chế sạch 100% &amp; Nấu cơm nhà 15 phút — Chỉ 1 chảo</h3>
              <p class="v-desc">Xem cách gia đình bận rộn chỉ mất 15 phút là có mâm cơm 5 món nóng hổi chuẩn vị nhà</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid">
        <article
          v-for="(s, idx) in samples"
          :key="s.title"
          class="sample-card"
          :style="tilts[idx].cardStyle()"
          @pointermove="tilts[idx].onPointerMove"
          @pointerleave="tilts[idx].onPointerLeave"
        >
          <div class="card-glare" aria-hidden="true"></div>
          <div class="sample-media">
            <img
              :src="s.image"
              :alt="s.imageAlt"
              class="sample-img"
              loading="lazy"
              decoding="async"
            />
            <div class="img-badge-overlay">
              <span class="theme-badge">{{ s.theme }}</span>
            </div>
          </div>
          <div class="sample-content">
            <p class="tag">{{ s.title }}</p>
            <MealCard :meal="s.meal" :show-price="false" />
          </div>
        </article>
      </div>

      <div class="more">
        <BaseButton tag="router-link" to="/menus" variant="secondary">Xem toàn bộ thực đơn tuần</BaseButton>
        <BaseButton tag="router-link" to="/plans" variant="orange">Xem thực đơn riêng do Đầu bếp thiết kế</BaseButton>
      </div>

      <!-- Chef Showcase Modal -->
      <div v-if="showVideoModal" class="modal" role="dialog" aria-modal="true" @click.self="showVideoModal = false">
        <div class="video-modal-box">
          <button class="mclose" type="button" @click="showVideoModal = false" aria-label="Đóng hướng dẫn"><X :size="20" aria-hidden="true" /></button>
          <div class="video-frame">
            <div class="chef-player">
              <div class="player-header">
                <span class="rec-dot" aria-hidden="true"></span>
                <b>Đầu bếp MOVA: Nấu Bò Lúc Lắc Tiêu Đen Chư Sê &amp; Cải Xào 15 Phút</b>
              </div>
              <div class="player-screen">
                <img :src="heroDishPreview" alt="Mâm cơm Việt MOVA 5 món" class="player-photo" />
                <div class="steps-overlay">
                  <div class="s-step"><Check :size="14" aria-hidden="true" /> <span>00:00 — Mở túi thịt bò sơ chế sẵn hút chân không</span></div>
                  <div class="s-step"><Check :size="14" aria-hidden="true" /> <span>05:00 — Áp chảo thịt 2 phút, rưới gói xốt tiêu đen Chư Sê</span></div>
                  <div class="s-step"><Check :size="14" aria-hidden="true" /> <span>10:00 — Xào nhanh bông cải xanh baby Đà Lạt trên cùng 1 chảo</span></div>
                  <div class="s-step"><Check :size="14" aria-hidden="true" /> <span>15:00 — Trọn mâm cơm nóng hổi, không bừa bếp rửa dọn</span></div>
                </div>
              </div>
              <div class="player-controls">
                <span>Tổng thời gian chuẩn bị &amp; nấu: 15:00</span>
                <span class="tag-live">1 Chảo • 5 Món</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { Check, X } from 'lucide-vue-next';
import MealCard from '../plans/MealCard.vue';
import BaseButton from '../ui/BaseButton.vue';
import { DISHES, SAUCES } from '../../shared/data/catalog';
import { generateMeals, carbOptionsFor } from '../../shared/domain/mealPlan';
import { rng } from '../../shared/utils/formatters';
import { figmaImg } from '../../shared/utils/assets';
import { use3dTilt } from '../../composables/use3dTilt';

const showVideoModal = ref(false);
const heroDishPreview = figmaImg('meal-mam-com-viet.webp');

const dishView = (id) => (id ? { dish_id: id, name: DISHES[id].name } : undefined);

function build(title, opts, seed, theme, image, imageAlt) {
  const m = generateMeals({ mealsCount: 1, rand: rng(seed), ...opts })[0];
  const protein = DISHES[m.dishes.protein];
  return {
    title,
    theme,
    image,
    imageAlt,
    meal: {
      meal_index: 1,
      day_label: 'Mâm mẫu',
      theme,
      western: false,
      meal_structure: {
        protein_dish: dishView(m.dishes.protein),
        veggie_dish: dishView(m.dishes.veg),
        soup_dish: dishView(m.dishes.soup),
        carb_dish: dishView(m.dishes.carb),
        dessert: dishView(m.dishes.dessert)
      },
      carb_choices: carbOptionsFor(m).map((id) => dishView(id)),
      highlight_sauce: protein.sauce ? { name: SAUCES[protein.sauce].name } : null
    }
  };
}

const samples = [
  build(
    'Cho 1 người',
    { householdSize: 1 },
    11,
    'Suất ăn nấu 1 chảo',
    figmaImg('meal-ga-nuong-mat-ong.webp'),
    'Suất ăn nấu 1 chảo cho 1 người'
  ),
  build(
    'Cho cặp đôi',
    { householdSize: 2 },
    23,
    'Mâm cơm Việt 5 phần',
    figmaImg('meal-mam-com-viet.webp'),
    'Mâm cơm Việt 5 phần cho cặp đôi'
  ),
  build(
    'Cho gia đình, ít tinh bột',
    { householdSize: 4, goals: ['low_carb'] },
    37,
    'Mâm cơm Việt 5 phần',
    figmaImg('meal-salad-vuon-xanh.webp'),
    'Mâm cơm Việt 5 phần ít tinh bột cho gia đình'
  )
];

const tilts = [
  use3dTilt({ maxTilt: 6, glareOpacity: 0.14 }),
  use3dTilt({ maxTilt: 6, glareOpacity: 0.14 }),
  use3dTilt({ maxTilt: 6, glareOpacity: 0.14 })
];
</script>

<style scoped>
.samples {
  padding: 52px 0 48px;
  background: var(--sand);
  border-top: 1px solid var(--line);
}

.sec-h {
  margin-bottom: 22px;
}

.samples-kicker {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--red-orange-d);
  background: var(--orange-soft);
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
  max-width: 60ch;
}

.video-card {
  margin-bottom: 28px;
}

.video-banner {
  min-height: 200px;
  background: linear-gradient(125deg, var(--red-orange-d) 0%, var(--red-orange-dd) 100%);
  border-radius: 22px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 28px 32px;
  box-shadow: var(--shadow-md);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.video-banner:hover {
  transform: translate3d(0, -3px, 0);
  box-shadow: var(--shadow-lg);
}

.watermark {
  position: absolute;
  right: 20px;
  bottom: -18px;
  font-size: clamp(64px, 10vw, 120px);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.08);
  pointer-events: none;
  line-height: 1;
}

.video-overlay {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.play-btn-pulse {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--harvest-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 8px rgba(217, 175, 8, 0.28);
}

.play-icon {
  color: var(--text-on-yellow);
  font-size: 24px;
  margin-left: 3px;
}

.video-caption {
  color: var(--text-on-accent);
}

.v-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  color: var(--butter);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 6px;
}

.v-title {
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 800;
  margin: 4px 0 6px;
  color: var(--text-on-accent);
}

.v-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.92);
  margin: 0;
  max-width: 58ch;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  align-items: stretch;
}

.sample-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease;
  will-change: transform;
}

.sample-card:hover {
  border-color: var(--red-orange);
  box-shadow: var(--shadow-md);
}

.card-glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle 240px at var(--glare-x, 50%) var(--glare-y, 50%),
    rgba(255, 255, 255, var(--glare-o, 0)),
    transparent 70%
  );
  z-index: 3;
}

.sample-media {
  width: 100%;
  aspect-ratio: 16 / 10;
  position: relative;
  overflow: hidden;
  background: var(--cream-warm);
}

.sample-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.sample-card:hover .sample-img {
  transform: scale(1.04);
}

.img-badge-overlay {
  position: absolute;
  bottom: 10px;
  left: 12px;
  z-index: 2;
}

.theme-badge {
  background: rgba(40, 37, 31, 0.84);
  backdrop-filter: blur(4px);
  color: var(--text-on-dark);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 999px;
}

.sample-content {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sample-content .tag {
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 12px;
  color: var(--ink);
}

.sample-content :deep(.meal) {
  border: none;
  padding: 0;
  background: transparent;
  flex: 1;
}

.more {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 980px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .video-banner {
    height: auto;
    padding: 22px;
  }
  .video-overlay {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(24, 21, 17, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.video-modal-box {
  background: var(--ink);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  max-width: 620px;
  width: 100%;
  padding: 24px;
  position: relative;
  color: var(--text-on-dark);
  box-shadow: var(--shadow-lg);
}

.mclose {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.14);
  border: 0;
  border-radius: 999px;
  width: 44px;
  height: 44px;
  color: var(--text-on-dark);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.chef-player {
  display: grid;
  gap: 16px;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  padding-right: 40px;
}

.rec-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--harvest-gold);
  display: inline-block;
  flex-shrink: 0;
}

.player-screen {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.player-photo {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 12px;
}

.steps-overlay {
  text-align: left;
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
}

.s-step {
  display: flex;
  align-items: center;
  gap: 8px;
}

.s-step :deep(svg) {
  color: var(--harvest-gold);
  flex-shrink: 0;
}

.player-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.88);
}

.tag-live {
  background: var(--green-d);
  color: var(--text-on-primary);
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .sample-card,
  .sample-img,
  .video-banner {
    transition: none;
    transform: none !important;
  }
}
</style>
