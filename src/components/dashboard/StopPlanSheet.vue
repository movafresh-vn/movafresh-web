<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="stop-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng">×</button>
      <h2 id="stop-title" class="pl-h2">Dừng gói?</h2>

      <p v-if="loading" class="pl-note" style="text-align: center; padding: 24px 0;">Đang tính toán số bữa và số tiền hoàn lại...</p>
      <p v-else-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>
      <template v-else-if="p">
        <!-- Thông báo nếu gói không có bữa nào chưa giao để hoàn tiền -->
        <section v-if="!hasUndelivered" class="pl-panel warn" aria-label="Không có bữa hoàn">
          <p>Hiện không có bữa ăn nào chưa chốt sổ để hoàn tiền. Toàn bộ các tuần của gói đã hoàn tất hoặc đang trong tiến trình giao.</p>
        </section>

        <section v-else class="pl-panel plan-details" aria-label="Chi tiết bữa ăn chưa nhận">
          <div class="meals-summary">
            <span class="icon">📦</span>
            <div>
              <b>Số bữa chưa giao: <span class="num">{{ p.undelivered_meals || (p.weeks_cancelled * 5) }}</span> bữa</b>
              <p class="pl-note" style="margin: 0;">(Tổng cộng {{ p.weeks_cancelled }} tuần chưa chốt sổ sản xuất)</p>
            </div>
          </div>
        </section>

        <section v-if="p.lost_incentives_vnd > 0 || p.gift_lost_vnd > 0 || p.forfeited_promo_vnd > 0" class="pl-panel warn" aria-label="Khấu trừ ưu đãi chiết khấu">
          <h3>Khấu trừ ưu đãi đã cấp</h3>
          <dl class="num">
            <div v-if="p.gift_lost_vnd > 0"><dt>Thẻ quà tặng của các tuần chưa giao</dt><dd>-{{ fmt(p.gift_lost_vnd) }}</dd></div>
            <div v-if="p.forfeited_promo_vnd > 0"><dt>Điểm ưu đãi tặng kèm bị thu hồi</dt><dd>-{{ fmt(p.forfeited_promo_vnd) }}</dd></div>
            <div class="total"><dt>Tổng chênh lệch ưu đãi khấu trừ</dt><dd>{{ fmt(p.lost_incentives_vnd) }}</dd></div>
          </dl>
          <p class="pl-note" style="margin-top: 6px;">Theo quy định hợp đồng từ xa, nếu dừng trước hạn, ưu đãi chiết khấu chu kỳ dài hạn sẽ được tất toán theo đúng giá trị bữa ăn thực tế đã phục vụ.</p>
        </section>

        <section class="pl-panel good" aria-label="Số tiền hoàn">
          <h3>Số tiền hoàn lại thực tế</h3>
          <p class="refund num">{{ fmt(p.refund_vnd) }}</p>
          <div class="refund-promise">
            🛡️ <b>Cam kết Luật BVQLNTD 19/2023:</b> Hoàn tiền về tài khoản nguồn trong vòng <b>7 ngày làm việc</b>.
          </div>
          <p class="pl-note" style="margin-top: 6px;">Hoàn 100% phần tiền thật tương ứng với các bữa ăn chưa giao. {{ p.weeks_cancelled }} tuần chưa chốt sổ sẽ được hủy<template v-if="p.kept_orders">; {{ p.kept_orders }} chuyến đã chốt sổ nhà máy vẫn được giao đúng hẹn</template>.</p>
        </section>

        <section v-if="p.skip_instead" class="pl-panel alt">
          <p>Chỉ cần nghỉ một tuần? Tạm hoãn <b>Tuần {{ p.skip_instead.number }}</b> thì bạn không mất ưu đãi nào, thực đơn dời xuống cuối gói.</p>
          <button class="pl-btn primary" type="button" @click="$emit('skip', p.skip_instead.week_index)">Tạm hoãn tuần {{ p.skip_instead.number }} thay vì dừng</button>
        </section>

        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <div class="btns">
          <button class="pl-btn" type="button" @click="$emit('close')">Giữ gói của tôi</button>
          <button class="pl-btn danger" type="button" :disabled="busy" @click="confirm">
            {{ p.refund_vnd > 0 ? `Vẫn dừng gói và hoàn ${fmt(p.refund_vnd)} (trong 7 ngày)` : 'Xác nhận dừng gói' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const emit = defineEmits(['close', 'done', 'skip']);
const store = useMovaStore();

const loading = ref(true);
const loadError = ref('');
const p = ref(null);
const error = ref('');
const busy = ref(false);

const hasUndelivered = computed(() => {
  if (!p.value) return false;
  return (p.value.undelivered_meals || (p.value.weeks_cancelled * 5)) > 0;
});

onMounted(async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await api.customer.previewCancel();
    if (res.status === 'error') {
      loadError.value = res.error?.message || 'Không thể tải thông tin dừng gói.';
    } else {
      p.value = res.data;
    }
  } catch (err) {
    loadError.value = err?.message || 'Có lỗi khi kết nối máy chủ.';
  } finally {
    loading.value = false;
  }
});

async function confirm() {
  busy.value = true;
  error.value = '';
  try {
    const r = await api.customer.cancelSubscription({ confirm: true });
    if (r.status === 'error') {
      error.value = r.error?.message || 'Không thể thực hiện dừng gói.';
      return;
    }
    await store.refresh();
    const refundText = r.data?.refund_vnd ? ` MOVA hoàn ${fmt(r.data.refund_vnd)} trong 7 ngày làm việc.` : '';
    store.toast(`Đã dừng gói.${refundText}`);
    emit('done', r.data);
  } catch (err) {
    error.value = err?.message || 'Có lỗi khi xử lý dừng gói.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.box { max-width: 540px; padding: 26px 20px; display: grid; gap: 14px; }
h3 { font-size: 17px; font-weight: 800; }
dl { margin: 0; display: grid; }
dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 16px; }
dt { color: var(--ink); }
dd { margin: 0; font-weight: 700; }
.total { border-top: 1px solid #F1C7B1; margin-top: 4px; padding-top: 10px !important; }
.total dd { font-size: 20px; color: var(--orange-ink); }
.refund { font-size: 28px; font-weight: 800; color: var(--green-d); margin: 4px 0; }
.meals-summary { display: flex; align-items: center; gap: 12px; }
.meals-summary .icon { font-size: 24px; }
.refund-promise { background: #E8F5E9; border-radius: 8px; padding: 8px 12px; font-size: 14px; color: #1B5E20; margin: 8px 0; }
.alt { background: var(--butter); border-color: #eadba6; }
.btns { display: grid; gap: 10px; }
.pl-btn.danger { background: #fff; border-color: var(--red); color: var(--red); }
.pl-btn.danger:hover:not(:disabled) { background: #FBE5E2; }
</style>
