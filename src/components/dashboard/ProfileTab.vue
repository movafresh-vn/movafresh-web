<template>
  <form v-if="form" class="profile" @submit.prevent="save">
    <!-- Gắn SĐT xác thực OTP cho tài khoản OAuth (Google/Zalo) chưa có SĐT -->
    <section v-if="store.needsPhoneLink" class="pl-card box phone-link-card" data-testid="profile-phone-link">
      <h2 class="pl-h2">Liên kết số điện thoại (OTP)</h2>
      <p class="pl-note">
        Xác thực số điện thoại để thanh toán gói, nhận thông báo giao hàng và tự động gộp số dư Fresh Credit nếu số này từng đặt hàng tại MOVA.
      </p>
      <div class="link-row">
        <DialSelect v-model="linkDial" :disabled="linkOtpSent || linkBusy" />
        <input
          v-model="linkPhone"
          class="pl-input num"
          type="tel"
          inputmode="tel"
          placeholder="0908 123 456"
          :disabled="linkOtpSent || linkBusy"
          aria-label="Số điện thoại cần liên kết"
        />
        <button v-if="!linkOtpSent" type="button" class="pl-btn primary sm" :disabled="linkBusy" @click="sendPhoneLinkOtp">
          {{ linkBusy ? 'Đang gửi…' : 'Gửi mã OTP' }}
        </button>
      </div>
      <div v-if="linkOtpSent" class="link-row">
        <input
          v-model="linkOtp"
          class="pl-input num"
          type="text"
          inputmode="numeric"
          maxlength="10"
          placeholder="Nhập mã OTP"
          :disabled="linkBusy"
          aria-label="Mã OTP xác thực số điện thoại"
        />
        <button type="button" class="pl-btn primary sm" :disabled="linkBusy" @click="confirmPhoneLinkOtp">
          {{ linkBusy ? 'Đang xác thực…' : 'Xác thực & liên kết' }}
        </button>
        <button type="button" class="pl-btn sm" :disabled="linkBusy" @click="resetPhoneLink">Đổi số</button>
      </div>
      <p v-if="linkError" class="pl-error" role="alert">{{ linkError }}</p>
    </section>

    <section class="pl-card box">
      <h2 class="pl-h2">Thông tin người nhận</h2>
      <div class="field">
        <label class="pl-label" for="pf-name">Họ tên</label>
        <input id="pf-name" v-model="form.name" class="pl-input" autocomplete="name" />
      </div>
      <div class="field">
        <label class="pl-label" for="pf-phone">Số điện thoại (Zalo)</label>
        <input id="pf-phone" v-model="form.phone" class="pl-input num" inputmode="tel" autocomplete="tel" />
      </div>
      <div class="field">
        <label class="pl-label" for="pf-email">Email</label>
        <input id="pf-email" v-model="form.email" class="pl-input" type="email" autocomplete="email" />
      </div>
      <div class="field">
        <label class="pl-label" for="pf-address">Địa chỉ giao hàng</label>
        <input id="pf-address" v-model="form.address" class="pl-input" autocomplete="street-address" />
        <p class="pl-note">Đổi địa chỉ áp cho các tuần chưa chốt sổ.</p>
      </div>
    </section>

    <section class="pl-card box">
      <h2 class="pl-h2">Thành viên trong nhà</h2>
      <p class="pl-note">Ghi lưu ý ăn uống của từng người (ví dụ không ăn cay, hạn chế đường, bé 3 tuổi) để bếp xếp món hợp hơn.</p>
      <div v-for="(m, i) in form.members" :key="i" class="member">
        <input v-model="m.name" class="pl-input" placeholder="Tên" :aria-label="`Tên thành viên ${i + 1}`" />
        <input v-model="m.relation" class="pl-input" placeholder="Quan hệ (bản thân, con, bố...)" :aria-label="`Quan hệ thành viên ${i + 1}`" />
        <input v-model="m.note" class="pl-input" placeholder="Lưu ý ăn uống" :aria-label="`Lưu ý ăn uống thành viên ${i + 1}`" />
        <button type="button" class="pl-btn sm" @click="form.members.splice(i, 1)">Xóa</button>
      </div>
      <button v-if="form.members.length < 8" type="button" class="pl-btn" @click="form.members.push({ name: '', relation: '', note: '' })">Thêm thành viên</button>
    </section>

    <section class="pl-card box">
      <h2 class="pl-h2">Khẩu vị, Khu vực &amp; Dị ứng</h2>
      <p class="pl-note">Đầu bếp MOVA kiểm tra dị ứng và kiêng cữ trực tiếp ở máy chủ khi đề xuất thực đơn hoặc thêm bữa.</p>
      <div class="field-grid">
        <div class="field">
          <label class="pl-label" for="pf-living-area">Khu vực giao hàng</label>
          <select id="pf-living-area" v-model="safety.living_area" class="pl-input">
            <option value="">Chọn quận / huyện</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="field">
          <label class="pl-label" for="pf-budget">Ngân sách tuần dự kiến (VNĐ)</label>
          <input id="pf-budget" v-model.number="safety.weekly_grocery_budget_vnd" class="pl-input num" type="number" min="0" step="50000" placeholder="Ví dụ 1000000" />
        </div>
      </div>
      <div class="field-grid three">
        <div class="field">
          <label class="pl-label" for="pf-adults">Người lớn (1–10)</label>
          <input id="pf-adults" v-model.number="safety.adults_count" class="pl-input num" type="number" min="1" max="10" />
        </div>
        <div class="field">
          <label class="pl-label" for="pf-children">Trẻ em (0–10)</label>
          <input id="pf-children" v-model.number="safety.children_count" class="pl-input num" type="number" min="0" max="10" />
        </div>
        <div class="field">
          <label class="pl-label" for="pf-meals">Số bữa / tuần (3–21)</label>
          <input id="pf-meals" v-model.number="safety.weekly_home_meals_count" class="pl-input num" type="number" min="3" max="21" />
        </div>
      </div>
      <div class="field">
        <span class="pl-label">Phong cách ẩm thực</span>
        <div class="chips">
          <label v-for="cs in CUISINE_STYLES" :key="cs.id" class="chip">
            <input type="checkbox" :value="cs.id" v-model="safety.cuisines" />
            <span>{{ cs.name }}</span>
          </label>
        </div>
      </div>
      <div class="field">
        <span class="pl-label">Ưu tiên 6 nguồn đạm</span>
        <div class="protein-grid">
          <div v-for="p in PROTEIN_SOURCES" :key="p.id" class="protein-row">
            <span>{{ p.name }}</span>
            <select v-model="safety.protein_prefs[p.id]" class="pl-input sm-select" :aria-label="`Sở thích ${p.name}`">
              <option value="neutral">Bình thường</option>
              <option value="like">Thích ăn nhiều</option>
              <option value="dislike">Không thích</option>
            </select>
          </div>
        </div>
      </div>
      <div class="field">
        <span class="pl-label">Mục tiêu thể trạng gia đình</span>
        <div class="chips">
          <label v-for="n in PROFILE_HEALTH_NEEDS" :key="n.id" class="chip">
            <input type="checkbox" :value="n.id" v-model="safety.household_needs" />
            <span>{{ n.label }}</span>
          </label>
        </div>
      </div>
      <div class="field">
        <span class="pl-label">Dị ứng (loại bỏ hoàn toàn)</span>
        <div class="chips">
          <label v-for="a in ALLERGENS" :key="a.code" class="chip">
            <input type="checkbox" :value="a.code" v-model="safety.allergen_codes" />
            <span>{{ a.label }}</span>
          </label>
        </div>
      </div>
      <div class="field">
        <span class="pl-label">Kiêng cữ</span>
        <div class="chips">
          <label v-for="t in AVOIDS" :key="t.code" class="chip">
            <input type="checkbox" :value="t.code" v-model="safety.avoid_tags" />
            <span>{{ t.label }}</span>
          </label>
          <label class="chip">
            <input type="checkbox" v-model="safety.require_vegetarian" />
            <span>Ăn chay</span>
          </label>
        </div>
      </div>
      <p v-if="safetyError" class="pl-error" role="alert">{{ safetyError }}</p>
      <button type="button" class="pl-btn" :disabled="savingSafety" @click="saveSafety">
        {{ savingSafety ? 'Đang lưu...' : 'Lưu khẩu vị & dị ứng' }}
      </button>
    </section>

    <section class="pl-card box">
      <p class="pl-note" role="status">
        <template v-if="completeness.complete">Hồ sơ đã đầy đủ.</template>
        <template v-else>Đã xong {{ completeness.done }} trên {{ completeness.total }} mục. Còn thiếu: {{ completeness.missing.join(', ') }}.</template>
        <template v-if="!claimed"> Điền đủ để nhận {{ fmt(reward) }} Fresh Credit.</template>
      </p>
      <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
      <button class="pl-btn primary" type="submit">Lưu hồ sơ</button>
    </section>
  </form>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { BUSINESS } from '../../shared/config/business';
