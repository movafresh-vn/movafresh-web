<template>
  <section>
    <h1>Khu giao &amp; sức chứa</h1>
    <p class="ops-muted proc-note">
      Mỗi khu có ngày giao cố định, khung giờ và sức chứa (thùng) mỗi khung. App khách chỉ hiện khung còn chỗ. Đổi sức chứa ở đây (lưu trong dữ liệu dùng chung, có số mặc định ở cấu hình)
      thì app khách đổi theo ngay. Hạ sức chứa thấp hơn số đã đặt thì đơn đã đặt vẫn phải giao, khách mới không đặt thêm được.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="cap-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="cap-ok">{{ ok }}</p>

    <div v-if="board && board.overbookedTotal" class="alert-bad" role="alert" data-testid="cap-overbooked">
      <strong>Có {{ board.overbookedTotal }} thùng đã đặt vượt sức chứa mới.</strong> Các đơn này vẫn giao; hãy bố trí thêm xe / shipper cho khung đó hoặc nâng sức chứa lại.
    </div>

    <section v-if="board && board.suggestions.length" class="ops-card" aria-label="Gợi ý gộp ngày" data-testid="merge-suggestions">
      <h2 class="plan-h2">Gợi ý gộp ngày cho khu ít đơn</h2>
      <p class="ops-muted">Khu có ngày giao lấp đầy dưới {{ Math.round(board.belowPct * 100) }}% và toàn bộ đơn của ngày đó chuyển được sang ngày giao cùng tuần mà không vượt sức chứa. Gộp lại để mỗi tuyến chở được nhiều thùng hơn.</p>
      <ul class="history">
        <li v-for="s in board.suggestions" :key="s.zoneId + s.fromDay">
          <strong>{{ s.zoneName }}</strong>: gộp {{ fmtDay(s.fromDay) }} ({{ s.moveBoxes }} thùng) sang {{ fmtDay(s.toDay) }}.
          Mật độ từ {{ dec(s.beforePerDay) }} lên {{ s.afterPerDay }} thùng / ngày giao.
        </li>
      </ul>
    </section>

    <section v-for="z in board ? board.zones : []" :key="z.zoneId" class="ops-card" :data-zone="z.zoneId">
      <div class="head-row">
        <h2 class="plan-h2">{{ z.name }} <small class="ops-muted">{{ z.zoneId }}{{ z.province ? ' · ' + z.province : '' }}</small></h2>
        <span class="ops-muted">Ngày giao: {{ z.deliveryDays.map((d) => DOW[d]).join(', ') }}</span>
      </div>
      <div class="ops-table-wrap">
        <table class="ops-table cap-table">
          <thead>
            <tr>
              <th>Ngày giao</th>
              <th v-for="s in z.days[0].slots" :key="s.slotId">{{ s.label }}<small>đã đặt / sức chứa (thùng)</small></th>
              <th class="r">Cả ngày</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in z.days" :key="d.day" :data-day="d.day">
              <td><strong>{{ fmtDay(d.day) }}</strong></td>
              <td v-for="s in d.slots" :key="s.slotId" class="cap-cell" :class="{ over: s.overbooked, full: !s.overbooked && s.remaining === 0 }" :data-cell="`${z.zoneId}|${d.day}|${s.slotId}`">
                <template v-if="isEditing(z, d, s)">
                  <form class="cap-edit" @submit.prevent="save(z, d, s)">
                    <label :for="`cap-${z.zoneId}-${d.day}-${s.slotId}`" class="ops-muted">Sức chứa mới (thùng)</label>
                    <input :id="`cap-${z.zoneId}-${d.day}-${s.slotId}`" v-model.number="val" class="ops-input ops-input-sm" type="number" min="0" max="500" inputmode="numeric" data-testid="cap-input" />
                    <label class="check-row"><input v-model="allDays" type="checkbox" data-testid="cap-all" /> <span>Áp cho mọi ngày giao của khung này</span></label>
                    <p v-if="confirmBelow" class="ops-error" data-testid="cap-confirm">{{ confirmBelow }}</p>
                    <div class="btn-row">
                      <button class="ops-btn ops-btn-primary ops-btn-small" type="submit" data-testid="cap-save">{{ confirmBelow ? 'Vẫn hạ' : 'Lưu' }}</button>
                      <button v-if="s.overridden" class="ops-btn ops-btn-small" type="button" data-testid="cap-reset" @click="reset(z, d, s)">Về mặc định ({{ s.configCapacity }})</button>
                      <button class="ops-btn ops-btn-small" type="button" @click="cancel">Hủy</button>
                    </div>
                  </form>
                </template>
                <template v-else>
                  <div class="cap-n"><strong>{{ s.used }}</strong> / {{ s.capacity }} <span v-if="s.overridden" class="ops-pill ops-pill-warn" title="Đã đổi so với cấu hình">đã chỉnh</span></div>
                  <div class="ops-bar-track"><div class="ops-bar-fill" :class="{ 'bar-bad': s.overbooked }" :style="{ width: Math.round(s.fillPct * 100) + '%' }"></div></div>
                  <small v-if="s.overbooked" class="ops-error">Vượt {{ s.overbooked }} thùng</small>
                  <small v-else-if="s.remaining === 0" class="ops-muted">Hết chỗ (khách không thấy khung này)</small>
                  <small v-else class="ops-muted">Còn {{ s.remaining }}</small>
                  <button class="ops-btn ops-btn-small cap-btn" type="button" data-testid="cap-edit" @click="edit(z, d, s)">Sửa</button>
                </template>
              </td>
              <td class="r"><strong>{{ d.used }}</strong> / {{ d.capacity }}<small>{{ Math.round(d.fillPct * 100) }}% lấp đầy</small></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ops-card" aria-label="Sức chứa chu kỳ giao" data-testid="cycle-section">
      <h2 class="plan-h2">Sức chứa chu kỳ giao: ba giới hạn vật lý</h2>
      <p class="ops-muted">
        Số thùng nhận được mỗi ngày giao = giới hạn thấp nhất trong ba nút thắt: <b>nguồn cung nông sản Đắk Lắk</b> (gram thô theo từng nguyên liệu), <b>công suất sơ chế nhà máy</b> và <b>xe lạnh chặng dài</b> (số thùng và kg).
        Khách chỉ đặt được khi cả ba còn chỗ. Để trống một ô để quay về số mặc định trong cấu hình.
      </p>
      <p v-if="cycleError" class="ops-error" role="alert" data-testid="cycle-error">{{ cycleError }}</p>
      <p v-if="cycleOk" class="ops-ok" role="status" data-testid="cycle-ok">{{ cycleOk }}</p>
      <div class="ops-table-wrap">
        <table class="ops-table cap-table" data-testid="cycle-table">
          <thead>
            <tr>
              <th>Ngày giao</th><th class="r">Đã đặt</th><th class="r">Còn lại (thùng)</th><th>Nút thắt</th><th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="c in cycles" :key="c.date">
              <tr :data-cycle="c.date">
                <td><strong>{{ fmtDay(c.date) }}</strong></td>
                <td class="r">{{ c.booked_boxes }}</td>
                <td class="r"><strong :class="{ 'ops-error': c.remaining_boxes === 0 }">{{ c.remaining_boxes }}</strong></td>
                <td data-testid="cycle-binding">{{ binding(c) }}</td>
                <td class="r"><button v-if="canWrite()" class="ops-btn ops-btn-small" type="button" data-testid="cycle-edit" @click="editCycle(c)">Sửa</button></td>
              </tr>
              <tr v-if="cycleEdit === c.date" :data-cycle-form="c.date">
                <td colspan="5">
                  <form class="cap-edit" novalidate @submit.prevent="saveCycle(c)">
                    <div class="field-grid">
                      <div>
                        <label :for="'cy-f-' + c.date">Công suất sơ chế (thùng / ngày)</label>
                        <input :id="'cy-f-' + c.date" v-model="cycleForm.factory_max_boxes" class="ops-input" type="number" min="0" inputmode="numeric" data-testid="cycle-factory" />
                      </div>
                      <div>
                        <label :for="'cy-t-' + c.date">Xe lạnh: số thùng</label>
                        <input :id="'cy-t-' + c.date" v-model="cycleForm.truck_max_boxes" class="ops-input" type="number" min="0" inputmode="numeric" data-testid="cycle-truck-boxes" />
                      </div>
                      <div>
                        <label :for="'cy-k-' + c.date">Xe lạnh: tải trọng (kg)</label>
                        <input :id="'cy-k-' + c.date" v-model="cycleForm.truck_max_kg" class="ops-input" type="number" min="0" step="any" inputmode="decimal" data-testid="cycle-truck-kg" />
                      </div>
                    </div>
                    <p class="help">Mỗi thùng nặng khoảng {{ c.limits.box_weight_g / 1000 }} kg: xe chở được {{ Math.floor((Number(cycleForm.truck_max_kg) || 0) / (c.limits.box_weight_g / 1000)) }} thùng theo tải trọng.</p>
                    <fieldset v-if="cycleForm.sku_supply.length" class="rb-shippers">
                      <legend class="ops-muted">Trần nguồn cung theo nguyên liệu (kg thô, để trống = bỏ trần)</legend>
                      <label v-for="sk in cycleForm.sku_supply" :key="sk.sku_id" class="check-row">
                        <span class="mono">{{ sk.sku_id }}</span>
                        <input v-model="sk.kg" class="ops-input ops-input-sm" type="number" min="0" step="any" inputmode="decimal" :data-sku="sk.sku_id" />
                      </label>
                    </fieldset>
                    <div class="field-grid two">
                      <div>
                        <label for="cy-sku-new">Thêm trần cho nguyên liệu (mã SKU)</label>
                        <input id="cy-sku-new" v-model="newSku" class="ops-input" placeholder="NL-BO-01" data-testid="cycle-new-sku" />
                      </div>
                      <div>
                        <label for="cy-sku-kg">Trần (kg thô)</label>
                        <input id="cy-sku-kg" v-model="newSkuKg" class="ops-input" type="number" min="0" step="any" inputmode="decimal" data-testid="cycle-new-kg" />
                      </div>
                    </div>
                    <label :for="'cy-n-' + c.date">Ghi chú</label>
                    <input :id="'cy-n-' + c.date" v-model="cycleForm.note" class="ops-input" maxlength="300" placeholder="Ví dụ: xe lạnh T1 thiếu tải" />
                    <div class="btn-row">
                      <button class="ops-btn ops-btn-primary ops-btn-small" type="submit" data-testid="cycle-save" :disabled="cycleBusy">Lưu</button>
                      <button class="ops-btn ops-btn-small" type="button" @click="cycleEdit = ''">Hủy</button>
                    </div>
                  </form>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-if="!canWrite()" class="ops-muted">Chỉ điều phối và admin sửa được sức chứa chu kỳ.</p>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../../shared/api';
