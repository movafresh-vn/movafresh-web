<template>
  <section class="pl-card support" aria-label="Đầu bếp MOVA hỗ trợ">
    <h2 class="pl-h2">Đầu bếp MOVA hỗ trợ</h2>
    <p class="pl-note">Xem thông tin mới nhất và gửi yêu cầu cho MOVA. Yêu cầu không tự đổi đơn hoặc hoàn tiền.</p>
    <p v-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>
    <template v-if="account">
      <p class="num">Fresh Credit: <b>{{ fmt(account.credit.total_vnd) }}</b>
        (tiền ăn {{ fmt(account.credit.real_vnd) }}, khuyến mãi {{ fmt(account.credit.promo_vnd) }}).</p>
      <p v-if="account.alert" class="pl-error">Tuần {{ account.alert.week_index + 1 }} còn thiếu {{ fmt(account.alert.shortfall_vnd) }}; trừ lúc {{ account.alert.charge_label }}.</p>
    </template>
    <ul v-if="weeks.length">
      <li v-for="w in weeks" :key="`${w.subscription_id || 'sub'}:${w.week_index}:${w.delivery_date}`">
        Tuần {{ w.number }}{{ w.order_code ? ` · ${w.order_code}` : '' }}: {{ w.status_label }} · hạn đổi {{ w.deadline_label }}
      </li>
    </ul>
    <p v-else-if="loaded && !loadError" class="pl-note">Chưa có tuần giao.</p>
    <button class="pl-btn sm" type="button" :disabled="loading" @click="load">Cập nhật thông tin</button>

    <div v-if="requests.length" class="history">
      <h3>Yêu cầu bạn đã gửi</h3>
      <ul>
        <li v-for="req in requests" :key="req.id" class="req-item">
          <div>
            <b>#{{ req.id }} · {{ statusLabel[req.status] || req.status }}</b>
            <p class="msg">{{ req.message }}</p>
            <p v-if="req.reply_message" class="reply">
              <b>Phản hồi từ MOVA Fresh:</b> {{ req.reply_message }}
            </p>
          </div>
        </li>
      </ul>
    </div>
    <form class="support-form" @submit.prevent="submit">
      <label for="support-category">Loại yêu cầu</label>
      <select id="support-category" v-model="category" class="pl-input" :disabled="busy || uncertain">
        <option value="address_change">Đổi địa chỉ</option>
        <option value="damaged_goods">Hàng hỏng</option>
        <option value="other">Yêu cầu khác</option>
      </select>
      <label for="support-message">Nội dung (có thể kèm mã đơn)</label>
      <textarea id="support-message" v-model.trim="message" class="pl-input" maxlength="2000" required :disabled="busy || uncertain" />
      <p v-if="sendError" class="pl-error" role="alert">{{ sendError }}</p>
      <p v-if="sent" role="status">Đã ghi nhận yêu cầu #{{ sent }}. MOVA cần xử lý thủ công; chưa thay đổi đơn.</p>
      <button class="pl-btn primary" type="submit" :disabled="busy || !message">{{ uncertain ? 'Gửi lại cùng yêu cầu' : 'Gửi yêu cầu' }}</button>
    </form>

    <div class="oa-channel" aria-label="Kênh hỗ trợ trực tiếp Zalo OA">
      <div>
        <b>Cần trao đổi nhanh với Chăm sóc Khách hàng?</b>
        <p class="pl-note">Nhắn Zalo Official Account MOVA FRESH hoặc gọi 1900 8899 (06:00 – 21:00 hàng ngày).</p>
      </div>
      <div class="oa-actions">
        <a
          href="https://zalo.me"
          :target="inMiniApp ? undefined : '_blank'"
          :rel="inMiniApp ? undefined : 'noopener noreferrer'"
          class="pl-btn sm zalo-oa-btn"
          @click="openExt($event, 'https://zalo.me')"
        >
          <MessageCircle :size="16" aria-hidden="true" />
          <span>Chat Zalo OA</span>
        </a>
        <a href="tel:19008899" class="pl-btn outline sm" @click="openExt($event, 'tel:19008899')">
          <Phone :size="16" aria-hidden="true" />
          <span>1900 8899</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { MessageCircle, Phone } from 'lucide-vue-next';
