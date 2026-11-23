<template>
  <div class="co">
    <header>
      <h1 class="pl-h1">Giao hàng và thanh toán</h1>
      <p class="pl-lead">Chọn ngày giao, điền nơi nhận và trả trước một lần. Tiền vào trước để nhà máy Đắk Lắk bắt đầu sơ chế cho bạn.</p>
    </header>

    <!-- 1. Giao hàng -->
    <section class="pl-card sec">
      <h2 class="pl-h2">1. Ngày và giờ giao</h2>
      <div class="pl-chips freq-chips">
        <button
          v-for="f in [1, 2]"
          :key="f"
          type="button"
          class="pl-chip freq-chip"
          :class="{ on: c.frequency === f }"
          :aria-pressed="c.frequency === f"
          @click="setFrequency(f)"
        >
          <span class="freq-title">{{ f }} lần mỗi tuần</span>
          <span v-if="f === 1" class="pl-pill recommend-pill">Khuyên dùng (tối ưu phí thùng &amp; ship 39.000đ/hộp)</span>
        </button>
      </div>

      <template v-if="options && options.options.length">
        <p class="pl-label">Ngày giao cố định hằng tuần</p>
        <div class="pl-chips col" role="radiogroup" aria-label="Ngày giao">
          <button
            v-for="(o, i) in options.options"
            :key="o.preferred_days.join()"
            type="button"
            role="radio"
            :aria-checked="c.optionIndex === i"
            class="pl-chip big"
            :class="{ on: c.optionIndex === i }"
            @click="pickOption(i)"
          >
            <b>{{ o.day_labels.join(' và ') }}</b>
            <small>Giao đầu tiên {{ o.first_delivery_label }}</small>
          </button>
        </div>

        <p class="pl-label">Khung giờ (chỉ hiện khung còn chỗ)</p>
        <div class="pl-chips col" role="radiogroup" aria-label="Khung giờ giao">
          <button
            v-for="s in slots"
            :key="s.slot_id"
            type="button"
            role="radio"
            :aria-checked="c.slotId === s.slot_id"
            class="pl-chip slot-chip"
            :class="{ on: c.slotId === s.slot_id, 'green-slot': s.slot_id === 'early_morning_06_08' }"
            @click="pickSlot(s.slot_id)"
          >
            <span class="slot-text">{{ s.label }}</span>
            <span v-if="s.slot_id === 'early_morning_06_08'" class="slot-badge">Freeship / Ưu đãi khung giờ xanh -15.000đ</span>
          </button>
        </div>
        <p class="pl-note">MOVA báo khung giờ giao chính xác cho bạn trước {{ options.lead_time_notice_hours }} giờ.</p>

        <!-- Sức chứa còn lại của từng ngày giao (máy chủ tính: nhỏ nhất của khung giờ, nhà máy, xe lạnh, nguồn cung) -->
        <div v-if="capacityRows.length" class="capacity" data-testid="capacity" aria-label="Số chỗ còn lại theo ngày giao">
          <p class="pl-label">Số chỗ còn lại theo từng ngày giao</p>
          <ul class="cap-list">
            <li v-for="d in capacityRows" :key="d.date" :class="{ full: d.full, low: d.low }" :data-date="d.date">
              <span>{{ fmtDay(d.date) }}</span>
              <b class="num">{{ d.full ? 'Hết chỗ' : 'Còn ' + d.effective_remaining + ' chỗ' }}</b>
            </li>
          </ul>
          <p v-if="hasFullDate" class="pl-error" role="alert" data-testid="capacity-full">
            Có ngày giao đã hết chỗ. Bạn chọn khung giờ hoặc ngày giao khác để tiếp tục.
          </p>
        </div>

        <!-- Hướng dẫn giao hàng lạnh: BẮT BUỘC chọn, mặc định "để ở lễ tân + shipper chụp ảnh" -->
        <fieldset class="delivery-instruct-wrap" data-testid="instruction">
          <legend class="pl-label">Hướng dẫn khi giao hàng lạnh <span class="req">(bắt buộc)</span></legend>
          <label v-for="m in INSTRUCTION_MODES" :key="m.mode" class="instr" :class="{ on: c.instruction.mode === m.mode }">
            <input type="radio" name="coInstruction" :value="m.mode" :checked="c.instruction.mode === m.mode" @change="setInstruction(m)" />
            <span>{{ m.label }}</span>
          </label>
          <p v-if="c.instruction.photo_required" class="pl-note">Hàng lạnh để lại nơi nhận thì shipper luôn chụp ảnh làm bằng chứng và gửi vào tuần giao của bạn.</p>
          <input
            v-model="c.instruction.note"
            type="text"
            class="pl-input"
            maxlength="200"
            placeholder="Ghi chú thêm cho shipper (không bắt buộc), ví dụ: gửi bảo vệ tòa B"
            @input="save"
          />
        </fieldset>

        <!-- Dòng nhắc lịch giao cố định -->
        <p class="fixed-delivery-reminder">
          📅 <b>Lịch giao cố định:</b> Các tuần tiếp theo sẽ tự động giao vào đúng <b>{{ selectedDayLabel }}</b> hàng tuần — bạn có thể đổi ngày hoặc tạm dừng bất kỳ lúc nào trước <b>08:00 sáng ngày D-2</b>.
        </p>
      </template>
      <div v-else-if="options" class="pl-panel warn" role="alert">
        <b>Khu của bạn hiện đã kín chỗ giao.</b>
        <p>Bạn thử chọn {{ c.frequency === 1 ? '2 lần mỗi tuần' : '1 lần mỗi tuần' }}, hoặc để lại thông tin ở màn đầu để MOVA báo khi có chỗ.</p>
      </div>
    </section>

    <!-- Giao nhanh 24-36 giờ (tự ẩn khi tắt) -->
    <ExpressPanel />

    <!-- 2. Người nhận -->
    <section class="pl-card sec">
      <h2 class="pl-h2">2. Nơi nhận hàng</h2>
      <div class="pl-stack">
        <div>
          <label class="pl-label" for="coName">Tên người nhận</label>
          <input id="coName" v-model="c.name" class="pl-input" type="text" autocomplete="name" placeholder="Ví dụ Nguyễn Thị Lan" @change="save" />
        </div>
        <div>
          <label class="pl-label" for="coPhone">Số điện thoại người nhận</label>
          <div class="phone-row">
            <DialSelect v-model="c.phoneDial" @update:model-value="onPhoneChange" />
            <input
              id="coPhone"
              v-model="c.phone"
              class="pl-input num"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="0908 123 456"
              @input="onPhoneChange"
              @change="save"
            />
            <button
              v-if="!c.phoneVerified"
              class="pl-btn outline sm-btn"
              type="button"
              @click="openOtpModal"
            >
              Xác thực SĐT (OTP)
            </button>
            <span v-else class="verified-pill">✓ Đã xác thực OTP</span>
          </div>
          <p v-if="phoneErr" class="pl-error phone-err" role="alert">{{ phoneErr }}</p>
        </div>
        <div>
          <label class="pl-label" for="coStreet">Số nhà, tên đường, phường</label>
          <input id="coStreet" v-model="c.street" class="pl-input" type="text" autocomplete="street-address" placeholder="Ví dụ 12 Nguyễn Văn Linh, P. Tân Phong" @change="save" />
        </div>
        <div>
          <label class="pl-label" for="coWard">Phường/xã <span class="muted">(không bắt buộc, giúp MOVA gom tuyến giao nhanh hơn)</span></label>
          <input id="coWard" v-model="c.ward" class="pl-input" type="text" maxlength="60" autocomplete="address-level3" placeholder="Ví dụ Tân Phong" data-testid="ward" @change="save" />
        </div>
        <div v-if="options">
          <label class="pl-label" for="coArea">Quận/huyện</label>
          <select id="coArea" v-model="c.district" class="pl-input" @change="save">
            <option v-for="d in options.districts" :key="d" :value="d">{{ d }}, {{ options.province }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. Thanh toán -->
    <section class="pl-card sec">
      <h2 class="pl-h2">3. Thanh toán</h2>
      <!-- Máy chủ báo chưa liên kết thẻ/ví (PAYMENT_TOKEN_REQUIRED): giữ nguyên danh sách phương thức, đưa nút liên kết -->
      <div v-if="preview && store.cardLinkNeeded" class="pl-panel warn" role="alert" data-testid="card-link-needed">
        <p>{{ cardNotice }}</p>
        <button class="pl-btn primary sm-btn" type="button" @click="linkOpen = true">Liên kết thẻ/ví đối tác</button>
      </div>
      <p v-if="phoneNotVerified" class="pl-panel warn" role="alert" data-testid="phone-not-verified">{{ phoneNotVerifiedMsg }}</p>
      <p v-if="needsAuth" class="pl-panel warn" role="status" data-testid="needs-auth">
        Xác thực số điện thoại ở mục 2 để MOVA tính số tiền chính xác cho bạn (giá, ưu đãi và lịch trừ tiền do hệ thống tính, không ước lượng).
      </p>
      <p v-else-if="!preview && store.error" class="pl-error" role="alert">{{ store.error }}</p>
      <p v-else-if="!preview" class="pl-note">Chọn ngày và khung giờ giao để xem số tiền chi tiết.</p>

      <div v-else class="methods" role="radiogroup" aria-label="Hình thức thanh toán">
        <!-- a. Fresh Credit -->
        <div class="method" :class="{ on: c.method === 'fresh_credit' }">
          <button type="button" role="radio" :aria-checked="c.method === 'fresh_credit'" class="m-head" @click="setMethod('fresh_credit')">
            <span class="radio" :class="{ on: c.method === 'fresh_credit' }"></span>
            <span class="m-title">Gói Suất ăn trả trước (Fresh Credit) <span class="pl-pill">Ưu đãi chiết khấu khi mua gói</span></span>
          </button>
          <div v-if="c.method === 'fresh_credit'" class="m-body">
            <p v-if="fc.covered" class="pl-panel good" data-testid="credit-covered">
              Fresh Credit hiện có <b class="num">{{ fmt(fc.balance_vnd) }}</b> đủ trả tuần 1 (<b class="num">{{ fmt(fc.week1_payable_vnd) }}</b>). Bạn không cần mua thêm.
            </p>
            <div v-else class="offers" role="radiogroup" aria-label="Gói suất ăn trả trước">
              <p class="pl-note" data-testid="credit-shortfall">
                Fresh Credit hiện có {{ fmt(fc.balance_vnd) }}, tuần 1 cần {{ fmt(fc.week1_payable_vnd) }}: còn thiếu <b class="num">{{ fmt(fc.shortfall_vnd) }}</b>.
                <template v-if="fc.pack_id">Gói nhỏ nhất đủ phần thiếu là <b>{{ fc.pack_label || exactLabel }}</b> (trả {{ fmt(fc.pay_vnd) }}, nhận {{ fmt(fc.credit_received_vnd) }}).</template>
              </p>
              <button v-if="fc.pack_id" type="button" role="radio" :aria-checked="c.packId === 'exact'" class="offer" :class="{ on: c.packId === 'exact' }" @click="setPack('exact')">
                <span class="offer-n">{{ exactLabel }}</span>
                <span class="offer-get num">Nhận {{ fmt(fc.credit_received_vnd) }}</span>
                <span class="offer-pay num">Trả {{ fmt(fc.pay_vnd) }}</span>
              </button>
              <button v-for="p in fc.packs" :key="p.pack_id" type="button" role="radio" :aria-checked="c.packId === p.pack_id" class="offer" :class="{ on: c.packId === p.pack_id }" @click="setPack(p.pack_id)">
                <span class="offer-n">{{ p.label }}</span>
                <span class="offer-get num">Nhận {{ fmt(p.credit_received_vnd) }}</span>
                <span class="offer-pay num">Trả {{ fmt(p.pay_vnd) }}</span>
              </button>
              <p v-if="!fc.pack_id" class="pl-error" role="alert">Chưa có Gói Suất ăn trả trước đủ giá trị cho phần thiếu. Hãy chọn cách trả khác.</p>
            </div>
            <p class="pl-note">
              Fresh Credit là điểm bữa ăn trả trước, chỉ dùng để đổi suất ăn tại MOVA Fresh; không rút tiền mặt trực tiếp và không chuyển nhượng.
              <template v-if="fc.covered">Tuần 1 trừ ngay từ Fresh Credit, các tuần sau tự trừ trước giờ giao {{ chargeHours }} giờ (72 tiếng).</template>
              <template v-else>Tuần 1 sẽ được trừ khi Fresh Credit đủ; các tuần sau tự trừ trước giờ giao {{ chargeHours }} giờ (72 tiếng).</template>
            </p>
            <div v-if="packOrder" class="pl-panel warn" role="status" data-testid="pack-order">
              <b>Chuyển khoản để mua gói</b>
              <p>Chuyển đúng <b class="num">{{ fmt(packOrder.pay_vnd) }}</b> với nội dung <b class="ref">{{ packOrder.transfer_content }}</b>. Khi tiền về, MOVA cộng {{ fmt(packOrder.credit_received_vnd) }} vào Fresh Credit, rồi bạn bấm kích hoạt gói lại.</p>
            </div>
          </div>
        </div>

        <!-- b. Chuyển khoản -->
        <div class="method" :class="{ on: c.method === 'bank_transfer_4w' }">
          <button type="button" role="radio" :aria-checked="c.method === 'bank_transfer_4w'" class="m-head" @click="setMethod('bank_transfer_4w')">
            <span class="radio" :class="{ on: c.method === 'bank_transfer_4w' }"></span>
            <span class="m-title">Chuyển khoản VietQR một lần cho cả {{ preview.cycle_weeks.length }} tuần</span>
          </button>
          <div v-if="c.method === 'bank_transfer_4w'" class="m-body bank">
            <div v-if="preview.payment_ref" class="qr"><VietQrSvg :seed="qrSeed" /></div>
            <div class="bank-info">
              <p>Số tiền: <b class="num big">{{ fmt(preview.bank_transfer_4w.pay_vnd) }}</b></p>
              <p v-if="preview.payment_ref">Nội dung chuyển khoản: <b class="ref">{{ preview.payment_ref }}</b></p>
              <p v-else class="pl-note">Mã chuyển khoản của bạn hiện ngay sau khi bạn bấm đăng ký gói.</p>
              <p class="pl-note">Giữ nguyên nội dung này để MOVA khớp khoản chuyển với gói của bạn. Gói bắt đầu khi ngân hàng báo tiền về.</p>
            </div>
          </div>
        </div>

        <!-- c. Liên kết thẻ -->
        <div class="method" :class="{ on: c.method === 'card' }">
          <button type="button" role="radio" :aria-checked="c.method === 'card'" class="m-head" @click="setMethod('card')">
            <span class="radio" :class="{ on: c.method === 'card' }"></span>
            <span class="m-title">Trừ tiền định kỳ qua Thẻ / Ví đối tác (MoMo, ZaloPay, VNPAY, Thẻ quốc tế)</span>
          </button>
          <div v-if="c.method === 'card'" class="m-body">
            <div class="unlink-commitment">
              <span class="c-shield">🛡️</span>
              <div>
                <b>Cam kết minh bạch:</b> Bạn có thể hủy liên kết thẻ/ví đối tác bất kỳ lúc nào chỉ với 1 chạm tại trang quản lý gói.
              </div>
            </div>
            <p class="pl-note" data-testid="card-state">{{ store.cardLinkNeeded ? 'Chưa liên kết thẻ/ví đối tác.' : '✓ Đã liên kết thẻ/ví đối tác.' }}</p>
            <button class="pl-btn outline sm-btn" type="button" data-testid="link-card-open" @click="linkOpen = true">{{ store.cardLinkNeeded ? 'Liên kết thẻ/ví đối tác' : 'Quản lý liên kết thẻ/ví' }}</button>
            <ul class="charges">
              <li v-for="(ch, i) in preview.card.charges" :key="i">
                <span>{{ ch.now ? 'Hôm nay' : fmtDeadline(new Date(ch.charge_at)) }}<small class="muted"> · tuần {{ ch.week_index + 1 }}</small></span>
                <b class="num">{{ fmt(ch.amount_vnd) }}</b>
              </li>
            </ul>
            <p class="pl-note">Tuần 2 trở đi tự động trừ trước giờ giao {{ chargeHours }} giờ (72 tiếng). Thẻ/ví không trừ được thì MOVA báo ngay để bạn cập nhật trước hạn đổi món.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Voucher / Mã ưu đãi -->
    <section v-if="preview" class="pl-card sec voucher-card">
      <h2 class="pl-h2">Mã ưu đãi / Voucher</h2>
      <div class="voucher-box">
        <input
          v-model="voucherInput"
          class="pl-input num voucher-input"
          type="text"
          placeholder="Nhập mã giới thiệu MOVA-XXXX hoặc THEQUATANG"
          style="text-transform: uppercase;"
          :disabled="Boolean(appliedVoucher)"
          @keyup.enter="applyVoucher"
        />
        <button
          v-if="!appliedVoucher"
          class="pl-btn outline"
          type="button"
          @click="applyVoucher"
        >
          Áp dụng
        </button>
        <button
          v-else
          class="pl-btn ghost"
          type="button"
          @click="removeVoucher"
        >
          Gỡ bỏ
        </button>
      </div>
      <div v-if="appliedVoucher" class="applied-voucher">
        <span class="v-tag">✓ {{ appliedVoucher.name }}</span>
        <span v-if="appliedVoucher.discountVnd > 0" class="v-amt num">-{{ fmt(appliedVoucher.discountVnd) }}</span>
      </div>
      <p v-if="voucherMsg" :class="appliedVoucher ? 'v-success' : 'pl-error'" style="margin: 0; font-size: 14px;">
        {{ voucherMsg }}
      </p>
    </section>

    <!-- 4. Cam kết & Điều khoản giao dịch từ xa -->
    <section v-if="preview" class="pl-card sec terms">
      <div class="terms-toggle-bar" @click="showTerms = !showTerms">
        <h2 class="pl-h2" style="margin: 0;">Điều khoản giao dịch từ xa &amp; Chính sách đổi trả</h2>
        <button type="button" class="terms-toggle-btn" :aria-expanded="showTerms">
          {{ showTerms ? '▲ Thu gọn' : '▼ Chi tiết chính sách bảo vệ' }}
        </button>
      </div>

      <div v-show="showTerms" class="terms-collapsible">
        <div class="legal-badge">
          ⚖️ Tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15 &amp; Nghị định 52/2024/NĐ-CP
        </div>
        <ul class="rules legal-list">
          <li><b>Cam kết dừng gói 1 chạm bất kỳ lúc nào:</b> Bạn có thể chủ động bấm Dừng gói hoặc Hủy liên kết thẻ/ví đối tác ngay tại trang tài khoản mà không cần gọi tổng đài hay chờ duyệt phức tạp.</li>
          <li><b>Cam kết hoàn tiền trong vòng 7 ngày làm việc:</b> Khi dừng gói giữa chừng, MOVA hoàn trả 100% tiền thật tương ứng với các bữa ăn chưa giao về đúng phương thức/tài khoản nguồn (tất toán lại phần ưu đãi chiết khấu chu kỳ dài nếu dừng trước hạn theo đúng giá trị bữa ăn thực tế).</li>
          <li><b>Báo trước 7 ngày làm việc trước khi hết chu kỳ gói:</b> Hệ thống thông báo thực đơn và số tiền dự kiến trước 7 ngày làm việc để bạn chủ động quyết định tiếp tục hoặc tạm dừng; tuyệt đối KHÔNG âm thầm tự động gia hạn gói lớn.</li>
          <li><b>Linh hoạt tạm hoãn:</b> Được tạm hoãn tối đa {{ maxSkip }} tuần trong mỗi chu kỳ 4 tuần (chỉ cần báo trước giờ chốt sổ D-2) mà không mất ưu đãi hay bị phạt.</li>
          <li><b>Minh bạch hóa đơn điện tử:</b> Xuất hóa đơn điện tử GTGT hợp lệ tại mỗi lần giao hàng theo đúng quy định tại Điều 9 Nghị định 254/2026/NĐ-CP.</li>
        </ul>
      </div>

      <ul class="rules" style="margin-top: 14px;">
        <li>Gói cam kết <b>{{ preview.cycle_weeks.length }} tuần</b> liên tục để nhà máy lên kế hoạch thu mua nông sản tận vườn.</li>
        <li>Bạn được <b>tạm hoãn tối đa {{ maxSkip }} tuần</b> trong chu kỳ, báo trước hạn đổi món của tuần đó.</li>
        <li>
          Hạn đổi món của từng tuần (trước giờ chốt sổ nhà máy):
          <ul class="deadlines">
            <li v-for="w in preview.cycle_weeks" :key="w.week_index">
              <span>Tuần {{ w.week_index + 1 }}</span>
              <b>trước {{ fmtDeadline(new Date(w.cutoff_at)) }}</b>
            </li>
          </ul>
        </li>
        <!-- Tuần dời vì nghỉ lễ Tết: máy chủ trả shifted_from (ngày khách chọn ban đầu) -->
        <li v-for="w in preview.shifted_weeks" :key="'sh' + w.week_index" data-testid="shifted-notice">
          <b>Tuần {{ w.week_index + 1 }}</b> giao ngày <b>{{ fmtDay(w.delivery_date) }}</b> thay vì {{ fmtDay(w.shifted_from) }} vì nghỉ lễ Tết.
        </li>
      </ul>
      <div class="checkbox-stack">
        <label class="agree">
          <input v-model="c.agree" type="checkbox" @change="save" />
          <span>
            Tôi đã đọc và đồng ý với
            <router-link to="/terms" target="_blank" class="legal-link" @click.stop>Điều khoản giao dịch từ xa</router-link>,
            <router-link to="/refund-policy" target="_blank" class="legal-link" @click.stop>Chính sách hoàn tiền 7 ngày</router-link> và
            <router-link to="/privacy" target="_blank" class="legal-link" @click.stop>Chính sách bảo mật</router-link>
            của MOVA Fresh.
          </span>
        </label>
        <label class="agree newsletter">
          <input v-model="c.newsletterOptin" type="checkbox" @change="save" />
          <span>Đăng ký nhận bản tin công thức nấu ăn từ Đầu bếp MOVA &amp; ưu đãi định kỳ qua Email (Tặng ngay +15.000đ Fresh Credit).</span>
        </label>
      </div>
    </section>

    <!-- 5. Câu hỏi thường gặp theo ngữ cảnh trước khi thanh toán -->
    <section class="pl-card sec checkout-faqs-section">
      <h2 class="pl-h2" style="margin-bottom: 2px;">Câu hỏi thường gặp khi thanh toán</h2>
      <p class="pl-note" style="margin-top: 0; margin-bottom: 12px;">Giải đáp nhanh những băn khoăn phổ biến trước khi bạn hoàn tất đăng ký:</p>
      
      <div class="faq-accordion-list">
        <div v-for="faq in checkoutFaqs" :key="faq.id" class="faq-acc-item" :class="{ open: openFaqId === faq.id }">
          <button type="button" class="faq-acc-header" @click="toggleFaq(faq.id)">
            <span class="faq-acc-q">{{ faq.q }}</span>
            <span class="faq-acc-icon">{{ openFaqId === faq.id ? '−' : '+' }}</span>
          </button>
          <div v-show="openFaqId === faq.id" class="faq-acc-body" v-html="faq.a"></div>
        </div>
      </div>
    </section>

    <!-- Nút trả tiền -->
    <section class="pay-bar">
      <div v-if="preview" class="pay-breakdown" data-testid="pay-breakdown">
        <div v-if="otherDiscountVnd > 0" class="pay-line green">
          <span>Ưu đãi của gói (thẻ quà tặng, khung giờ xanh):</span>
          <b class="num">-{{ fmt(otherDiscountVnd) }}</b>
        </div>
        <div v-if="referralDiscountVnd > 0" class="pay-line green">
          <span>Ưu đãi người quen giới thiệu ({{ activeRefCode }}):</span>
          <b class="num">-{{ fmt(referralDiscountVnd) }}</b>
        </div>
        <div v-if="c.lockMenu" class="pay-line green" data-testid="lock-menu-line">
          <span>Đã chốt món theo ưu đãi chiến dịch (đổi món bị khóa ở các tuần đã chốt)</span>
        </div>
        <div class="pay-sum">
          <small v-if="payInfo.kind === 'activate'">Tuần 1 trừ từ Fresh Credit hôm nay <span class="rate-note">(~{{ fmt(servingPayToday) }}/suất • {{ fmt(mealPayToday) }}/bữa)</span></small>
          <small v-else-if="payInfo.kind === 'buy_pack'">Hôm nay bạn mua gói để đủ tiền tuần 1</small>
          <small v-else>Hôm nay bạn trả <span class="rate-note">(~{{ fmt(servingPayToday) }}/suất • {{ fmt(mealPayToday) }}/bữa)</span></small>
          <b class="num">{{ fmt(payToday) }}</b>
        </div>
      </div>
      <p v-if="problems.length" class="pl-note need">Còn thiếu: {{ problems.join(', ') }}.</p>
      <p v-if="message" class="pl-error" role="alert">{{ message }}</p>
      <button class="pl-btn orange" type="button" :disabled="problems.length > 0 || busy" @click="pay">{{ payLabel }}</button>
    </section>

    <LinkCardSheet v-if="linkOpen" :linked="!store.cardLinkNeeded && c.method === 'card'" @close="linkOpen = false" @linked="onCardLinked" @unlinked="onCardUnlinked" />

    <!-- Modal xác thực OTP -->
    <div v-if="showOtpModal" class="otp-modal-backdrop" @click.self="showOtpModal = false">
      <div class="otp-modal">
        <button class="mclose" type="button" aria-label="Đóng" @click="showOtpModal = false">×</button>
        <h3 class="otp-title">Xác thực số điện thoại</h3>
        <p class="pl-note">MOVA vừa gửi mã OTP đến số <b>{{ phoneValue || c.phone }}</b>. Nhập mã để xác nhận số này là của bạn.</p>
        <div class="otp-form">
          <input
            v-model="otpInput"
            class="pl-input num otp-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="10"
            placeholder="Mã OTP"
            @keyup.enter="verifyOtp"
          />
          <button class="pl-btn primary" type="button" :disabled="otpBusy" @click="verifyOtp">{{ otpBusy ? 'Đang xác nhận…' : 'Xác nhận OTP' }}</button>
        </div>
        <p v-if="otpError" class="pl-error" style="margin-top: 6px;">{{ otpError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import VietQrSvg from '../common/VietQrSvg.vue';
import ExpressPanel from './ExpressPanel.vue';
import DialSelect from '../modals/DialSelect.vue';
import LinkCardSheet from '../dashboard/LinkCardSheet.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { useMovaStore } from '../../stores/useMovaStore';
import { BUSINESS } from '../../shared/config/business';
import { INSTRUCTION_MODES, payTodayInfo } from '../../shared/api/adapters/checkout';
import { checkoutErrorMessage } from '../../shared/domain/checkoutError';
import { fmt, hash } from '../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../shared/utils/time';
import { normalizeContact, splitPhone } from '../../shared/domain/leads';

const emit = defineEmits(['done']);
const store = usePlanFlowStore();
const account = useMovaStore();
const c = store.checkout;
const options = computed(() => store.options);
const preview = computed(() => store.preview);
const busy = ref(false);
const message = ref('');
const maxSkip = BUSINESS.subscription.maxSkipWeeksPerCycle;
const chargeHours = BUSINESS.timings.chargeBeforeDeliveryHours;

const showOtpModal = ref(false);
const otpInput = ref('');
const otpError = ref('');
const otpBusy = ref(false);
const packOrder = ref(null);
const phoneErr = ref('');
const showTerms = ref(false);
const linkOpen = ref(false);
const phoneNotVerified = ref(false);
const cardNotice = checkoutErrorMessage('PAYMENT_TOKEN_REQUIRED');
const phoneNotVerifiedMsg = checkoutErrorMessage('PHONE_NOT_VERIFIED');

const voucherInput = ref('');
const voucherMsg = ref('');
const appliedVoucher = ref(null);

const selectedDayLabel = computed(() => {
  const opt = options.value && options.value.options[c.optionIndex];
  return opt ? opt.day_labels.join(' và ') : 'ngày đã chọn';
});

const openFaqId = ref('faq1');

const checkoutFaqs = [
  {
    id: 'faq1',
    q: 'Tôi có bị khóa hợp đồng hay tự động gia hạn không?',
    a: '<p><b>Hoàn toàn không.</b> Bạn có quyền dừng gói 1 chạm bất kỳ lúc nào ngay tại trang tài khoản. MOVA Fresh sẽ gửi thông báo trước ít nhất <b>7 ngày làm việc</b> trước khi hết chu kỳ 4 tuần để bạn chủ động quyết định tiếp tục hay dừng lại, và cam kết hoàn tiền 100% các bữa chưa giao trong 7 ngày làm việc.</p>'
  },
  {
    id: 'faq2',
    q: 'Nếu tôi không có ở nhà lúc xe lạnh giao tới thì sao?',
    a: '<p>Bộ thùng carton sóng 3 lớp kèm túi xốp bạc và đá gel sinh học giữ lạnh chuẩn <b>0–4°C suốt 6 giờ</b>. Shipper sẽ gọi điện trước 15 phút, gửi lễ tân/bảo vệ chung cư hoặc đặt trước cửa và chụp ảnh hiện trường rõ nét gửi cho bạn.</p>'
  },
  {
    id: 'faq3',
    q: 'Khi nào tôi có thể đổi món hoặc đổi ngày giao?',
    a: '<p>Bạn có thể đổi từng món trong thực đơn hoặc tạm hoãn chuyến giao thoải mái trước giờ chốt sổ của nhà máy Đắk Lắk là <b>08:00 sáng ngày D-2</b> (trước ngày giao 48 tiếng).</p>'
  },
  {
    id: 'faq4',
    q: 'Tôi có được xuất hóa đơn điện tử GTGT không?',
    a: '<p><b>Có.</b> Căn cứ Điều 9 Nghị định 254/2026/NĐ-CP, hóa đơn điện tử GTGT hợp pháp được phát hành tự động cho từng lần giao hàng thực tế và gửi về email đã đăng ký của bạn.</p>'
  },
  {
    id: 'faq5',
    q: 'Tôi có cần chuẩn bị gia vị gì ở nhà không?',
    a: '<p>Chỉ cần chuẩn bị gia vị bếp cơ bản (dầu ăn, muối, nước lọc). Gói xốt MOVA đặc biệt và toàn bộ nguyên liệu tươi sống sơ chế sẵn đã có trong thùng.</p>'
  }
];

function toggleFaq(id) {
  openFaqId.value = openFaqId.value === id ? '' : id;
}

const slots = computed(() => (options.value && options.value.options[c.optionIndex] ? options.value.options[c.optionIndex].slots : []));
const fc = computed(() => preview.value.fresh_credit);
const qrSeed = computed(() => Math.abs(hash(preview.value ? preview.value.payment_ref : 'mova')));

const householdSize = computed(() => store.plan?.household_size || 2);
const mealsCount = computed(() => store.plan?.quote?.meals_per_week || 5);

const activeRefCode = computed(() => {
  return store.refCode || (appliedVoucher.value?.code?.startsWith('MOVA-') ? appliedVoucher.value.code : '');
});

const referralDiscountVnd = computed(() => (preview.value && preview.value.referral ? preview.value.referral.referee_bonus_vnd : 0));
const otherDiscountVnd = computed(() => (preview.value ? Math.max(0, preview.value.gift_total_vnd - referralDiscountVnd.value) : 0));

// Số tiền phải trả hôm nay: toàn bộ do máy chủ tính. Fresh Credit đủ tuần 1 thì là số trừ từ credit ("Kích hoạt gói"),
// thiếu thì là giá gói trả trước nhỏ nhất đủ phần thiếu; chuyển khoản là cả gói; thẻ/ví là tuần 1.
const payInfo = computed(() => payTodayInfo(preview.value, c.method, { packPayVnd: preview.value ? store.selectedTopupPay() : 0, fmtVnd: fmt }));
const payToday = computed(() => payInfo.value.amount_vnd);

const mealPayToday = computed(() => {
  if (!payToday.value) return 0;
  const weeks = ['card', 'activate'].includes(payInfo.value.kind) ? 1 : 4;
  const count = (mealsCount.value || 5) * weeks;
  return Math.round(payToday.value / count);
});

const servingPayToday = computed(() => {
  return Math.round(mealPayToday.value / (householdSize.value || 1));
});

const payLabel = computed(() => payInfo.value.label);

const needsAuth = computed(() => !account.authUser && store.errorCode === 'AUTH_REQUIRED');
const exactLabel = computed(() => `Gói ${BUSINESS.subscription.defaultWeeks} tuần phù hợp (${(mealsCount.value || 5) * 4} bữa ~ ${(mealsCount.value || 5) * 4 * (householdSize.value || 2)} suất)`);

// Sức chứa từng ngày giao: chỉ các ngày thuộc gói (ngày đầu tiên + các tuần sau theo thứ đã chọn)
const capacityRows = computed(() => (store.capacity || []).map((d) => ({ ...d, full: d.effective_remaining <= 0, low: d.effective_remaining > 0 && d.effective_remaining <= 3 })));
const hasFullDate = computed(() => {
  const full = new Set([...(preview.value ? preview.value.full_dates : []), ...store.fullDates]);
  const dates = preview.value ? preview.value.deliveries.map((x) => x.delivery_date) : [];
  return dates.length ? dates.some((d) => full.has(d)) : full.size > 0;
});

// Số người nhận đã chuẩn hóa (0xxxxxxxxx cho số Việt Nam, E.164 cho số quốc tế); null nếu chưa hợp lệ.
const phoneValue = computed(() => {
  const n = normalizeContact(c.phone, { dial: c.phoneDial });
  return n && n.type === 'phone' ? n.value : null;
});

const problems = computed(() => {
  const list = [];
  if (!c.slotId) list.push('ngày và khung giờ giao');
  if (hasFullDate.value) list.push('ngày giao còn chỗ');
  if (c.name.trim().length < 2) list.push('tên người nhận');
  if (!phoneValue.value) {
    list.push('số điện thoại người nhận hợp lệ');
  } else if (!c.phoneVerified) {
    list.push('xác thực OTP số điện thoại');
  }
  if (c.street.trim().length < 4) list.push('địa chỉ');
  if (!c.agree) list.push('đồng ý với điều khoản dịch vụ');
  return list;
});

function onPhoneChange() {
  c.phoneVerified = false;
  phoneNotVerified.value = false;
  phoneErr.value = '';
  save();
}

async function openOtpModal() {
  phoneErr.value = '';
  const cleanPhone = phoneValue.value;
  if (!cleanPhone) {
    phoneErr.value = 'Vui lòng nhập số điện thoại hợp lệ (chọn đúng mã vùng, hoặc gõ đủ dạng +81 90 1234 5678) trước khi xác thực OTP';
    return;
  }
  otpInput.value = '';
  otpError.value = '';
  otpBusy.value = true;
  const err = await account.requestOtp(cleanPhone);
  otpBusy.value = false;
  if (err) {
    phoneErr.value = err;
    return;
  }
  showOtpModal.value = true;
}

async function verifyOtp() {
  if (otpBusy.value) return;
  otpBusy.value = true;
  otpError.value = '';
  const err = await account.verifyOtp(phoneValue.value || c.phone, otpInput.value);
  otpBusy.value = false;
  if (err) {
    otpError.value = err;
    return;
  }
  c.phoneVerified = true;
  showOtpModal.value = false;
  save();
  await refresh();
}

function setInstruction(m) {
  c.instruction.mode = m.mode;
  c.instruction.photo_required = m.photo_required;
  save();
}

async function applyVoucher() {
  voucherMsg.value = '';
  const code = voucherInput.value.trim().toUpperCase();
  if (!code) {
    voucherMsg.value = 'Vui lòng nhập mã ưu đãi';
    return;
  }
  if (code === BUSINESS.incentives.giftCardCode) {
    appliedVoucher.value = { code, name: 'Thẻ quà tặng MOVA Fresh (trải đều 4 tuần)' };
    c.voucherCode = code;
    voucherMsg.value = '✓ Đã kích hoạt thẻ quà tặng 4 tuần!';
    save();
    return;
  }
  if (!code.startsWith('MOVA-')) {
    voucherMsg.value = 'Mã ưu đãi không hợp lệ hoặc đã hết hạn';
    return;
  }
  // Mã giới thiệu do máy chủ kiểm tra (mã sai, tự giới thiệu, khách không còn là khách mới) khi tính lại giá.
  const prevRef = store.refCode;
  const prevCode = c.voucherCode;
  store.setRef(code);
  c.voucherCode = code;
  await store.loadPreview();
  if (store.errorCode === 'REFERRAL_INVALID' || store.errorCode === 'REFERRAL_NOT_ELIGIBLE') {
    voucherMsg.value = store.error;
    store.setRef(prevRef);
    c.voucherCode = prevCode;
    await store.loadPreview();
    return;
  }
  appliedVoucher.value = { code, name: `Ưu đãi người quen giới thiệu (${code})` };
  voucherMsg.value = preview.value && preview.value.referral ? `✓ Áp dụng mã giới thiệu ${code}: giảm ${fmt(preview.value.referral.referee_bonus_vnd)} vào đơn đầu` : `✓ Đã ghi nhận mã giới thiệu ${code}`;
  save();
}

function removeVoucher() {
  if (appliedVoucher.value?.code?.startsWith('MOVA-')) {
    store.setRef('');
  }
  appliedVoucher.value = null;
  c.voucherCode = '';
  voucherInput.value = '';
  voucherMsg.value = '';
  save();
}

function save() {
  store.persist();
}

async function refresh() {
  await Promise.all([store.loadPreview(), store.loadCapacity()]);
  store.persist();
}

async function setFrequency(f) {
  c.frequency = f;
  c.optionIndex = 0;
  c.slotId = '';
  await store.loadOptions();
  autoPick();
  await refresh();
}

async function pickOption(i) {
  c.optionIndex = i;
  const list = options.value.options[i].slots;
  if (!list.some((s) => s.slot_id === c.slotId)) c.slotId = list.length ? list[0].slot_id : '';
  await refresh();
}

async function pickSlot(id) {
  c.slotId = id;
  await refresh();
}

async function setMethod(m) {
  c.method = m;
  await refresh();
}

function setPack(id) {
  c.packId = id;
  packOrder.value = null;
  save();
}

function autoPick() {
  const o = options.value && options.value.options[c.optionIndex];
  if (o && !o.slots.some((s) => s.slot_id === c.slotId)) c.slotId = o.slots[0].slot_id;
}

async function onCardLinked() {
  linkOpen.value = false;
  store.cardLinkNeeded = false;
  c.method = 'card';
  await refresh();
}

async function onCardUnlinked() {
  linkOpen.value = false;
  store.cardLinkNeeded = true;
  c.method = 'fresh_credit';
  await refresh();
}

async function buyPack() {
  const o = await store.orderSelectedPack();
  busy.value = false;
  if (o.ok) {
    packOrder.value = o.order;
    message.value = 'Chuyển khoản mua gói bên dưới để đủ tiền tuần 1. Khi tiền về, bạn quay lại bấm "Kích hoạt gói".';
  } else {
    message.value = o.message;
  }
}

async function pay() {
  message.value = '';
  packOrder.value = null;
  phoneNotVerified.value = false;
  busy.value = true;
  // Fresh Credit chưa đủ tuần 1: mua gói trả trước nhỏ nhất đủ phần thiếu trước (chuyển khoản), chưa kích hoạt gói.
  if (payInfo.value.kind === 'buy_pack') return buyPack();
  const r = await store.submitOrder();
  busy.value = false;
  if (r.ok) {
    emit('done');
    return;
  }
  if (['SLOT_FULL', 'CYCLE_FULL', 'SLOT_NOT_AVAILABLE', 'DAY_NOT_AVAILABLE'].includes(r.kind)) {
    c.slotId = '';
    await store.loadOptions();
    autoPick();
    await refresh();
    message.value = r.kind === 'CYCLE_FULL'
      ? 'Năng lực giao của một ngày trong gói vừa hết. Mời chọn ngày hoặc khung giờ khác.'
      : 'Khung giờ bạn chọn vừa kín chỗ. Mời chọn khung giờ khác.';
  } else if (r.kind === 'INSUFFICIENT_CREDIT') {
    // Fresh Credit chưa đủ: tạo lệnh mua Gói Suất ăn trả trước để khách chuyển khoản.
    const o = await store.orderSelectedPack();
    if (o.ok) {
      packOrder.value = o.order;
      message.value = 'Fresh Credit chưa đủ cho tuần đầu. Hãy chuyển khoản mua gói bên dưới, khi tiền về bạn bấm kích hoạt lại.';
    } else {
      message.value = o.message;
    }
  } else if (r.kind === 'AUTH_REQUIRED') {
    message.value = 'Hãy xác thực số điện thoại trước khi trả tiền.';
  } else if (r.kind === 'PHONE_NOT_VERIFIED') {
    // Tài khoản đăng nhập bằng Google chưa có số điện thoại đã xác thực: chỉ dẫn rõ ở mục 2
    phoneNotVerified.value = true;
    c.phoneVerified = false;
    message.value = r.message;
  } else if (r.kind === 'PAYMENT_TOKEN_REQUIRED') {
    // store đã đưa lựa chọn về Fresh Credit và bật nút liên kết thẻ/ví; tính lại giá để danh sách phương thức hiện đủ
    await refresh();
    message.value = '';
  } else {
    message.value = r.message;
  }
}

onMounted(async () => {
  await store.loadOptions();
  const contact = normalizeContact(store.contact);
  if (!c.phone && contact && contact.type === 'phone') {
    const sp = splitPhone(contact.value);
    c.phoneDial = sp.dial;
    c.phone = sp.national;
  }
  // Đã đăng nhập (OTP) bằng số này rồi thì không bắt xác thực lại (so sánh dạng chuẩn hóa, mã vùng nào cũng được)
  const rawAuthPhone = account.authUser && account.authUser.phone ? String(account.authUser.phone) : '';
  const authNorm = rawAuthPhone ? normalizeContact(rawAuthPhone.startsWith('+') || rawAuthPhone.startsWith('0') ? rawAuthPhone : `+${rawAuthPhone}`) : null;
  if (authNorm && phoneValue.value && authNorm.value === phoneValue.value) {
    c.phoneVerified = true;
  }
  if (c.voucherCode) {
    voucherInput.value = c.voucherCode;
    await applyVoucher();
  } else if (store.refCode) {
    voucherInput.value = store.refCode;
    await applyVoucher();
  }
  autoPick();
  await refresh();
});

watch(() => c.packId, save);
</script>

<style scoped>
.co { display: grid; gap: 16px; max-width: 760px; margin: 0 auto; }
.sec { display: grid; gap: 14px; }
.freq-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.freq-chip { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 14px; text-align: left; }
.freq-title { font-weight: 700; font-size: 16px; }
.recommend-pill { font-size: 12px; font-weight: 600; background: var(--green); color: var(--white); padding: 2px 8px; border-radius: 99px; }

.slot-chip { display: flex; justify-content: space-between; align-items: center; gap: 8px; text-align: left; width: 100%; }
.slot-badge { font-size: 12px; font-weight: 700; background: var(--green-soft); color: var(--green-d); padding: 3px 8px; border-radius: 6px; }

.phone-row { display: flex; gap: 8px; align-items: center; }
.phone-row .pl-input { flex: 1; }
.sm-btn { padding: 8px 12px; font-size: 14px; white-space: nowrap; }
.verified-pill { font-size: 14px; font-weight: 700; color: var(--green-d); background: var(--green-soft); padding: 6px 12px; border-radius: 8px; white-space: nowrap; }
.phone-err { margin-top: 4px; font-size: 14px; }

.methods { display: grid; gap: 12px; }
.method { border: 1.5px solid var(--line); border-radius: 16px; overflow: hidden; }
.method.on { border-color: var(--green); }
.m-head { width: 100%; min-height: 60px; display: flex; align-items: center; gap: 12px; background: var(--card); border: 0; padding: 12px 16px; text-align: left; font-size: 17px; font-weight: 700; cursor: pointer; }
.m-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.radio { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line); flex-shrink: 0; position: relative; }
.radio.on { border-color: var(--green); }
.radio.on::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--green); }
.m-body { padding: 4px 16px 16px; display: grid; gap: 12px; }
.offers { display: grid; gap: 8px; }
.offer { display: grid; grid-template-columns: 1fr auto; column-gap: 12px; text-align: left; min-height: 64px; border: 1.5px solid var(--line); background: var(--card); border-radius: 14px; padding: 10px 14px; }
.offer.on { border-color: var(--green); background: var(--green-soft); }
.offer-n { grid-column: 1 / -1; font-size: 15px; color: var(--muted); }
.offer-get { font-size: 20px; font-weight: 800; }
.offer-pay { font-size: 16px; font-weight: 700; color: var(--orange-ink); align-self: end; }
.bank { grid-template-columns: 180px 1fr; align-items: center; }
.qr { width: 180px; height: 180px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; padding: 8px; }
.bank-info { display: grid; gap: 6px; font-size: 16px; }
.bank-info .big { font-size: 24px; color: var(--green-d); }
.ref { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .04em; }
.charges { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.charges li { display: flex; justify-content: space-between; gap: 10px; min-height: 44px; align-items: center; border-bottom: 1px dashed var(--line); font-size: 16px; }

.unlink-commitment {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--green-soft);
  color: var(--green-d);
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 10px;
  font-size: 14px;
}
.c-shield { font-size: 20px; flex-shrink: 0; }

