# 05. TIẾN ĐỘ THỰC HIỆN & LỘ TRÌNH TRIỂN KHAI (PROGRESS & ROADMAP)

> **Bảng theo dõi trạng thái hiện tại, lộ trình các Tracks hành động và kế hoạch kiểm thử thực tế.**
> Mục tiêu tối thượng: **Chính thức bấm nút chạy sản phẩm thật (Launch) vào Tháng 12/2026.**
> Cập nhật: 22/11/2026 (Phiên bản V2.3: backend thật)

---

## 1. BẢNG TIẾN ĐỘ V2.2 HIỆN TẠI (STATUS DASHBOARD)

| Hạng mục / Jira Task | Trạng thái | Đánh giá & Kết quả đạt được |
|---|---|---|
| **Hạ tầng Web Multi-Page (MPA)** | ✅ **Đã hoàn thành** | Build hoàn chỉnh `index.html` (App Khách) và `ops.html` (App Vận hành) trên Vite 6. |
| **Deploy Netlify CI/CD** | ✅ **Đã hoàn thành** | Đã kết nối repo `github.com/movafresh-vn/movafresh-web` (nhánh `feat/v2-customer-and-ops-apps`) sang `https://movafresh-web.netlify.app`. |
| **Frontend V2 Customer App (`KAN-5`)** | ✅ **Đã hoàn thành** | Phễu Onboarding 4 bước (`/plans`), mâm cơm Á Đông 5 món, linh hoạt đổi món chéo nguyên liệu, modal Chi tiết món (Terroir, size specs, nutrition, 3 bước nấu 15 phút), Video Hook Grand Frais 10s. |
| **FinTech Dòng tiền & Thanh toán (`KAN-6`)** | ✅ **Đã hoàn thành** | Fresh Credit 2 ngăn (`real_vnd` vs `promo_vnd`), voucher HelloFresh 4 tuần (`THEQUATANG`, `MOVA20`, `FREESHIP`), Khung giờ xanh (-15k Freeship), Xác thực SĐT qua OTP (demo mã 1234), Zero COD. |
| **Hệ thống Vận hành 8 Vai trò (`KAN-9`)** | ✅ **Đã hoàn thành** | Đóng gói `/ops.html` đầy đủ cho Quản đốc phân xưởng (`1111`), Bếp phân xưởng (`2222`), Mua hàng (`3333`), NCC (`4001`), Điều phối xe lạnh (`5555`), Kho phụ TP.HCM (`6666`), Shipper (`7777`), Kế toán dòng tiền (`9999`). Bảo mật ẩn PII khách hàng. |
| **Bảng giá thực tế & Kinh tế đơn vị (`KAN-10`)** | ✅ **Đã hoàn thành** | Đồng bộ 3 file Excel của Hiếu: 18 SKU nguyên liệu thô, 8 túi xốt OEM sachet, 21 món ăn Terroir, quy chuẩn đóng thùng cách nhiệt 14k + ship nội thành 25k (phân bổ 6.5k/bữa). Ràng buộc Nguyên liệu + Ship $\le 50\%$, Net Margin ~30%. Bỏ bơ sáp ưu tiên Vải thiều IQF. |
| **Bộ Unit Tests Tự Động (`KAN-11`)** | ✅ **Đã hoàn thành** | Vitest chạy không cần backend: client HTTP, bảng route đối chiếu với mã nguồn backend, adapters, quét tĩnh async, logic thuần. Chạy `npm test`, phải pass toàn bộ. |
| **Kết nối Backend thật (V2.3)** | ✅ **Đã hoàn thành** | Web gọi `movafresh-platform/backend` qua `src/shared/api/http.js` + bảng route; **đã xóa mock-server**. Khách đăng nhập SĐT + OTP, nhân viên email + mật khẩu (Supabase Auth, quyền từ `GET /ops/me`). Giá, sức chứa và trạng thái đơn do máy chủ quyết định. Chạy local: `README.md` (`npm run stack:up`). |
| **Màn hình mới V2.3** | ✅ **Đã hoàn thành** | Hướng dẫn giao bắt buộc + ô phường + số chỗ còn lại theo ngày (khách); nút chốt sổ một chạm, tải lệnh mua tổng CSV, hàng đợi thanh toán muộn, nhập hiệu suất (cờ 5%), in nhãn thùng có Route_ID, xuất xe cần nhiệt độ + ảnh, hoàn tiền thiếu hàng hàng loạt, bảng giá vốn món (cờ 35%), ô toàn vẹn sổ cái, ảnh giao hàng trên thẻ tuần, bảng demo `/demo` (chỉ dev). |