import { profileCompleteness } from '../../shared/domain/rewards';
import { ALLERGENS, AVOIDS, CUISINE_STYLES, PROFILE_HEALTH_NEEDS, PROTEIN_SOURCES } from '../../shared/domain/profilePreferences';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';
import DialSelect from '../modals/DialSelect.vue';

const store = useMovaStore();
const reward = BUSINESS.incentives.rewards.profileComplete;
const form = ref(null);
const claimed = ref(false);
const error = ref('');
const safetyError = ref('');
const savingSafety = ref(false);
const linkDial = ref('84');
const linkPhone = ref('');
const linkOtp = ref('');
const linkOtpSent = ref(false);
const linkBusy = ref(false);
const linkError = ref('');
const districts = BUSINESS.zones.flatMap((z) => z.districts).filter((d) => d !== 'TP. Thủ Đức');
const defaultProteinPrefs = () => Object.fromEntries(PROTEIN_SOURCES.map((p) => [p.id, 'neutral']));
const safety = ref({
  living_area: '',
  adults_count: 2,
  children_count: 0,
  weekly_home_meals_count: 5,
  weekly_grocery_budget_vnd: null,
  allergen_codes: [],
  avoid_tags: [],
  require_vegetarian: false,
  household_needs: [],
  cuisines: [],
  protein_prefs: defaultProteinPrefs(),
  servings_default: 2
});

