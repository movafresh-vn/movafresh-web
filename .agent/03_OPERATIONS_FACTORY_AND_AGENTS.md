# 03. VẬN HÀNH NHÀ MÁY, KHO BÃI & HỆ THỐNG VẬN HÀNH `/ops.html`

> **Quy định quy trình sản xuất thực phẩm, đóng gói, điều phối chuỗi cung ứng Đắk Lắk – TP.HCM, phân quyền 8 vai trò vận hành và các tác tử AI tự động.**
> Phiên bản: V2.3 | Cập nhật: 22/11/2026 (Chạy trên backend thật: máy trạng thái đơn, chốt sổ cứng, truy xuất lô, chuỗi lạnh)

---

## 1. THUẬT TOÁN "ĐA DẠNG ĐẦU RA — TỐI GIẢN ĐẦU VÀO" (THE CORE AGGREGATION ALGORITHM)

Thách thức lớn nhất của Meal-Kit cá nhân hóa là: **Làm sao để 1.000 khách hàng nhận 1.000 thực đơn khác nhau mà nhà máy không bị vỡ trận?**

MOVA Fresh giải quyết bằng thuật toán **BOM (Bill of Materials) Reverse Aggregator**:

```
[1,000 Thực đơn Cá nhân hóa của Khách hàng]
  (Bò lúc lắc, Bò áp chảo xốt vang, Gà nướng sả mật ong, Canh bí đỏ sườn non...)
                  │
                  ▼
[Thuật toán BOM Reverse Aggregator]
                  │
                  ▼
[Tập Nguyên Liệu Thô Tối Giản Cho Nhà Máy]
  - Thịt bò đùi nạc thái mỏng (NL-BO-01, yield 0.95): 145 kg
  - Thăn bò cắt steak (NL-BO-02, yield 0.95): 85 kg
  - Ba rọi heo thảo mộc (NL-HEO-02, yield 0.97): 160 kg
  - Sườn non heo cắt khúc (NL-SUON-04, yield 0.85): 110 kg
  - Ức gà phi lê (NL-GA-03, yield 0.95): 95 kg
  - Bông cải xanh baby (NL-RAU-01, yield 0.75): 120 kg
  - Cải ngọt Đắk Lắk (NL-RAU-02, yield 0.75): 140 kg
  - Gói xốt OEM sachet: XOT-01 (Kho tàu), XOT-02 (Tiêu đen), XOT-04 (Tỏi gừng)...
```

- **Nguyên lý:** Phía khách hàng nhìn thấy hàng trăm món phong phú. Phía nhà máy Đắk Lắk chỉ nhìn thấy **bảng tổng hợp nguyên liệu thô theo quy cách cắt thái đồng nhất** kèm mã gói xốt tương ứng.

---

## 2. QUY CHUẨN ĐÓNG GÓI & PHÂN BỔ NHÀ MÁY ĐẮK LẮK — KHO PHỤ TP.HCM

### A. Phân định nguồn cung ứng:
1. **Nhà máy sơ chế trung tâm Đắk Lắk:**
   - Đảm nhận toàn bộ: Thịt heo thảo mộc, Gà đồi Đắk Lắk, Bò ăn cỏ Tây Nguyên, Rau củ quả xứ lạnh/nhiệt đới, Gạo ST25, Khoai lang mật, Trái cây tráng miệng (Chuối tiêu chín cây, Vải thiều IQF).
   - Sơ chế sạch 100%, đóng gói hút chân không (Vacuum packaging) định lượng theo gram.
   - Chiết rót và đóng gói các túi xốt tiêu chuẩn (Sauce sachets: XOT-01 đến XOT-08).
2. **Kho phụ trung chuyển TP.HCM (Secondary Cold Hub):**
   - Đảm nhận: Cá tươi biển (Cá bớp cắt khoanh Vũng Tàu), Tôm sú bóc nõn rút chỉ (để đảm bảo độ tươi tuyệt đối, tránh rủi ro bảo quản đường dài từ Đắk Lắk).
   - Tiếp nhận xe đông lạnh hàng ngày từ Đắk Lắk $\rightarrow$ Ghép bộ Hải sản $\rightarrow$ Đóng thùng tổng hợp giao cho shipper chặng cuối.

### B. Phạm vi đóng gói hộp Meal-Kit:
- **Thành phần BẮT BUỘC có trong hộp:**
  - [x] Thịt / Cá / Tôm (đóng chân không, nhãn mác rõ ràng).
  - [x] Rau củ rửa sạch, cắt khúc sẵn sàng vào nồi.
  - [x] Tinh bột (túi gạo ST25 hút chân không, bún gạo khô, mì Ý, khoai lang mật...).
  - [x] Gói xốt công thức độc quyền của Đầu bếp MOVA.
  - [x] Trái cây tráng miệng (Chuối tiêu chín cây hoặc Vải thiều cấp đông IQF). *Tuyệt đối không dùng Bơ sáp 034*.
