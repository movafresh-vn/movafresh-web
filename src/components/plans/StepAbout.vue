<template>
  <section class="about-container" aria-live="polite">
    <!-- Màn đầu: q = 0 (Đăng nhập MXH & Liên hệ nhanh) -->
    <div v-if="q === 0" class="pl-card about-welcome">
      <h1 class="pl-h1">Thiết kế thực đơn riêng cho nhà bạn</h1>
      <p class="pl-lead">
        Đăng ký gói 4 tuần, nhận thẻ quà tặng đến
        <b class="num">{{ fmt(giftMax) }}</b>
        chia đều theo từng tuần. Bắt đầu ngay, không cần mật khẩu rườm rà.
      </p>

      <form class="pl-stack" @submit.prevent="saveContact">
        <label class="pl-label" for="plContact">Số điện thoại hoặc Email</label>
        <input
          id="plContact"
          v-model="contactInput"
          class="pl-input"
          type="text"
          inputmode="email"
          autocomplete="email"
          placeholder="Ví dụ 0987 654 321 hoặc ten@email.com"
          required
        />
        <p v-if="store.error" class="pl-error" role="alert">{{ store.error }}</p>
        <button class="pl-btn primary" type="submit">Bắt đầu khảo sát (1 phút)</button>
      </form>
    </div>

    <!-- Màn khảo sát Split-Screen: q = 1 đến 6 -->
    <div v-else class="about-split">
      <!-- Cột Trái: Câu hỏi, vùng tương tác & Hộp cam kết ngữ cảnh -->
      <div class="about-left pl-card">
        <div class="q-head">
          <button class="pl-back" type="button" @click="go(q - 1)">‹ Quay lại</button>
          <span class="q-count num">Bước {{ q }}/{{ LAST }}</span>
        </div>
        <div class="q-bar" aria-hidden="true">
          <i :style="{ width: (Math.min(q, LAST) / LAST * 100) + '%' }"></i>
        </div>

        <!-- 1. Quận / Huyện -->
        <div v-if="q === 1" class="step-body">
          <h2 class="step-title">Nhà bạn ở quận/huyện nào tại TP.HCM?</h2>
          <p class="step-sub">MOVA Fresh giao chuỗi lạnh 0–4°C xuyên đêm tận cửa nhà bạn.</p>

          <div class="pl-chips">
            <button
              v-for="d in districts"
              :key="d"
              type="button"
              class="pl-chip"
              :class="{ on: store.answers.district === d && !customOpen }"
              :aria-pressed="store.answers.district === d && !customOpen"
              @click="pickDistrict(d)"
            >{{ d }}</button>
            <button
              type="button"
              class="pl-chip"
              :class="{ on: customOpen }"
              :aria-pressed="customOpen"
              @click="customOpen = true"
            >Khu vực khác</button>
          </div>

          <div v-if="customOpen" class="pl-stack other-zone-input">
            <label class="pl-label" for="plOther">Gõ tên quận/huyện hoặc tỉnh của bạn:</label>
            <input
              id="plOther"
              v-model="customText"
              class="pl-input"
              type="text"
              placeholder="Ví dụ Dĩ An, Biên Hòa, Vũng Tàu..."
              @input="outOfZone = false"
            />
          </div>

          <div v-if="outOfZone" class="pl-panel warn" role="alert">
            <b>MOVA chưa giao tới {{ store.answers.district }}.</b>
            <p v-if="!store.waitlist">Để lại thông tin, MOVA sẽ báo ngay khi xe lạnh mở tuyến mới tới khu của bạn.</p>
            <p v-else class="ok-line">Đã ghi nhận. MOVA sẽ báo qua <b>{{ store.contact }}</b> khi có chuyến tới {{ store.waitlist.district }}.</p>
            <button v-if="!store.waitlist" class="pl-btn orange" type="button" @click="joinWaitlist">Báo tôi khi MOVA mở tuyến</button>
            <button class="pl-btn" type="button" @click="chooseOther">Chọn khu vực khác</button>
          </div>
        </div>

        <!-- 2. Quy mô gia đình: Người lớn & Trẻ em (0-12 tuổi) -->
        <div v-else-if="q === 2" class="step-body">
          <h2 class="step-title">Nhà bạn có mấy thành viên ăn cơm nhà?</h2>
          <p class="step-sub">Tách riêng người lớn và trẻ nhỏ giúp Đầu bếp MOVA định lượng gram chuẩn xác và nêm nếm vừa vị.</p>

          <div class="family-steppers-grid">
            <!-- Stepper Người lớn -->
            <div class="stepper-card">
              <span class="stepper-label">👨‍🦰 Người lớn</span>
              <PeopleStepper
                :model-value="adultsCount"
                :min="1"
                :max="10"
                label="người lớn"
                sublabel="từ 12 tuổi trở lên"
                @update:model-value="updateAdults"
              />
            </div>

            <!-- Stepper Trẻ em (0-12 tuổi) -->
            <div class="stepper-card">
              <span class="stepper-label">🧒 Trẻ em (0–12 tuổi)</span>
              <PeopleStepper
                :model-value="childrenCount"
                :min="0"
                :max="6"
                label="trẻ em"
                sublabel="bé 0–12 tuổi"
                @update:model-value="updateChildren"
              />
            </div>
          </div>

          <!-- Huy hiệu tổng số suất & lưu ý trẻ nhỏ -->
          <div class="family-summary-badge">
            <span class="total-head">🍽️ Tổng quy mô: <b>{{ totalHouseholdSize }} thành viên</b> (~{{ totalHouseholdSize }} suất/bữa)</span>
            <p v-if="childrenCount > 0" class="child-priority-hint">
              👶 <b>Nhà có trẻ nhỏ:</b> Đầu bếp MOVA sẽ tự động ưu tiên các món mềm ngọt tự nhiên, thanh đạm và lọc tuyệt đối ớt cay để bé ăn ngon miệng.
            </p>
          </div>
        </div>

        <!-- 3. Khẩu vị & Nguồn đạm (👍 / 👎) -->
        <div v-else-if="q === 3" class="step-body">
          <h2 class="step-title">Khẩu vị & Nguồn đạm yêu thích của gia đình?</h2>
          <p class="step-sub">Bấm 👍 (Thích) để ưu tiên nhiều hơn, hoặc 👎 (Hạn chế) nếu nhà bạn ít ăn món đó.</p>

          <!-- Nhóm Nguồn Đạm -->
          <div class="pref-section">
            <h3 class="pref-group-title">🥩 6 Nhóm nguồn đạm tươi sạch</h3>
            <div class="thumbs-grid">
              <div
                v-for="p in PROTEIN_SOURCES"
                :key="p.id"
                class="thumb-item-card"
                :class="{
                  'is-like': getProteinPref(p.id) === 'like',
                  'is-dislike': getProteinPref(p.id) === 'dislike'
                }"
              >
                <div class="item-info">
                  <span class="item-icon">{{ p.icon }}</span>
                  <div class="item-texts">
                    <b class="item-name">{{ p.name }}</b>
                    <small class="item-desc">{{ p.desc }}</small>
                  </div>
                </div>

                <div class="thumb-btns" role="group" :aria-label="`Lựa chọn cho ${p.name}`">
                  <button
                    type="button"
                    class="thumb-btn like"
                    :class="{ active: getProteinPref(p.id) === 'like' }"
                    :title="`Thích ${p.name}`"
                    @click="setProteinPref(p.id, 'like')"
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    class="thumb-btn dislike"
                    :class="{ active: getProteinPref(p.id) === 'dislike' }"
                    :title="`Hạn chế ${p.name}`"
                    @click="setProteinPref(p.id, 'dislike')"
                  >
                    👎
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Nhóm Phong cách ẩm thực -->
          <div class="pref-section" style="margin-top: 14px;">
            <h3 class="pref-group-title">🥢 3 Phong cách ẩm thực</h3>
            <div class="thumbs-grid">
              <div
                v-for="c in CUISINE_STYLES"
                :key="c.id"
                class="thumb-item-card"
                :class="{
                  'is-like': getCuisinePref(c.id) === 'like',
                  'is-dislike': getCuisinePref(c.id) === 'dislike'
                }"
              >
                <div class="item-info">
                  <span class="item-icon">{{ c.icon }}</span>
                  <div class="item-texts">
                    <b class="item-name">{{ c.name }}</b>
                    <small class="item-desc">{{ c.desc }}</small>
                  </div>
                </div>

                <div class="thumb-btns" role="group" :aria-label="`Lựa chọn cho ${c.name}`">
                  <button
                    type="button"
                    class="thumb-btn like"
                    :class="{ active: getCuisinePref(c.id) === 'like' }"
                    :title="`Thích phong cách ${c.name}`"
                    @click="setCuisinePref(c.id, 'like')"
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    class="thumb-btn dislike"
                    :class="{ active: getCuisinePref(c.id) === 'dislike' }"
                    :title="`Hạn chế ${c.name}`"
                    @click="setCuisinePref(c.id, 'dislike')"
                  >
                    👎
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Kiêng cữ & Dị ứng (Zero-Tolerance) -->
        <div v-else-if="q === 4" class="step-body">
          <h2 class="step-title">Nhà bạn có kiêng cữ hay dị ứng thực phẩm nào không?</h2>
          <p class="step-sub">Chọn các chất gây dị ứng hoặc nguyên liệu gia đình bạn không ăn.</p>

          <!-- Lưới ô vuông kiêng cữ -->
          <div class="allergies-grid">
            <button
              v-for="item in ALLERGY_ITEMS"
              :key="item.id"
              type="button"
              class="allergy-square-btn"
              :class="{ on: isAvoidSelected(item.id) }"
              :aria-pressed="isAvoidSelected(item.id)"
              @click="toggleAvoidItem(item.id)"
            >
              <span class="sq-icon">{{ item.icon }}</span>
              <span class="sq-label">{{ item.label }}</span>
              <span v-if="isAvoidSelected(item.id)" class="sq-check">✓</span>
            </button>
          </div>

          <!-- Ô nhập kiêng cữ khác -->
          <div v-if="showCustomAvoidInput" class="custom-input-box">
            <label class="pl-label" for="customAvoid">Gõ món kiêng hoặc chất dị ứng khác:</label>
            <input
              id="customAvoid"
              v-model="customAvoidText"
              class="pl-input"
              type="text"
              placeholder="Ví dụ: kiêng bột ngọt, mè đen, nấm rơm, thịt cừu..."
              @input="analyzeAvoidText"
            />
            <p v-if="avoidAnalysisTags.length" class="auto-tag-hint">
              ✓ Đã tự động loại trừ: <b>{{ avoidAnalysisTags.join(', ') }}</b>
            </p>
          </div>
        </div>

        <!-- 5. Số bữa nấu tại nhà & Thể trạng gia đình -->
        <div v-else-if="q === 5" class="step-body">
          <h2 class="step-title">Mỗi tuần nhà bạn nấu mấy bữa ở nhà?</h2>
          <p class="step-sub">Đầu bếp MOVA sẽ gửi đủ nguyên liệu tươi cho các bữa trong tuần.</p>

          <div class="stepper-wrap" style="padding: 10px 0;">
            <div class="ps" role="group" aria-label="Số bữa mỗi tuần">
              <button
                type="button"
                class="ps-btn"
                :disabled="store.answers.meals <= 3"
                aria-label="Bớt một bữa"
                @click="store.setAnswer('meals', store.answers.meals - 1)"
              >−</button>
              <div class="ps-val num">
                <b>{{ store.answers.meals }}</b>
                <span>bữa / tuần</span>
              </div>
              <button
                type="button"
                class="ps-btn"
                :disabled="store.answers.meals >= 7"
                aria-label="Thêm một bữa"
                @click="store.setAnswer('meals', store.answers.meals + 1)"
              >+</button>
            </div>
          </div>

          <h3 class="pref-group-title" style="margin-top: 16px;">Mục tiêu thể trạng gia đình:</h3>
          <div class="pl-chips col">
            <button
              v-for="n in HEALTH_NEEDS"
              :key="n.id"
              type="button"
              class="pl-chip"
              :class="{ on: isNeedActive(n.id) }"
              :aria-pressed="isNeedActive(n.id)"
              @click="toggleNeed(n.id)"
            >{{ n.label }}</button>
          </div>

          <div v-if="showCustomNeedInput" class="custom-input-box">
            <label class="pl-label" for="customNeed">Gõ tình trạng sức khỏe khác:</label>
            <input
              id="customNeed"
              v-model="customNeedText"
              class="pl-input"
              type="text"
              placeholder="Ví dụ: ít đạm purin, kiêng mỡ động vật, dạ dày nhạy cảm..."
              @input="analyzeNeedText"
            />
            <p v-if="needAnalysisTags.length" class="auto-tag-hint">
              ✓ Đã tự động ghi nhận: <b>{{ needAnalysisTags.join(', ') }}</b>
            </p>
          </div>
        </div>

        <!-- 6. Chi tiêu đi chợ hàng tuần (Trần mềm định hướng) -->
        <div v-else-if="q === 6" class="step-body">
          <h2 class="step-title">Mỗi tuần nhà bạn thường chi bao nhiêu tiền đi chợ?</h2>
          <p class="step-sub">Định mức ngân sách giúp Đầu bếp MOVA cân đối các món đạm thượng hạng (bò, cá bớp, tôm) hợp túi tiền gia đình.</p>

          <div class="pl-chips col">
            <button
              v-for="v in budgetChoices"
              :key="v"
              type="button"
              class="pl-chip num"
              :class="{ on: store.answers.budget === v && !isCustomBudget }"
              :aria-pressed="store.answers.budget === v && !isCustomBudget"
              @click="pickStandardBudget(v)"
            >{{ budgetChoiceLabel(v, { mealsPerWeek: store.answers.meals }) }}</button>
            <button
              type="button"
              class="pl-chip"
              :class="{ on: isCustomBudget }"
              :aria-pressed="isCustomBudget"
              @click="toggleCustomBudget"
            >Khác (nhập mức chi tiêu cụ thể)</button>
          </div>

          <!-- Khung nhập chi tiêu tùy chỉnh -->
          <p v-if="budgetNote" class="budget-explain" data-testid="budget-explain" role="status">{{ budgetNote.text }}</p>

          <div v-if="isCustomBudget" class="custom-budget-box" role="group" aria-label="Nhập mức chi tiêu cụ thể">
            <label class="pl-label" for="customBudgetInput">Mức chi tiêu dự kiến mỗi tuần (VNĐ):</label>
            <div class="custom-budget-stepper">
              <button
                type="button"
                class="budget-step-btn"
                :disabled="customBudgetValue <= MIN_BUDGET"
                aria-label="Giảm 100.000đ"
                @click="stepBudget(-BUDGET_STEP)"
              >−</button>
              <div class="budget-input-wrap">
                <input
                  id="customBudgetInput"
                  v-model="customBudgetText"
                  class="pl-input budget-num-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="1.800.000đ"
                  @input="onBudgetTextInput"
                  @blur="onBudgetTextBlur"
                />
              </div>
              <button
                type="button"
                class="budget-step-btn"
                :disabled="customBudgetValue >= MAX_BUDGET"
                aria-label="Tăng 100.000đ"
                @click="stepBudget(BUDGET_STEP)"
              >+</button>
            </div>
            <p class="budget-hint">
              Bước nhảy 100.000đ (từ {{ fmt(MIN_BUDGET) }} đến {{ fmt(MAX_BUDGET) }}). Trần mềm định hướng để Đầu bếp MOVA gợi ý món ăn phù hợp.
            </p>
          </div>
        </div>

        <!-- HỘP CAM KẾT MÀU XANH LÁ NHẠT (#ECFDF3) GÓC DƯỚI TRÁI -->
        <div class="context-commitment-box" role="note">
          <div class="c-head">
            <span class="c-icon">{{ currentCommitment.icon }}</span>
            <b class="c-title">{{ currentCommitment.title }}</b>
          </div>
          <p class="c-desc">{{ currentCommitment.desc }}</p>
        </div>

        <p v-if="store.error && q > 0" class="pl-error" role="alert">{{ store.error }}</p>

        <!-- Fixed / compact footer navigation -->
        <div class="q-foot">
          <button v-if="q < LAST" class="pl-btn primary step-next-btn" type="button" :disabled="!canNext" @click="next">
            Tiếp tục
          </button>
          <template v-else>
            <button class="pl-btn primary step-next-btn" type="button" @click="finish">
              Xem thực đơn Đầu bếp thiết kế cho tôi
            </button>
            <button class="pl-btn ghost" type="button" @click="clearBudgetAndFinish">
              Bỏ qua câu ngân sách
            </button>
          </template>
        </div>
      </div>

      <!-- Cột Phải: Khung hình ảnh ẩm thực / hộp nguyên liệu tươi bo góc lớn (20px) -->
      <aside class="about-right" aria-label="Hình ảnh ẩm thực minh họa">
        <div class="visual-card">
          <div class="visual-img-container">
            <!-- Fallback SVG gradient phong cách ẩm thực tự nhiên -->
            <div class="visual-art" :class="'scene-q' + q">
              <div class="art-overlay-gradient"></div>
              <div class="art-badge-strip">
                <span class="art-badge">{{ currentSceneBadge }}</span>
                <span class="art-badge alt">⏱ Nấu 15 phút — 1 chảo</span>
              </div>
              <div class="art-center-illustration">
                <span class="center-emoji">{{ currentSceneEmoji }}</span>
              </div>
              <div class="art-caption-box">
                <h4 class="art-caption-title">{{ currentSceneTitle }}</h4>
                <p class="art-caption-sub">{{ currentSceneSubtitle }}</p>
              </div>
            </div>
          </div>

          <!-- Dải 3 ưu điểm cốt lõi chân khung ảnh -->
          <div class="visual-pillars">
            <div class="pillar-item">
              <span class="p-icon">🌿</span>
              <span>Đắk Lắk sơ chế sạch</span>
            </div>
            <div class="pillar-item">
              <span class="p-icon">❄️</span>
              <span>Xe lạnh 0–4°C xuyên đêm</span>
            </div>
            <div class="pillar-item">
              <span class="p-icon">✨</span>
              <span>Đổi món & dừng 1 chạm</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PeopleStepper from './PeopleStepper.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { api } from '../../shared/api';
import { BUSINESS } from '../../shared/config/business';
import { fmt } from '../../shared/utils/formatters';
import { budgetChoiceLabel, budgetExplain } from '../../shared/domain/budgetExplain';

const LAST = 6;

const store = usePlanFlowStore();
const route = useRoute();
const router = useRouter();

const q = computed(() => {
  const n = Number(route.query.q);
  if (route.query.q !== undefined && Number.isInteger(n) && n >= 0 && n <= LAST) return n;
  return store.leadId ? 1 : 0;
});

const contactInput = ref(store.contact);
// Danh sách quận lấy từ cấu hình khu giao trước (hiện ngay), rồi thay bằng danh sách của máy chủ khi tải xong.
const districts = ref(BUSINESS.zones.flatMap((z) => z.districts).filter((d) => d !== 'TP. Thủ Đức'));
onMounted(async () => {
  try {
    const areas = await api.customer.serviceAreas();
    const fromServer = areas.flatMap((z) => z.districts).filter((d) => d !== 'TP. Thủ Đức');
    if (fromServer.length) districts.value = fromServer;
  } catch {
    // mất mạng: giữ danh sách có sẵn
  }
});
const customOpen = ref(false);
const customText = ref('');
const outOfZone = ref(false);

const MIN_BUDGET = 200000;
const MAX_BUDGET = 20000000;
const BUDGET_STEP = 100000;
const DEFAULT_CUSTOM_BUDGET = 1800000;

const budgetChoices = BUSINESS.plan.groceryBudgetChoicesVnd;
// Dòng giải thích Q6: mức tuần đang chọn ≈ bao nhiêu cho gói 4 tuần (ước tính, tiền thật do máy chủ tính)
const budgetNote = computed(() => budgetExplain(store.answers.budget, { mealsPerWeek: store.answers.meals }));
const giftMax = BUSINESS.incentives.giftCardWeeklyVnd.reduce((a, b) => a + b, 0);

// Stepper Người lớn & Trẻ em (0-12 tuổi)
const adultsCount = computed(() => {
  return Number(store.answers.adults != null ? store.answers.adults : (store.answers.size || 2));
});
const childrenCount = computed(() => {
  return Number(store.answers.children != null ? store.answers.children : 0);
});
const totalHouseholdSize = computed(() => {
  return Math.min(10, Math.max(1, adultsCount.value + childrenCount.value));
});

function updateAdults(val) {
  store.setAnswer('adults', val);
}
function updateChildren(val) {
  store.setAnswer('children', val);
}

// Danh mục 6 nhóm đạm tươi sạch
const PROTEIN_SOURCES = [
  { id: 'beef', name: 'Thịt bò Tây Nguyên', icon: '🥩', desc: 'Thăn bò đồi Bazan mềm ngọt' },
  { id: 'pork', name: 'Thịt heo thảo mộc', icon: '🥓', desc: 'Ba rọi, sườn non Cư M\'gar thơm sạch' },
  { id: 'chicken', name: 'Gà đồi Đắk Lắk', icon: '🍗', desc: 'Gà thả vườn thớ thịt săn chắc' },
  { id: 'fish', name: 'Cá biển tươi Vũng Tàu', icon: '🐟', desc: 'Cá bớp cắt khoanh dày ngọt thịt' },
  { id: 'seafood', name: 'Tôm & Hải sản', icon: '🦐', desc: 'Tôm sú bóc nõn rút chỉ tiện lợi' },
  { id: 'plant', name: 'Đạm thực vật & Nấm', icon: '🥑', desc: 'Đậu hũ non, nấm đùi gà thanh nhẹ' }
];

// Danh mục 3 phong cách ẩm thực
const CUISINE_STYLES = [
  { id: 'viet', name: 'Thuần Việt', icon: '🍚', desc: 'Cơm nhà 3 miền chuẩn vị Á Đông ấm cúng' },
  { id: 'asian', name: 'Đồ Á hiện đại', icon: '🥢', desc: 'Món Hàn, Trung, Đài phong vị đậm đà' },
  { id: 'western', name: 'Đồ Tây thượng hạng', icon: '🍝', desc: 'Steak bò, áp chảo, mì Ý xốt kem nấm' }
];

function getProteinPref(id) {
  return store.answers.proteinPrefs?.[id] || 'neutral';
}

function setProteinPref(id, type) {
  const cur = getProteinPref(id);
  const nextVal = cur === type ? 'neutral' : type;
  const prefs = { ...(store.answers.proteinPrefs || {}), [id]: nextVal };
  store.setAnswer('proteinPrefs', prefs);

  // Đồng bộ sang avoid nếu không thích
  let curAvoid = [...(store.answers.avoid || [])];
  if (id === 'beef') {
    if (nextVal === 'dislike' && !curAvoid.includes('no_beef')) curAvoid.push('no_beef');
    if (nextVal !== 'dislike') curAvoid = curAvoid.filter((x) => x !== 'no_beef');
  } else if (id === 'pork') {
    if (nextVal === 'dislike' && !curAvoid.includes('no_pork')) curAvoid.push('no_pork');
    if (nextVal !== 'dislike') curAvoid = curAvoid.filter((x) => x !== 'no_pork');
  } else if (id === 'fish' || id === 'seafood') {
    if (nextVal === 'dislike' && !curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
    if (nextVal !== 'dislike' && prefs.fish !== 'dislike' && prefs.seafood !== 'dislike') {
      curAvoid = curAvoid.filter((x) => x !== 'no_seafood');
    }
  }
  store.setAnswer('avoid', curAvoid);
}

function getCuisinePref(id) {
  return store.answers.cuisinePrefs?.[id] || 'neutral';
}

function setCuisinePref(id, type) {
  const cur = getCuisinePref(id);
  const nextVal = cur === type ? 'neutral' : type;
  const prefs = { ...(store.answers.cuisinePrefs || {}), [id]: nextVal };
  store.setAnswer('cuisinePrefs', prefs);

  // Đồng bộ sang cuisines list & cuisine
  const activeLikes = Object.entries(prefs).filter(([_, v]) => v === 'like').map(([k]) => k);
  const sel = activeLikes.length > 0 ? activeLikes : ['viet'];
  store.setAnswer('cuisines', sel);
  if (prefs.western === 'like' || sel.includes('western')) {
    store.setAnswer('cuisine', sel.length > 1 ? 'viet_western' : 'western');
  } else {
    store.setAnswer('cuisine', 'viet');
  }
}

// Danh mục Kiêng cữ / Dị ứng dạng lưới ô vuông
const ALLERGY_ITEMS = [
  { id: 'none', label: 'Không kiêng gì', icon: '🥗' },
  { id: 'no_seafood', label: 'Hải sản', icon: '🐟' },
  { id: 'no_shellfish', label: 'Tôm cua vỏ', icon: '🦀' },
  { id: 'no_peanuts', label: 'Đậu phộng', icon: '🥜' },
  { id: 'no_nuts', label: 'Các loại hạt', icon: '🌰' },
  { id: 'no_gluten', label: 'Gluten', icon: '🌾' },
  { id: 'no_lactose', label: 'Sữa/Lactose', icon: '🥛' },
  { id: 'no_beef', label: 'Không ăn Bò', icon: '🥩' },
  { id: 'no_pork', label: 'Không ăn Heo', icon: '🥓' },
  { id: 'no_spicy', label: 'Không ăn cay', icon: '🌶️' },
  { id: 'custom_avoid', label: 'Khác (tự nhập)', icon: '✍️' }
];

const showCustomAvoidInput = ref(false);
const customAvoidText = ref('');
const avoidAnalysisTags = ref([]);

function isAvoidSelected(id) {
  if (id === 'none') {
    return (!store.answers.avoid || store.answers.avoid.length === 0) && !showCustomAvoidInput.value;
  }
  if (id === 'custom_avoid') return showCustomAvoidInput.value;
  return store.answers.avoid?.includes(id);
}

function toggleAvoidItem(id) {
  if (id === 'none') {
    showCustomAvoidInput.value = false;
    customAvoidText.value = '';
    avoidAnalysisTags.value = [];
    store.setAnswer('avoid', []);
    return;
  }
  if (id === 'custom_avoid') {
    showCustomAvoidInput.value = !showCustomAvoidInput.value;
    if (!showCustomAvoidInput.value) {
      customAvoidText.value = '';
      avoidAnalysisTags.value = [];
    }
    return;
  }
  const cur = [...(store.answers.avoid || [])];
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  store.setAnswer('avoid', next);
}

function analyzeAvoidText() {
  const t = customAvoidText.value.toLowerCase();
  const tags = [];
  const curAvoid = [...(store.answers.avoid || [])];

  if (t.includes('bò') || t.includes('beef')) {
    tags.push('Thịt bò');
    if (!curAvoid.includes('no_beef')) curAvoid.push('no_beef');
  }
  if (t.includes('heo') || t.includes('lợn') || t.includes('pork')) {
    tags.push('Thịt heo');
    if (!curAvoid.includes('no_pork')) curAvoid.push('no_pork');
  }
  if (t.includes('tôm') || t.includes('cua') || t.includes('cá') || t.includes('hải sản') || t.includes('seafood')) {
    tags.push('Hải sản');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('cay') || t.includes('ớt') || t.includes('tiêu')) {
    tags.push('Đồ cay');
    if (!curAvoid.includes('no_spicy')) curAvoid.push('no_spicy');
  }
  if (t.includes('bột mì') || t.includes('gluten') || t.includes('bánh mì')) {
    tags.push('Gluten');
    if (!curAvoid.includes('no_gluten')) curAvoid.push('no_gluten');
  }
  if (t.includes('sữa') || t.includes('lactose') || t.includes('bơ sữa')) {
    tags.push('Lactose');
    if (!curAvoid.includes('no_lactose')) curAvoid.push('no_lactose');
  }
  if (t.includes('đậu phộng') || t.includes('lạc') || t.includes('peanut')) {
    tags.push('Đậu phộng');
    if (!curAvoid.includes('no_peanuts')) curAvoid.push('no_peanuts');
  }

  avoidAnalysisTags.value = tags;
  store.setAnswer('avoid', [...new Set(curAvoid)]);
}

// Nhu cầu sức khỏe & Thể trạng
const HEALTH_NEEDS = [
  { id: 'balanced', label: 'Cân bằng dinh dưỡng' },
  { id: 'gym', label: 'Tăng cơ / Tập Gym' },
  { id: 'weight_loss', label: 'Giảm mỡ / Giữ dáng' },
  { id: 'limit_sugar', label: 'Hạn chế đường (tham khảo dinh dưỡng)' },
  { id: 'sensitive_stomach', label: 'Tiêu hóa nhẹ nhàng' },
  { id: 'elderly', label: 'Người lớn tuổi' },
  { id: 'young_child', label: 'Trẻ nhỏ' },
  { id: 'gout', label: 'Ít đạm purin (tham khảo dinh dưỡng)' },
  { id: 'meat_lover', label: 'Thích ăn nhiều thịt' },
  { id: 'custom_need', label: 'Khác (tự nhập)' }
];

const showCustomNeedInput = ref(false);
const customNeedText = ref('');
const needAnalysisTags = ref([]);

function isNeedActive(id) {
  if (id === 'custom_need') return showCustomNeedInput.value;
  return store.answers.needs?.includes(id);
}

function toggleNeed(id) {
  if (id === 'custom_need') {
    showCustomNeedInput.value = !showCustomNeedInput.value;
    if (!showCustomNeedInput.value) {
      customNeedText.value = '';
      needAnalysisTags.value = [];
    }
    return;
  }
  const cur = store.answers.needs || [];
  store.setAnswer('needs', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

function analyzeNeedText() {
  const t = customNeedText.value.toLowerCase();
  const tags = [];
  const cur = [...(store.answers.needs || [])];
  const curAvoid = [...(store.answers.avoid || [])];

  if (t.includes('gout') || t.includes('gút') || t.includes('purin')) {
    tags.push('Ít đạm purin (tham khảo)');
    if (!cur.includes('gout')) cur.push('gout');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('không hải sản') || t.includes('dị ứng hải sản') || t.includes('kiêng hải sản')) {
    tags.push('Kiêng hải sản');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('dầu') || t.includes('dạ dày') || t.includes('tiêu hóa') || t.includes('thanh đạm')) {
    tags.push('Thanh đạm / Dễ tiêu');
    if (!cur.includes('sensitive_stomach')) cur.push('sensitive_stomach');
  }
  if (t.includes('gym') || t.includes('cơ bắp') || t.includes('tập')) {
    tags.push('Tăng cơ / Tập Gym');
    if (!cur.includes('gym')) cur.push('gym');
  }
  if (t.includes('đường') || t.includes('tiểu đường')) {
    tags.push('Hạn chế đường (tham khảo)');
    if (!cur.includes('limit_sugar')) cur.push('limit_sugar');
  }
  if (t.includes('giảm cân') || t.includes('giảm mỡ') || t.includes('béo')) {
    tags.push('Giảm mỡ / Low carb');
    if (!cur.includes('weight_loss')) cur.push('weight_loss');
  }

  needAnalysisTags.value = tags;
  store.setAnswer('needs', [...new Set(cur)]);
  store.setAnswer('avoid', [...new Set(curAvoid)]);
}

// Ngân sách đi chợ
const isCustomBudget = ref(
  store.answers.budget !== null &&
  store.answers.budget !== undefined &&
  !budgetChoices.includes(store.answers.budget)
);
const customBudgetValue = ref(
  isCustomBudget.value && store.answers.budget ? store.answers.budget : DEFAULT_CUSTOM_BUDGET
);
const customBudgetText = ref(fmt(customBudgetValue.value));

function pickStandardBudget(v) {
  isCustomBudget.value = false;
  const nextVal = store.answers.budget === v ? null : v;
  store.setAnswer('budget', nextVal);
}

function toggleCustomBudget() {
  if (isCustomBudget.value) {
    isCustomBudget.value = false;
    store.setAnswer('budget', null);
  } else {
    isCustomBudget.value = true;
    let val = customBudgetValue.value;
    if (!val || val < MIN_BUDGET || val > MAX_BUDGET) val = DEFAULT_CUSTOM_BUDGET;
    customBudgetValue.value = val;
    customBudgetText.value = fmt(val);
    store.setAnswer('budget', val);
  }
}

function stepBudget(delta) {
  let val = (customBudgetValue.value || DEFAULT_CUSTOM_BUDGET) + delta;
  if (val < MIN_BUDGET) val = MIN_BUDGET;
  if (val > MAX_BUDGET) val = MAX_BUDGET;
  customBudgetValue.value = val;
  customBudgetText.value = fmt(val);
  store.setAnswer('budget', val);
}

function parseBudgetString(str) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function onBudgetTextInput(e) {
  const raw = e.target.value;
  let num = parseBudgetString(raw);
  if (e.inputType === 'deleteContentBackward' && !raw.endsWith('đ')) num = Math.floor(num / 10);
  if (!num) {
    customBudgetValue.value = 0;
    customBudgetText.value = '';
    store.setAnswer('budget', null);
    return;
  }
  if (num > MAX_BUDGET) num = MAX_BUDGET;
  customBudgetValue.value = num;
  customBudgetText.value = fmt(num);
  if (num >= MIN_BUDGET && num <= MAX_BUDGET) store.setAnswer('budget', num);
  else store.setAnswer('budget', null);
}

function onBudgetTextBlur() {
  let val = customBudgetValue.value || 0;
  if (val < MIN_BUDGET) val = MIN_BUDGET;
  if (val > MAX_BUDGET) val = MAX_BUDGET;
  customBudgetValue.value = val;
  customBudgetText.value = fmt(val);
  store.setAnswer('budget', val);
}

// Hộp cam kết ngữ cảnh theo câu hỏi
const currentCommitment = computed(() => {
  switch (q.value) {
    case 1:
      return {
        icon: '🚚',
        title: 'Sơ chế sạch 100% từ Đắk Lắk, xe lạnh 0–4°C xuyên đêm:',
        desc: 'Nông sản và thịt cá được xơ chế đóng khay vô trùng tại Buôn Ma Thuột, chuyển xe lạnh về TP.HCM lúc sáng sớm. Bạn luôn có thể đổi từng món hoặc dừng gói 1 chạm bất kỳ lúc nào.'
      };
    case 2:
      return {
        icon: '👨‍🍳',
        title: 'Khẩu phần may đo chuẩn xác từng gram:',
        desc: childrenCount.value > 0
          ? 'Định lượng theo số người lớn và trẻ nhỏ. Đầu bếp MOVA tự động ưu tiên các món mềm ngọt tự nhiên, vị thanh mát, hoàn toàn không cay cho các bữa ăn có bé nhỏ.'
          : 'Định lượng theo đúng số thành viên gia đình, triệt tiêu lãng phí thức ăn thừa. Nấu nhanh 15 phút — 1 chảo gọn nhẹ, tiết kiệm 2 tiếng đi chợ & nấu nướng mỗi ngày.'
      };
    case 3:
      return {
        icon: '🥩',
        title: 'Đa dạng nguồn đạm, cân đối dinh dưỡng mỗi ngày:',
        desc: 'Đầu bếp MOVA tự động xếp thực đơn luân phiên giữa Bò Tây Nguyên, Heo thảo mộc, Gà đồi và Cá biển tươi, kết hợp gói xốt công thức riêng giúp mâm cơm gia đình không bao giờ ngán.'
      };
    case 4:
      return {
        icon: '🛡️',
        title: 'Cam kết Zero-Tolerance lọc cứng 100% chất dị ứng:',
        desc: 'Hệ thống loại trừ tuyệt đối mọi món ăn chứa nguyên liệu bạn kiêng cữ. Phân xưởng Đắk Lắk sơ chế phân luồng cách ly, đảm bảo an toàn tuyệt đối cho người thân.'
      };
    case 5:
      return {
        icon: '🥗',
        title: 'Linh hoạt số bữa & Cân bằng calo gia đình:',
        desc: 'Từ 3 đến 7 bữa/tuần tùy lịch sinh hoạt của nhà bạn. Bạn có thể tạm hoãn tuần bận rộn hoặc đổi món thoải mái trước giờ chốt sổ 08:00 sáng ngày D-2.'
      };
    case 6:
      return {
        icon: '💰',
        title: 'Kiểm soát chi tiêu, hoàn tiền minh bạch trong 7 ngày:',
        desc: 'Ngân sách chỉ là trần mềm định hướng. Bạn trả trước theo gói nhưng luôn có thể dừng gói bất kỳ lúc nào và nhận hoàn 100% tiền ăn các bữa chưa giao trong 7 ngày làm việc.'
      };
    default:
      return {
        icon: '✨',
        title: 'Cam kết chất lượng từ MOVA Fresh:',
        desc: 'Thực phẩm sạch chuẩn vị gia đình, nói không với COD trôi nổi và không chất bảo quản công nghiệp.'
      };
  }
});

// Trực quan hóa Visual Card cột phải
const currentSceneBadge = computed(() => {
  switch (q.value) {
    case 1: return '🚚 Chuỗi xe lạnh 0–4°C';
    case 2: return '👨‍👩‍👧‍👦 Mâm cơm gia đình 5 món';
    case 3: return '🥩 Đạm sạch Tây Nguyên';
    case 4: return '🛡️ An toàn dị ứng 100%';
    case 5: return '🥗 Dinh dưỡng cân đối';
    case 6: return '💰 Tiết kiệm 2 giờ/ngày';
    default: return '🌿 Nông sản Đắk Lắk';
  }
});

const currentSceneEmoji = computed(() => {
  switch (q.value) {
    case 1: return '🚛';
    case 2: return '🍲';
    case 3: return '🥩';
    case 4: return '🥦';
    case 5: return '🍱';
    case 6: return '⚖️';
    default: return '🎁';
  }
});

const currentSceneTitle = computed(() => {
  switch (q.value) {
    case 1: return 'Giao tận bếp TP.HCM & Đông Nam Bộ';
    case 2: return 'Cơm nhà 15 phút — Chỉ 1 chảo';
    case 3: return 'Nguyên liệu Terroir chuẩn tươi ngon';
    case 4: return 'Phân xưởng vô trùng cách ly sạch sẽ';
    case 5: return 'Thực đơn do Đầu bếp thiết kế riêng';
    case 6: return 'Chi phí minh bạch, tiết kiệm tối đa';
    default: return 'Hộp nguyên liệu chuẩn Đầu bếp MOVA';
  }
});

const currentSceneSubtitle = computed(() => {
  switch (q.value) {
    case 1: return 'Xe lạnh rời xưởng Đắk Lắk 18:00, giao sáng trước 10:00 tại TP.HCM trong thùng cách nhiệt 6 giờ.';
    case 2: return 'Rau củ thịt cá thái sẵn 100%, kèm túi xốt định lượng. Bật bếp 15 phút là cả nhà quây quần.';
    case 3: return 'Ba rọi thảo mộc, Bò lúc lắc Chư Sê, Cá bớp Vũng Tàu, Gạo hữu cơ ST25 & Vải thiều IQF.';
    case 4: return 'Loại bỏ hoàn toàn các chất dị ứng gia đình kiêng cữ. Khay hút chân không dán sticker rõ ràng.';
    case 5: return '5 cấu phần hoàn chỉnh: Món Đạm + Rau xanh + Canh ấm + Tinh bột + Trái cây tráng miệng.';
    case 6: return 'Chỉ từ ~45.000đ/suất. Rẻ hơn ăn ngoài, ngon sạch hơn tự đi chợ nhặt rau chặt thịt.';
    default: return 'Mở hộp là nấu ngay, không cần chuẩn bị dao thớt cầu kỳ.';
  }
});

const canNext = computed(() => {
  if (q.value === 1) return customOpen.value ? customText.value.trim().length > 1 : Boolean(store.answers.district);
  return true;
});

watch(
  () => store.answers.district,
  (d) => {
    if (d && !districts.value.includes(d)) {
      customOpen.value = true;
      customText.value = d;
    }
  },
  { immediate: true }
);

function go(n) {
  router.push({ path: '/plans', query: { step: '1', q: String(Math.max(0, n)) } });
}

async function saveContact() {
  if (await store.saveContact(contactInput.value)) go(1);
}

function pickDistrict(d) {
  customOpen.value = false;
  outOfZone.value = false;
  store.setAnswer('district', d);
}

function chooseOther() {
  outOfZone.value = false;
  store.waitlist = null;
  customOpen.value = false;
  store.setAnswer('district', '');
}

async function joinWaitlist() {
  await store.joinWaitlist();
}

async function next() {
  if (q.value === 1 && customOpen.value) {
    const text = customText.value.trim();
    store.setAnswer('district', text);
    if (!(await api.customer.checkArea(text)).served) {
      outOfZone.value = true;
      return;
    }
  }
  go(q.value + 1);
}

async function finish() {
  if (isCustomBudget.value) {
    let val = customBudgetValue.value || 0;
    if (val < MIN_BUDGET) val = MIN_BUDGET;
    if (val > MAX_BUDGET) val = MAX_BUDGET;
    customBudgetValue.value = val;
    customBudgetText.value = fmt(val);
    store.setAnswer('budget', val);
  }
  const r = await store.submitProfile();
  if (r === 'ok') router.push({ path: '/plans', query: { step: '2' } });
  else if (r === 'out_of_zone') {
    outOfZone.value = true;
    go(1);
  }
}

function clearBudgetAndFinish() {
  isCustomBudget.value = false;
  store.setAnswer('budget', null);
  finish();
}
</script>

<style scoped>
.about-container {
  width: 100%;
  margin: 0 auto;
}

.about-welcome {
  max-width: 620px;
  margin: 0 auto;
}

/* Split screen layout */
.about-split {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 24px;
  max-width: 1060px;
  margin: 0 auto;
  align-items: stretch;
}

.about-left {
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
  min-height: 560px;
  border-radius: 20px;
}

.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 6px;
  line-height: 1.3;
}

.step-sub {
  font-size: 13.5px;
  color: var(--muted);
  margin: 0 0 16px;
  line-height: 1.45;
}

.q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.q-count {
  font-size: 13px;
  color: var(--green-d);
  font-weight: 700;
  background: var(--green-soft);
  padding: 3px 8px;
  border-radius: 6px;
}
.q-bar {
  height: 6px;
  background: var(--line-2);
  border-radius: 6px;
  margin-bottom: 20px;
  overflow: hidden;
}
.q-bar i {
  display: block;
  height: 100%;
  background: var(--green);
  border-radius: 6px;
  transition: width 0.25s ease;
}

/* Stepper gia đình 2 cột */
.family-steppers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}
.stepper-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.stepper-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.family-summary-badge {
  background: var(--green-soft);
  border-radius: 12px;
  padding: 10px 14px;
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}
.total-head {
  font-size: 14px;
  color: var(--green-d);
}
.child-priority-hint {
  font-size: 13px;
  color: var(--green-d);
  margin: 0;
  line-height: 1.4;
}

/* Thumbs Prefs (👍 / 👎) */
.pref-section {
  display: grid;
  gap: 8px;
}
.pref-group-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}
.thumbs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.thumb-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--white);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  transition: all 0.15s ease;
}
.thumb-item-card.is-like {
  border-color: var(--green);
  background: var(--green-tint);
}
.thumb-item-card.is-dislike {
  border-color: var(--orange);
  background: var(--amber-soft);
}
.item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.item-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.item-texts {
  display: grid;
  gap: 1px;
}
.item-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}
.item-desc {
  font-size: 11.5px;
  color: var(--muted);
}
.thumb-btns {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.thumb-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--white);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.thumb-btn:hover {
  transform: scale(1.08);
  border-color: var(--faint);
}
.thumb-btn.like.active {
  background: var(--green);
  border-color: var(--green);
  box-shadow: 0 2px 8px rgba(20, 108, 67, 0.3);
}
.thumb-btn.dislike.active {
  background: var(--orange);
  border-color: var(--orange);
  box-shadow: 0 2px 8px rgba(217, 83, 30, 0.3);
}