import { fmtDay } from '../../../shared/utils/time';
import { can, ctx } from '../../session';
import { useLive } from '../../useLive';
import { dec, logisticsError } from '../../logisticsUi';
import { bindingLimit, buildCycleBody, formFromCycle } from '../../cycleCapacity';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const board = ref(null);
const error = ref('');
const ok = ref('');
const editKey = ref('');
const val = ref(0);
const allDays = ref(false);
const confirmBelow = ref('');

// ---- Sức chứa chu kỳ (ba giới hạn vật lý)
const cycles = ref([]);
const cycleError = ref('');
const cycleOk = ref('');
const cycleEdit = ref('');
const cycleForm = ref({ factory_max_boxes: '', truck_max_boxes: '', truck_max_kg: '', sku_supply: [], note: '' });
let cycleOriginal = null;
const newSku = ref('');
const newSkuKg = ref('');
const cycleBusy = ref(false);
const canWrite = () => can('capacityWrite');
const binding = (c) => {
  const b = bindingLimit(c);
  return b ? b.label + ' (' + b.remaining + ' thùng)' : '—';
};

const key = (z, d, s) => `${z.zoneId}|${d.day}|${s.slotId}`;
const isEditing = (z, d, s) => editKey.value === key(z, d, s);

async function load() {
  try {
    board.value = await api.ops.logistics.capacityBoard(ctx.value);
  } catch (e) {
    error.value = logisticsError(e);
  }
}
async function loadCycles() {
  try {
    cycles.value = (await api.ops.cycleCapacity.list(ctx.value, { days: 14 })).cycles;
  } catch (e) {
    cycleError.value = logisticsError(e);
  }
}
useLive(async () => {
  if (!editKey.value) await load();
  if (!cycleEdit.value) await loadCycles();
});

