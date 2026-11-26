<template>
  <form v-if="form" class="profile" @submit.prevent="save">
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
      <h2 class="pl-h2">Khẩu vị &amp; Dị ứng</h2>
      <p class="pl-note">Đầu bếp MOVA kiểm tra dị ứng và kiêng cữ trực tiếp ở máy chủ khi đề xuất thực đơn hoặc thêm bữa.</p>
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
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const reward = BUSINESS.incentives.rewards.profileComplete;
const form = ref(null);
const claimed = ref(false);
const error = ref('');
const safetyError = ref('');
const savingSafety = ref(false);
const ALLERGENS = [
  { code: 'seafood', label: 'Hải sản' },
  { code: 'shellfish', label: 'Động vật có vỏ (tôm, cua)' },
  { code: 'peanut', label: 'Đậu phộng' },
  { code: 'egg', label: 'Trứng' },
  { code: 'dairy', label: 'Sữa' },
  { code: 'soy', label: 'Đậu nành' },
  { code: 'gluten', label: 'Gluten' }
];
const AVOIDS = [
  { code: 'beef', label: 'Không ăn bò' },
  { code: 'pork', label: 'Không ăn heo' },
  { code: 'spicy', label: 'Không ăn cay' }
];
const safety = ref({ allergen_codes: [], avoid_tags: [], require_vegetarian: false, household_needs: [], cuisines: [], servings_default: 2 });

async function load() {
  const r = await api.customer.findCustomer();
  if (r.status !== 'success') return;
  const c = r.data;
  claimed.value = c.profile_reward_claimed;
  form.value = { name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', members: (c.members || []).map((m) => ({ ...m })) };
  if (c.safety_profile) {
    safety.value = {
      allergen_codes: [...(c.safety_profile.allergen_codes || [])],
      avoid_tags: [...(c.safety_profile.avoid_tags || [])],
      require_vegetarian: Boolean(c.safety_profile.require_vegetarian),
      household_needs: [...(c.safety_profile.household_needs || [])],
      cuisines: [...(c.safety_profile.cuisines || [])],
      servings_default: c.safety_profile.servings_default || 2
    };
  }
}
load();

async function saveSafety() {
  savingSafety.value = true;
  safetyError.value = '';
  try {
    const r = await api.customer.saveSafetyProfile({
      allergen_codes: safety.value.allergen_codes,
      avoid_tags: safety.value.avoid_tags,
      require_vegetarian: safety.value.require_vegetarian,
      household_needs: safety.value.household_needs,
      cuisines: safety.value.cuisines,
      servings_default: safety.value.servings_default
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
</script>

<style scoped>
.profile { display: grid; gap: 16px; max-width: 720px; }
.box { display: grid; gap: 12px; }
.field { display: grid; gap: 6px; }
.member { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
.member .pl-btn { justify-self: start; }
@media (min-width: 641px) { .member { grid-template-columns: 1fr 1fr 2fr auto; align-items: center; } }
</style>
