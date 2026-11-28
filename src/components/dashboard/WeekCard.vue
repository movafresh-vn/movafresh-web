<template>
  <article class="week pl-card" :aria-label="`Tuần ${week.number}`">
    <header class="head">
      <div>
        <h2 class="pl-h2">Tuần {{ week.number }}</h2>
        <p v-if="week.order_code" class="muted num" data-testid="week-order-code">Mã đơn: <b>{{ week.order_code }}</b></p>
        <p class="when">
          <span v-for="(b, i) in week.boxes" :key="b.order_id">{{ i ? ' và ' : '' }}{{ b.delivery_label }}</span>
          <span class="muted"> · {{ week.boxes?.[0]?.slot_label }}</span>
        </p>
      </div>
      <span class="status" :class="week.status">{{ week.status_label }}</span>
    </header>

    <!-- Khoản thanh toán đến sau giờ chốt sổ: MOVA xem xét, báo kết quả cho khách -->
    <p v-if="week.late_payment" class="pl-panel note late" :data-tone="week.late_payment.tone" data-testid="late-payment" role="status">
      <b>Thanh toán đến sau giờ chốt sổ</b><br />{{ week.late_payment.label }}
    </p>

    <p v-if="week.postponed_to_week != null" class="pl-panel note">
      Tuần này đã tạm hoãn. Thực đơn dời sang <b>Tuần {{ week.postponed_to_week + 1 }}</b>, ưu đãi của tuần được giữ nguyên.
    </p>
    <p v-if="week.shifted_from" class="pl-panel note" data-testid="shifted-from">
      Tuần này dời sang ngày giao mới vì nghỉ lễ Tết (ngày giao ban đầu {{ fmtDay(week.shifted_from) }}).
    </p>
    <p v-if="week.postponed_to_week == null && week.moved_from_week != null" class="pl-panel note">
      Đây là thực đơn của Tuần {{ week.moved_from_week + 1 }} đã tạm hoãn, dời xuống cuối gói.
    </p>

    <!-- Hạn đổi món: luôn là ngày giờ cụ thể -->
    <div v-if="week.status !== 'postponed' && week.status !== 'cancelled'" class="deadline" :class="{ open: week.editable }">
      <small>{{ week.editable ? 'Đổi món trước' : 'Đã khóa từ' }}</small>
      <b class="num">{{ week.deadline_label }}</b>
      <span v-if="week.editable">Sau mốc này nhà máy chốt sổ và bắt đầu sơ chế, thực đơn không đổi được nữa.</span>
      <span v-else>Nhà máy đã chốt sổ tuần này.</span>
    </div>

    <dl class="money num">
      <div v-if="week.status !== 'postponed' && week.status !== 'cancelled'">
        <dt>Số tiền tuần này</dt>
        <dd>{{ fmt(week.amount_vnd) }}</dd>
      </div>
      <div v-if="week.discount_vnd > 0 && week.status !== 'cancelled'">
        <dt>Ưu đãi của tuần (thẻ quà tặng)</dt>
        <dd class="good">−{{ fmt(week.discount_vnd) }}</dd>
      </div>
      <div v-if="chargeText">
        <dt>{{ chargeText.label }}</dt>
        <dd :class="{ bad: week.charge?.state === 'failed' }">{{ chargeText.value }}</dd>
      </div>
    </dl>

    <ul class="meals">
      <li v-for="m in week.meals" :key="m.order_id + '-' + m.meal_index" class="meal">
        <div class="meal-h">
          <b>Bữa {{ m.meal_index }}</b>
          <span v-if="m.western" class="pl-pill orange">Bữa Tây</span>
          <span class="num muted">{{ fmt(m.price_vnd) }}</span>
        </div>
        <ul class="dishes">
          <li v-for="d in m.dishes" :key="d.kind">
            <span class="dn">{{ d.name }}<small v-if="d.sauce_name"> · {{ d.sauce_name }}</small></span>
            <button v-if="m.editable && SWAP.includes(d.kind)" type="button" class="swap" :aria-label="`Đổi món ${d.name}`" @click="$emit('change', { meal: m, dish: d })">Đổi</button>
          </li>
        </ul>
      </li>
    </ul>

    <ul v-if="week.boxes?.length > 1 && week.boxes.some((b) => ['shipping', 'delivered'].includes(b.phase))" class="box-status" aria-label="Trạng thái từng thùng">
      <li v-for="b in week.boxes" :key="'bs' + b.order_id" :data-phase="b.phase"><b>{{ b.delivery_label }}</b>: {{ b.phase_label }}</li>
    </ul>

    <p v-for="b in (week.boxes || []).filter((x) => x.delivery_issue)" :key="'iss' + b.order_id" class="pl-panel note issue" :data-issue="b.delivery_issue.kind">
      <b>{{ b.delivery_issue.label }}</b><br />{{ b.delivery_issue.detail }}
    </p>

    <div v-if="week.boxes?.some((b) => b.photo_url)" class="proof" data-testid="delivery-proof">
      <figure v-for="b in week.boxes.filter((x) => x.photo_url)" :key="b.order_id">
        <template v-if="!imgFailed[b.order_id]">
          <img
            :src="b.photo_url"
            alt="Ảnh giao hàng"
            loading="lazy"
            title="Bấm để xem ảnh phóng to"
            @error="onImgError(b.order_id)"
            @click="previewImg = b.photo_url"
          />
        </template>
        <span v-else class="pl-pill">Đã lưu ảnh giao hàng</span>
        <figcaption v-if="b.delivered_at">Giao lúc {{ fmtDeadline(new Date(b.delivered_at)) }}</figcaption>
      </figure>

      <Teleport to="body">
        <div v-if="previewImg" class="photo-modal-backdrop" role="dialog" aria-modal="true" @click.self="previewImg = ''">
          <div class="photo-modal-content">
            <button type="button" class="photo-modal-close" aria-label="Đóng" @click="previewImg = ''"><X :size="18" aria-hidden="true" /></button>
            <img :src="previewImg" alt="Ảnh giao hàng phóng to" />
          </div>
        </div>
      </Teleport>
    </div>
    <p v-else-if="week.status === 'delivered'" class="pl-note" data-testid="delivery-proof-pending">Ảnh giao hàng sẽ hiện ở đây khi shipper tải lên.</p>

    <footer v-if="week.editable || week.skip?.allowed || skipHint" class="foot">
      <div class="foot-actions">
        <button v-if="week.editable" class="pl-btn sm" type="button" data-testid="toggle-extra-meals" @click="showExtra = !showExtra">
          {{ showExtra ? 'Đóng thêm bữa / tăng suất' : 'Thêm bữa / tăng suất' }}
        </button>
        <button v-if="week.skip?.allowed" class="pl-btn" type="button" @click="$emit('skip', week)">Tạm hoãn tuần này</button>
      </div>
      <p v-if="!week.skip?.allowed && skipHint" class="pl-note">{{ skipHint }}</p>

      <form v-if="week.editable && showExtra" class="extra-form" @submit.prevent="submitExtra">
        <p class="pl-note">Tối đa 21 bữa/tuần (bao gồm bữa bổ sung) và tối đa 10 suất/món. Phần tăng thêm của tuần đã thanh toán được trừ bằng Fresh Credit; ưu đãi tuần đầu giữ nguyên.</p>
        <div class="extra-row">
          <label>
            <span>Bữa cần tăng suất</span>
            <select v-model.number="extraMealIdx" class="pl-input">
              <option v-for="m in week.meals" :key="m.meal_index" :value="m.meal_index">Bữa {{ m.meal_index }}</option>
            </select>
          </label>
          <label>
            <span>Số suất mới (1–10)</span>
            <input v-model.number="extraServings" class="pl-input num" type="number" min="1" max="10" required />
          </label>
        </div>
        <p v-if="extraError" class="pl-error" role="alert">{{ extraError }}</p>
        <p v-if="extraOk" role="status">{{ extraOk }}</p>
        <button class="pl-btn primary sm" type="submit" :disabled="extraBusy">
          {{ extraBusy ? 'Đang cập nhật...' : 'Xác nhận tăng suất' }}
        </button>
      </form>
    </footer>
  </article>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../shared/api';
