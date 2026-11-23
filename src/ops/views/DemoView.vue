<template>
  <section>
    <h1>Bảng demo (công cụ dev)</h1>

    <p v-if="status === 'checking'" class="ops-muted">Đang kiểm tra máy chủ…</p>
    <p v-else-if="status === 'off'" class="ops-muted" data-testid="demo-off">
      Công cụ dev không bật. Chạy máy chủ với DEV_TOOLS_ENABLED=true và web với VITE_DEV_TOOLS=true (chỉ trên máy cục bộ).
    </p>

    <template v-else>
      <p class="ops-muted">
        Đồng hồ nghiệp vụ do MÁY CHỦ giữ và chỉ đi tới (trừ khi tick “cho phép lùi”). Mỗi nút nhảy tới ngay sau mốc kế tiếp và chạy
        các job đã tới hạn (trừ tiền, chốt sổ, nhắc khách, xuất hóa đơn). Dữ liệu không có nút đặt lại: tạo lại CSDL cục bộ bằng
        <code>npm run stack:down</code> rồi <code>npm run stack:up</code>.
      </p>

      <div v-if="st" class="ops-card">
        <h2>Bây giờ: {{ fmt(st.now) }}<span v-if="st.frozen"> (đóng băng)</span></h2>
        <ul class="ops-list">
          <li>Mốc trừ tiền kế tiếp: <strong>{{ fmt(st.nextCharge) }}</strong></li>
          <li>Giờ chốt sổ kế tiếp: <strong>{{ fmt(st.nextCutoff) }}</strong></li>
          <li>Giờ giao kế tiếp: <strong>{{ fmt(st.nextDelivery) }}</strong></li>
          <li>Xe về kho phụ kế tiếp (ngày giao D lúc 02:00): <strong>{{ fmt(st.nextHubArrival) }}</strong></li>
          <li>Lô đã khóa: <strong>{{ st.lockedBatches }}</strong> · PO đã lập: <strong>{{ st.purchaseOrders }}</strong></li>
        </ul>
        <p class="ops-muted" data-testid="demo-counts">{{ countsText }}</p>

        <div class="ops-actions">
          <button class="ops-btn ops-btn-primary" :disabled="!st.nextCharge || busy" @click="jump('charge')">Tới mốc trừ tiền</button>
          <button class="ops-btn ops-btn-primary" :disabled="!st.nextCutoff || busy" @click="jump('cutoff')">Tới giờ chốt sổ</button>
          <button class="ops-btn ops-btn-primary" :disabled="!st.nextDelivery || busy" @click="jump('delivery')">Tới ngày giao</button>
          <button class="ops-btn ops-btn-primary" :disabled="!st.nextHubArrival || busy" data-testid="jump-hub" @click="jump('hub')">Tới D 02:00 (xe về kho phụ)</button>
        </div>

        <div class="ops-set">
          <label for="at">Đặt giờ</label>
          <input id="at" v-model="at" type="datetime-local" class="ops-input" />
          <label><input v-model="allowBackward" type="checkbox" /> cho phép lùi</label>
          <button class="ops-btn" :disabled="!at || busy" @click="setNow">Đặt</button>
          <button class="ops-btn" :disabled="busy" data-testid="reset-clock" @click="resetClock">Về giờ thật</button>
          <button class="ops-btn" :disabled="busy" data-testid="run-jobs" @click="runJobs">Chạy job đến hạn</button>
        </div>

        <h2>Dữ liệu mẫu cho truy xuất và thu hồi lô</h2>
        <p class="ops-muted">Cần đã chốt sổ ít nhất một ngày. Dựng hai lô nguyên liệu, mẻ túi, thùng và đơn ở đủ ba trạng thái (chưa xuất / đang giao / đã giao) để thử Kho phụ → Truy xuất và Thu hồi lô.</p>
        <div class="ops-actions">
          <button class="ops-btn" data-testid="seed-trace" :disabled="busy" @click="seedTrace">Dựng dữ liệu truy xuất mẫu</button>
        </div>

        <h2>Dữ liệu mẫu cho kho phụ và giao hàng</h2>
        <p class="ops-muted">Cần đã chốt sổ ít nhất một ngày. Xưởng đóng đủ thùng, lên xe và xuất bến cả hai chuyến (có nhiệt độ, ảnh, số niêm phong). Sau đó: Tới D 02:00 → Kho phụ → Nhận xe → Ghép hải sản → Chia tuyến → Xuất kho → đăng nhập shipper giao hàng.</p>
        <div class="ops-actions">
          <button class="ops-btn" data-testid="seed-trips" :disabled="busy" @click="seedTrips">Dựng chuyến xe mẫu (xuất bến)</button>
        </div>

        <h2>Tiền về ngân hàng (webhook đã ký, đi qua đường thật)</h2>
        <p class="ops-muted">
          Gói: khách chuyển đúng giá một Gói suất ăn. Tuần: khách chuyển đúng tổng các tuần chưa trả (lô đã khóa thì mở ngoại lệ thanh toán muộn).
          Lạ: tiền về không có mã, vào hàng chờ khớp tay ở Tài chính.
        </p>
        <div class="ops-set">
          <label for="who">Khách mẫu</label>
          <select id="who" v-model="who" class="ops-input" data-testid="bank-who">
            <option v-for="c in customers" :key="c.user_id" :value="c.user_id">{{ c.name || c.user_id.slice(0, 8) }} · {{ c.payment_method }}<template v-if="c.login"> · OTP {{ c.login.phone }} / {{ c.login.otp }}</template></option>
          </select>
        </div>
        <div class="ops-actions">
          <button class="ops-btn" data-testid="bank-pack" :disabled="!who || busy" @click="bank('pack')">Tiền về đúng giá gói</button>
          <button class="ops-btn" data-testid="bank-weeks" :disabled="!who || busy" @click="bank('weeks')">Tiền về đúng tổng các tuần chưa trả</button>
          <button class="ops-btn" data-testid="bank-stranger" :disabled="busy" @click="bank('stranger')">Tiền về không rõ nội dung</button>
        </div>

        <h2>Tài khoản mẫu</h2>
        <ul v-if="staff.length" class="ops-list" data-testid="sample-staff">
          <li v-for="s in staff" :key="s.email"><strong>{{ s.role }}</strong> · {{ s.email }}</li>
        </ul>
        <p v-if="staffHint" class="ops-muted">{{ staffHint }}</p>

        <p v-if="msg" class="ops-ok" role="status" data-testid="demo-msg">{{ msg }}</p>
        <p v-if="err" class="ops-error" role="alert" data-testid="demo-err">{{ err }}</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../../shared/api';