.voucher-card { padding: 16px; }
.voucher-box { display: flex; gap: 8px; align-items: center; }
.voucher-input { flex: 1; }
.applied-voucher { display: flex; justify-content: space-between; align-items: center; background: var(--green-soft); color: var(--green-d); padding: 8px 12px; border-radius: 8px; font-size: 15px; font-weight: 700; }
.v-amt { font-size: 16px; }
.v-success { color: var(--green-d); font-weight: 600; }
.req { font-weight: 600; color: var(--orange-ink); font-size: 14px; }
.instr { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 12px; border: 1.5px solid var(--line); border-radius: 12px; margin-bottom: 8px; font-size: 16px; }
.instr.on { border-color: var(--green); background: var(--green-soft); }
fieldset.delivery-instruct-wrap { border: 0; padding: 0; margin: 0; display: grid; gap: 4px; }
.cap-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.cap-list li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 12px; border-radius: 10px; background: var(--green-soft); font-size: 15px; }
.cap-list li.low { background: var(--butter); }
.cap-list li.full { background: var(--red-soft); color: var(--red); }
.pl-panel.good { background: var(--green-soft); }
.rate-note { font-size: 13px; font-weight: 600; color: var(--green-d); margin-left: 4px; }

.terms-toggle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 8px;
}
.terms-toggle-btn {
  background: none;
  border: none;
  color: var(--green-d);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
}
.terms-collapsible {
  margin-top: 8px;
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
}
.legal-badge {
  display: inline-block;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 10px;
}
.legal-list {
  display: grid;
  gap: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
}

