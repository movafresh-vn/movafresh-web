<template>
  <section class="samples" id="mam-com-mau">
    <div class="wrap">
      <div class="sec-h">
        <h2>Vài mâm cơm mẫu chuẩn Đầu bếp MOVA</h2>
        <p>Chỉ để bạn hình dung. Thực đơn thật của nhà bạn do Đầu bếp MOVA tuyển chọn theo khẩu vị và thể trạng riêng của gia đình.</p>
      </div>

      <!-- Video giới thiệu sơ chế & nấu 15 phút - 1 chảo -->
      <div class="video-card">
        <div class="video-banner" @click="showVideoModal = true" role="button" tabindex="0" aria-label="Xem video nấu 15 phút 1 chảo">
          <div class="video-overlay">
            <div class="play-btn-pulse">
              <span class="play-icon">▶</span>
            </div>
            <div class="video-caption">
              <span class="v-badge">VIDEO ĐẦU BẾP HƯỚNG DẪN</span>
              <h3 class="v-title">Sơ chế sạch 100% & Nấu cơm nhà 15 phút — Chỉ 1 chảo</h3>
              <p class="v-desc">Xem cách mẹ bận rộn và dân văn phòng chỉ mất 15 phút là có mâm cơm nóng hổi chuẩn vị</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid">
        <div v-for="s in samples" :key="s.title" class="sample-card">
          <div class="sample-media">
            <img
              :src="s.image"
              :alt="s.imageAlt"
              class="sample-img"
              loading="lazy"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <div class="sample-fallback-gradient" aria-hidden="true">
              <span class="fallback-icon">🍲</span>
            </div>
            <div class="img-badge-overlay">
              <span class="theme-badge">{{ s.theme }}</span>
            </div>
          </div>
          <div class="sample-content">
            <p class="tag">{{ s.title }}</p>
            <MealCard :meal="s.meal" :show-price="false" />
          </div>
        </div>
      </div>

      <p class="more">
        <router-link to="/menus" class="pl-btn outline" style="margin-right: 10px;">Xem toàn bộ thực đơn tuần</router-link>
        <router-link to="/plans" class="pl-btn primary">Xem thực đơn riêng do Đầu bếp thiết kế</router-link>
      </p>

      <!-- Video Modal -->
      <div v-if="showVideoModal" class="modal" role="dialog" aria-modal="true" @click.self="showVideoModal = false">
        <div class="video-modal-box">
          <button class="mclose" type="button" @click="showVideoModal = false" aria-label="Đóng video">×</button>
          <div class="video-frame">
            <div class="mock-player">
              <div class="player-header">
                <span class="rec-dot"></span>
                <b>Đầu bếp MOVA: Nấu Bò Lúc Lắc Tiêu Đen & Cải Xào 15 Phút</b>
              </div>
              <div class="player-screen">
                <div class="pan-animation">
                  <div class="pan-graphic">🍳</div>
                  <div class="sizzle-text">🔥 Đang xào áp chảo 1 phút... Xốt Tiêu Đen Chư Sê quyện vị!</div>
                </div>
                <div class="steps-overlay">
                  <div class="s-step">✓ 00:00 - Mở túi thịt bò sơ chế sẵn hút chân không</div>
                  <div class="s-step">✓ 05:00 - Áp chảo thịt 2 phút, thêm xốt tiêu đen</div>
                  <div class="s-step">✓ 10:00 - Xào nhanh bông cải xanh baby Đà Lạt</div>
                  <div class="s-step">✓ 15:00 - Mâm cơm hoàn tất, thơm lừng không dọn rửa nhiều</div>
                </div>
              </div>
              <div class="player-controls">
                <span>02:15 / 15:00</span>
                <span class="tag-live">Chuẩn vị Á Đông</span>
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
import MealCard from '../plans/MealCard.vue';
import { DISHES, SAUCES } from '../../shared/data/catalog';
import { generateMeals, carbOptionsFor } from '../../shared/domain/mealPlan';
import { rng } from '../../shared/utils/formatters';

