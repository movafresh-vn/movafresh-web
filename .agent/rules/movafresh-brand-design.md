# MOVA FRESH — HIẾN PHÁP DESIGN SYSTEM & BRAND VOICE

> Tài liệu chuẩn hóa thiết kế giao diện & giọng văn thương hiệu cho **MOVA Fresh** trên cả **Web Production** và **Zalo Mini App (ZMP)**.  
> Chắt lọc từ Figma DFL24-web, nguyên lý thẩm mỹ *Anthropic `frontend-design`* (chống UI AI rập khuôn), và *Vercel Web Interface Guidelines*.

---

## 1. NGUỒN SỰ THẬT DUY NHẤT (`tokens.css`)

Mọi màu sắc, typography, spacing, bo góc và bóng đổ **BẮT BUỘC** đi qua [`src/assets/styles/tokens.css`](file:///src/assets/styles/tokens.css). Cấm hardcode mã màu hex/rgb rời rạc trong component (ngoại trừ fallback nền SVG thương hiệu đặc thù).

### Bảng màu & Ngữ nghĩa cốt lõi
- **Thương hiệu & CTA chính:** `--green` (`#0B9C63`), `--green-d` (`#087A4D`, nền nút Primary đạt WCAG AA `5.38:1` với `--text-on-primary` `#FFFFFF`), `--green-dd` (`#065F3C`), `--forest` (`#52652B`), `--forest-d` (`#3F4E20`).
- **Điểm nhấn ấm thực (Terroir & Harvest):** `--orange` (`#F89122`), `--harvest-gold` (`#D9AF08`), `--coral` (`#EF4C27`), `--red-orange-d` (`#C43A14` — badge/CTA cảnh báo đạt AA).
- **Bề mặt nền ấm (Warm Culinary Surfaces):** `--cream` (`#F9F7EC`), `--cream-warm` (`#F6F1E7`), `--sand` (`#EFE8DC`), `--surface` (`#F4F1E4`), `--white` (`#FFFFFF`). **Cấm dùng nền trắng lạnh `#F8FAFC` hoặc đen xám Tailwind `slate-900` (`#0F172A`).**
- **Mực chữ & Tương phản WCAG AA ($\ge 4.5:1$):** `--ink-dark` (`#28251F`), `--ink-forest` (`#18201B`), `--ink-2` (`#543F18`), `--muted` (`#665F54` — đạt `5.60:1` trên nền cream), `--line` (`#DBD3C3`), `--line-2` (`#EAE3D4`), `--line-strong` (`#C9BFAE`).
- **Trạng thái & Đối tác:** `--green-tint`, `--green-soft`, `--green-line`, `--amber-soft`, `--amber-ink`, `--red`, `--red-soft`, `--blue`, `--blue-soft`, `--pay-zalo` (`#0068FF`), `--pay-vietqr`, `--pay-momo`.

---

## 2. TYPOGRAPHY, SPACING & HÌNH KHỐI

- **Cặp font chữ (subset `vietnamese`):**
  - Body / UI / Số liệu: `--font` (`"Epilogue", system-ui, ...`). Luôn bật `font-variant-numeric: tabular-nums` cho giá tiền, số suất còn lại, đếm ngược chốt sổ.
  - Tiêu đề Editorial / Cảm xúc: `--font-display` (`"Playfair Display", "Epilogue", Georgia, serif`).
- **Hệ khoảng cách (4/8pt scale):** `--sp-1` (`4px`), `--sp-2` (`8px`), `--sp-3` (`12px`), `--sp-4` (`16px`), `--sp-5` (`24px`), `--sp-6` (`32px`), `--sp-7` (`48px`), `--sp-8` (`64px`).
- **Bo góc & Bóng đổ:** `--r-sm` (`8px`), `--r-ctl` (`12px` — input, nút, pill), `--r-card` (`16px` — thẻ nội dung), `--r-lg` (`20px` — khung ảnh hero/modal), `--r-pill` (`999px` — badge/chip); bóng ấm `--shadow-1`, `--shadow-md`, `--shadow-2`, `--shadow-hero`.

---

## 3. QUY CHUẨN COMPONENT & TƯƠNG TÁC (CHỐNG UI RẬP KHUÔN)

1. **Icon hệ thống thống nhất (`lucide-vue-next`):**
   - Cấm dùng emoji hệ điều hành (`🌿`, `🔥`, `✓`, `📅`, `🚚`, `⚡`, `⚠️`, `🔒`) làm icon điều hướng, badge, nút hoặc tiêu đề trong UI khách hàng.
   - Bắt buộc import rời từng icon từ `lucide-vue-next` (`import { Leaf, Clock } from 'lucide-vue-next'`) để Vite tree-shake giữ bundle Zalo Mini App gọn nhẹ.
   - Ngoại lệ duy nhất được phép: SVG thương hiệu Google/Zalo, ảnh chụp thật trong `public/images/`, và minh họa 3D có chủ đích.
2. **Cấm checkbox thô & bullet list `<ul>` trong card tương tác:**
   - Mọi nhóm chọn nhiều (khẩu vị, mục tiêu thể trạng, dị ứng, kiêng cữ) dùng mẫu **Selectable Pill/Chip Card**: `display: inline-flex; align-items: center; gap: 8px; min-height: 44px`, `<input type="checkbox" class="sr-only">` + ô tick Lucide `Check`, kích hoạt viền focus bằng `:focus-visible` / `:has(:focus-visible)`.
   - Tuyệt đối không render `<input>` không bọc flex khiến ô tick rớt xuống dòng khác chữ, và không để chấm bullet mặc định của `<ul>` xuất hiện trong bảng chọn ngày/lịch sử/ưu đãi.
3. **Thứ bậc nút hành động (Button Hierarchy):**
   - Tối đa **1 nút Primary** (`pl-btn primary` / nền `--green-d`) trong một khu vực hành động; nút phụ dùng Secondary (`pl-btn outline`), nút ít ưu tiên hơn dùng Ghost/Text. Không đặt 2 nút cạnh nhau cùng trọng lượng thị giác hoặc cùng thiếu phân cấp.
4. **Nhiếp ảnh ẩm thực không bị che chắn:**
   - Ảnh chụp mâm cơm / nguyên liệu thật (`object-fit: cover`) không bao giờ bị che tâm bằng icon/emoji trôi nổi hay lớp phủ tối toàn ảnh. Chỉ dùng dải scrim chân ảnh để giữ tương phản cho chú thích (`linear-gradient(180deg, transparent 48%, var(--scrim-dark) 100%)`).
5. **Chống CLS & Chạm mục tiêu $\ge 44\text{px}$:**
   - Mọi nút bấm, tab, chip chọn, nút đóng modal (`X`) phải đạt vùng chạm tối thiểu `44×44px` trên cả Web và Zalo Mini App.
   - Ảnh & card video luôn khai báo rõ `aspect-ratio` hoặc `width`/`height`.
   - Đầy đủ 4 trạng thái UI: **Loading (skeleton/chờ tải)**, **Empty (trạng thái trống hướng dẫn hành động)**, **Error (thông báo lỗi tiếng Việt kèm nút thử lại)**, **Cutoff/Full (khóa rõ ràng, tách biệt pill trạng thái khỏi nhãn giờ)**.

---

## 4. GIỌNG VĂN THƯƠNG HIỆU (MOVA FRESH BRAND VOICE)

- **Tính cách:** Ấm áp như gian bếp gia đình Việt, tinh tế chuẩn chỉnh, gợi vị giác tươi ngon, an tâm minh bạch nguồn gốc: **nông trại Đắk Lắk – sơ chế sạch tại nhà máy – xe lạnh 0–4°C – nấu gọn 15 phút – lọc cứng 100% dị ứng**.
- **Tôn trọng tuyệt đối 9 điều cấm của `AGENTS.md` & NĐ 52/2024:**
  - KHÔNG dùng *"ví điện tử"*, *"nạp tiền tự do"*, *"lãi suất"* $\rightarrow$ dùng **Fresh Credit / Điểm bữa ăn trả trước / Gói Suất ăn trả trước**.
  - KHÔNG dùng *"AI"* trên giao diện khách $\rightarrow$ dùng **Đầu bếp MOVA**.
  - KHÔNG dùng *"COD"*, *"đơn tối thiểu 250k"*, *"mua lẻ 1 tuần"*, *"HelloFresh"*, *"bản demo"*, *"fake"*, mã lỗi kỹ thuật thô.
  - Giờ chốt sổ luôn hiện mốc ngày/giờ cụ thể từ máy chủ (`Đặt trước X giờ` / `Qua giờ chốt` tách pill riêng), giá luôn hiển thị số nguyên VND dạng `fmt()`.
