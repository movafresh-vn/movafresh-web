<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="link-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng">×</button>
      <h2 id="link-title" class="pl-h2">Thẻ / ví đối tác</h2>

      <p class="state" :class="linked ? 'on' : 'off'" data-testid="link-state">
        {{ linked ? '✓ Đã liên kết: MOVA trừ tiền từng tuần trước giờ giao 72 tiếng.' : 'Chưa liên kết thẻ hoặc ví đối tác.' }}
      </p>

      <template v-if="!linked">
        <p class="pl-lead">
          Bạn được chuyển sang trang của cổng thanh toán để liên kết. MOVA không nhận và không lưu số thẻ của bạn.
        </p>
        <p class="pl-note">Bạn có thể hủy liên kết bất kỳ lúc nào chỉ với 1 chạm tại trang quản lý gói.</p>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <div class="btns">
          <button class="pl-btn primary" type="button" :disabled="busy" @click="start">{{ busy ? 'Đang mở trang liên kết…' : 'Liên kết thẻ/ví đối tác' }}</button>
          <button v-if="opened" class="pl-btn" type="button" @click="$emit('linked')">Tôi đã liên kết xong</button>
        </div>
      </template>

      <template v-else>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <div class="btns">
          <button class="pl-btn" type="button" :disabled="busy" @click="unlink">Hủy liên kết thẻ/ví đối tác</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../shared/api';
import { isZaloMiniApp, openExternalUrl } from '../../services/zaloMiniApp';

// Sheet liên kết thẻ/ví đối tác. `linked` do nơi mở truyền vào (backend chưa có đường riêng đọc trạng thái liên kết:
// gói đang trả bằng thẻ, hoặc xem trước giá bằng thẻ không báo PAYMENT_TOKEN_REQUIRED, nghĩa là đã liên kết).
defineProps({ linked: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'linked', 'unlinked']);

const busy = ref(false);
const error = ref('');
const opened = ref(false);

async function start() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const inMiniApp = isZaloMiniApp();
    const returnOrigin = inMiniApp && location.origin.startsWith('zbrowser://') ? 'https://h5.zdn.vn' : location.origin;
    const res = await api.customer.linkCard(`${returnOrigin}${location.pathname}`);
    if (res.status === 'error') {
      error.value = res.error?.message || 'Chưa mở được trang liên kết. Bạn thử lại sau nhé.';
      return;
    }
    opened.value = true;
    // Trong WebView Zalo Mini App mở qua zmp-sdk openWebview; trên Web thường giữ redirect cùng tab.
    await openExternalUrl(res.data.url, { sameTab: true, style: 'normal', leftButton: 'back' });
  } catch (e) {
    error.value = e && e.message ? e.message : 'Không kết nối được máy chủ MOVA.';
  } finally {
    busy.value = false;
  }
}

async function unlink() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const res = await api.customer.unlinkCard();
    if (res.status === 'error') {
      error.value = res.error?.message || 'Chưa hủy liên kết được. Bạn thử lại nhé.';
      return;
    }
    emit('unlinked', res.data);
  } catch (e) {
    error.value = e && e.message ? e.message : 'Không kết nối được máy chủ MOVA.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.box { max-width: 480px; padding: 26px 20px; display: grid; gap: 14px; }
.state { margin: 0; padding: 10px 14px; border-radius: 12px; font-size: 15px; font-weight: 600; }
.state.on { background: var(--green-soft); color: var(--green-d); }
.state.off { background: var(--butter); color: var(--ink); }
.btns { display: grid; gap: 10px; }
</style>
