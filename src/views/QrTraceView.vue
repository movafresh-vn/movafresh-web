<template>
  <div class="trace">
    <div class="wrap narrow">
      <section v-if="!loaded" class="pl-card" role="status"><p class="pl-lead">Đang tải thông tin nguồn gốc…</p></section>

      <section v-else-if="!lot" class="pl-card">
        <h1 class="pl-h1">Không tìm thấy mã QR này</h1>
        <p class="pl-lead">Mã <b class="code">{{ code }}</b> chưa có trong hệ thống. Bạn kiểm tra lại nhãn trên hộp hoặc thử một mã mẫu:</p>
        <ul class="samples">
          <li v-for="s in samples" :key="s.qr_code"><router-link :to="`/q/${s.qr_code}`">{{ s.product_name }}<small>{{ s.qr_code }}</small></router-link></li>
        </ul>
      </section>

      <template v-else>
        <header class="pl-card top">
          <p class="kicker">Truy xuất nguồn gốc</p>
          <h1 class="pl-h1">{{ lot.product_name }}</h1>
          <p class="pl-note">Mã lô <b class="code">{{ lot.qr_code }}</b></p>
          <p v-if="lot.sample" class="pl-panel sample">Đây là dữ liệu mẫu của bản demo. Bản thật lấy từ lô do xưởng Đắk Lắk ghi lúc sơ chế.</p>
        </header>

        <!-- 1. Công thức nấu 15 phút -->
        <section class="pl-card sec" aria-labelledby="sec-recipe">
          <h2 id="sec-recipe" class="pl-h2">Nấu trong 15 phút</h2>
          <p v-if="!lot.recipes.length" class="pl-note">Nguyên liệu này dùng cho nhiều món. Công thức nằm trong thực đơn tuần của bạn.</p>
          <article v-for="r in lot.recipes" :key="r.dish_id" class="recipe">
            <h3>{{ r.name }} <span class="pl-pill">{{ r.minutes }} phút</span></h3>
            <p v-if="r.sauce_name" class="pl-note">Dùng gói {{ r.sauce_name }} trong hộp. Gia vị bếp cơ bản (muối, đường, dầu ăn) bạn có sẵn ở nhà.</p>
            <ol>
              <li v-for="(s, i) in r.steps" :key="i">{{ s }}</li>
            </ol>
          </article>
        </section>

        <!-- 2. Nguồn gốc lô -->
        <section class="pl-card sec" aria-labelledby="sec-origin">
          <h2 id="sec-origin" class="pl-h2">Nguồn gốc lô</h2>
          <dl class="facts">
            <div><dt>Hợp tác xã / trang trại</dt><dd>{{ lot.farm.name }}</dd></div>
            <div><dt>Khu vực</dt><dd>{{ lot.farm.location }}</dd></div>
            <div><dt>{{ harvestLabel }}</dt><dd class="num">{{ lot.harvest_or_slaughter_at ? fmtDate(new Date(lot.harvest_or_slaughter_at)) : 'Chưa ghi' }}</dd></div>
            <div><dt>Ngày sơ chế</dt><dd class="num">{{ lot.processed_at ? fmtDate(new Date(lot.processed_at)) : 'Chưa ghi' }}</dd></div>
            <div><dt>Xác nhận chéo từ nông hộ lân cận</dt><dd class="num">{{ lot.peer_validations_count }} lượt<small v-if="lot.last_peer_check">Gần nhất {{ fmtDeadline(new Date(lot.last_peer_check)) }}</small></dd></div>
            <div v-if="lot.inspector.verified"><dt>Cán bộ MOVA kiểm tra</dt><dd>Đã kiểm<small>Test tồn dư kháng sinh: {{ testText }}</small></dd></div>
            <div v-if="lot.trust_score != null"><dt>Điểm tin cậy</dt><dd class="num">{{ lot.trust_score }} trên 100</dd></div>
          </dl>
          <p class="pl-note">Các hộ nông dân ở ô đất, chuồng trại lân cận xác nhận chéo nhật ký canh tác, tương tự cách người dùng Waze xác nhận tình trạng đường.</p>

          <h3>Nhật ký nhiệt</h3>
          <template v-if="lot.temperature.readings.length">
            <p class="temp" :class="{ ok: lot.temperature.within_limit, bad: lot.temperature.within_limit === false }">
              <b class="num">{{ lot.temperature.min }}°C đến {{ lot.temperature.max }}°C</b>
              <span v-if="lot.temperature.limit">
                {{ lot.temperature.within_limit ? ` nằm trong ngưỡng ${lot.temperature.limit.min}°C đến ${lot.temperature.limit.max}°C` : ` vượt ngưỡng ${lot.temperature.limit.min}°C đến ${lot.temperature.limit.max}°C` }}
              </span>
            </p>
            <ul class="readings">
              <li v-for="r in lot.temperature.readings" :key="r.at"><span>{{ r.point }}<small>{{ fmtDeadline(new Date(r.at)) }}</small></span><b class="num">{{ r.celsius }}°C</b></li>
            </ul>
          </template>
          <p v-else class="pl-note">{{ lot.temperature.log || 'Nguyên liệu này không cần chuỗi lạnh.' }}</p>
        </section>

        <!-- 3. Chia sẻ nhận thưởng -->
        <section class="pl-card sec share" aria-labelledby="sec-share">
          <h2 id="sec-share" class="pl-h2">Chia sẻ nhận thưởng</h2>
          <p class="pl-lead">Gửi trang này cho bạn bè và nhận <b class="num">{{ fmt(reward) }}</b> Fresh Credit.</p>
          <button class="pl-btn primary" type="button" :disabled="busy" @click="share">Chia sẻ trang này</button>
          <p v-if="message" class="pl-note msg" role="status">{{ message }}</p>
          <p v-if="!store.isLoggedIn" class="pl-note">
            Bạn chưa đăng nhập nên chưa nhận được thưởng.
            <button class="link" type="button" @click="store.openModal('login')">Đăng nhập để nhận thưởng</button>
          </p>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../shared/api';