const showVideoModal = ref(false);

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
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
    'Suất ăn nấu 1 chảo cho 1 người'
  ),
  build(
    'Cho cặp đôi',
    { householdSize: 2 },
    23,
    'Mâm cơm Việt 5 phần',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=80',
    'Mâm cơm Việt 5 phần cho cặp đôi'
  ),
  build(
    'Cho gia đình, ít tinh bột',
    { householdSize: 4, goals: ['low_carb'] },
    37,
    'Mâm cơm Việt 5 phần',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80',
    'Mâm cơm Việt 5 phần cho gia đình'
  )
];
</script>

<style scoped>
.samples { padding: 40px 0 8px; }
.sec-h { margin-bottom: 20px; }
.sec-h h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; }
.sec-h p { color: var(--muted); font-size: 16px; margin-top: 4px; }

.video-card { margin-bottom: 28px; }
.video-banner {
  height: 220px;
  background: linear-gradient(135deg, #1C3325 0%, #2D5A3D 100%);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 24px 32px;
  box-shadow: 0 10px 24px rgba(28, 51, 37, 0.15);
  transition: transform .2s ease, box-shadow .2s ease;
}
.video-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(28, 51, 37, 0.22);
}
.video-overlay {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
}
.play-btn-pulse {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--orange, #E87A3E);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 8px rgba(232, 122, 62, 0.3);
  animation: pulse 2s infinite;
}
.play-icon {
  color: #fff;
  font-size: 26px;
  margin-left: 4px;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(232, 122, 62, 0.5); }
  70% { box-shadow: 0 0 0 14px rgba(232, 122, 62, 0); }
  100% { box-shadow: 0 0 0 0 rgba(232, 122, 62, 0); }
}
.video-caption { color: #fff; }
.v-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  color: #FFD29D;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .05em;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
}
.v-title {
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 800;
  margin: 4px 0 6px;
  color: #FFFFFF;
}
.v-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
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
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  transition: transform .2s ease, box-shadow .2s ease;
}
.sample-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.sample-media {
  width: 100%;
  aspect-ratio: 16 / 10;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #2D5A3D 0%, #1C3325 100%);
}
.sample-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .3s ease;
}
.sample-card:hover .sample-img {
  transform: scale(1.03);
}
.sample-fallback-gradient {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
}
.fallback-icon {
  font-size: 38px;
  opacity: 0.8;
}
.img-badge-overlay {
  position: absolute;
  bottom: 10px;
  left: 12px;
  z-index: 2;
}
.theme-badge {
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}
.sample-content {
  padding: 16px;
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
.more { margin-top: 24px; text-align: center; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.video-modal-box {
  background: #18221B;
  border-radius: 20px;
  max-width: 640px;
  width: 100%;
  padding: 24px;
  position: relative;
  color: #fff;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}
.mclose {
  position: absolute;
  top: 14px;
  right: 18px;
  background: transparent;
  border: 0;
  color: #fff;
  font-size: 32px;
  cursor: pointer;
}
.mock-player {
  display: grid;
  gap: 16px;
}
.player-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}
.rec-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #E53E3E;
  display: inline-block;
  animation: blink 1s infinite alternate;
}
@keyframes blink { from { opacity: 0.3; } to { opacity: 1; } }
.player-screen {
  background: #0D1610;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 28px 20px;
  text-align: center;
  display: grid;
  gap: 18px;
}
.pan-graphic { font-size: 54px; }
.sizzle-text { font-size: 17px; font-weight: 700; color: #FFC078; }
.steps-overlay {
  text-align: left;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 12px 16px;
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #E2E8F0;
}
.player-controls {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--muted);
}
.tag-live {
  background: var(--green);
  color: #fff;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 700;
}

@media (max-width: 980px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .video-banner { height: auto; padding: 20px; }
  .video-overlay { flex-direction: column; align-items: flex-start; gap: 14px; }
}
</style>
