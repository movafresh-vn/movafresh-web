<template>
  <section>
    <h1>Giao nhanh 24-36 giờ</h1>
    <p class="ops-muted proc-note">
      ĐỀ XUẤT, mặc định TẮT. Màn này để chuẩn bị dữ liệu thật (báo giá, năng lực hãng, QA lô) và theo dõi đơn. Không có giá mẫu: bảng trống thì mọi so sánh là "chưa đủ dữ liệu". Khách chỉ thấy khung giao nhanh khi cờ bật VÀ chủ sở hữu đã duyệt chính sách.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="ex-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="ex-ok">{{ ok }}</p>

    <nav class="ops-subnav" aria-label="Giao nhanh">
      <button v-for="t in TABS" :key="t.key" type="button" class="ops-subtab" :class="{ active: tab === t.key }" :data-tab="t.key" @click="go(t.key)">{{ t.title }}</button>
    </nav>

    <!-- Chính sách và cờ -->
    <section v-if="tab === 'policy' && settings" class="ops-card" aria-label="Chính sách">
      <h2 class="plan-h2">Trạng thái <span class="ops-pill" :class="settings.gate.active ? 'ops-pill-ok' : 'ops-pill-warn'" data-testid="ex-gate">{{ gateText }}</span></h2>
      <dl class="kv">
        <div><dt>Cờ tính năng</dt><dd>{{ settings.config.enabled ? 'Bật' : 'Tắt' }}</dd></div>
        <div><dt>Chủ sở hữu duyệt chính sách</dt><dd>{{ settings.config.policy_approved ? `Đã duyệt (${dt(settings.config.policy_approved_at)})` : 'CHƯA duyệt' }}</dd></div>
        <div><dt>Khung SLA</dt><dd>{{ settings.config.window_min_hours }}–{{ settings.config.window_max_hours }} giờ kể từ lúc thanh toán thành công</dd></div>
        <div><dt>Thanh toán đơn đầu</dt><dd>{{ settings.config.payment_methods.join(', ') }} (trừ ngay lúc đặt)</dd></div>
        <div><dt>Địa chỉ kho phụ (đo đường bộ)</dt><dd>{{ settings.hub.address || 'CHƯA khai: chưa báo được phí chặng cuối' }}</dd></div>
      </dl>
      <h3>Đề xuất chính sách (chờ chủ sở hữu duyệt)</h3>
      <p>{{ settings.policy_proposal.summary }}</p>
      <p class="ops-muted">Mâu thuẫn với: {{ settings.policy_proposal.conflicts_with }}</p>
      <ul>
        <li v-for="d in settings.policy_proposal.requires_owner_decisions" :key="d">{{ d }}</li>
      </ul>
      <form v-if="can('expressPolicy')" class="field-grid" novalidate @submit.prevent="saveHub">
        <div>
          <label for="hub-addr">Địa chỉ thật của kho phụ</label>
          <input id="hub-addr" v-model="hubAddress" class="ops-input" data-testid="hub-address" maxlength="300" />
        </div>
        <button class="ops-btn" type="submit" data-testid="hub-save">Lưu địa chỉ kho phụ</button>
      </form>
      <div v-if="can('expressPolicy')" class="head-row">
        <button class="ops-btn" type="button" data-testid="toggle-enabled" @click="saveFlag({ enabled: !settings.config.enabled })">{{ settings.config.enabled ? 'Tắt cờ' : 'Bật cờ' }}</button>
        <button v-if="!settings.config.policy_approved" class="ops-btn ops-btn-primary" type="button" data-testid="approve-policy" @click="approve">Chủ sở hữu duyệt chính sách</button>
        <button v-else class="ops-btn" type="button" data-testid="revoke-policy" @click="saveFlag({ policy_approved: false, acknowledge_policy_change: true })">Thu hồi duyệt</button>
      </div>
    </section>

    <!-- Báo giá -->
    <section v-if="tab === 'quotes'" aria-label="Báo giá">
      <form class="ops-card" novalidate @submit.prevent="addQuote">
        <h2 class="plan-h2">Nhập báo giá</h2>
        <div class="field-grid">
          <div><label for="q-leg">Chặng</label>
            <select id="q-leg" v-model="q.leg" class="ops-input" data-testid="q-leg"><option value="long_haul">Chặng dài (xưởng → hub lạnh)</option><option value="last_mile">Chặng cuối (bảng cự ly)</option></select></div>
          <div><label for="q-carrier">Nhà vận tải</label><input id="q-carrier" v-model="q.carrier" class="ops-input" data-testid="q-carrier" /></div>
          <div><label for="q-source">Loại giá</label>
            <select id="q-source" v-model="q.source" class="ops-input" data-testid="q-source"><option value="carrier_confirmed">Nhà vận tải đã xác nhận</option><option value="public_reference">Công khai tham khảo (không thu)</option></select></div>
          <div v-if="q.source === 'carrier_confirmed'"><label for="q-ref">Mã xác nhận của nhà vận tải</label><input id="q-ref" v-model="q.confirmation_ref" class="ops-input" data-testid="q-ref" /></div>
          <div><label for="q-basis">Cách tính</label>
            <select id="q-basis" v-model="q.price_basis" class="ops-input"><option value="per_trip">Mỗi chuyến/lần giao</option><option value="per_box" :disabled="q.leg === 'last_mile'">Mỗi hộp</option><option value="per_kg" :disabled="q.leg === 'last_mile'">Mỗi kg</option></select></div>
          <div><label for="q-price">Giá (đ, chưa VAT)</label><input id="q-price" v-model.number="q.price_vnd" class="ops-input" type="number" min="0" data-testid="q-price" /></div>
          <div><label for="q-vat">VAT (điểm cơ bản, để trống nếu chưa biết)</label><input id="q-vat" v-model.number="q.vat_bp" class="ops-input" type="number" min="0" max="10000" /></div>
          <div><label for="q-from">Hiệu lực từ</label><input id="q-from" v-model="q.valid_from" class="ops-input" type="datetime-local" data-testid="q-from" /></div>
          <div><label for="q-until">Hiệu lực đến</label><input id="q-until" v-model="q.valid_until" class="ops-input" type="datetime-local" data-testid="q-until" /></div>
          <template v-if="q.leg === 'long_haul'">
            <div><label for="q-vtype">Loại xe</label><input id="q-vtype" v-model="q.vehicle_type" class="ops-input" /></div>
            <div><label for="q-vmode">Xe ghép / riêng</label><select id="q-vmode" v-model="q.vehicle_mode" class="ops-input"><option value="dedicated">Xe riêng</option><option value="shared">Xe ghép</option></select></div>
            <div><label for="q-cap">Sức chở THỰC đã xác nhận (hộp)</label><input id="q-cap" v-model.number="q.capacity_boxes" class="ops-input" type="number" min="1" /></div>
            <div><label>Vùng nhiệt</label>
              <label v-for="z in ZONES" :key="z.k" class="inline"><input v-model="q.temp_zones" type="checkbox" :value="z.k" /> {{ z.label }}</label></div>
            <div><label class="inline"><input v-model="q.temp_independent" type="checkbox" /> Buồng độc lập</label>
              <label class="inline"><input v-model="q.temp_plan_qa_approved" type="checkbox" /> Phương án nhiệt độ đã QA duyệt</label></div>
            <div v-if="q.temp_plan_qa_approved"><label for="q-tpref">Mã hồ sơ QA</label><input id="q-tpref" v-model="q.temp_plan_ref" class="ops-input" /></div>
            <div><label class="inline"><input v-model="q.surcharges_complete" type="checkbox" /> Đã liệt kê đủ phụ phí</label></div>
          </template>
          <template v-else>
            <div><label for="q-min">Từ (km)</label><input id="q-min" v-model.number="q.min_km" class="ops-input" type="number" min="0" step="0.1" data-testid="q-min" /></div>
            <div><label for="q-max">Đến (km)</label><input id="q-max" v-model.number="q.max_km" class="ops-input" type="number" min="0" step="0.1" data-testid="q-max" /></div>
            <div><label class="inline"><input v-model="q.max_inclusive" type="checkbox" /> Gồm cả mốc "đến" (theo điều kiện hãng)</label></div>
          </template>
        </div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="q-save">Lưu báo giá</button>
      </form>
      <section class="ops-card" aria-label="Danh sách báo giá">
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="quotes">
            <thead><tr><th>Mã</th><th>Chặng</th><th>Nhà vận tải</th><th>Loại giá</th><th class="r">Giá</th><th>Hiệu lực</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              <tr v-for="x in quotes" :key="x.id">
                <td class="mono">{{ x.id }}</td>
                <td>{{ x.leg === 'long_haul' ? `${x.vehicle_type || ''} (${x.vehicle_mode === 'shared' ? 'ghép' : 'riêng'}, ${x.capacity_boxes} hộp)` : `${x.min_km}–${x.max_km} km` }}</td>
                <td>{{ x.carrier }}</td>
                <td><span class="ops-pill" :class="x.chargeable ? 'ops-pill-ok' : 'ops-pill-warn'">{{ x.price_class === 'carrier_confirmed' ? 'Đã xác nhận' : 'Tham khảo' }}</span></td>
                <td class="r">{{ fmt(x.price_vnd) }}<small class="ops-muted"> /{{ BASIS[x.price_basis] }}</small></td>
                <td>{{ dt(x.valid_from) }} → {{ dt(x.valid_until) }}</td>
                <td>{{ STATE[x.state] }}</td>
                <td><button v-if="x.state !== 'revoked' && can('expressQuoteWrite')" class="ops-btn" type="button" :data-revoke="x.id" @click="revoke(x)">Thu hồi</button></td>
              </tr>
              <tr v-if="!quotes.length"><td colspan="8" class="ops-muted">Chưa có báo giá nào. Không có giá mẫu: hãy nhập báo giá thật của nhà vận tải.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <!-- So sánh chặng dài -->
    <section v-if="tab === 'compare'" class="ops-card" aria-label="So sánh chặng dài">
      <h2 class="plan-h2">So sánh xe ghép / xe riêng (xưởng → hub lạnh)</h2>
      <form class="field-grid" novalidate @submit.prevent="runCompare">
        <div><label for="c-boxes">Số hộp</label><input id="c-boxes" v-model.number="cmp.boxes" class="ops-input" type="number" min="1" data-testid="c-boxes" /></div>
        <div><label>Vùng nhiệt</label><label v-for="z in ZONES" :key="z.k" class="inline"><input v-model="cmp.zones" type="checkbox" :value="z.k" /> {{ z.label }}</label></div>
        <div><label for="c-ship">Giờ xe chạy</label><input id="c-ship" v-model="cmp.ship_at" class="ops-input" type="datetime-local" data-testid="c-ship" /></div>
        <div><label for="c-kg">Khối lượng mỗi hộp (kg, nếu có giá theo kg)</label><input id="c-kg" v-model.number="cmp.avg_box_kg" class="ops-input" type="number" min="0" step="0.1" /></div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="c-run">So sánh</button>
      </form>
      <template v-if="compareResult">
        <p data-testid="c-verdict"><strong>{{ compareResult.verdict === 'ranked' ? `Phương án rẻ nhất trong các báo giá đã nhập: ${compareResult.cheapest_quote_id}` : 'CHƯA ĐỦ DỮ LIỆU để so sánh' }}</strong></p>
        <p v-if="compareResult.missing.length" class="ops-muted">Còn thiếu: {{ compareResult.missing.map((m) => MISSING[m] || m).join('; ') }}</p>
        <p class="ops-muted">Xe ghép vs xe riêng: {{ compareResult.shared_vs_dedicated === 'compared' ? 'đã so sánh' : 'chưa đủ dữ liệu' }}. {{ compareResult.method }}</p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="c-options">
            <thead><tr><th>Báo giá</th><th>Hãng</th><th>Loại</th><th class="r">Chuyến</th><th class="r">Chưa VAT</th><th class="r">VAT</th><th class="r">Mỗi hộp (chưa VAT)</th><th>Không so sánh được vì</th></tr></thead>
            <tbody>
              <tr v-for="o in compareResult.options" :key="o.quote_id">
                <td class="mono">{{ o.quote_id }}</td><td>{{ o.carrier }}</td><td>{{ o.vehicle_mode === 'shared' ? 'Ghép' : 'Riêng' }}</td><td class="r">{{ o.trips ?? '—' }}</td>
                <td class="r">{{ o.ex_vat_vnd == null ? '—' : fmt(o.ex_vat_vnd) }}</td><td class="r">{{ o.vat_vnd == null ? 'chưa biết' : fmt(o.vat_vnd) }}</td>
                <td class="r">{{ o.per_box_ex_vat_vnd == null ? '—' : fmt(o.per_box_ex_vat_vnd) }}</td><td>{{ o.blockers.map((b) => BLOCKER[b] || b).join('; ') }}</td>
              </tr>
              <tr v-if="!compareResult.options.length"><td colspan="8" class="ops-muted">Chưa có báo giá chặng dài nào.</td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- Kịch bản -->
    <section v-if="tab === 'scenarios'" class="ops-card" aria-label="Kịch bản sản lượng">
      <h2 class="plan-h2">Kịch bản 30 / 50 / 100 / 150 / 300 / 500 hộp mỗi tuần</h2>
      <p class="ops-muted">Để trống = CHƯA BIẾT (không được tính là 0). Số hộp khác số điểm giao: phí giao cuối tính theo điểm giao.</p>
      <form class="field-grid" novalidate @submit.prevent="runScenarios">
        <div><label for="s-quote">Giá xe lấy từ báo giá chặng dài đã xác nhận</label>
          <select id="s-quote" v-model="sc.long_haul_quote_id" class="ops-input" data-testid="s-quote"><option value="">(nhập tay)</option><option v-for="x in longQuotes" :key="x.id" :value="x.id">{{ x.id }} · {{ x.carrier }} · {{ x.capacity_boxes }} hộp</option></select></div>
        <div v-for="f in SC_FIELDS" :key="f.k"><label :for="`s-${f.k}`">{{ f.label }}</label><input :id="`s-${f.k}`" v-model="sc.a[f.k]" class="ops-input" type="number" min="0" :data-testid="`s-${f.k}`" /></div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="s-run">Tính kịch bản</button>
      </form>
      <template v-if="scenarioResult">
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="s-table">
            <thead><tr><th class="r">Hộp</th><th class="r">Điểm giao</th><th class="r">Chuyến</th><th v-for="k in LINE_KEYS" :key="k" class="r">{{ LINE_LABEL[k] }}</th><th class="r">Tổng đã biết</th><th class="r">Giá vốn đầy đủ</th><th>Mục tiêu</th></tr></thead>
            <tbody>
              <tr v-for="r in scenarioResult.rows" :key="r.boxes" :data-boxes="r.boxes">
                <td class="r">{{ r.boxes }}</td>
                <td class="r"><input v-model.number="points[r.boxes]" class="ops-input" type="number" min="0" :aria-label="`Số điểm giao cho ${r.boxes} hộp`" @change="runScenarios" /></td>
                <td class="r">{{ r.trips ?? '—' }}</td>
                <td v-for="k in LINE_KEYS" :key="k" class="r">{{ lineOf(r, k) == null ? 'chưa biết' : fmt(lineOf(r, k)) }}</td>
                <td class="r">{{ fmt(r.known_subtotal_vnd) }}</td>
                <td class="r"><strong>{{ r.complete ? fmt(r.complete_total_vnd) : 'chưa đủ dữ liệu' }}</strong></td>
                <td>{{ r.targets.cannot_verify.length ? 'Không thể kết luận (thiếu: ' + r.targets.cannot_verify.join(', ') + ')' : `${(r.targets.logistics_share_of_revenue_bp / 100).toFixed(1)}% doanh thu` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="ops-muted"><li v-for="n in scenarioResult.notes" :key="n">{{ n }}</li></ul>
      </template>
    </section>

    <!-- Chặng cuối -->
    <section v-if="tab === 'lastmile'" aria-label="Chặng cuối">
      <section class="ops-card">
        <h2 class="plan-h2">Yêu cầu báo giá chặng cuối chờ điều phối</h2>
        <p class="ops-muted">Chưa có API hãng hay bản đồ: điều phối đo quãng đường ĐƯỜNG BỘ từ địa chỉ kho phụ thật tới địa chỉ khách rồi xác nhận. Chỉ thu mức hãng đã xác nhận (bảng cự ly đã xác nhận, hoặc phí riêng kèm mã xác nhận của hãng). Từ 20 km hoặc ngoài điều kiện hãng: nhập phí riêng.</p>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="lm-table">
            <thead><tr><th>Mã</th><th>Địa chỉ giao</th><th>Trạng thái</th><th class="r">Km</th><th class="r">Phí</th><th>Xác nhận</th></tr></thead>
            <tbody>
              <tr v-for="r in requests" :key="r.id" :data-request="r.id">
                <td class="mono">{{ r.id }}</td>
                <td>{{ addressText(r.address) }}</td>
                <td>{{ LM_STATUS[r.status] || r.status }}</td>
                <td class="r">{{ r.distance_km ?? '—' }}</td>
                <td class="r">{{ r.fee_vnd == null ? '—' : fmt(r.fee_vnd) }}</td>
                <td>
                  <template v-if="r.status === 'pending_manual' && can('expressLastMile')">
                    <input v-model.number="lm[r.id].km" class="ops-input" type="number" min="0" step="0.1" placeholder="Km đường bộ" :data-testid="`lm-km-${r.id}`" />
                    <input v-model="lm[r.id].carrier" class="ops-input" placeholder="Hãng giao" />
                    <input v-model.number="lm[r.id].fee" class="ops-input" type="number" min="0" placeholder="Phí riêng (nếu có)" />
                    <input v-model="lm[r.id].ref" class="ops-input" placeholder="Mã xác nhận của hãng" />
                    <button class="ops-btn ops-btn-primary" type="button" :data-confirm="r.id" @click="confirmLm(r)">Xác nhận</button>
                    <button class="ops-btn" type="button" @click="rejectLm(r)">Từ chối</button>
                  </template>
                  <span v-else class="ops-muted">{{ r.valid_until ? `đến ${dt(r.valid_until)}` : r.note }}</span>
                </td>
              </tr>
              <tr v-if="!requests.length"><td colspan="6" class="ops-muted">Không có yêu cầu nào.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <form class="ops-card" novalidate @submit.prevent="addCapacity">
        <h2 class="plan-h2">Năng lực hãng đã xác nhận theo khung giờ</h2>
        <div class="field-grid">
          <div><label for="k-carrier">Hãng</label><input id="k-carrier" v-model="cap.carrier" class="ops-input" /></div>
          <div><label for="k-zone">Khu</label><input id="k-zone" v-model="cap.zone_id" class="ops-input" placeholder="Z1" /></div>
          <div><label for="k-day">Ngày</label><input id="k-day" v-model="cap.day" class="ops-input" type="date" /></div>
          <div><label for="k-slot">Khung giờ</label><input id="k-slot" v-model="cap.slot_id" class="ops-input" placeholder="evening_18_21" /></div>
          <div><label for="k-n">Số đơn tối đa</label><input id="k-n" v-model.number="cap.orders_capacity" class="ops-input" type="number" min="0" /></div>
          <div><label>Vùng nhiệt hãng đảm bảo</label><label v-for="z in ZONES" :key="z.k" class="inline"><input v-model="cap.temp_zones" type="checkbox" :value="z.k" /> {{ z.label }}</label></div>
          <div><label class="inline"><input v-model="cap.temp_independent" type="checkbox" /> Buồng độc lập</label><label class="inline"><input v-model="cap.temp_plan_qa_approved" type="checkbox" /> QA đã duyệt phương án</label></div>
          <div v-if="cap.temp_plan_qa_approved"><label for="k-tp">Mã hồ sơ QA</label><input id="k-tp" v-model="cap.temp_plan_ref" class="ops-input" /></div>
          <div><label for="k-ref">Mã xác nhận của hãng</label><input id="k-ref" v-model="cap.confirmation_ref" class="ops-input" /></div>
          <div><label for="k-until">Hiệu lực đến</label><input id="k-until" v-model="cap.valid_until" class="ops-input" type="datetime-local" /></div>
        </div>
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="k-save">Ghi xác nhận năng lực</button>
        <div class="ops-table-wrap">
          <table class="ops-table" data-testid="cap-table">
            <thead><tr><th>Khu</th><th>Ngày</th><th>Khung</th><th>Hãng</th><th class="r">Đã giữ / tối đa</th><th>Nhiệt độ</th><th>Hiệu lực</th></tr></thead>
            <tbody>
              <tr v-for="c in capacity" :key="c.id"><td>{{ c.zone_id }}</td><td>{{ c.day }}</td><td>{{ c.slot_id }}</td><td>{{ c.carrier }}</td><td class="r">{{ c.active_holds }} / {{ c.orders_capacity }}</td>
                <td>{{ c.temp_zones.join(', ') || 'thường' }}{{ c.temp_plan_qa_approved ? ' · QA duyệt' : '' }}</td><td>{{ c.expired ? 'Hết hạn' : `đến ${dt(c.valid_until)}` }}</td></tr>
              <tr v-if="!capacity.length"><td colspan="7" class="ops-muted">Hãng chưa xác nhận năng lực khung nào: khách sẽ không thấy khung giao nhanh.</td></tr>
            </tbody>
          </table>
        </div>
      </form>
    </section>

    <!-- QA lô -->
    <section v-if="tab === 'qa'" class="ops-card" aria-label="QA lô">
      <h2 class="plan-h2">Lô kho phụ và QA duyệt cho giao nhanh</h2>
      <p class="ops-muted">Lô chưa có bằng chứng nhiệt độ và số giờ lưu tối đa do QA kiểm chứng thì KHÔNG được dùng cho giao nhanh. Lô đang giữ chỉ mở lại khi người có quyền ghi duyệt mới; hệ thống không tự giải phóng.</p>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="qa-table">
          <thead><tr><th>Lô</th><th>SKU</th><th>Vùng</th><th>Hạn dùng</th><th class="r">Tồn / giữ chỗ</th><th>QA</th><th v-if="can('expressQa')">Quyết định</th></tr></thead>
          <tbody>
            <tr v-for="l in lots" :key="l.stock_id" :data-stock="l.stock_id">
              <td class="mono">{{ l.lot_code }}</td><td>{{ l.sku_id }}</td><td>{{ l.temp_class }}</td><td>{{ dt(l.expires_at) }}</td><td class="r">{{ l.on_hand }} / {{ l.reserved }}</td>
              <td>{{ l.recalled ? 'Đang bị giữ vì thu hồi' : l.qa ? `${QA[l.qa.status]}${l.qa.max_hold_hours ? ` · tối đa ${l.qa.max_hold_hours}h` : ''}` : 'Chưa có dữ liệu QA' }}</td>
              <td v-if="can('expressQa')">
                <template v-if="!l.recalled">
                  <input v-model.number="qa[l.stock_id].hours" class="ops-input" type="number" min="1" placeholder="Giờ lưu tối đa" />
                  <input v-model="qa[l.stock_id].ref" class="ops-input" placeholder="Mã bằng chứng nhiệt độ" />
                  <button class="ops-btn ops-btn-primary" type="button" :data-approve="l.stock_id" @click="setQa(l, 'approved')">Duyệt</button>
                  <input v-model="qa[l.stock_id].note" class="ops-input" placeholder="Lý do giữ / từ chối" />
                  <button class="ops-btn" type="button" @click="setQa(l, 'on_hold')">Giữ</button>
                  <button class="ops-btn" type="button" @click="setQa(l, 'rejected')">Từ chối</button>
                </template>
              </td>
            </tr>
            <tr v-if="!lots.length"><td colspan="7" class="ops-muted">Kho phụ chưa có lô còn tồn.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Đơn giao nhanh -->
    <section v-if="tab === 'orders'" class="ops-card" aria-label="Đơn giao nhanh">
      <h2 class="plan-h2">Đơn giao nhanh đã thanh toán</h2>
      <p class="ops-muted">Điều phối thủ công. Đồng hồ SLA 24–36 giờ tính từ lúc thanh toán thành công; đơn bị giữ (vượt nhiệt độ) không tự giải phóng.</p>
      <div class="ops-table-wrap">
        <table class="ops-table" data-testid="xo-table">
          <thead><tr><th>Mã</th><th>Thanh toán</th><th>SLA đến</th><th>Khung giao</th><th>Hãng</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id" :data-order="o.id">
              <td class="mono">{{ o.id }}</td><td>{{ dt(o.paid_at) }}</td><td>{{ dt(o.sla_to) }}</td><td>{{ dt(o.window_start) }} – {{ dt(o.window_end) }}</td><td>{{ o.carrier }}</td>
              <td>{{ XO[o.status] }}<span v-if="o.on_hold" class="ops-pill ops-pill-warn"> đang giữ</span><span v-if="o.overdue" class="ops-pill ops-pill-warn"> quá khung</span></td>
              <td>
                <template v-if="can('expressFulfil') && NEXT[o.status]">
                  <input v-model.number="xo[o.id].temp" class="ops-input" type="number" step="0.1" placeholder="Nhiệt độ °C" />
                  <input v-model="xo[o.id].note" class="ops-input" placeholder="Ghi chú / lý do" />
                  <button v-for="to in NEXT[o.status]" :key="to" class="ops-btn" :class="{ 'ops-btn-primary': to !== 'failed' }" type="button" :data-advance="`${o.id}:${to}`" @click="advance(o, to)">{{ XO_ACTION[to] }}</button>
                </template>
              </td>
            </tr>
            <tr v-if="!orders.length"><td colspan="7" class="ops-muted">Chưa có đơn giao nhanh.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { can, ctx } from '../../session';
import { dt, logisticsError } from '../../logisticsUi';

const TABS = [
  { key: 'policy', title: 'Chính sách & cờ' },
  { key: 'quotes', title: 'Báo giá' },
  { key: 'compare', title: 'So sánh chặng dài' },
  { key: 'scenarios', title: 'Kịch bản sản lượng' },
  { key: 'lastmile', title: 'Chặng cuối' },
  { key: 'qa', title: 'QA lô' },
  { key: 'orders', title: 'Đơn giao nhanh' }
];
const ZONES = [{ k: 'ambient', label: 'Thường' }, { k: 'chill', label: 'Mát' }, { k: 'frozen', label: 'Đông' }];
const BASIS = { per_trip: 'chuyến', per_box: 'hộp', per_kg: 'kg' };
const STATE = { valid: 'Còn hiệu lực', expired: 'Hết hạn', not_yet_valid: 'Chưa hiệu lực', revoked: 'Đã thu hồi' };
const QA = { approved: 'QA duyệt', on_hold: 'QA đang giữ', rejected: 'QA từ chối' };
const XO = { paid: 'Đã thanh toán', picked: 'Đã lấy hàng', dispatched: 'Đang giao', delivered: 'Đã giao', failed: 'Thất bại' };
const XO_ACTION = { picked: 'Lấy hàng (xuất kho)', dispatched: 'Xuất phát', delivered: 'Đã giao', failed: 'Giao thất bại' };
const NEXT = { paid: ['picked', 'failed'], picked: ['dispatched', 'failed'], dispatched: ['delivered', 'failed'] };
const LM_STATUS = { pending_manual: 'Chờ điều phối', confirmed: 'Đã xác nhận', rejected: 'Đã từ chối', expired: 'Hết hạn', cancelled: 'Đã hủy' };
const MISSING = {
  no_quotes_entered: 'chưa nhập báo giá chặng dài nào',
  no_comparable_quote: 'chưa có báo giá nào so sánh được',
  need_at_least_two_comparable_quotes: 'cần ít nhất hai báo giá so sánh được',
  no_comparable_shared_quote: 'chưa có báo giá xe ghép so sánh được',
  no_comparable_dedicated_quote: 'chưa có báo giá xe riêng so sánh được'
};
const BLOCKER = {
  quote_expired: 'báo giá hết hạn', quote_not_yet_valid: 'báo giá chưa hiệu lực', quote_revoked: 'báo giá đã thu hồi', price_reference_only: 'chỉ là giá tham khảo',
  capacity_unconfirmed: 'chưa xác nhận sức chở', temp_zone_not_covered: 'không phủ vùng nhiệt cần', temp_not_independent: 'chưa có buồng độc lập', temp_plan_not_qa_approved: 'phương án nhiệt độ chưa QA duyệt',
  surcharges_incomplete: 'chưa đủ phụ phí', box_weight_missing: 'thiếu khối lượng hộp'
};
const LINE_KEYS = ['long_haul', 'long_haul_surcharge', 'long_haul_vat', 'hub', 'packaging', 'last_mile', 'other_surcharges', 'other_tax'];
const LINE_LABEL = { long_haul: 'Xe liên tỉnh', long_haul_surcharge: 'Phụ phí xe', long_haul_vat: 'VAT xe', hub: 'Kho', packaging: 'Bao bì', last_mile: 'Giao cuối', other_surcharges: 'Phụ phí khác', other_tax: 'Thuế khác' };
const SC_FIELDS = [
  { k: 'capacity_boxes', label: 'Sức chở thực mỗi chuyến (hộp)' },
  { k: 'trip_price_vnd', label: 'Giá xe mỗi chuyến (đ)' },
  { k: 'trip_surcharge_vnd', label: 'Phụ phí mỗi chuyến (đ)' },
  { k: 'long_haul_vat_bp', label: 'VAT chặng dài (điểm cơ bản)' },
  { k: 'hub_weekly_vnd', label: 'Kho mỗi tuần (đ)' },
  { k: 'packaging_per_box_vnd', label: 'Bao bì mỗi hộp (đ)' },
  { k: 'last_mile_fee_per_point_vnd', label: 'Phí giao cuối mỗi điểm (đ)' },
  { k: 'other_surcharges_vnd', label: 'Phụ phí khác mỗi tuần (đ)' },
  { k: 'other_tax_vnd', label: 'Thuế khác mỗi tuần (đ)' },
  { k: 'revenue_vnd', label: 'Doanh thu mỗi tuần (đ)' },
  { k: 'food_cost_vnd', label: 'Food cost mỗi tuần (đ)' }
];

const tab = ref('policy');
const error = ref('');
const ok = ref('');
const settings = ref(null);
const hubAddress = ref('');
const quotes = ref([]);
const compareResult = ref(null);
const scenarioResult = ref(null);
const requests = ref([]);
const capacity = ref([]);
const lots = ref([]);
const orders = ref([]);

const lm = reactive({});
const qa = reactive({});
const xo = reactive({});
const points = reactive({});
const longQuotes = computed(() => quotes.value.filter((x) => x.leg === 'long_haul' && x.chargeable));
const gateText = computed(() => (settings.value.gate.active ? 'MỞ cho khách' : settings.value.gate.reason === 'policy_pending' ? 'Chờ duyệt chính sách' : 'TẮT'));

const iso = (v) => (v ? new Date(v).toISOString() : undefined);
const blank = (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v);
const addressText = (a) => (a ? [a.street, a.ward, a.district, a.city].filter(Boolean).join(', ') : '(đã xóa theo yêu cầu ẩn danh hóa)');
const lineOf = (row, k) => (row.lines.find((l) => l.key === k) || {}).vnd;

const q = reactive({
  leg: 'long_haul', carrier: '', source: 'carrier_confirmed', confirmation_ref: '', price_basis: 'per_trip', price_vnd: null, vat_bp: null, valid_from: '', valid_until: '',
  vehicle_type: '', vehicle_mode: 'dedicated', capacity_boxes: null, temp_zones: [], temp_independent: false, temp_plan_qa_approved: false, temp_plan_ref: '', surcharges_complete: false,
  min_km: null, max_km: null, max_inclusive: false
});
const cmp = reactive({ boxes: 150, zones: [], ship_at: '', avg_box_kg: null });
const sc = reactive({ long_haul_quote_id: '', a: {} });
const cap = reactive({ carrier: '', zone_id: '', day: '', slot_id: '', orders_capacity: 0, temp_zones: [], temp_independent: false, temp_plan_qa_approved: false, temp_plan_ref: '', confirmation_ref: '', valid_until: '' });

async function guarded(fn, success = '') {
  error.value = '';
  ok.value = '';
  try {
    await fn();
    if (success) ok.value = success;
  } catch (e) {
    error.value = logisticsError(e);
  }
}

async function go(k) {
  tab.value = k;
  await guarded(load);
}

async function load() {
  const c = ctx.value;
  if (tab.value === 'policy') {
    settings.value = await api.ops.express.settings();
    hubAddress.value = settings.value.hub.address || '';
  } else if (tab.value === 'quotes' || tab.value === 'scenarios') {
    quotes.value = (await api.ops.express.quotes(c, { includeRevoked: true })).quotes;
  } else if (tab.value === 'lastmile') {
    requests.value = (await api.ops.express.lastMileRequests(c, {})).requests;
    for (const r of requests.value) lm[r.id] ??= { km: null, carrier: '', fee: null, ref: '' };
    capacity.value = (await api.ops.express.capacity(c, {})).capacity;
  } else if (tab.value === 'qa') {
    lots.value = (await api.ops.express.lotQa()).lots;
    for (const l of lots.value) qa[l.stock_id] ??= { hours: null, ref: '', note: '' };
  } else if (tab.value === 'orders') {
    orders.value = (await api.ops.express.orders(c, {})).orders;
    for (const o of orders.value) xo[o.id] ??= { temp: null, note: '' };
  }
}

const saveFlag = (patch) => guarded(async () => { settings.value = await api.ops.express.saveSettings(ctx.value, patch); }, 'Đã lưu.');
const approve = () => {
  if (typeof window !== 'undefined' && window.confirm && !window.confirm('Xác nhận: chủ sở hữu DUYỆT chính sách trừ tiền ngay lúc đặt cho đơn đầu giao nhanh (khác mốc 72 giờ)?')) return Promise.resolve();
  return saveFlag({ policy_approved: true, acknowledge_policy_change: true });
};
const saveHub = () => saveFlag({ hub: { address: hubAddress.value } });

const addQuote = () =>
  guarded(async () => {
    const lastMile = q.leg === 'last_mile';
    await api.ops.express.addQuote(ctx.value, {
      leg: q.leg, carrier: q.carrier, source: q.source, confirmation_ref: blank(q.confirmation_ref), price_basis: lastMile ? 'per_trip' : q.price_basis, price_vnd: q.price_vnd,
      vat_bp: blank(q.vat_bp), valid_from: iso(q.valid_from), valid_until: iso(q.valid_until),
      ...(lastMile
        ? { min_km: q.min_km, max_km: q.max_km, max_inclusive: q.max_inclusive }
        : {
            vehicle_type: q.vehicle_type, vehicle_mode: q.vehicle_mode, capacity_boxes: q.capacity_boxes, temp_zones: q.temp_zones, temp_independent: q.temp_independent,
            temp_plan_qa_approved: q.temp_plan_qa_approved, temp_plan_ref: blank(q.temp_plan_ref), surcharges_complete: q.surcharges_complete
          })
    });
    quotes.value = (await api.ops.express.quotes(ctx.value, { includeRevoked: true })).quotes;
  }, 'Đã lưu báo giá.');

const revoke = (x) => {
  const reason = typeof window !== 'undefined' && window.prompt ? window.prompt(`Lý do thu hồi ${x.id}?`) : 'thu hồi';
  if (!reason) return Promise.resolve();
  return guarded(async () => {
    await api.ops.express.revokeQuote(ctx.value, { id: x.id, reason });
    await load();
  }, 'Đã thu hồi.');
};

const runCompare = () =>
  guarded(async () => {
    compareResult.value = await api.ops.express.compare(ctx.value, { boxes: cmp.boxes, zones: cmp.zones, ship_at: iso(cmp.ship_at), avg_box_kg: blank(cmp.avg_box_kg) });
  });

const runScenarios = () =>
  guarded(async () => {
    const a = Object.fromEntries(SC_FIELDS.map((f) => [f.k, blank(sc.a[f.k]) ?? null]));
    const volumes = [30, 50, 100, 150, 300, 500];
    scenarioResult.value = await api.ops.express.scenarios(ctx.value, {
      ...(sc.long_haul_quote_id ? { long_haul_quote_id: sc.long_haul_quote_id } : {}),
      assumptions: a,
      rows: volumes.map((boxes) => ({ boxes, delivery_points: blank(points[boxes]) ?? null }))
    });
  });

const confirmLm = (r) =>
  guarded(async () => {
    const f = lm[r.id];
    await api.ops.express.confirmLastMile(ctx.value, { id: r.id, distance_km: f.km, carrier: f.carrier, fee_vnd: blank(f.fee), confirmation_ref: blank(f.ref) });
    await load();
  }, 'Đã xác nhận báo giá chặng cuối.');
const rejectLm = (r) => {
  const reason = typeof window !== 'undefined' && window.prompt ? window.prompt('Lý do từ chối?') : 'từ chối';
  if (!reason) return Promise.resolve();
  return guarded(async () => {
    await api.ops.express.rejectLastMile(ctx.value, { id: r.id, reason });
    await load();
  }, 'Đã từ chối.');
};

const addCapacity = () =>
  guarded(async () => {
    await api.ops.express.putCapacity(ctx.value, { ...cap, temp_plan_ref: blank(cap.temp_plan_ref), valid_until: iso(cap.valid_until) });
    await load();
  }, 'Đã ghi xác nhận năng lực.');

const setQa = (l, status) =>
  guarded(async () => {
    const f = qa[l.stock_id];
    await api.ops.express.setLotQa(ctx.value, {
      stock_id: l.stock_id, status, temp_class: l.temp_class, max_hold_hours: status === 'approved' ? blank(f.hours) : undefined, temp_evidence_ref: status === 'approved' ? blank(f.ref) : undefined, note: f.note || ''
    });
    await load();
  }, 'Đã ghi quyết định QA.');

const advance = (o, to) =>
  guarded(async () => {
    const f = xo[o.id];
    await api.ops.express.advance(ctx.value, { id: o.id, to, temp_c: blank(f.temp), note: f.note || '' });
    await load();
  });

guarded(load);
</script>
