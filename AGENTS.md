# MOVA FRESH — AGENT RUNTIME & SYSTEM DIRECTIVES

> **TÀI LIỆU KHỞI ĐỘNG BẮT BUỘC CHO MỌI AI AGENT TRƯỚC KHI THỰC THI BẤT KỲ TÁC VỤ NÀO.**
> Cập nhật lần cuối: 19/11/2026 | Phiên bản kiến trúc: V2.3 (backend thật, Meeting 17/11 Fine-Tuning Sync)
> Repository chính thức: `github.com/movafresh-vn/movafresh-web` | Nhánh: `feat/v2-customer-and-ops-apps`
> Production URL: `https://movafresh-web.netlify.app`

---

## 1. CHỈ THỊ KHỞI ĐỘNG (BOOT SEQUENCE)

Mọi AI Agent (Gemini, Claude, GPT, Cursor, Roo, v.v.) khi được kích hoạt trong repository này **BẮT BUỘC** phải đọc và tải vào ngữ cảnh toàn bộ 6 tài liệu trong thư mục `.agent/` theo đúng thứ tự sau trước khi thực hiện phân tích, đề xuất tính năng hay chỉnh sửa bất kỳ dòng code nào:

1. [`.agent/01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md`](file:///.agent/01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md): Linh hồn sản phẩm, mô hình dòng tiền FinTech 2 đầu, Unit Economics chuẩn V2.2 (Nguyên liệu + Vận chuyển $\le 50\%$).
2. [`.agent/02_USER_FLOW_AND_UX_SPEC.md`](file:///.agent/02_USER_FLOW_AND_UX_SPEC.md): Đặc tả luồng người dùng V2.2 (Khảo sát Đầu bếp MOVA, Mâm cơm Việt 5 món, Terroir đặc sản, Subscription 4 tuần, OTP SĐT & Khung giờ xanh).
3. [`.agent/03_OPERATIONS_FACTORY_AND_AGENTS.md`](file:///.agent/03_OPERATIONS_FACTORY_AND_AGENTS.md): Vận hành nhà máy Đắk Lắk, kho phụ TP.HCM, quy cách đóng gói, Dashboard sản xuất `/ops.html` (8 vai trò, đăng nhập email + mật khẩu) & hệ sinh thái AI Agents.
4. [`.agent/04_TECH_ARCHITECTURE_AND_CONVENTIONS.md`](file:///.agent/04_TECH_ARCHITECTURE_AND_CONVENTIONS.md): Kiến trúc Multi-Page App (MPA: `index.html` & `ops.html`), Vue 3 + Pinia, `src/shared/`, lớp gọi backend thật (`http.js` + bảng route + adapters, KHÔNG còn mock), bộ unit test Vitest, quy chuẩn UI/UX, cách chạy stack local.
5. [`.agent/05_PROGRESS_AND_ROADMAP.md`](file:///.agent/05_PROGRESS_AND_ROADMAP.md): Bảng theo dõi tiến độ V1 $\rightarrow$ V2.2, các mốc hoàn thành và 4 đầu việc tiếp theo trước mốc Launch T12/2026.
6. [`.agent/06_MEETING_DECISIONS_LOG.md`](file:///.agent/06_MEETING_DECISIONS_LOG.md): Biên bản các quyết định chiến lược đã chốt ngày 15/11/2026 và ngày 17/11/2026 của Ban sáng lập (không tranh luận lại).

---

## 2. TUYÊN NGÔN CỐT LÕI (CORE MANTRA)

> ### ⚠️ MOVA FRESH KHÔNG PHẢI LÀ SÀN E-COMMERCE BÁN LẺ THỰC PHẨM!
> **MOVA Fresh là mô hình FINTECH KINH DOANH DÒNG TIỀN (Cash-Flow Business) kết hợp MEAL-KIT SUBSCRIPTION DO ĐẦU BẾP TUYỂN CHỌN.**

- **Nguyên tắc dòng tiền tối thượng:** 
  $$\text{Tiền của khách hàng phải vào trước 100\%} \quad \times \quad \text{Công nợ với nhà máy \& nhà cung cấp trả sau}$$
- Khách hàng trả tiền trước thông qua:
  - **Fresh Credit** (thưởng nạp thường xuyên khoảng 10%; ưu đãi chu kỳ đầu có trần tổng).
  - Hoặc **Subscription trọn gói 4 tuần** (hoặc cơ chế tự động trừ thẻ tín dụng trước ngày giao **72 tiếng**).
- Nhà máy và nhà cung cấp nguyên liệu nhận thanh toán theo kỳ công nợ đàm phán gối đầu (Net 15–30 ngày). Mô hình này tạo ra **Dòng tiền vận hành luôn dương (Positive Operating Cash Flow)** và triệt tiêu rủi ro tồn kho nông sản.

---

## 3. DANH SÁCH CẤM TUYỆT ĐỐI (STRICT ANTI-PATTERNS)

Mọi dòng code, UI component, API logic hoặc kịch bản trải nghiệm vi phạm một trong 9 điều cấm sau đây sẽ bị **REJECT NGAY LẬP TỨC**:

| # | Điều cấm | Lý do chiến lược & Quy chuẩn bắt buộc |
|---|---|---|
| ❌ 1 | **CẤM THANH TOÁN KHI NHẬN HÀNG (ZERO COD)** | COD phá hủy dòng tiền, tạo tỷ lệ hủy đơn (boom hàng) và phát sinh hàng hư hỏng hoàn về. 100% đơn hàng phải được thanh toán trước qua Fresh Credit, thẻ tín dụng hoặc chuyển khoản định kỳ. |
| ❌ 2 | **CẤM TƯ DUY SÀN TMĐT VỚI "ĐƠN TỐI THIỂU 250K" & FREESHIP PROGRESS BAR** | Không bao giờ code thanh tiến trình freeship `250k -> 400k -> 600k`. MOVA Fresh bán giải pháp dinh dưỡng theo gói tuần/tháng, phí vận chuyển đã được tối ưu vào cấu trúc gói hoặc điều phối theo cung giờ cố định. |
| ❌ 3 | **CẤM BÁN LẺ TỪNG TUẦN RỜI RẠC** | Bắt buộc khách hàng tham gia Subscription tối thiểu **4 tuần** (1 tháng). Không chấp nhận mô hình "thích thì mua 1 tuần rồi nghỉ". Nếu khách dùng thử, ưu đãi trải nghiệm chỉ áp dụng trong cấu trúc cam kết dài hạn có thể pause/skip. |
| ❌ 4 | **CẤM DÙNG TỪ "VÍ ĐIỆN TỬ"** | Tuân thủ tuyệt đối **Nghị định 52/2024/NĐ-CP** về thanh toán không dùng tiền mặt. Hệ thống không giữ giấy phép ví điện tử trung gian thanh toán. Thuật ngữ duy nhất được phép hiển thị trên UI và code: **Fresh Credit** hoặc **Điểm bữa ăn trả trước**. |
| ❌ 5 | **CẤM ĐỊNH VỊ "GIÁ RẺ" ĐUA XUỐNG ĐÁY VỚI SIÊU THỊ** | MOVA không cạnh tranh giá với Bách Hóa Xanh hay WinMart. Mọi mức giá phải phản ánh giá trị: sơ chế sẵn 100%, định lượng chuẩn xác theo thể trạng, công thức chuẩn ngon, tiết kiệm 2 tiếng đi chợ - nấu nướng mỗi ngày. Ràng buộc: Tổng Nguyên liệu + Vận chuyển $\le 50\%$ giá bán, Gross Margin duy trì **20% – 30%**, Net Margin mục tiêu **~30%**. |
| ❌ 6 | **CẤM HIỂN THỊ HƯỚNG DẪN BẢO QUẢN NGĂN MÁT / ĐÔNG TRÊN WEB KHÁCH** | Không làm rối giao diện người dùng bằng các badge hoặc text hướng dẫn bảo quản phức tạp. Quy trình sản xuất tại nhà máy Đắk Lắk đã chuẩn hóa: dán nhãn sticker màu phân loại Ngăn mát / Ngăn đông trực tiếp lên khay nguyên liệu. |
| ❌ 7 | **CẤM ĐƯA GIA VỊ BẾP CƠ BẢN VÀO GÓI NGUYÊN LIỆU** | Không đóng gói nước mắm, muối, đường, hạt nêm, dầu ăn thông thường vào meal-kit (gây lãng phí bao bì, rách vỡ, đội chi phí đóng gói). Nhà máy chỉ cung cấp: Thịt, Cá, Rau củ sơ chế, Tinh bột, Trái cây và **Gói xốt MOVA đặc biệt**. Mọi căn bếp Việt đều có sẵn gia vị cơ bản. |
| ❌ 8 | **CẤM DÙNG TỪ KHÓA "AI" TRÊN GIAO DIỆN NGƯỜI DÙNG CUỐI** | Toàn bộ copywriting hướng tới khách hàng (Landing, `/plans`, `/account`) phải dùng **"Đầu bếp" (Chef)**: *"Thực đơn Đầu bếp thiết kế riêng"*, *"Đầu bếp MOVA tuyển chọn"*. (Thư mục kỹ thuật backend trên platform vẫn là `ai-engine/`, nhưng mặt hiển thị khách tuyệt đối không gọi là AI). |
| ❌ 9 | **CẤM DÙNG TÊN ĐỐI THỦ "HELLOFRESH" TRÊN GIAO DIỆN NGƯỜI DÙNG** | Tuyệt đối không để lộ từ khóa "HelloFresh" trên giao diện khách hàng, copywriting hay marketing. Phải dùng tên thương hiệu chính thức: **MOVA Fresh**, **Gói 4 tuần của bạn**, **Thẻ quà tặng MOVA Fresh**. |

---

## 3B. QUY TẮC KIẾN TRÚC KHI LÀM VIỆC VỚI BACKEND THẬT (V2.3)

Web **không còn máy chủ giả**. Mọi trạng thái, số tiền, sức chứa và quyền do `movafresh-platform/backend` quyết định; chi tiết ở `.agent/04_TECH_ARCHITECTURE_AND_CONVENTIONS.md` mục 4 và `README.md` (cách chạy stack local bằng `npm run stack:up`).

1. **Một cửa gọi API:** chỉ qua `src/shared/api/` (`http.js`, `routes.js`, `opsRoutes.js`, `adapters/`). Không `fetch` rải rác trong component; không thêm đường gọi mà backend chưa có (test `w1Routes`/`w4Routes` sẽ đỏ).
2. **Mọi lệnh gọi là bất đồng bộ:** `await` đủ ở store, view và composable. Cấm đọc `api.customer.x(...).data` đồng bộ; các test quét tĩnh (`w2AsyncScan`, `w3AsyncScan`, `w4–w8 AsyncScan`) bắt lỗi này.
3. **Số tiền chỉ lấy từ máy chủ:** giá, giảm giá, khung giờ xanh, giới thiệu, lịch trừ tiền hiển thị từ `POST /subscription/preview`; web KHÔNG tự tính số tiền để hiển thị hay gửi. Mọi dữ liệu tiền là số nguyên VND, định dạng bằng `fmt()`.
4. **Lỗi nghiệp vụ theo mã hợp đồng** (`docs/api-contract.json`): app khách giữ phong bì `{status:'success'|'error'}`; app vận hành bắt `HttpError {code,status,details}`. Hiển thị thông báo tiếng Việt theo `code` (ví dụ `CYCLE_FULL`, `BATCH_LOCKED`, `PHOTO_REQUIRED`), không hiện thông báo thô của máy chủ.
5. **Danh tính nằm ở Supabase JWT:** khách đăng nhập SĐT + OTP, nhân viên đăng nhập email + mật khẩu rồi lấy vai trò/quyền từ `GET /ops/me` (`src/ops/session.js`). Không còn mã PIN, không truyền `customerId`/`ctx` có ý nghĩa nào. Ẩn nút theo `can(permission)` chỉ để tiện, quyền thật luôn do máy chủ kiểm.
6. **Giờ nghiệp vụ theo máy chủ:** dùng `serverNow()` và `syncServerTime()` trong `src/shared/utils/time.js`; không tự suy giờ chốt sổ từ giờ máy. Không chạy "tick" ở trình duyệt: job chạy ở máy chủ (khi dev: bảng demo gọi `/dev/jobs/run`).
7. **Ảnh (nhiệt độ, nhận hàng, bằng chứng giao):** tải lên bằng vé một lần (`POST /ops/uploads`) rồi chỉ gửi ĐƯỜNG DẪN; không gửi data URL tới thao tác nghiệp vụ. Hàng đợi offline của xưởng tải ảnh trước rồi phát lại thao tác theo `opId`.
8. **Không có kho dữ liệu cục bộ:** `localStorage`/`sessionStorage` chỉ giữ phiên, bản nháp thực đơn, hàng đợi offline. Không dựng lại mock-server, `createMemoryStorage` hay dữ liệu giả trong `src/`.
9. **Bảng demo (`/demo`) chỉ ở bản dev:** build với `VITE_DEV_TOOLS=true` và backend `DEV_TOOLS_ENABLED=true`; không bao giờ bật ở production.
10. **Xác nhận trước khi coi là xong:** `npm test` và `npm run build` đều qua; luồng thật cần chạy tay trên stack local (xem checklist ở `.agent/05_PROGRESS_AND_ROADMAP.md`).

---

## 4. TÓM TẮT BỘ CHỈ SỐ VẬN HÀNH (NORTH STAR METRICS)

- **Hook chuyển đổi cốt lõi:** Giữ nguyên cam kết **"15 phút"** (Mâm cơm 5 món trong 15 phút — 1 chảo) trên Landing Page và Video Hero để tối đa hóa tỷ lệ chuyển đổi (không nới lỏng thành 15–30 phút).
- **Quy tắc hiển thị giá song song:** Luôn hiển thị song song đơn giá theo **bữa** (cả hộ gia đình) và quy đổi theo **suất** (1 người ăn: `~...đ/suất • ...đ/bữa`) trên toàn bộ phễu `/plans`.
- **Cơ chế thưởng giới thiệu 100k (Referral Dual-Benefit):**
  + Người được mời: Giảm trực tiếp **`100.000đ`** vào đơn đầu tiên (áp dụng trên cả 3 phương thức: Fresh Credit, Chuyển khoản VietQR, Thẻ tín dụng; tuân thủ trần ưu đãi chu kỳ đầu).
  + Người giới thiệu: Nhận ngay **`+100.000đ` vào ngăn `promo` tài khoản Fresh Credit** sau khi đơn đầu tiên của bạn bè thanh toán thành công.
- **Subscription Length:** Tối thiểu 4 tuần.
- **Auto-debit / Charge cutoff:** Trước giờ giao 72 tiếng.
- **Dish customization cutoff:** Giờ chốt sổ nhà máy của chuyến giao (mặc định **08:00 ngày D-2**, cấu hình được). Giao diện luôn hiện ngày giờ cụ thể, **tuyệt đối không ghi "8 tiếng trước giờ giao"**.
- **Unit Economics Target:** 
  + $\text{Nguyên liệu} + \text{Vận chuyển} \le 50\%$ giá bán lẻ.
  + Hệ số giá vốn trực tiếp tối đa: **55%** (gồm bao bì thùng cách nhiệt 14k + ship nội thành 25k = 39k/lần giao = 6.5k/bữa).
  + Opex & MKT: **15%**.
  + Lợi nhuận ròng mục tiêu (**Target Net Margin**): **~30%** (Gross Margin 20% – 30%).
- **Terroir & Storytelling:** 100% món ăn gắn xuất xứ đặc sản vùng miền (Đắk Lắk, Chư Sê, Buôn Đôn, Đà Lạt, Biển Vũng Tàu, Sóc Trăng...).
- **Quy chuẩn tráng miệng:** Bỏ hoàn toàn Bơ sáp 034 (lích kích sơ chế); ưu tiên chuối tiêu chín cây và **Vải thiều cấp đông nhanh IQF** (quay vi sóng 1 phút tươi 90%).
- **Target Customer Retention Rate (Month 2+):** $\ge 50\%$.
- **Operating Target:** Tối đa hóa tỷ lệ $\frac{\text{Doanh thu}}{\text{Nhân sự vận hành}}$ bằng hệ sinh thái AI Agents & quy trình tự động hóa.
- **Mốc Launch Sản Phẩm Thật:** **Tháng 12/2026**.

---

---

## 5. BẢNG PHÂN LOẠI PHÁP LÝ ĐỎ / VÀNG / XANH & KIẾN TRÚC DÒNG TIỀN 4 TẦNG (LEGAL & GREEN ACCOUNTING SYNC)

### A. Bảng phân loại Pháp lý Đỏ / Vàng / Xanh:

| Nhóm | Phân loại & Ràng buộc | Căn cứ pháp lý | Quy chuẩn thực thi tại MOVA Fresh |
|---|---|---|---|
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm ví điện tử tự phát** | **Nghị định 52/2024/NĐ-CP** (Thanh toán không dùng tiền mặt) | MOVA không giữ giấy phép ví trung gian thanh toán. Xóa bỏ 100% chữ "Ví" trên UI khách; cấm nạp/rút/chuyển tiền tự do. |
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm huy động vốn & Trả lãi trên số dư chờ** | **Luật Các TCTD 32/2024/QH15** (Tổ chức tín dụng) | Cấm ghi "lãi", cấm "thưởng nạp kiểu ngân quỹ". Chỉ dùng: *"Ưu đãi chiết khấu khi mua Gói Suất ăn trả trước"*. Tắt hoàn toàn ô nhập nạp tiền lẻ tự do (`minTopUpVnd`). |
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm bẫy gia hạn âm thầm & Giữ cọc không cho rút** | **Luật BVQLNTD 19/2023/QH15** (Bảo vệ người tiêu dùng) | Cấm âm thầm auto-renew gói lớn. Báo trước **7 ngày làm việc** trước khi hết gói. Cam kết **dừng gói 1 chạm** và **hoàn tiền trong 7 ngày làm việc** cho các bữa chưa giao. |
| 🟡 **VÀNG** (Điều kiện) | **Lập hóa đơn GTGT từng lần giao hàng** | **Nghị định 254/2026/NĐ-CP** Điều 9 khoản 1, 3 | Suất ăn là hàng hóa thực phẩm giao định kỳ, xuất hóa đơn điện tử cho từng lần giao hàng thực tế. Cấu hình hệ thống `invoicing.issueOn = 'delivery'`. |
| 🟡 **VÀNG** (Điều kiện) | **Tài khoản trả trước đóng kín nội bộ** | **Nghị định 52/2024/NĐ-CP** | Điểm Fresh Credit chỉ được dùng để đổi suất ăn tại MOVA Fresh, không chuyển nhượng sang tài khoản khác. |
| 🟢 **XANH** (Chuẩn hóa) | **Gói Suất ăn trả trước (Pre-paid meal package)** | **Thông tư 99/2025/TT-BTC** (Chế độ kế toán DN 2026) | Hạch toán khách trả trước: Nợ 112 / Có 131; Giao từng lần: Nợ 131 / Có 511, Có 33311. Tiền nhàn rỗi là vốn lưu động hợp pháp. |
| 🟢 **XANH** (Chuẩn hóa) | **Phí hội viên năm MOVA Club (Membership)** | **Thông tư 99/2025/TT-BTC** | Hạch toán doanh thu chưa thực hiện: Nợ 112 / Có 3387; phân bổ hàng tháng vào 511. |
| 🟢 **XANH** (Chuẩn hóa) | **Trừ tiền định kỳ qua cổng thẻ / ví đối tác** | **Nghị định 52/2024/NĐ-CP** | Tận dụng hạ tầng ví đối tác đã cấp phép (MoMo, ZaloPay, VNPAY, Cổng thẻ quốc tế) kèm cam kết khách hủy 1 chạm bất kỳ lúc nào. |

### B. Kiến trúc dòng tiền 4 tầng (4-Layer Cash Flow Architecture):

1. **Tầng `D` — Nền tảng bắt buộc (Foundational Mandatory):**
   - Trừ thẻ định kỳ trước giờ giao 72 tiếng / Liên kết ví đối tác (MoMo, ZaloPay, VNPAY).
   - Zero rủi ro pháp lý theo NĐ 52/2024, đáp ứng khách hàng muốn trải nghiệm linh hoạt nhưng vẫn đảm bảo tiền vào trước khi nhà máy sản xuất.
2. **Tầng `A` — Dòng tiền trả trước (Pre-paid Meal Float):**
   - Bán Gói Suất ăn trả trước 4 tuần hoặc 13 tuần cố định (hạch toán TK 131), ưu đãi chiết khấu tặng bữa.
   - Cam kết hoàn tiền 100% tiền thật các bữa chưa giao trong vòng **7 ngày làm việc** khi dừng gói giữa chừng.
3. **Tầng `C` — Đường ống thu hộ (Collection Pipelines):**
   - VietQR tĩnh và động kết nối trực tiếp với cổng thanh toán đối tác, tiền về thẳng tài khoản ngân hàng của Công ty MOVA Fresh.
4. **Tầng `B` — Giá trị gia tăng tùy chọn (Optional Addons):**
   - Thẻ hội viên VIP năm (MOVA Club - TK 3387 phân bổ đều 12 tháng), thẻ quà tặng sinh nhật, voucher B2B cho doanh nghiệp.

---

*Mọi thắc mắc kỹ thuật và nghiệp vụ, hãy đối chiếu trực tiếp với các tài liệu chi tiết tại `.agent/`.*
