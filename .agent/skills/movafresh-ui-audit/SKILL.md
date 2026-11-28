---
name: movafresh-ui-audit
description: Quy trình kiểm toán UI/UX 7 bước cho MOVA Fresh trên Desktop, Mobile và Zalo Mini App trước khi coi là hoàn thành.
---

# MOVA FRESH — SKILL KIỂM TOÁN UI/UX TOÀN DIỆN (7 BƯỚC)

Kích hoạt quy trình này sau khi chỉnh sửa giao diện hoặc trước mọi đợt phát hành Production / Zalo Mini App.

## Bước 1: Quét CSS & Token Sai Lệch
- Chạy `rg` quét mã hex (`#[0-9A-Fa-f]{3,8}`) và `rgba(...)` ngoài `src/assets/styles/tokens.css`.
- Xác nhận mọi màu nền, chữ, viền, overlay, bóng đổ đều ánh xạ qua CSS custom properties trong `tokens.css`.
- Kiểm tra không còn emoji thô (`🌿`, `🔥`, `✓`, `📅`, `🚚`, `⚡`) trong các component khách hàng — thay bằng `lucide-vue-next`.

## Bước 2: Kiểm Định Tương Phản WCAG AA & Hệ Chữ
- Đối chiếu chữ trên nền `--cream`, `--cream-warm`, `--sand`, `--green-d`, `--forest`, `--amber-soft`, `--blue-soft`: tỷ lệ tương phản $\ge 4.5:1$ (chữ lớn/display $\ge 3:1$).
- Đảm bảo số tiền VND, ngày giao, bộ đếm suất còn dùng `tabular-nums`; tiêu đề cảm xúc dùng `var(--font-display)` thống nhất.

## Bước 3: Kiểm Toán Copywriting & Pháp Lý
- Quét toàn `src/` (trừ `ops/`) để bảo đảm **0 lần xuất hiện**: `ví điện tử`, `HelloFresh`, `demo`, `AI` (theo nghĩa AI gợi ý món), `COD` (như phương thức cho chọn), chuỗi lỗi thô từ server.
- Kiểm tra nhãn thời gian/giá trị trong nút bấm (nhãn khung giờ tách riêng pill trạng thái `Còn X suất` / `Qua giờ chốt`, tuyệt đối không dính chuỗi).

## Bước 4: Mở Trình Duyệt Thật (Chromium) & Tự Thao Tác Toàn Luồng
Kiểm tra `http://localhost:5173` trên **Desktop (`1440×900`)** và **Mobile (`375×812`, `414×896`)** cho mọi tuyến:
- `/` (Hero, Video Hook, Sample Meals, Box 3D, How It Works, Journey, FAQ, Footer, Floating Zalo)
- `/menus` (Thực đơn tuần + chi tiết món modal/bottom-sheet)
- `/plans?step=1` (`q=0..6` khảo sát Đầu bếp MOVA, ảnh không bị che bởi icon nổi)
- `/plans?step=2` (Chọn món & thanh đáy sticky mobile)
- `/plans?step=3` (Auto-chọn ngày sớm nhất khả dụng, `min` ràng buộc, chọn nhanh Date Group Card, đổi ngày tương lai qua `#first-date` không bị giật về ngày cũ)
- `/account` (đủ 5 tab + `ProfileTab` pill chips không wrap vỡ dòng, trạng thái loading/empty/error)
- `/faq`, `/auth/zalo/callback`, `LoginModal`, `NotificationDrawer`, `DishDetailModal`

## Bước 5: Kiểm Tra Console, Network, Overflow & Touch Target
- Xác nhận **0 `console.error`**, **0 `pageerror`**, **0 request API lỗi ngoài kịch bản kiểm thử**.
- Đo `document.documentElement.scrollWidth <= window.innerWidth` ở mọi viewport (`375px`, `414px`, `1440px`).
- Kiểm tra vùng chạm mọi nút tương tác (`>= 44×44px`) và focus ring `:focus-visible`.

## Bước 6: Cross-Check Chế Độ Zalo Mini App (`isZaloMiniApp`)
- Kiểm tra thanh điều hướng đáy `ZmpBottomNav`, ẩn thành phần web không phù hợp trong ZMP, hạ tải hiệu ứng nặng ở chế độ lite GPU-only.
- Xác nhận không làm hỏng luồng `zmp-sdk`, OTP, Google/Zalo OAuth.

## Bước 7: Kiểm Định Build Production & ZMP Cleanliness
- Chạy `npm test` (tất cả unit test pass, kể cả `w2AsyncScan`, `w2Capacity`, `w10ProfilePlansUx`, `figmaDesign3d`).
- Chạy `npm run build` và `npm run zmp:build`.
- Quét CSS sinh ra trong `www/assets/style-*.css`: xác nhận **0 biến CSS vòng lặp (`cyclicVars === 0`)** và bundle size đạt ngưỡng tối ưu trước khi commit/push.