/* Lưới ô vuông dị ứng */
.allergies-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
@media (max-width: 500px) {
  .allergies-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.allergy-square-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  min-height: 64px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: var(--white);
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}
.allergy-square-btn:hover {
  border-color: var(--faint);
  transform: translateY(-1px);
}
.allergy-square-btn.on {
  border-color: var(--green);
  background: var(--green-tint);
}
.sq-icon {
  font-size: 18px;
}
.sq-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
  line-height: 1.2;
}
.sq-check {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--green);
}

/* Hộp cam kết ngữ cảnh (var(--green-tint)) */
.context-commitment-box {
  margin-top: auto;
  padding-top: 14px;
  margin-bottom: 12px;
  background: var(--green-tint);
  border: 1px solid var(--green-line);
  border-radius: 14px;
  padding: 12px 14px;
  display: grid;
  gap: 4px;
}
.c-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.c-icon {
  font-size: 16px;
}
.c-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--green-d);
}
.c-desc {
  font-size: 12px;
  color: var(--green-dd);
  line-height: 1.45;
  margin: 0;
}

.q-foot {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.step-next-btn {
  min-height: 48px;
  font-size: 15px;
  font-weight: 700;
}

/* Cột Phải: Visual Card ẩm thực */
.about-right {
  display: flex;
  flex-direction: column;
}
.visual-card {
  background: var(--white);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(20, 108, 67, 0.08);
  height: 100%;
}
.visual-img-container {
  flex: 1;
  position: relative;
  min-height: 380px;
  overflow: hidden;
}
.visual-art {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  position: relative;
  background: linear-gradient(135deg, var(--green-d) 0%, var(--green-dd) 60%, var(--green-dd) 100%);
  color: var(--white);
}
.visual-art.scene-q1 {
  background: linear-gradient(135deg, var(--green-dd) 0%, var(--green-d) 60%, var(--green-dd) 100%);
}
.visual-art.scene-q2 {
  background: linear-gradient(135deg, var(--amber-ink) 0%, var(--amber-ink) 60%, var(--green-dd) 100%);
}
.visual-art.scene-q3 {
  background: linear-gradient(135deg, var(--red) 0%, var(--red) 60%, var(--green-d) 100%);
}
.visual-art.scene-q4 {
  background: linear-gradient(135deg, var(--blue-ink) 0%, var(--blue-ink) 60%, var(--green-dd) 100%);
}
.visual-art.scene-q5 {
  background: linear-gradient(135deg, var(--blue-ink) 0%, var(--violet) 60%, var(--green-d) 100%);
}
.visual-art.scene-q6 {
  background: linear-gradient(135deg, var(--blue-ink) 0%, var(--violet) 60%, var(--green-dd) 100%);
}

.art-overlay-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.15), transparent 70%);
  pointer-events: none;
}
.art-badge-strip {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  position: relative;
  z-index: 2;
}
.art-badge {
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px);
  color: var(--white);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.art-badge.alt {
  background: rgba(217, 83, 30, 0.85);
  border-color: rgba(217, 83, 30, 0.9);
}

