# MOVA FRESH — Web-App Khách Hàng & Vận Hành (Vue 3 + Vite + Pinia)

> Nền tảng đặt thực đơn nguyên liệu sơ chế sẵn (**Ready-to-Cook - RTC**) do **Đầu bếp MOVA tuyển chọn**, kết nối trực tiếp nông sản trù phú từ vùng nguyên liệu **Đắk Lắk & Tây Nguyên** cùng kho phụ trung chuyển TP.HCM. Nguyên liệu sơ chế sạch 100%, đóng thùng cách nhiệt đá gel vận chuyển xe lạnh xuyên đêm giao thẳng tới tận bếp tại **TP. Hồ Chí Minh** và vùng Đông Nam Bộ. Chuẩn bữa cơm nhà tươi ngon: **15 phút – 1 chảo**.
>
> 🌐 **Production URL:** [https://movafresh-web.netlify.app](https://movafresh-web.netlify.app)  
> 📦 **Repository chính thức:** `github.com/movafresh-vn/movafresh-web`  
> 🌿 **Nhánh phát triển V2:** `feat/v2-customer-and-ops-apps`

---

## 🌟 Tính Năng Cốt Lõi (V2.3: chạy trên backend thật)

> Từ V2.3 web **không còn máy chủ giả**: mọi dữ liệu, giá, sức chứa và trạng thái đơn do `movafresh-platform/backend` quyết định (Hono + Supabase/Postgres). Web chỉ hiển thị và gửi lệnh. Không có `localStorage` làm kho dữ liệu; trình duyệt chỉ giữ phiên đăng nhập, bản nháp thực đơn và hàng đợi offline của xưởng.

### 1. Web App Khách Hàng (`index.html`)
- **Trang chủ & Video Hook 10 giây:** `00:00 Mở hộp Đắk Lắk` → `00:05 Đảo 1 chảo & rưới xốt` → `00:15 Xong mâm cơm 5 món`.
- **Đăng nhập bằng SĐT + OTP (Supabase Auth):** không còn nút đăng nhập mạng xã hội hay tài khoản mẫu. Bản local dùng số thử có OTP cố định (xem mục "Tài khoản thử").
- **Phễu khảo sát Đầu bếp (`/plans`):** số người ăn (1–10), số bữa/tuần (3–7), nhu cầu thể trạng, kiêng cữ dị ứng (có ô tự nhập, máy chủ phân tích và **chặn món không an toàn: fail-closed**), phong cách ẩm thực. Bản nháp thực đơn nằm ở trình duyệt; mọi món được máy chủ kiểm lại khi xem giá và khi đăng ký.
- **Thực đơn Mâm cơm 5 món** và đổi món theo danh mục `GET /dishes` (Đạm, Canh, Rau, Tinh bột, Tráng miệng; huy hiệu vùng, định lượng theo số người, dinh dưỡng, 3 bước nấu 15 phút).
- **Thanh toán & giao hàng (Zero COD):**
  - **Mọi số tiền (giá, giảm giá, khung giờ xanh, giới thiệu, lịch trừ tiền) do máy chủ trả về** qua `POST /subscription/preview`; web không tự tính để hiển thị.
  - **Hướng dẫn giao bắt buộc chọn**, mặc định "Để ở lễ tân + shipper chụp ảnh" (`leave_at_reception`, bắt buộc ảnh); có ô **phường** (không bắt buộc) để gom tuyến.
  - **Số chỗ còn lại theo từng ngày giao** (khung giờ và chu kỳ sản xuất); ngày đã đầy không chọn được và hiện lý do (`SLOT_FULL`, `CYCLE_FULL`).
  - Phương thức: Fresh Credit (mua Gói Suất ăn trả trước cố định), chuyển khoản VietQR 4 tuần, thẻ liên kết (tự trừ trước 72 giờ). Voucher và thưởng giới thiệu theo luật của máy chủ.
- **Tài khoản (`/account`):** đổi món trước giờ chốt sổ (mặc định **08:00 ngày D-2**, cấu hình ở máy chủ, luôn hiện ngày giờ cụ thể), hoãn tuần, gia hạn có đồng ý rõ ràng, Fresh Credit 2 ngăn (`real` / `promo`), thưởng và chia sẻ, mời bạn. Thẻ tuần hiện **ảnh giao hàng** khi đã giao, hóa đơn, và huy hiệu **thanh toán muộn** (đang chờ admin / dời ngày / hoàn Fresh Credit).

---

### 2. Web App Vận Hành 8 Vai Trò (`ops.html`)
Đăng nhập **email + mật khẩu** (Supabase Auth); vai trò, trang chủ và danh sách quyền lấy từ `GET /ops/me`, nên menu và nút ẩn theo quyền còn máy chủ vẫn kiểm lại ở từng lệnh. Không còn mã PIN. Dữ liệu khách chỉ hiện đúng mức vai trò được phép.

| Vai trò (email local, đều @staff.movafresh.local) | Làm gì |
|---|---|
| `workshop` Xưởng Đắk Lắk (workshop@) | Hôm nay làm bao nhiêu, nhận nguyên liệu (ảnh + mã lô), đóng gói, **in nhãn thùng (Order_Code, Batch_ID, Route_ID, Lot_IDs, không có tên khách)**, **nhập hiệu suất thực tế (lệch >5% bị cờ)**, xuất xe (**bắt buộc nhiệt độ + ảnh**), báo thiếu/hỏng, **hoàn tiền thiếu hàng hàng loạt (xem trước rồi xác nhận)**. Hàng đợi offline: ảnh tải lên trước, rồi gửi lại thao tác theo `opId`. |
| `hub` Kho phụ TP.HCM (hub@) | Nhận hàng, tồn kho FEFO, truy xuất lô (liệt kê mọi đơn bị ảnh hưởng), thu hồi lô, nhận xe lạnh (**cần ảnh dỡ hàng**), ghép hải sản, chia tuyến, xuất kho. |
| `dispatch` Điều phối (dispatch@) | Kế hoạch & chốt sổ, **nút chốt sổ một chạm** (chốt sớm cần lý do), **tải lệnh mua tổng CSV**, bảng sức chứa và **3 giới hạn chu kỳ** (xưởng, xe theo hộp, xe theo kg), chuyến xe, lập tuyến, ngoại lệ giao, chuỗi lạnh, chi phí và KPI. |
| `purchasing` Mua hàng (purchasing@) | Nhà cung cấp, SKU, bảng giá (cảnh báo món vượt 35% giá vốn), dự báo, PO (duyệt, gửi, đối chiếu 3 chiều, trả), mua trực tiếp, công nợ, thẻ điểm nhà cung cấp. |
| `supplier` Cổng nhà cung cấp (s-factory@, s-seafood@, s-truck@, s-lastmile@, s-pack@) | Xác nhận PO, hóa đơn, trả lời khiếu nại; chỉ thấy dữ liệu của chính nhà cung cấp đó. |
| `shipper` Giao hàng (shipper1@ đến shipper4@) | Điểm dừng của tuyến mình, gọi khách (SĐT che một phần), đã giao (**ảnh bằng chứng theo hướng dẫn giao**) / không giao được (mở ngoại lệ). |
| `accounting` Kế toán (accounting@) | Sổ Fresh Credit, đề nghị điều chỉnh, đối soát ngân hàng, doanh thu và hóa đơn, giá vốn và margin, công nợ và pay-run, dòng tiền, xuất bút toán CSV, **bảng giá vốn món (cờ đỏ >35%)**. |
| `admin` Quản trị (admin@) | Tổng quan founder, **hàng đợi thanh toán muộn** (nhận vào lô còn khóa hoặc từ chối: dời ngày / hoàn Fresh Credit, khách được báo), duyệt điều chỉnh, ô **toàn vẹn sổ cái** (xanh khi sổ cái khớp số dư), bảng dev. |

Màn "Bảng demo" (`/demo`): đồng hồ máy chủ giả lập (nhảy tới giờ trừ tiền / chốt sổ / giao), chạy job, nạp dữ liệu mẫu, chuyển khoản ngân hàng giả có chữ ký. **Chỉ hiện khi build với `VITE_DEV_TOOLS=true` ** và backend bật `DEV_TOOLS_ENABLED=true`; không bao giờ ở production.

---

## 📊 Ràng Buộc Kinh Tế Đơn Vị (Unit Economics V2.2)

- **Ràng buộc cốt lõi:**
  $$\text{Tổng chi phí Nguyên liệu} + \text{Vận chuyển} \le 50\% \text{ giá bán lẻ}$$
- **Giá vốn trực tiếp (COGS) tối đa:** **55%** (gồm nguyên liệu thô, tỷ lệ hao hụt yield, túi xốt OEM sachet và bao bì thùng cách nhiệt).
- **Định mức đóng gói & Giao hàng nội thành (6 bữa/lần giao):**
  + Bộ thùng cách nhiệt (`BB-THUNG-01`): `14.000đ / hộp` (Carton 3 lớp + Xốp bạc + Đá gel).
  + Vận chuyển chặng cuối nội thành TP.HCM: `25.000đ / lần giao`.
  + Phí hộp + ship phân bổ: $(14.000 + 25.000) / 6 = \mathbf{6.500đ / \text{bữa}}$.
- **Chi phí vận hành & Marketing (OPEX & MKT):** **15%**.
- **Biên lợi nhuận gộp (Gross Margin):** **20% – 30%**.
- **Lợi nhuận ròng mục tiêu (Net Margin):** **~30%**.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
movafresh-web/
├── .agent/                             # Tài liệu nghiệp vụ, kiến trúc & roadmap cho AI (đọc theo AGENTS.md)
├── AGENTS.md                           # Chỉ thị khởi động & danh sách cấm bắt buộc cho AI
├── index.html                          # Entry HTML cho Web Khách Hàng
├── ops.html                            # Entry HTML cho Web Vận Hành
├── netlify.toml                        # Netlify redirects (/ops -> /ops.html, /* -> /index.html)
├── .env.example                        # Biến môi trường công khai (VITE_*), xem mục bên dưới
├── vite.config.js                      # Vite build đa cổng vào + Vitest
└── src/
    ├── main.js, App.vue, router/       # App khách (Vue Router history: /, /plans, /account, /q/:code)
    ├── stores/                         # Pinia: usePlanFlowStore, useMovaStore (phiên OTP, thông báo)
    ├── views/, components/             # Màn khách: plans/, dashboard/, common/, store/
    ├── services/                       # supabase.js (Auth: OTP khách, email+mật khẩu nhân viên), aiApi.js (gợi ý thực đơn)
    ├── ops/                            # App vận hành (hash router)
    │   ├── session.js, guard.js        # Phiên nhân viên từ GET /ops/me, chặn route theo vai trò/quyền
    │   ├── useLive.js, live.js         # Cập nhật theo nhịp 6 giây, không chồng yêu cầu, tạm dừng khi tab ẩn
    │   ├── queue.js, queuePhotos.js    # Hàng đợi offline của xưởng: tải ảnh trước, gửi lại thao tác theo opId
    │   └── views/                      # workshop/, hub/, logistics/, purchasing/, supplier/, shipper/, finance/, ...
    └── shared/
        ├── api/                        # Lớp gọi backend (xem bên dưới)
        ├── config/                     # business.js (khung giờ, hằng hiển thị), roles.js (nhãn vai trò)
        ├── data/                       # Dữ liệu hiển thị tĩnh còn lại (catalog, packaging, recipes, sources); nguồn sự thật nghiệp vụ là backend
        ├── domain/                     # Hàm thuần dùng chung cho hiển thị và hàng đợi offline (không giữ trạng thái)
        ├── utils/                      # time.js (giờ Việt Nam + đồng hồ theo máy chủ), formatters.js (fmt), qr.js
        └── __tests__/                  # Vitest, tên theo nhóm: w1* (client), w2* (phễu), w3* (tài khoản), w4–w9* (vận hành)
```

`src/shared/api/`: `http.js` (một client duy nhất: Bearer của Supabase, `Idempotency-Key` tự gắn cho lệnh ghi, bóc phong bì `{status,data}`, ném `HttpError {code,status,details}`), `routes.js` (bảng đường gọi của app khách) và `opsRoutes.js` (của app vận hành): mỗi dòng được test đối chiếu với `movafresh-platform/backend/src/routes`; `customerApi.js` (`api.customer.*`, giữ phong bì `{status,data|error}`), `opsApi.js` (`api.ops.*`, ném `HttpError`), `devApi.js` (`/dev/*`), `adapters/` (đổi dạng backend sang dạng màn hình dùng), `uploads.js` (vé ảnh một lần), `index.js` (`api` ghép các phần trên).

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

### Yêu cầu môi trường
- **Node.js** ≥ 20 (backend yêu cầu 20; web dùng Vite 6), **npm** ≥ 9, **Docker** (để chạy Supabase local).
- Repo anh em: `movafresh-platform` (backend + ai-engine) đặt cạnh `movafresh-web`.

### Chạy toàn bộ stack local (backend thật + web)
Thứ tự bắt buộc:

```bash
# 1. Backend: Supabase local (Postgres, Auth, Storage), cổng API 55441, DB 55442
cd ../movafresh-platform/backend
npm install
npm run stack:up
npm run stack:status          # lấy ANON_KEY và SERVICE_ROLE_KEY (chỉ dùng local)

# 2. Điền backend/.env từ .env.example (SUPABASE_*, DATABASE_URL, AI_ENGINE_*, BANK_WEBHOOK_*);
#    đặt DEV_TOOLS_ENABLED=true và CORS_ORIGINS có http://localhost:5173

# 3. Dữ liệu mẫu (migration đã được stack:up áp). seed:dev làm trọn: món (nhãn dị ứng coi như đã duyệt, chỉ dev), SKU, lô mẫu,
#    một nhân viên mỗi vai trò, 4 khách mẫu có gói 4 tuần. Chạy lại an toàn. Có thể chạy riêng từng phần: npm run seed, npm run seed:staff.
npm run seed:dev

# 4. Backend (cổng 8787)
npm run dev

# 5. Web (một terminal khác)
cd ../../movafresh-web
npm install
cp .env.example .env.local    # điền VITE_SUPABASE_ANON_KEY từ bước 1; đặt VITE_DEV_TOOLS=true khi muốn có bảng demo
npm run dev
# -> App khách:    http://localhost:5173/
# -> App vận hành: http://localhost:5173/ops.html
```

Dừng stack: `npm run stack:down` (trong `movafresh-platform/backend`, dữ liệu được giữ). Kiểm cả luồng một đơn trên stack thật: `npm run smoke:e2e` (cũng ở backend).

### Biến môi trường (`.env.local`, chỉ chứa giá trị công khai)
| Biến | Ý nghĩa |
|---|---|
| `VITE_API_BASE_URL` | Địa chỉ backend, local `http://localhost:8787` (web gọi `${VITE_API_BASE_URL}/api/v2/...`) |
| `VITE_SUPABASE_URL` | Supabase Auth, local `http://127.0.0.1:55441` |
| `VITE_SUPABASE_ANON_KEY` | Khóa anon của Supabase (công khai); KHÔNG bao giờ đặt service-role hay khóa Gemini ở đây |
| `VITE_DEV_TOOLS` | `true` mới hiện "Bảng demo" ở app vận hành; mặc định `false`; chỉ bật ở máy local |

### Tài khoản thử (chỉ stack local)
- **Khách (OTP cố định `123456`):** số `84901000001` đến `84901000004` (có sẵn gói 4 tuần do `seed:dev`); số `15555550100` dành cho smoke test. Cấu hình ở `movafresh-platform/backend/supabase/config.toml`.
- **Nhân viên:** email ở bảng vai trò trên (đuôi `@staff.movafresh.local`), mật khẩu là `STAFF_SEED_PASSWORD` khi chạy `seed:staff` (mặc định dev `Mova-dev-2026!`, KHÔNG dùng ở môi trường thật).

### Lệnh khác
```bash
npm test          # Vitest: toàn bộ test web (không cần backend chạy)
npm run build     # Build production cho cả index.html và ops.html -> dist/
```

---

## 🚢 Triển Khai (Deployment trên Netlify)

1. Netlify build tự động: lệnh `npm run build`, thư mục publish `dist`.
2. Biến môi trường production: `VITE_API_BASE_URL` (backend đã deploy), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Để `VITE_DEV_TOOLS` trống hoặc `false`; backend production phải có `DEV_TOOLS_ENABLED=false` (mặc định) và `NODE_ENV=production`.
3. Backend (`movafresh-platform`) cần `CORS_ORIGINS` chứa domain web.
