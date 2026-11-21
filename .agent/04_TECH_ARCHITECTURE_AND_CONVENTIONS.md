# 04. KIẾN TRÚC KỸ THUẬT & QUY CHUẨN LẬP TRÌNH (TECH SPEC)

> **Tài liệu đặc tả toàn bộ ngăn xếp công nghệ, kiến trúc Multi-Page App, quy chuẩn mã nguồn, kiểm thử và cấu trúc thư mục dự án.**
> Phiên bản: V2.3 (backend thật) | Cập nhật: 22/11/2026 | Tech Lead: Nguyễn Công Khôi
> Repository: `github.com/movafresh-vn/movafresh-web` | Branch: `feat/v2-customer-and-ops-apps`
> Production URL: `https://movafresh-web.netlify.app`

---

## 1. TECH STACK V2.3 HIỆN TẠI

- **Kiến trúc ứng dụng:** **Multi-Page Application (MPA)** đóng gói 2 app riêng biệt trong cùng 1 repository:
  1. **App Khách hàng (`index.html`):** Sử dụng `vue-router` chế độ HTML5 History (`createWebHistory`), gồm Landing Page (`/`), Phễu onboarding khảo sát & đăng ký gói (`/plans`), Bảng điều khiển tài khoản & thực đơn (`/account`), và Cổng tra cứu nguồn gốc nông sản theo lô (`/q/:code`).
  2. **App Vận hành (`ops.html`):** Ứng dụng nội bộ cho 8 vai trò (workshop, hub, dispatch, purchasing, supplier, shipper, accounting, admin), đăng nhập email + mật khẩu Supabase, quyền lấy từ `GET /ops/me`, hash router (`#/xuong`, `#/kho`, `#/ke-hoach`, `#/mua-hang`, `#/nha-cung-cap`, `#/logistics`, `#/giao-hang`, `#/tai-chinh`, `#/tong-quan`).