import { BUSINESS } from '../shared/config/business';
import { fmt } from '../shared/utils/formatters';
import { fmtDate, fmtDeadline } from '../shared/utils/time';
import { useMovaStore } from '../stores/useMovaStore';

const route = useRoute();
const store = useMovaStore();
const reward = BUSINESS.incentives.rewards.share;
const lot = ref(null);
const loaded = ref(false);
const samples = ref([]);
const message = ref('');
const busy = ref(false);

const code = computed(() => String(route.params.code || ''));
const harvestLabel = computed(() => (lot.value && lot.value.kind === 'rice' ? 'Ngày thu hoạch' : 'Ngày giết mổ'));
const testText = computed(() => (lot.value.inspector.antibiotic_test === 'NEGATIVE' ? 'âm tính (đạt)' : lot.value.inspector.antibiotic_test || 'chưa có'));

async function load() {
  loaded.value = false;
  const res = await api.customer.traceLot(code.value);
  lot.value = res.status === 'success' ? res.data : null;
  samples.value = lot.value ? [] : await api.customer.sampleLotCodes();
  message.value = '';
  loaded.value = true;
  document.title = lot.value ? `${lot.value.product_name} | MOVA FRESH` : 'Truy xuất nguồn gốc | MOVA FRESH';
}
load();
watch(code, load);

async function share() {
  busy.value = true;
  message.value = '';
  const url = location.href;
  const text = `Mình vừa quét QR trên hộp MOVA FRESH: ${lot.value.product_name} từ ${lot.value.farm.location}. Xem nguồn gốc và công thức 15 phút:`;
  try {
    if (navigator.share) await navigator.share({ title: lot.value.product_name, text, url });
    else await navigator.clipboard.writeText(`${text} ${url}`);
  } catch (e) {
    if (!e || e.name !== 'AbortError') message.value = `Trình duyệt không cho sao chép tự động. Bạn hãy chép liên kết này: ${url}`;
    busy.value = false;
    return;
  }
  if (!store.isLoggedIn) {
    message.value = 'Đã chia sẻ. Đăng nhập để MOVA cộng thưởng vào Fresh Credit.';
  } else {
    const res = await api.customer.claimShare({ kind: 'qr', ref: lot.value.qr_code });
    if (res.status === 'error') message.value = `Đã chia sẻ. ${res.error.message}.`;
    else {
      message.value = `Đã chia sẻ. MOVA cộng ${fmt(res.data.reward_vnd)} vào Fresh Credit (khuyến mãi).`;
      await store.refresh();
    }
  }
  busy.value = false;
}
</script>

<style scoped>
.trace { padding: 20px 0 60px; }
.narrow { max-width: 720px; display: grid; gap: 16px; }
.top { display: grid; gap: 8px; }
.kicker { font-size: 14px; font-weight: 700; color: var(--green-d); text-transform: uppercase; letter-spacing: .05em; }
.code { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .02em; overflow-wrap: anywhere; }
.sample { background: var(--butter); border-color: var(--amber-line); font-size: 15px; }
.sec { display: grid; gap: 14px; }
h3 { font-size: 18px; font-weight: 800; }
.recipe { border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 8px; }
.recipe ol { margin: 0; padding-left: 22px; display: grid; gap: 8px; font-size: 17px; }
.facts { margin: 0; display: grid; }
.facts > div { display: flex; justify-content: space-between; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--line-2); font-size: 16px; }
.facts dt { color: var(--muted); flex: 0 0 44%; }
.facts dd { margin: 0; font-weight: 700; text-align: right; display: grid; justify-items: end; }
.facts small, .readings small { display: block; font-weight: 400; color: var(--muted); font-size: 14px; }
.temp { font-size: 17px; padding: 10px 14px; border-radius: 12px; background: var(--line-2); }
.temp.ok { background: var(--green-soft); color: var(--green-d); }
.temp.bad { background: var(--red-soft); color: var(--red); }
.readings { list-style: none; margin: 0; padding: 0; display: grid; }
.readings li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 16px; }
.share { background: var(--green-soft); border-color: var(--green-line); }
.msg { color: var(--green-d); font-weight: 600; }
.link { background: none; border: 0; padding: 0; color: var(--green-d); font-weight: 700; text-decoration: underline; min-height: 44px; font-size: inherit; }
.samples { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.samples a { display: block; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; font-weight: 700; text-decoration: none; }
.samples small { display: block; font-weight: 400; color: var(--muted); }
</style>