import { api } from '../../shared/api';
import { newKey } from '../../shared/api/http';
import { fmt } from '../../shared/utils/formatters';
import { isZaloMiniApp, openExternalUrl } from '../../services/zaloMiniApp';

const inMiniApp = isZaloMiniApp();
function openExt(event, url) {
  if (!inMiniApp) return;
  event.preventDefault();
  void openExternalUrl(url);
}

const account = ref(null);
const weeks = ref([]);
const requests = ref([]);
const statusLabel = { open: 'Chờ tiếp nhận', in_progress: 'Đang xử lý', resolved: 'Đã xử lý' };
const loading = ref(false);
const loaded = ref(false);
const loadError = ref('');
const category = ref('address_change');
const message = ref('');
const sendError = ref('');
const sent = ref(null);
const busy = ref(false);
const uncertain = ref(false);
let key = null;

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const [a, reqs] = await Promise.all([api.customer.getAccount(), api.customer.listSupportRequests()]);
    if (a.status === 'error') {
      loadError.value = a.error.message;
      return;
    }
    account.value = a.data;
    const activeSubs = (a.data.subscriptions || []).filter((s) => s.status === 'active');
    const weekResponses = activeSubs.length > 0
      ? await Promise.all(activeSubs.map((s) => api.customer.myWeeks(s.id)))
      : [await api.customer.myWeeks()];
    const firstErr = weekResponses.find((r) => r.status === 'error');
    if (firstErr && weekResponses.every((r) => r.status === 'error')) {
      loadError.value = firstErr.error.message;
      return;
    }
    const merged = [];
    for (const [idx, res] of weekResponses.entries()) {
      if (res.status !== 'success') continue;
      const subId = activeSubs[idx]?.id || null;
      for (const w of res.data.weeks || []) merged.push({ ...w, subscription_id: w.subscription_id || subId });
    }
    merged.sort((x, y) => String(x.delivery_date || '').localeCompare(String(y.delivery_date || '')) || Number(x.number || 0) - Number(y.number || 0));
    weeks.value = merged;
    if (reqs.status === 'success') requests.value = reqs.data.requests || [];
  } catch {
    loadError.value = 'Không tải được thông tin. Vui lòng thử lại.';
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}

async function submit() {
  if (busy.value || !message.value) return;
  busy.value = true;
  sendError.value = '';
  sent.value = null;
  key ||= newKey();
  try {
    const r = await api.customer.supportRequest({ category: category.value, message: message.value, key });
    if (r.status === 'error') {
      if (r.error.code === 'BAD_RESPONSE' || r.error.status >= 500) uncertain.value = true;
      sendError.value = uncertain.value ? 'Chưa xác nhận được kết quả. Hãy gửi lại cùng yêu cầu tại đây, không tải lại trang.' : r.error.message;
      if (!uncertain.value) key = null;
      return;
    }
    sent.value = r.data.id;
    message.value = '';
    uncertain.value = false;
    key = null;
    await load();
  } catch {
    uncertain.value = true;
    sendError.value = 'Chưa xác nhận được kết quả. Kiểm tra kết nối và gửi lại cùng yêu cầu tại đây, không tải lại trang.';
  } finally {
    busy.value = false;
  }
}
load();
</script>

<style scoped>
.support, .support-form { display: grid; gap: 12px; }
.support ul { padding-left: 20px; }
.support textarea { min-height: 100px; }
.oa-channel {
  margin-top: 8px;
  padding: 14px;
  border-radius: 14px;
  background: var(--cream-warm);
  border: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.oa-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.oa-actions a { text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
.zalo-oa-btn { background: var(--pay-zalo); border-color: var(--pay-zalo); color: var(--text-on-primary); }
</style>
