<template>
  <div class="faq-page">
    <div class="wrap">
      <nav class="breadcrumb" aria-label="Đường dẫn trang">
        <router-link to="/">Trang chủ</router-link>
        <span class="sep">›</span>
        <span>Trung tâm Hỏi đáp (FAQs)</span>
      </nav>

      <header class="faq-header">
        <span class="faq-badge">TRUNG TÂM TRỢ GIÚP &amp; HỎI ĐÁP</span>
        <h1 class="faq-title">Câu hỏi thường gặp tại MOVA FRESH</h1>
        <p class="faq-lead">
          Tìm kiếm nhanh câu trả lời về thực đơn Đầu bếp MOVA, nguyên liệu tươi sạch Đắk Lắk, chính sách gói suất ăn và hoàn tiền minh bạch trong 7 ngày.
        </p>

        <!-- Thanh tìm kiếm nhanh câu hỏi -->
        <div class="faq-search-box">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="faq-search-input"
            placeholder="Tìm theo từ khóa: đổi món, hoàn tiền, dị ứng, giờ giao, hóa đơn, xốt..."
          />
          <button v-if="searchQuery" class="clear-search-btn" type="button" @click="searchQuery = ''">×</button>
        </div>
      </header>

      <!-- Thanh chọn nhóm chủ đề -->
      <div class="faq-category-nav" role="tablist">
        <button
          v-for="cat in FAQ_GROUPS"
          :key="cat.id"
          type="button"
          class="faq-cat-btn"
          :class="{ active: activeGroup === cat.id }"
          role="tab"
          :aria-selected="activeGroup === cat.id"
          @click="activeGroup = cat.id"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span>{{ cat.title }}</span>
          <span class="cat-count num">{{ getFaqGroupCount(cat.id) }}</span>
        </button>
      </div>

      <!-- Danh sách câu hỏi Accordion -->
      <div class="faq-content-container">
        <div v-for="group in filteredGroups" :key="group.id" class="faq-group-block">
          <h2 class="group-title">
            <span class="g-icon">{{ group.icon }}</span>
            <span>{{ group.title }}</span>
          </h2>

          <div class="accordion-list">
            <div
              v-for="q in group.questions"
              :key="q.id"
              class="accordion-item"
              :class="{ open: isOpen(q.id) }"
            >
              <button
                type="button"
                class="accordion-trigger"
                :aria-expanded="isOpen(q.id)"
                @click="toggleItem(q.id)"
              >
                <span class="q-question-text">{{ q.q }}</span>
                <span class="q-toggle-icon">{{ isOpen(q.id) ? '−' : '+' }}</span>
              </button>
              <div v-show="isOpen(q.id)" class="accordion-panel">
                <div class="panel-content" v-html="q.a"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!filteredGroups.length" class="empty-faq">
          <p>Không tìm thấy câu hỏi nào phù hợp với từ khóa "<b>{{ searchQuery }}</b>".</p>
          <button class="pl-btn" type="button" @click="searchQuery = ''; activeGroup = 'all'">Xem tất cả câu hỏi</button>
        </div>
      </div>

      <!-- Hộp hỗ trợ trực tiếp -->
      <section class="faq-support-card pl-card">
        <div class="support-left">
          <span class="support-avatar">👨‍🍳</span>
          <div>
            <h3>Vẫn còn câu hỏi cần giải đáp?</h3>
            <p>Đội ngũ Đầu bếp và Chăm sóc khách hàng MOVA FRESH sẵn sàng hỗ trợ bạn từ 06:00 đến 21:00 hàng ngày.</p>
          </div>
        </div>
        <div class="support-actions">
          <a href="tel:19008899" class="pl-btn outline tel-btn" @click="openLink($event, 'tel:19008899')">📞 Gọi 1900 8899</a>
          <a
            href="https://zalo.me"
            :target="inMiniApp ? undefined : '_blank'"
            :rel="inMiniApp ? undefined : 'noopener noreferrer'"
            class="pl-btn primary zalo-btn"
            @click="openLink($event, 'https://zalo.me')"
          >
            Chat Zalo Official
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { isZaloMiniApp, openExternalUrl } from '../services/zaloMiniApp';

const inMiniApp = isZaloMiniApp();
function openLink(event, url) {
  if (!inMiniApp) return;
  event.preventDefault();
  void openExternalUrl(url);
}

const searchQuery = ref('');
const activeGroup = ref('all');
const openItemIds = ref(new Set(['m1', 'c1', 'p1'])); // Mặc định mở 1 số câu quan trọng