import { X } from 'lucide-vue-next';
import { newKey } from '../../shared/api/http';
import { fmt } from '../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../shared/utils/time';
import { useMovaStore } from '../../stores/useMovaStore';

const props = defineProps({ week: { type: Object, required: true } });
defineEmits(['change', 'skip']);
const store = useMovaStore();
const SWAP = ['protein', 'veg', 'soup', 'carb'];

const showExtra = ref(false);
const extraMealIdx = ref(props.week.meals?.[0]?.meal_index || 1);
const extraServings = ref(3);
const extraBusy = ref(false);
const extraError = ref('');
const extraOk = ref('');
let extraKey = null;

async function submitExtra() {
  if (extraBusy.value) return;
  const meal = (props.week.meals || []).find((m) => m.meal_index === extraMealIdx.value);
  if (!meal || !meal.dishes?.length) {
    extraError.value = 'Không tìm thấy bữa ăn hợp lệ.';
    return;
  }
  extraBusy.value = true;
  extraError.value = '';
  extraOk.value = '';
  extraKey ||= newKey();
  try {
    const r = await api.customer.addWeekMeals({
      week_index: props.week.number,
      portion_updates: meal.dishes.map((d) => ({ meal_index: meal.meal_index, kind: d.kind, servings: extraServings.value })),
      idempotency_key: extraKey
    });
    if (r.status === 'error') {
      extraError.value = r.error.message;
      if (r.error.status < 500) extraKey = null;
      return;
    }
    extraKey = null;
    extraOk.value = `Đã cập nhật! Chênh lệch: ${fmt(r.data.delta_vnd)}.`;
    await store.refresh();
  } catch {
    extraError.value = 'Không kết nối được máy chủ. Bấm xác nhận lại để gửi cùng yêu cầu an toàn.';
  } finally {
    extraBusy.value = false;
  }
}