.art-center-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  position: relative;
  z-index: 2;
}
.center-emoji {
  font-size: 80px;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35));
  animation: floatEmoji 3s ease-in-out infinite alternate;
}
@keyframes floatEmoji {
  from { transform: translateY(0px) scale(1); }
  to { transform: translateY(-8px) scale(1.05); }
}

.art-caption-box {
  position: relative;
  z-index: 2;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.art-caption-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0 0 4px;
  color: var(--white);
}
.art-caption-sub {
  font-size: 12px;
  margin: 0;
  color: var(--line);
  line-height: 1.4;
}

.visual-pillars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 14px;
  background: var(--surface);
  border-top: 1px solid var(--line-2);
}
.pillar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.p-icon {
  font-size: 14px;
}

/* Social & Form styles */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 14px 0 16px;
  color: var(--muted);
  font-size: 13px;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}
.divider span {
  padding: 0 10px;
}

.custom-input-box {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--bg);
  border: 1px dashed var(--green);
  border-radius: 12px;
  display: grid;
  gap: 6px;
}
.auto-tag-hint {
  font-size: 13px;
  color: var(--green-d);
  margin: 0;
}

.custom-budget-box {
  margin-top: 10px;
  padding: 16px;
  background: var(--bg);
  border: 1.5px dashed var(--green);
  border-radius: 14px;
  display: grid;
  gap: 10px;
}
.custom-budget-stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}
.budget-step-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1.5px solid var(--green);
  background: var(--card);
  color: var(--green);
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.budget-step-btn:hover:not(:disabled) {
  background: var(--green-soft);
}
.budget-step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.budget-input-wrap {
  flex: 1;
}
.budget-num-input {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.5px;
}
.budget-explain {
  font-size: 14px;
  color: var(--green-d);
  background: var(--green-soft);
  border-radius: 12px;
  padding: 10px 14px;
  margin: 0;
  line-height: 1.45;
}
.budget-hint {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.stepper-wrap {
  display: flex;
  justify-content: center;
}
.ps { display: inline-flex; align-items: center; gap: 18px; }
.ps-btn {
  width: 52px; height: 52px; border-radius: 14px; border: 1.5px solid var(--green);
  background: var(--card); color: var(--green); font-size: 26px; font-weight: 700; line-height: 1;
  cursor: pointer;
}
.ps-btn:hover:not(:disabled) { background: var(--green-soft); }
.ps-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ps-val { min-width: 100px; text-align: center; display: flex; flex-direction: column; line-height: 1.1; }
.ps-val b { font-size: 34px; font-weight: 800; color: var(--ink); }
.ps-val span { font-size: 14px; color: var(--muted); margin-top: 4px; font-weight: 600; }

@media (max-width: 860px) {
  .about-split {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .about-right {
    order: -1;
  }
  .visual-img-container {
    min-height: 200px;
  }
  .center-emoji {
    font-size: 52px;
  }
  .art-caption-title {
    font-size: 14px;
  }
}
</style>