const FAQ_GROUPS = [
  { id: 'all', title: 'Tất cả chủ đề', icon: '📋' },
  { id: 'menu', title: 'Thực đơn & Đầu bếp MOVA', icon: '👨‍🍳' },
  { id: 'food', title: 'Nguyên liệu Đắk Lắk & Chuỗi lạnh', icon: '🌿' },
  { id: 'payment', title: 'Gói Suất ăn & Thanh toán', icon: '💳' },
  { id: 'delivery', title: 'Giao nhận, Hóa đơn & Hoàn tiền', icon: '🚚' }
];

const RAW_FAQS = [
  // Nhóm 1: Thực đơn & Đầu bếp MOVA (4 câu)
  {
    id: 'm1',
    groupId: 'menu',
    q: 'Cam kết "Nấu trong 15 phút — Chỉ 1 chảo" được thực hiện như thế nào?',
    a: '<p>Toàn bộ nguyên liệu thịt cá, rau củ đã được các đầu bếp MOVA sơ chế sạch sẽ 100%, thái sẵn vừa ăn và đóng chân không vô trùng. Cùng với <b>Gói xốt MOVA đặc biệt</b> định lượng chuẩn xác từng gram, bạn chỉ cần mở túi trút vào chảo nóng, đảo chín trong 10–12 phút là xong mâm cơm 5 món chuẩn Á Đông mà không cần dao thớt hay nêm nếm phức tạp.</p>'
  },
  {
    id: 'm2',
    groupId: 'menu',
    q: 'Tôi có thể đổi món trong thực đơn tuần được không? Khi nào hết hạn đổi?',
    a: '<p>Có, bạn hoàn toàn có thể đổi từng món trong thực đơn. Khi bấm nút <b>"Đổi"</b>, hệ thống sẽ gợi ý 3–4 món khác hẳn nguồn đạm (bò ↔ gà ↔ heo ↔ cá biển) hoặc mở toàn bộ thực đơn nhà máy để bạn lựa chọn. Thời hạn đổi món là trước <b>08:00 sáng ngày D-2</b> (giờ chốt sổ xưởng Đắk Lắk).</p>'
  },
  {
    id: 'm3',
    groupId: 'menu',
    q: 'Gia đình tôi có người kiêng ăn cay và kiêng hải sản thì MOVA xử lý thế nào?',
    a: '<p>MOVA FRESH áp dụng cam kết <b>Zero-Tolerance (Lọc cứng 100%)</b>. Ngay khi bạn chọn kiêng cay hoặc kiêng hải sản tại phễu khảo sát, Đầu bếp MOVA sẽ loại trừ tuyệt đối mọi món ăn chứa nguyên liệu này. Nếu nhà có trẻ nhỏ, hệ thống tự động ưu tiên món ngọt mềm thanh dịu.</p>'
  },
  {
    id: 'm4',
    groupId: 'menu',
    q: 'Tôi có cần chuẩn bị thêm gia vị hay dụng cụ gì ở nhà không?',
    a: '<p>Bạn chỉ cần chuẩn bị gia vị cơ bản có sẵn trong mọi căn bếp Việt: <b>1–2 muỗng dầu ăn, muối, nước mắm cơ bản và nước lọc</b> cùng <b>1 chảo chống dính sâu lòng</b>. Nhà máy không đóng gói gia vị thông thường để tránh rác thải bao bì và rách vỡ dung dịch.</p>'
  },

  // Nhóm 2: Nguyên liệu Đắk Lắk & Chuỗi lạnh (3 câu)
  {
    id: 'f1',
    groupId: 'food',
    q: 'Nguồn gốc xuất xứ nguyên liệu của MOVA FRESH từ đâu?',
    a: '<p>100% món ăn tại MOVA FRESH gắn liền với câu chuyện thổ nhưỡng <b>Terroir đặc sản</b>: Thịt heo thảo mộc Cư M\'gar, Thăn bò ăn cỏ Chư Sê, Gà đồi Buôn Đôn, Bông cải xanh baby Đà Lạt, Cá bớp cắt khoanh Vũng Tàu, Gạo ST25 hữu cơ Sóc Trăng và Vải thiều IQF. Mỗi hộp cơm đều có mã QR để quét tra cứu nhật ký nông hộ.</p>'
  },
  {
    id: 'f2',
    groupId: 'food',
    q: 'Tại sao tráng miệng lại dùng Vải thiều cấp đông IQF thay vì Bơ sáp 034?',
    a: '<p>Bơ sáp 034 đòi hỏi phải gọt vỏ, xay sinh tố và rửa cối lích kích, đi ngược lại tiêu chí 15 phút. <b>Vải thiều cấp đông nhanh IQF tách hạt</b> ứng dụng công nghệ làm lạnh tức thì -40°C, giữ trọn 95% vitamin. Khi ăn chỉ cần quay lò vi sóng 1 phút là tươi rói, ngọt mát tự nhiên.</p>'
  },
  {
    id: 'f3',
    groupId: 'food',
    q: 'Thực phẩm được bảo quản như thế nào trong suốt chuyến xe xuyên đêm?',
    a: '<p>Xe lạnh chuyên dụng xuất phát từ phân xưởng Buôn Ma Thuột lúc 18:00 và có mặt tại kho trung chuyển TP.HCM lúc sáng sớm. Hàng được đóng trong <b>Bộ thùng cách nhiệt 3 lớp (`BB-THUNG-01`) kèm đá gel giữ lạnh 0°C – 4°C suốt 6 giờ</b>, đảm bảo độ tươi tuyệt đối.</p>'
  },

  // Nhóm 3: Gói Suất ăn & Thanh toán (4 câu)
  {
    id: 'p1',
    groupId: 'payment',
    q: 'Tôi có bị trói buộc hợp đồng hay tự động gia hạn ngầm không?',
    a: '<p><b>Tuyệt đối KHÔNG.</b> Tuân thủ Luật Bảo vệ người tiêu dùng 19/2023, bạn có quyền <b>dừng gói 1 chạm</b> hoặc hủy liên kết thẻ/ví đối tác bất kỳ lúc nào ngay tại trang tài khoản. MOVA cam kết gửi thông báo trước ít nhất <b>7 ngày làm việc</b> trước khi hết chu kỳ gói để bạn chủ động quyết định.</p>'
  },
  {
    id: 'p2',
    groupId: 'payment',
    q: 'Fresh Credit là gì? Tôi nạp tiền vào có rút ra được không?',
    a: '<p><b>Fresh Credit</b> là điểm suất ăn trả trước nội bộ theo Thông tư 99/2025/TT-BTC, dùng để đổi bữa ăn tại MOVA FRESH nhận chiết khấu khoảng 10%. Fresh Credit không phải là ví điện tử trung gian thanh toán (tuân thủ Nghị định 52/2024/NĐ-CP). Khi dừng gói giữa chừng, MOVA hoàn trả 100% tiền ăn các bữa chưa giao về tài khoản ngân hàng của bạn trong 7 ngày làm việc.</p>'
  },
  {
    id: 'p3',
    groupId: 'payment',
    q: 'Tại sao MOVA FRESH không áp dụng hình thức thanh toán khi nhận hàng (COD)?',
    a: '<p>Thực phẩm sơ chế tươi sống theo khẩu vị riêng của gia đình bạn không thể tái sử dụng nếu bị boom hàng hoặc hoàn về. Mô hình trả trước giúp triệt tiêu rủi ro tồn kho nông sản, bảo vệ dòng tiền lành mạnh và cho phép MOVA giữ mức giá ưu đãi tốt nhất cho khách hàng.</p>'
  },
  {
    id: 'p4',
    groupId: 'payment',
    q: 'Chính sách giới thiệu bạn bè nhận thưởng 100.000đ hoạt động ra sao?',
    a: '<p>Cơ chế Dual-Benefit: Bạn bè đăng ký qua mã giới thiệu của bạn được <b>giảm trực tiếp 100.000đ</b> vào đơn đầu tiên (áp dụng cho cả VietQR, Thẻ và Fresh Credit). Đồng thời, tài khoản của bạn nhận ngay <b>+100.000đ vào ngăn ưu đãi Fresh Credit</b> ngay khi bạn bè thanh toán thành công.</p>'
  },

  // Nhóm 4: Giao nhận, Hóa đơn & Hoàn tiền (3 câu)
  {
    id: 'd1',
    groupId: 'delivery',
    q: 'Nếu tôi không có ở nhà lúc xe lạnh giao tới thì sao?',
    a: '<p>Thùng cách nhiệt chuyên dụng kèm đá gel giữ lạnh chuẩn 0–4°C suốt 6 giờ. Bạn có thể chọn hướng dẫn giao lạnh: <i>"Gửi lễ tân/bảo vệ chung cư"</i> hoặc <i>"Để trước cửa căn hộ"</i>. Shipper sẽ chụp ảnh hiện trường rõ nét để bạn yên tâm nhận hàng khi về nhà.</p>'
  },
  {
    id: 'd2',
    groupId: 'delivery',
    q: 'Quy trình hoàn tiền các bữa chưa giao diễn ra trong bao lâu?',
    a: '<p>MOVA FRESH cam kết hoàn tiền 100% tiền ăn cho các bữa ăn chưa giao trong vòng <b>7 ngày làm việc</b> kể từ khi bạn bấm Dừng gói hoặc liên hệ CSKH. Số tiền được chuyển khoản trực tiếp về tài khoản ngân hàng hoặc phương thức nguồn của bạn.</p>'
  },
  {
    id: 'd3',
    groupId: 'delivery',
    q: 'Tôi là khách hàng doanh nghiệp hoặc cá nhân cần hóa đơn đỏ GTGT thì sao?',
    a: '<p>Căn cứ Điều 9 Nghị định 254/2026/NĐ-CP, MOVA FRESH tự động phát hành hóa đơn điện tử GTGT hợp pháp cho từng lần giao hàng thực tế. Bạn có thể tải hóa đơn trực tiếp tại tab Quản lý đơn hàng hoặc nhận qua email công ty.</p>'
  }
];