function editCycle(c) {
  cycleEdit.value = c.date;
  cycleForm.value = formFromCycle(c);
  cycleOriginal = JSON.parse(JSON.stringify(cycleForm.value));
  newSku.value = '';
  newSkuKg.value = '';
  cycleError.value = '';
  cycleOk.value = '';
}

async function saveCycle(c) {
  if (cycleBusy.value) return;
  cycleError.value = '';
  cycleOk.value = '';
  try {
    const form = { ...cycleForm.value, sku_supply: cycleForm.value.sku_supply.map((x) => ({ ...x })) };
    if (newSku.value.trim()) form.sku_supply.push({ sku_id: newSku.value.trim().toUpperCase(), kg: newSkuKg.value });
    const body = buildCycleBody(form, cycleOriginal);
    if (!Object.keys(body).length) {
      cycleEdit.value = '';
      return;
    }
    cycleBusy.value = true;
    await api.ops.cycleCapacity.put(ctx.value, c.date, body);
    cycleOk.value = 'Đã lưu sức chứa chu kỳ ' + fmtDay(c.date) + '.';
    cycleEdit.value = '';
  } catch (e) {
    cycleError.value = e && e.code === 'BOM_SKU_UNKNOWN' ? 'Mã nguyên liệu (SKU) không tồn tại.' : logisticsError(e);
  } finally {
    cycleBusy.value = false;
  }
  await loadCycles();
}