.rules { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 16px; }
.deadlines { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; }
.deadlines li { display: flex; justify-content: space-between; gap: 10px; background: var(--bg); border-radius: 10px; padding: 8px 12px; font-size: 16px; }
.checkbox-stack { display: grid; gap: 8px; margin-top: 10px; }
.agree { display: flex; gap: 12px; align-items: flex-start; min-height: 44px; font-size: 15px; font-weight: 600; cursor: pointer; }
.agree input { width: 22px; height: 22px; accent-color: var(--green); flex-shrink: 0; margin-top: 2px; }

.pay-bar { position: sticky; bottom: 0; background: rgba(250, 249, 245, .97); border-top: 1px solid var(--line); margin: 0 -20px; padding: 12px 20px; display: grid; gap: 8px; z-index: 10; }
.pay-breakdown { display: grid; gap: 4px; }
.pay-line { display: flex; justify-content: space-between; font-size: 14px; }
.pay-line.green { color: var(--green-d); font-weight: 600; }
.pay-sum { display: flex; justify-content: space-between; align-items: baseline; }
.pay-sum small { font-size: 15px; color: var(--muted); }
.pay-sum b { font-size: 24px; }
.need { color: var(--orange-ink); }

/* OTP Modal */
.otp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 16px; }
.otp-modal { background: var(--white); width: 100%; max-width: 400px; border-radius: 20px; padding: 24px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: grid; gap: 12px; }
.otp-title { font-size: 20px; font-weight: 800; margin: 0; }
.demo-hint { color: var(--green-d); font-weight: 700; }
.otp-form { display: flex; gap: 8px; align-items: center; }
.otp-input { width: 110px; font-size: 20px; text-align: center; letter-spacing: 4px; }
.mclose { position: absolute; top: 16px; right: 16px; border: 0; background: var(--line-2); width: 32px; height: 32px; border-radius: 50%; font-size: 20px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.legal-link {
  color: var(--green-d);
  text-decoration: underline;
  font-weight: 700;
}
.legal-link:hover {
  color: var(--green);
}

.delivery-instruct-wrap {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}
.custom-instruction-box {
  margin-top: 4px;
}
.fixed-delivery-reminder {
  font-size: 13.5px;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 10px 14px;
  border-radius: 10px;
  margin: 10px 0 0;
  line-height: 1.4;
}

.checkout-faqs-section {
  padding: 18px 20px;
}
.faq-accordion-list {
  display: grid;
  gap: 8px;
}
.faq-acc-item {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg);
}
.faq-acc-item.open {
  border-color: var(--green);
  background: var(--white);
}
.faq-acc-header {
  width: 100%;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.faq-acc-q {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.faq-acc-icon {
  font-size: 18px;
  font-weight: 800;
  color: var(--green-d);
  flex-shrink: 0;
}
.faq-acc-body {
  padding: 0 14px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-2);
  border-top: 1px dashed var(--line-2);
}
.faq-acc-body p {
  margin: 6px 0 0;
}

@media (max-width: 560px) {
  .bank { grid-template-columns: 1fr; justify-items: center; }
  .pay-bar { margin: 0 -16px; padding: 10px 16px; }
}
</style>