- **Frontend Framework:** **Vue 3** (100% sử dụng **Composition API** với cú pháp `<script setup>`).
- **Build Tool:** **Vite 6** (`@vitejs/plugin-vue`) với cấu hình `rollupOptions.input` đa cổng vào (`main` & `ops`).
- **Backend:** web gọi `movafresh-platform/backend` (Hono + Supabase/Postgres) qua `/api/v2`; **không còn mock-server** và không còn kho dữ liệu trong trình duyệt. Xem mục 4.
- **State Management:** **Pinia** cho trạng thái giao diện; `localStorage`/`sessionStorage` chỉ giữ phiên, bản nháp thực đơn `/plans` và hàng đợi offline của xưởng. Dữ liệu nghiệp vụ luôn đọc lại từ máy chủ (ops dùng polling `useLive` 6 giây).
- **Test Runner:** **Vitest** (`npm test`), chạy không cần backend: test client HTTP, bảng route (đối chiếu với mã nguồn backend), adapters, quét tĩnh async và logic thuần. Tên file theo nhóm `w1*` (client/đăng nhập/đồng hồ), `w2*` (phễu `/plans`), `w3*` (tài khoản), `w4*–w9*` (vận hành). Mã test: `W<nhóm>-NN`. Luồng thật đầu-cuối chạy ở backend (`npm run smoke:e2e`).
- **Styling:** CSS thuần hiện đại (Modern Vanilla CSS) dựa trên hệ thống biến toàn cục `:root` đặt tại `src/assets/styles/main.css` và `src/ops/styles/ops.css`.
- **Deployment & CI/CD:**
  - Repo GitHub: [`github.com/movafresh-vn/movafresh-web`](https://github.com/movafresh-vn/movafresh-web).
  - Nhánh phát triển V2 chính thức: **`feat/v2-customer-and-ops-apps`**.
  - Hosting: **Netlify** liên kết CI/CD với nhánh `feat/v2-customer-and-ops-apps`, production URL: [https://movafresh-web.netlify.app](https://movafresh-web.netlify.app).
  - Biến môi trường (công khai, `.env.example`): `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_TOOLS` (chỉ bật ở máy local để hiện bảng demo). Tuyệt đối không đưa khóa service-role, khóa Gemini hay `AI_ENGINE_TOKEN` vào web.

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) & QUY CHUẨN GIAO DIỆN

Hệ thống giao diện của MOVA Fresh được thiết kế theo trường phái **Warm Light Mode** (ấm cúng, sạch sẽ, mang hơi thở thiên nhiên và mâm cơm gia đình):

### A. Bảng mã màu chủ đạo (CSS Variables)
Định nghĩa tại `src/assets/styles/main.css`:

```css
:root {
  --bg: #FAF9F5;          /* Nền tổng thể: Trắng ngà ấm */
  --card: #FFFFFF;        /* Nền thẻ nội dung */
  --line: #E6E2D6;        /* Đường kẻ viền phân cách */
  --ink: #1E241D;         /* Màu chữ chính: Đen rêu than đậm */
  --muted: #626B60;       /* Chữ phụ, mô tả */
  
  /* Màu thương hiệu & Điểm nhấn */
  --green: #146C43;       /* Xanh lá đậm nông sản Tây Nguyên (Primary Action, Brand) */
  --green-d: #0F5534;     /* Xanh lá đậm khi hover button */
  --green-soft: #E4F0E8;  /* Nền xanh nhạt cho badge, tag */
  --orange: #D9531E;      /* Cam gốm / ớt lửa (Accent, CTA nổi bật) */
  --orange-soft: #FCEDE4; /* Nền cam nhạt */
  --orange-ink: #A33C12;  /* Chữ cam đậm */
  
  /* Màu hỗ trợ ẩm thực */
  --wood: #E9D9BF;        /* Màu gỗ tự nhiên */
  --butter: #FBF1D6;      /* Vàng bơ béo ngậy */
  --red: #B3261E;         /* Đỏ cảnh báo */
  --blue: #1D6FA5;        /* Xanh dương thông tin vận chuyển */
}
```

### B. Typography & Định dạng số
- **Font chữ chính:** `"Be Vietnam Pro", system-ui, -apple-system, sans-serif`. Nạp trực tiếp qua Google Fonts tại `index.html` và `ops.html`.
- **Hiển thị tiền tệ:** Mọi con số liên quan đến tài chính, tiền tệ, số lượng bữa ăn **BẮT BUỘC** có:
  ```css
  font-variant-numeric: tabular-nums;
  ```
- **Hàm format tiền tệ chuẩn:** Luôn dùng `fmt(amount)` trong `src/shared/utils/formatters.js` để hiển thị `1.500.000 đ`.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN THỰC TẾ (PROJECT DIRECTORY TREE)

```
movafresh-web/
├── .agent/                             # Tài liệu nghiệp vụ, kiến trúc & roadmap cho AI
├── AGENTS.md, README.md                # Chỉ thị khởi động + cách chạy stack local
├── index.html, ops.html                # Entry HTML của 2 app
├── netlify.toml                        # Netlify redirects (/ops -> /ops.html, /* -> /index.html)
├── .env.example                        # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEV_TOOLS
├── vite.config.js                      # Vite build đa cổng vào + Vitest
└── src/
    ├── main.js, App.vue, router/       # App khách
    ├── stores/                         # Pinia: usePlanFlowStore, useMovaStore (phiên OTP, thông báo)
    ├── views/, components/             # Màn khách (plans/, dashboard/, common/, store/)
    ├── services/                       # supabase.js (Auth), aiApi.js (gợi ý thực đơn qua backend)
    ├── ops/                            # App vận hành
    │   ├── main.js, App.vue, router.js # Khôi phục phiên (restoreStaff) rồi mới dựng router
    │   ├── session.js, guard.js        # Phiên nhân viên từ GET /ops/me; can(permission); chặn route theo vai trò
    │   ├── useLive.js, live.js         # Poller 6 giây: không chồng yêu cầu, tạm dừng khi tab ẩn
    │   ├── queue.js, queuePhotos.js    # Hàng đợi offline của xưởng (tải ảnh trước, gửi lại theo opId)
    │   └── views/                      # workshop/, hub/, logistics/, purchasing/, supplier/, shipper/, finance/, LatePaymentsView, PlanView, ...
    └── shared/
        ├── api/                        # http.js, routes.js, opsRoutes.js, customerApi.js, opsApi.js, devApi.js, adapters/, uploads.js, index.js
        ├── config/                     # business.js (hằng hiển thị), roles.js (nhãn vai trò)
        ├── data/                       # Dữ liệu hiển thị tĩnh còn lại (catalog, packaging, recipes, sources); nguồn sự thật nghiệp vụ là backend
        ├── domain/                     # Hàm thuần (định dạng, tính hiển thị, hàng đợi offline); không giữ trạng thái
        ├── utils/                      # time.js (giờ VN + serverNow), formatters.js (fmt), qr.js
        └── __tests__/                  # Vitest
```

---

## 4. KẾT NỐI BACKEND THẬT (V2.3)

### A. Lớp gọi API (`src/shared/api/`)
- `http.js`: client duy nhất. Gắn `Authorization: Bearer` lấy từ Supabase, tự thêm `Idempotency-Key` cho POST/PUT/PATCH/DELETE (truyền `key` để thử lại đúng một lệnh), bóc phong bì `{status:'success', data}`, ném `HttpError {code,status,details}` (`NETWORK_ERROR` khi mất mạng). Tải file: `as:'text'|'blob'|'download'` (CSV có header `X-Count`...).
- `routes.js` (app khách) và `opsRoutes.js` (app vận hành): bảng phẳng "tên hàm → [HTTP, đường dẫn]". Test (`w1Routes`, `w4Routes`) đối chiếu từng dòng với `movafresh-platform/backend/src/routes` và `docs/api-contract.json`, nên thêm dòng mà backend chưa có là test đỏ. Id có ký tự đặc biệt (ví dụ id tuyến `<batch>:<slot>:<route>`) phải `encodeURIComponent`.
- `customerApi.js` (`api.customer.*`): giữ phong bì `{status:'success'|'error', data|error}` để các kiểm tra `errorKind` cũ chạy tiếp. `opsApi.js` (`api.ops.*`): ném `HttpError`; tham số `ctx` chỉ để tương thích (danh tính do JWT quyết định). `adapters/` đổi dạng backend sang dạng màn hình dùng và có test riêng với payload mẫu từ hợp đồng.
- `devApi.js`: `/dev/*` (đồng hồ, job, dữ liệu mẫu, chuyển khoản giả); chỉ hiện khi `VITE_DEV_TOOLS=true`.

### B. Quy tắc bất đồng bộ
- Mọi hàm API trả Promise. Phải `await` trong store/composable/handler; không đọc kết quả đồng bộ trong `computed` hay template (đưa vào `ref` sau khi tải). Test quét tĩnh (`w2AsyncScan`, `w3AsyncScan`, `w4–w8 AsyncScan`) kiểm các file đã chuyển.
- Số tiền, giá, giảm giá, sức chứa còn lại, lịch trừ tiền lấy từ máy chủ (`/subscription/preview`, `available-slots`); không tự tính để hiển thị.
- Màn đọc dữ liệu trực tiếp dùng `useLive(fn, {every})`; `fn` chỉ ĐỌC. Không "tick" job ở trình duyệt.

### C. Phiên và quyền
- Khách: Supabase SĐT + OTP (`services/supabase.js`, store `useMovaStore`); không còn tài khoản mẫu hay đăng nhập mạng xã hội.
- Nhân viên: `loginStaff(email, mật khẩu)` rồi `GET /ops/me` (vai trò, trang chủ, quyền, `shipper_id`/`supplier_id`). Tải lại trang thì `restoreStaff()` hỏi lại máy chủ. `can(permission)` chỉ để ẩn nút; máy chủ luôn kiểm lại. Router guard dùng vai trò của từng module và `meta.roles` của màn con.
- Giờ: `syncServerTime(iso)` được gọi mỗi khi `summary` trả về; mọi nơi cần "bây giờ" dùng `serverNow()` (`src/shared/utils/time.js`).

### D. Ảnh và hàng đợi offline
- Ảnh nhiệt độ/nhận hàng/xuất xe/bằng chứng giao: xin vé `POST /ops/uploads` (một lần, gắn một mục đích) → tải lên → gửi ĐƯỜNG DẪN trong thao tác. Máy chủ từ chối ảnh nhúng (data URL).
- Hàng đợi offline xưởng (`src/ops/queue.js`, `queuePhotos.js`, `shared/domain/offlineQueue.js`): ảnh nằm trong hàng đợi dạng data URL; khi có mạng, tải ảnh lên trước, thay `photo` bằng đường dẫn, rồi phát lại thao tác theo `opId` (máy chủ khử trùng). Nếu ảnh lên được mà gửi lỗi, lần thử sau dùng lại đường dẫn đã có.

### E. Chạy và kiểm
- Chạy stack local và tài khoản thử: `README.md` (`npm run stack:up` ở `movafresh-platform/backend`, rồi seed, backend dev, web dev).
- Trước khi coi là xong: `npm test` và `npm run build` (cả `index.html` và `ops.html`) qua; luồng thật chạy tay trên stack (checklist ở `.agent/05_PROGRESS_AND_ROADMAP.md`).