function edit(z, d, s) {
  editKey.value = key(z, d, s);
  val.value = s.capacity;
  allDays.value = false;
  confirmBelow.value = '';
  error.value = '';
  ok.value = '';
}
function cancel() {
  editKey.value = '';
  confirmBelow.value = '';
}

async function save(z, d, s) {
  error.value = '';
  try {
    const r = await api.ops.logistics.setCapacity(ctx.value, { zoneId: z.zoneId, day: allDays.value ? '*' : d.day, slotId: s.slotId, capacityBoxes: Number(val.value), allowBelowUsed: Boolean(confirmBelow.value) });
    ok.value = `Đã đặt sức chứa ${r.capacityBoxes} thùng cho ${s.label}${allDays.value ? ' (mọi ngày giao)' : ' ngày ' + fmtDay(d.day)}.${r.overbooked ? ` Cảnh báo: đã đặt vượt ${r.overbooked} thùng, các đơn này vẫn giao.` : ''}`;
    editKey.value = '';
    confirmBelow.value = '';
  } catch (e) {
    if (e.code === 'CAPACITY_BELOW_USED') confirmBelow.value = e.message;
    else error.value = logisticsError(e);
  }
  await load();
}

async function reset(z, d, s) {
  try {
    await api.ops.logistics.setCapacity(ctx.value, { zoneId: z.zoneId, day: allDays.value ? '*' : d.day, slotId: s.slotId, capacityBoxes: null });
    ok.value = `Đã bỏ chỉnh sửa, ${s.label} về sức chứa mặc định ${s.configCapacity} thùng.`;
    editKey.value = '';
  } catch (e) {
    error.value = logisticsError(e);
  }
  await load();
}
</script>