---

## 2. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (NEXT ACTIONS BEFORE LAUNCH)

```
                    MỤC TIÊU: LAUNCH THÁNG 12/2026
                                   ▲
   ┌─────────────────┬─────────────┴─────────┬─────────────────┐
   │                 │                       │                 │
Đầu việc 1        Đầu việc 2              Đầu việc 3        Đầu việc 4
Bộ data 200 hộ &   Đồng bộ contract        Kết nối Backend   Áp dụng Branding
10 Personas BOM    sang platform           thật & Payment    Kit từ Designer
(KAN-12)           (api-contract.json)     (VietQR / Thẻ)    (Design System)
```

### 1. Đầu việc 1: Bộ dữ liệu 200 Hộ dân & 10 AI Personas (`KAN-12`)
- **Mục tiêu:** Tạo bộ dữ liệu mẫu chuẩn xác cho 200 hộ gia đình TP.HCM & Đông Nam Bộ.
- **Nội dung:** 10 AI Personas (Gym nam, Nữ văn phòng giảm mỡ, Tiểu đường hạn chế đường, Dạ dày nhạy cảm, Gia đình hạt nhân, Đại gia đình 3 thế hệ, Độc thân bận rộn, Ăn chay bán phần, Mẹ bỉm sữa, Cặp đôi Gen Z Fusion) chạy qua BOM Reverse Aggregator để xuất Phiếu Request Đặt Hàng Test gửi nhà máy Đắk Lắk chạy thử nghiệm dây chuyền.

### 2. Đầu việc 2: Đồng bộ `api-contract.json` sang `movafresh-platform`
- Chuyển giao các định nghĩa API và mô hình dữ liệu đã hoàn thiện từ `docs/contract-changes.md` sang repository `movafresh-platform`, duy trì tính tương thích ngược giữa Tech Lead (Khôi) và AI Lead (Hiếu).

### 3. Đầu việc 3: Hạ tầng thanh toán tự động (backend thật đã nối xong)
- **Đã xong (V2.3):** web chạy trên backend thật (Supabase/Postgres), không còn mock in-memory.
- **Còn lại:** cắm cổng thanh toán ngân hàng (VietQR động, webhook có chữ ký) và cổng thẻ tín dụng tự động trừ trước 72 giờ; hiện chỉ có giao diện và bản giả cho dev (`/dev/bank-transfer`). Các con số sức chứa, giá, nhân công, bao bì vẫn là SỐ GIẢ ĐỊNH chờ founder và anh Trung chốt; kế toán cần xác nhận hạch toán `late_payment_credit` và `undelivered_refund`.

### 4. Đầu việc 4: Áp dụng Branding Kit chính thức
- Khi designer bàn giao Design System chính thức (SVG icons, màu sắc chuẩn thương hiệu, hình ảnh chụp thực tế từ xưởng Đắk Lắk và video unbox 15 phút thực tế), thay thế vào vị trí đã chừa sẵn trong code.

---

## 3. CHECKLIST KIỂM THỬ ĐÁNH GIÁ (ACCEPTANCE CRITERIA CHO AGENT)

Trước khi coi một task là hoàn thành, Agent cần tự kiểm tra:
1. Code có vi phạm bất kỳ điều nào trong 8 điều cấm (`AGENTS.md`) không?
2. Có từ ngữ "ví điện tử" hoặc "COD" hoặc "AI" (ở giao diện khách) nào lọt vào không?
3. Các con số tiền tệ có dùng CSS `tabular-nums` và hàm `fmt()` không?
4. Đơn hàng có bị chia nhỏ dưới 4 tuần không?
5. Mâm cơm gia đình có đủ 5 thành phần (Đạm, Rau, Canh, Tinh bột, Trái cây) không?
6. Chạy `npm test` có pass toàn bộ không (không cần backend)?
7. Chạy `npm run build` có thành công 0 lỗi cho cả `index.html` và `ops.html` không?
8. Mọi lệnh gọi API có `await` và đi qua `src/shared/api` không? Có số tiền nào web tự tính để hiển thị thay vì lấy từ máy chủ không?
9. Luồng thật (chạy tay trên stack local theo `README.md`): khách đăng ký với hướng dẫn giao bắt buộc, admin chốt sổ một chạm, thanh toán muộn vào hàng đợi (nhận một lần, từ chối một lần), xưởng nhập hiệu suất và xuất xe có ảnh, kho nhận xe và chia tuyến, shipper giao có ảnh, khách thấy ảnh giao và hóa đơn, hoàn tiền thiếu hàng, ô toàn vẹn sổ cái vẫn xanh.