function getFaqGroupCount(groupId) {
  if (groupId === 'all') return RAW_FAQS.length;
  return RAW_FAQS.filter((f) => f.groupId === groupId).length;
}

const filteredGroups = computed(() => {
  let list = RAW_FAQS;

  if (activeGroup.value !== 'all') {
    list = list.filter((f) => f.groupId === activeGroup.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((f) => {
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    });
  }

  // Nhóm lại theo FAQ_GROUPS
  const groups = [];
  for (const g of FAQ_GROUPS) {
    if (g.id === 'all') continue;
    const items = list.filter((f) => f.groupId === g.id);
    if (items.length) {
      groups.push({
        id: g.id,
        title: g.title,
        icon: g.icon,
        questions: items
      });
    }
  }
  return groups;
});

function isOpen(id) {
  return openItemIds.value.has(id);
}

function toggleItem(id) {
  if (openItemIds.value.has(id)) {
    openItemIds.value.delete(id);
  } else {
    openItemIds.value.add(id);
  }
}
</script>

<style scoped>
.faq-page {
  padding: 30px 0 80px;
  background: var(--bg);
  min-height: 85vh;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
}
.breadcrumb a {
  color: var(--green-d);
  text-decoration: none;
  font-weight: 600;
}
.breadcrumb .sep {
  color: var(--line);
}

.faq-header {
  text-align: center;
  max-width: 740px;
  margin: 0 auto 30px;
}
.faq-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--green-d);
  background: var(--green-soft);
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.faq-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--ink);
  margin: 0 0 10px;
  line-height: 1.3;
}
.faq-lead {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.55;
  margin: 0 0 20px;
}