import { fmtDeadline } from '../../shared/utils/time';
import { demoSummary, bankSummary } from './demoText';

const status = ref('checking'); // 'checking' | 'on' | 'off'
const st = ref(null);
const at = ref('');
const allowBackward = ref(false);
const msg = ref('');
const err = ref('');
const busy = ref(false);
const customers = ref([]);
const staff = ref([]);
const staffHint = ref('');
const who = ref('');

const fmt = (iso) => (iso ? fmtDeadline(new Date(iso)) : 'Không còn');
const countsText = computed(() =>
  st.value && st.value.counts ? 'Đơn theo trạng thái: ' + Object.entries(st.value.counts).map(([k, v]) => `${k} ${v}`).join(' · ') : ''
);

async function reload() {
  st.value = await api.demo.state();
}

async function run(fn, okText) {
  if (busy.value) return;
  busy.value = true;
  msg.value = '';
  err.value = '';
  try {
    msg.value = okText(await fn());
    await reload();
  } catch (e) {
    err.value = e && e.code === 'DEV_SCENARIO_FAILED' ? `${e.message} (bước ${(e.details && e.details.step) || '?'})` : (e && e.message) || 'Không thực hiện được.';
  } finally {
    busy.value = false;
  }
}

const jump = (kind) => run(() => api.demo.jumpTo(kind), (r) => demoSummary(r));
const setNow = () => run(() => api.demo.setNow(new Date(at.value), { allowBackward: allowBackward.value }), (r) => demoSummary(r));
const resetClock = () => run(() => api.demo.resetClock(), () => 'Đã về giờ thật.');
const runJobs = () => run(() => api.demo.runJobs(), (r) => demoSummary(r));
const seedTrace = () =>
  run(
    () => api.demo.seedTrace(),
    (r) => `Đã dựng truy xuất ngày ${r.day}: lô ${(r.lotCodes || []).join(' và ')} trên ${r.orders} đơn.`
  );
const seedTrips = () =>
  run(
    () => api.demo.seedTrips(),
    (r) => `Đã đóng thùng, lên xe và xuất bến ${(r.trips || []).length} chuyến của ngày ${r.day}: ${r.boxes} thùng.`
  );
const bank = (scenario) => run(() => api.demo.bankTransfer({ scenario, userId: scenario === 'stranger' ? undefined : who.value }), (r) => bankSummary(r));

onMounted(async () => {
  try {
    if (!(await api.demo.available())) {
      status.value = 'off';
      return;
    }
    status.value = 'on';
    await reload();
    const s = await api.demo.sampleAccounts();
    customers.value = s.customers || [];
    staff.value = s.staff || [];
    staffHint.value = s.staff_password_hint || '';
    who.value = customers.value[0] ? customers.value[0].user_id : '';
  } catch (e) {
    status.value = 'on';
    err.value = (e && e.message) || 'Không tải được công cụ dev.';
  }
});
</script>