- **Thành phần TUYỆT ĐỐI KHÔNG ĐÓNG GÓI:**
  - [ ] Nước mắm, Muối ăn, Bột ngọt, Đường, Dầu ăn cơ bản. (Căn bếp của mọi gia đình Việt đều đã có sẵn. Đóng gói các loại này vừa lãng phí bao bì, vừa tăng nguy cơ rách vỡ dung dịch ra hộp).
- **Quy chuẩn dán nhãn phân loại nhiệt độ:**
  - *Không hiển thị hướng dẫn rườm rà trên app khách.* Nhà máy dán trực tiếp **Sticker màu phân loại**:
    - 🟢 **Sticker Xanh (Ngăn mát 0°C – 4°C):** Rau củ quả, gói xốt, thịt dùng trong ngày.
    - 🔵 **Sticker Xanh Dương (Ngăn đông -18°C):** Thịt cá dự trữ cho các bữa sau trong tuần, Vải thiều IQF.
- **Quy chuẩn Thùng cách nhiệt & Vận chuyển chặng cuối:**
  - Bộ thùng cách nhiệt (`BB-THUNG-01`): `14.000đ / hộp` (Carton 3 lớp 5.500đ + Túi xốp bạc 3.200đ + Đá gel 5.300đ).
  - Phí giao hàng chặng cuối (`lastMile`): `25.000đ / lần giao`.
  - Phí hộp + ship phân bổ: $(14.000 + 25.000) / 6 = \mathbf{6.500đ / \text{bữa}}$.

---

## 3. HỆ THỐNG VẬN HÀNH `/ops.html`: PHÂN QUYỀN 8 VAI TRÒ & BẢO MẬT PII

Ứng dụng vận hành là Single Page độc lập tại **`/ops.html`** (hash router), phục vụ 8 vai trò. Từ V2.3 **không còn mã PIN**: nhân viên đăng nhập **email + mật khẩu** (Supabase Auth), vai trò và quyền lấy từ `GET /ops/me`; máy chủ kiểm quyền ở từng lệnh. Tài khoản local do `npm run seed:staff` tạo (`<vai trò>@staff.movafresh.local`; shipper `shipper1..4@`; nhà cung cấp `s-factory@`, `s-seafood@`, `s-truck@`, `s-lastmile@`, `s-pack@`).

| Vai trò | Phạm vi chức năng & Bảo mật dữ liệu |
|---|---|
| **`workshop`: Xưởng Đắk Lắk** | Hôm nay làm bao nhiêu (túi × gram), nhận nguyên liệu kèm mã lô và ảnh, đóng gói theo thùng, **in nhãn thùng (Order_Code, Batch_ID, Route_ID, Lot_IDs; không có tên khách)**, **nhập hiệu suất thực tế so chuẩn (lệch >5% bị cờ)**, xuất xe (**bắt buộc nhiệt độ + ảnh**: biên bản giao nhận lạnh bất biến), báo thiếu/hỏng và **hoàn tiền thiếu hàng hàng loạt** (xem trước có mã băm, rồi xác nhận). Offline Queue khi mất mạng. Không thấy thông tin cá nhân khách. |
| **`hub`: Kho phụ TP.HCM** | Nhận hàng đối chiếu PO, tồn kho theo lô và FEFO, truy xuất lô trong vài giây (mọi đơn bị ảnh hưởng), thu hồi lô (giữ đơn, bồi thường promo), nhận xe lạnh (**cần ảnh dỡ hàng và nhiệt độ**), ghép hải sản, chia tuyến theo Route_ID, xuất kho. Được thấy tên và địa chỉ người nhận để in phiếu tuyến. |
| **`dispatch`: Điều phối** | Kế hoạch & chốt sổ, **nút chốt sổ một chạm** (chốt sớm trước giờ cần lý do, có audit), **tải lệnh mua tổng (CSV)**, sức chứa ba giới hạn của chu kỳ (xưởng, xe theo hộp, xe theo kg), chuyến xe, lập tuyến, ngoại lệ giao hàng, chuỗi lạnh (giữ/hủy), chi phí logistics theo thùng và KPI. |
| **`purchasing`: Mua hàng** | Nhà cung cấp, SKU, bảng giá (cảnh báo khi giá mới làm món vượt 35% giá vốn), dự báo, PO (duyệt, gửi, đối chiếu ba chiều PO–phiếu nhận–hóa đơn, trả), mua trực tiếp, công nợ, thẻ điểm nhà cung cấp. Không thấy mã khách. |
| **`supplier`: Cổng nhà cung cấp** | Năm nhà cung cấp chính (`S-FACTORY`, `S-SEAFOOD`, `S-TRUCK`, `S-LASTMILE`, `S-PACK`): xác nhận PO, hóa đơn, trả lời khiếu nại, xem công nợ. **Chỉ thấy dữ liệu của chính mình.** |
| **`shipper`: Giao hàng** | Điểm dừng của tuyến mình, SĐT che một phần, gọi khách, đã giao (**ảnh bằng chứng nếu hướng dẫn giao yêu cầu**) hoặc không giao được (mở ngoại lệ). Không thấy tiền bạc hay mã khách. |
| **`accounting`: Kế toán** | Sổ Fresh Credit 2 ngăn, đề nghị điều chỉnh (admin duyệt), đối soát ngân hàng, doanh thu và hóa đơn theo từng lần giao, giá vốn và margin, công nợ và pay-run, dòng tiền, xuất bút toán CSV (cân đối nợ/có), **bảng giá vốn món (cờ đỏ khi >35%)**. |
| **`admin`: Quản trị / Founder** | Tổng quan founder, **hàng đợi thanh toán muộn** (xem mục 3A), duyệt điều chỉnh, ô toàn vẹn sổ cái, giám sát nhà cung cấp, bảng demo (chỉ bản dev). |

