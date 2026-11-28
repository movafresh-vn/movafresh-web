---
name: movafresh-3d-motion
description: Quy chuẩn chuyển động 60fps, hiệu ứng 3D, chống CLS và chiến lược tự hạ tải cho Mobile & Zalo Mini App tại MOVA Fresh.
---

# MOVA FRESH — SKILL CHUYỂN ĐỘNG 60FPS & 3D HIỆN ĐẠI

Áp dụng cho mọi animation CSS/Vue (`motion-v`, `TresJS`, `MovaBox3D`, modal/sheet transitions, scroll reveal).

## 1. Kỷ Luật Hiệu Năng GPU-Only
- Chỉ animate hai thuộc tính composite **không gây reflow/repaint**: `transform` (`translate3d`, `scale`, `rotate`) và `opacity`.
- **Cấm** animate `top`, `left`, `width`, `height`, `margin`, `padding`, `box-shadow` liên tục theo vòng lặp.
- Không lạm dụng `will-change` đại trà; chỉ gắn tạm trên phần tử 3D tương tác chính (`preserve-3d`).

## 2. Chống Nhảy Bố Cục (Zero CLS)
- Mọi khung ảnh, thẻ 3D (`MovaBox3D`), carousel video (`MealKitVideoHook`) phải khóa tỷ lệ qua `aspect-ratio` hoặc kích thước tối thiểu cố định trước khi tải media.
- Các modal trên Mobile (`<= 640px`) chuyển sang **Bottom Sheet** trượt từ dưới (`border-radius: var(--r-lg) var(--r-lg) 0 0`) với thanh kéo rõ và nút đóng `>= 44×44px`.

## 3. Tôn Trọng `prefers-reduced-motion` & Tĩnh Hóa Mặc Định
- Với người dùng bật `@media (prefers-reduced-motion: reduce)`: tắt toàn bộ `animation`, đặt `transition-duration: 0.01ms !important`, hiển thị ngay trạng thái cuối ổn định (mở hộp 3D sạch sẽ, không rung lắc).
- Scroll-driven animation (`animation-timeline: view()`) chỉ dùng tăng cường luỹ tiến (`@supports (animation-timeline: view()) and (animation-range: entry)`), trình duyệt không hỗ trợ mặc định hiển thị đầy đủ không bị kẹt `opacity: 0`.

## 4. Hạ Tải Thông Minh Cho Zalo Mini App (`isZaloMiniApp`) & Thiết Bị Yếu
- Tại Webview Zalo Mini App hoặc thiết bị có `isZaloMiniApp = true`:
  - Tự động kích hoạt chế độ **Lite GPU** (tắt vòng xoay `perspective` phức tạp / drop shadow đa lớp nặng, giữ chuyển cảnh tức thì 150–200ms mượt 60fps).
  - Bất kỳ chuyển động scroll mượt (như `Lenis` nếu dùng ở Landing Web) phải tự vô hiệu hóa trong Zalo Mini App và khi `prefers-reduced-motion: reduce`.
- Giữ bundle JS/CSS gọn bằng component transition nhẹ (`ease-out` 160–240ms để vào, 120–160ms để ra).