async function load() {
  const r = await api.customer.findCustomer();
  if (r.status !== 'success') return;
  const c = r.data;
  claimed.value = c.profile_reward_claimed;
  form.value = { name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', members: (c.members || []).map((m) => ({ ...m })) };
  if (c.safety_profile) {
    const sp = c.safety_profile;
    const adults = Math.max(1, Math.min(10, Number(sp.adults_count ?? sp.servings_default ?? 2)));
    const children = Math.max(0, Math.min(10, Number(sp.children_count ?? 0)));
    safety.value = {
      living_area: sp.living_area || c.district || '',
      adults_count: adults,
      children_count: children,
      weekly_home_meals_count: Math.max(3, Math.min(21, Number(sp.weekly_home_meals_count ?? 5))),
      weekly_grocery_budget_vnd: sp.weekly_grocery_budget_vnd || null,
      allergen_codes: [...(sp.allergen_codes || [])],
      avoid_tags: [...(sp.avoid_tags || [])],
      require_vegetarian: Boolean(sp.require_vegetarian),
      household_needs: [...(sp.household_needs || [])],
      cuisines: [...(sp.cuisines || [])],
      protein_prefs: { ...defaultProteinPrefs(), ...(sp.protein_prefs || {}) },
      servings_default: sp.servings_default || Math.min(10, Math.max(1, adults + children))
    };
  }
}
load();

async function saveSafety() {
  savingSafety.value = true;
  safetyError.value = '';
  try {
    const adults = Math.max(1, Math.min(10, Math.round(Number(safety.value.adults_count) || 2)));
    const children = Math.max(0, Math.min(10, Math.round(Number(safety.value.children_count) || 0)));
    const householdSize = Math.max(1, Math.min(10, adults + children));
    const meals = Math.max(3, Math.min(21, Math.round(Number(safety.value.weekly_home_meals_count) || 5)));
    const budget = safety.value.weekly_grocery_budget_vnd > 0 ? Math.round(Number(safety.value.weekly_grocery_budget_vnd)) : null;
    const r = await api.customer.saveSafetyProfile({
      living_area: safety.value.living_area || null,
      adults_count: adults,
      children_count: children,
      household_size: householdSize,
      servings_default: householdSize,
      weekly_home_meals_count: meals,
      weekly_grocery_budget_vnd: budget,
      allergen_codes: safety.value.allergen_codes,
      avoid_tags: safety.value.avoid_tags,
      require_vegetarian: safety.value.require_vegetarian,
      household_needs: safety.value.household_needs,
      cuisine_preferences: safety.value.cuisines,
      protein_prefs: safety.value.protein_prefs
    });
    if (r.status === 'error') {
      safetyError.value = r.error.message;
      return;
    }
    await store.refresh();
    store.toast('Đã lưu khẩu vị và thông tin dị ứng.');
  } finally {
    savingSafety.value = false;
  }
}

const completeness = computed(() => (form.value ? profileCompleteness(form.value) : { done: 0, total: 0, missing: [], complete: false }));

async function save() {
  error.value = '';
  const r = await api.customer.saveProfile({ ...form.value });
  if (r.status === 'error') {
    error.value = r.error.message;
    return;
  }
  claimed.value = r.data.customer.profile_reward_claimed;
  await store.refresh();
  store.toast(r.data.reward_vnd ? `Đã lưu hồ sơ. MOVA cộng ${fmt(r.data.reward_vnd)} vào Fresh Credit` : 'Đã lưu hồ sơ');
}

async function sendPhoneLinkOtp() {
  if (linkBusy.value) return;
  linkBusy.value = true;
  linkError.value = '';
  try {
    const err = await store.requestPhoneLink(linkPhone.value, { dial: linkDial.value });
    if (err) {
      linkError.value = err;
      return;
    }
    linkOtpSent.value = true;
  } finally {
    linkBusy.value = false;
  }
}

async function confirmPhoneLinkOtp() {
  if (linkBusy.value) return;
  linkBusy.value = true;
  linkError.value = '';
  try {
    const err = await store.verifyPhoneLink(linkPhone.value, linkOtp.value, { dial: linkDial.value });
    if (err) {
      linkError.value = err;
      return;
    }
    linkOtpSent.value = false;
    linkOtp.value = '';
    await load();
  } finally {
    linkBusy.value = false;
  }
}

function resetPhoneLink() {
  linkOtpSent.value = false;
  linkOtp.value = '';
  linkError.value = '';
}
</script>

<style scoped>
.profile { display: grid; gap: 16px; max-width: 720px; }
.box { display: grid; gap: 12px; }
.field { display: grid; gap: 6px; }
.member { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
.member .pl-btn { justify-self: start; }
@media (min-width: 641px) {
  .member { grid-template-columns: 1fr 1fr 2fr auto; align-items: center; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-grid.three { grid-template-columns: 1fr 1fr 1fr; }
}
.protein-grid { display: grid; gap: 8px; }
.protein-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 10px; }
.sm-select { width: auto; min-width: 140px; padding: 6px 10px; }
.phone-link-card { border-color: var(--orange, #e67e22); }
.link-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.link-row .pl-input { flex: 1; min-width: 160px; }
</style>