### 3A. Các luồng mới ở V2.3 (màn hình tương ứng)
- **Chốt sổ cứng:** tới giờ chốt (mặc định 08:00 ngày D-2, cấu hình ở máy chủ) hoặc khi admin bấm chốt, lô giao bị khóa, BOM và lệnh mua tổng được đóng băng. Tuần chưa trả ở lại DRAFT. Màn Kế hoạch & chốt sổ có nút chốt, giờ chốt và tải lệnh mua CSV.
- **Thanh toán muộn (`/thanh-toan-tre`, admin):** tiền tới sau khi lô khóa **không bao giờ** chui vào lô; mở một ngoại lệ chờ admin. Admin nhận (khi lô còn LOCKED và còn chỗ) hoặc từ chối: đơn dời sang ngày giao trống kế tiếp, hết chỗ thì tiền thành Fresh Credit (hoàn được). Khách nhận thông báo từng bước.
- **Hướng dẫn giao:** mỗi gói có hướng dẫn giao bắt buộc (mặc định "để ở lễ tân + shipper chụp ảnh"); shipper phải chụp ảnh khi hướng dẫn đòi.
- **Hiệu suất, truy xuất, chuỗi lạnh:** nhập hiệu suất thực tế; truy xuất lô liệt kê mọi đơn bị ảnh hưởng; các cạnh IN_TRANSIT và CROSS_DOCK của máy trạng thái đòi biên bản giao nhận lạnh (nhiệt độ + ảnh).
- **Hoàn tiền thiếu hàng hàng loạt:** xưởng báo thiếu một SKU, hệ thống phân bổ đơn bị ảnh hưởng theo mã đơn, xem trước (có mã băm), xác nhận trong một giao dịch, idempotent theo (đợt thiếu, tuần).
- **Bảng demo (`/demo`, chỉ `VITE_DEV_TOOLS=true`):** đồng hồ máy chủ giả lập, chạy job, dữ liệu mẫu, chuyển khoản ngân hàng giả có chữ ký (gọi `/dev/*` của backend).

---

## 4. HỆ THỐNG TRUY XUẤT NGUỒN GỐC KIỂU "WAZE" (CỘNG ĐỒNG XÁC NHẬN CHÉO)

Thay vì chi phí đắt đỏ cho Blockchain xa vời, MOVA Fresh triển khai mô hình xác thực phân tán:

### Thí điểm cho: THỊT BÒ ĂN CỎ TÂY NGUYÊN & GẠO HỮU CƠ ST25
1. **Lớp 1 — Giám sát của cán bộ MOVA:** Quét mã lô hàng, kiểm tra mẫu tồn dư thuốc BVTV / kháng sinh.
2. **Lớp 2 — Xác nhận chéo cộng đồng (Peer Validation):**
   - Nông dân các hộ lân cận trong cùng hợp tác xã quét xác nhận nhật ký canh tác thực tế.
   - Nhận điểm thưởng Fresh Credit khi đóng góp dữ liệu trung thực.
   - Người tiêu dùng quét mã QR trên hộp cơm xem hình ảnh nhật ký nông hộ được 3 bên xác nhận.

---

## 5. HỆ SINH THÁI AI AGENTS TỰ ĐỘNG HÓA

- **Pricing Agent:** Tự động đối chiếu giá thị trường, giá vốn đầu vào từ nhà máy Đắk Lắk, cân chỉnh đề xuất giá để bảo vệ **Gross Margin 20% – 30%** và Net Margin ~30%.
- **Marketing Agent:** Tự động tạo kịch bản video nấu 15 phút, hình ảnh mâm cơm theo mùa và bản tin công thức nấu ăn gửi khách hàng.