/* Thanh tìm kiếm */
.faq-search-box {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 600px;
  margin: 0 auto;
}
.search-icon {
  position: absolute;
  left: 16px;
  color: var(--muted);
  pointer-events: none;
}
.faq-search-input {
  width: 100%;
  height: 50px;
  padding: 0 44px 0 48px;
  font-size: 15px;
  border: 1.5px solid var(--line);
  border-radius: 999px;
  background: var(--white);
  outline: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}
.faq-search-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(11, 156, 99, 0.15);
}
.clear-search-btn {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  color: var(--muted);
  cursor: pointer;
  line-height: 1;
}

/* Category filter tabs */
.faq-category-nav {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}
.faq-cat-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--white);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
}
.faq-cat-btn:hover {
  border-color: var(--faint);
}
.faq-cat-btn.active {
  background: var(--green-d);
  border-color: var(--green-d);
  color: var(--white);
}
.cat-count {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
}
.faq-cat-btn.active .cat-count {
  background: rgba(255, 255, 255, 0.25);
  color: var(--white);
}

/* Accordion list */
.faq-content-container {
  max-width: 820px;
  margin: 0 auto 40px;
  display: grid;
  gap: 28px;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--green-d);
  margin: 0 0 12px;
}
.g-icon {
  font-size: 20px;
}

.accordion-list {
  display: grid;
  gap: 10px;
}
.accordion-item {
  background: var(--white);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.15s ease;
}
.accordion-item.open {
  border-color: var(--green);
}

.accordion-trigger {
  width: 100%;
  min-height: 56px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}
.q-question-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.4;
}
.q-toggle-icon {
  font-size: 22px;
  font-weight: 700;
  color: var(--green-d);
  line-height: 1;
  flex-shrink: 0;
}

.accordion-panel {
  padding: 0 18px 16px;
  border-top: 1px dashed var(--line-2);
}
.panel-content {
  padding-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-2);
}
.panel-content p {
  margin: 0 0 6px;
}
.panel-content p:last-child {
  margin-bottom: 0;
}

.empty-faq {
  text-align: center;
  padding: 40px;
  color: var(--muted);
}

/* Support card */
.faq-support-card {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px 28px;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  background: var(--amber-soft);
  border-color: var(--red-line);
}
.support-left {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 500px;
}
.support-avatar {
  font-size: 36px;
  flex-shrink: 0;
}
.support-left h3 {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
}
.support-left p {
  font-size: 13.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}
.support-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.tel-btn, .zalo-btn {
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 18px;
  border-radius: 999px;
}
.zalo-btn {
  background: var(--pay-zalo);
  border-color: var(--pay-zalo);
  color: var(--text-on-primary);
}
</style>