const previewImg = ref('');
const imgFailed = reactive({});
const onImgError = (id) => {
  imgFailed[id] = true;
};

const chargeText = computed(() => {
  const c = props.week.charge;
  const at = c.at ? fmtDeadline(new Date(c.at)) : '';
  switch (c.state) {
    case 'scheduled': return { label: 'MOVA sẽ trừ tiền lúc', value: at };
    case 'paid': return { label: 'Đã trừ tiền lúc', value: at };
    case 'prepaid': return { label: 'Đã trả trọn gói lúc', value: at };
    case 'failed': return { label: 'Chưa trừ được tiền', value: c.reason };
    default: return null;
  }
});

// Chỉ nhắc lý do khi tuần còn đổi món được mà không tạm hoãn được (hết lượt)
const skipHint = computed(() => (props.week.editable && props.week.skip?.code === 'SKIP_LIMIT' ? props.week.skip.reason : ''));
</script>

<style scoped>
.week { display: grid; gap: 14px; }
.head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.when { font-size: 16px; margin-top: 4px; }
.status {
  flex-shrink: 0; font-size: 14px; font-weight: 700; border-radius: 999px; padding: 5px 12px;
  background: var(--line-2); color: var(--ink); white-space: nowrap;
}
.status.editable { background: var(--green-soft); color: var(--green-d); }
.status.charged { background: var(--blue-soft); color: var(--blue); }
.status.charge_failed { background: var(--red-soft); color: var(--red); }
.status.locked, .status.in_production { background: var(--butter); color: var(--amber-ink); }
.status.shipping { background: var(--orange-soft); color: var(--orange-ink); }
.status.delivered { background: var(--green-d); color: var(--white); }
.status.postponed, .status.cancelled { background: var(--line); color: var(--muted); }

.note { font-size: 16px; background: var(--butter); border-color: var(--amber-line); }

.deadline { border-radius: 14px; padding: 12px 14px; background: var(--line-2); display: grid; gap: 2px; }
.deadline.open { background: var(--orange-soft); }
.deadline small { font-size: 15px; font-weight: 700; color: var(--orange-ink); }
.deadline:not(.open) small { color: var(--muted); }
.deadline b { font-size: 22px; }
.deadline span { font-size: 15px; color: var(--ink); }

.money { margin: 0; display: grid; }
.money > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 16px; }
.money dt { color: var(--muted); }
.money dd { margin: 0; font-weight: 700; text-align: right; }
.money .good { color: var(--green-d); }
.money .bad { color: var(--red); }

.meals { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.meal { border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: grid; gap: 8px; }
.meal-h { display: flex; align-items: center; gap: 8px; font-size: 16px; }
.meal-h .num { margin-left: auto; font-size: 15px; }
.dishes { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.dishes li { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; border-top: 1px dashed var(--line-2); font-size: 16px; }
.dishes li:first-child { border-top: 0; }
.dn small { color: var(--muted); font-size: 14px; }
.swap {
  min-width: 64px; min-height: 44px; border: 1.5px solid var(--green); background: var(--white); color: var(--green-d);
  border-radius: 12px; font-weight: 700; font-size: 16px; padding: 0 14px;
}
.swap:hover { background: var(--green-soft); }

.box-status { list-style: none; margin: 8px 0; padding: 0; display: grid; gap: 4px; font-size: 16px; }
.box-status li { padding: 6px 10px; border-radius: 10px; background: var(--line-2); }
.box-status li[data-phase="delivered"] { background: var(--green-soft); color: var(--green-d); }
.proof { display: grid; gap: 8px; }
.proof img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; background: var(--line-2); cursor: pointer; transition: transform 0.15s ease; }
.proof img:hover { transform: scale(1.02); }
.proof figure { margin: 0; display: grid; gap: 4px; }
.proof figcaption { font-size: 14px; color: var(--muted); }
.photo-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 24px;
  cursor: zoom-out;
}
.photo-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.photo-modal-content img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: var(--shadow-sheet);
  background: var(--ink-dark);
}
.photo-modal-close {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--white);
  color: var(--ink-dark);
  border: 1px solid var(--line);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  transition: background 0.15s ease, transform 0.15s ease;
}
.photo-modal-close:hover {
  background: var(--surface);
  transform: scale(1.08);
}
.late[data-tone="good"] { background: var(--green-soft); border-color: var(--green-line); }
.late[data-tone="wait"] { background: var(--orange-soft); border-color: var(--red-line); }
.late[data-tone="info"] { background: var(--blue-soft); }
.foot { display: grid; }
@media (min-width: 641px) { .foot { justify-items: start; } }
</style>
