// Danh sách phân hệ của app vận hành. `build` là prompt sẽ xây phần giao diện thật.
// `preview` quyết định dữ liệu đã lọc theo vai trò mà trang tạm hiển thị để kiểm tra.

export const MODULES = [
  { path: '/tong-quan', name: 'overview', title: 'Tổng quan', roles: ['admin'], build: 'P2D', preview: 'summary', note: 'Tiền vào/ra, nợ Fresh Credit, tỷ lệ bao phủ, margin, giữ chân, đúng giờ, hao hụt.' },
  { path: '/ke-hoach', name: 'plan', title: 'Kế hoạch & chốt sổ', roles: ['dispatch', 'admin', 'purchasing'], build: 'P2A', preview: 'plans', note: 'Nhu cầu theo SKU (đã chốt và dự kiến 4 tuần), phiếu sản xuất in được.' },
  { path: '/thanh-toan-tre', name: 'late-payments', title: 'Thanh toán muộn', roles: ['admin'], build: 'C22', preview: null, note: 'Tiền về sau khi lô đã khóa: admin nhận vào lô hoặc từ chối (dời ngày / hoàn Fresh Credit); khách được báo.' },
  { path: '/xuong', name: 'workshop', title: 'Xưởng Đắk Lắk', roles: ['workshop', 'admin'], build: 'P2A', preview: 'plans', note: 'Hôm nay làm bao nhiêu (túi × gram), nhận nguyên liệu kèm mã lô, đóng gói, in nhãn, xuất xe, báo thiếu/hỏng.' },
  { path: '/mua-hang', name: 'purchasing', title: 'Mua hàng', roles: ['purchasing', 'accounting', 'admin'], build: 'P2B', preview: 'pos', note: 'Nhà cung cấp, danh mục SKU, bảng giá, PO, đối chiếu 3 chiều, công nợ, mua trực tiếp và bảng kê. Kế toán xem PO, công nợ và chọn mẫu bảng kê.' },
  { path: '/nha-cung-cap', name: 'supplier', title: 'Cổng nhà cung cấp', roles: ['supplier', 'admin'], build: 'P2B', preview: 'pos', note: 'Xác nhận PO, xem dự báo, gửi hóa đơn, xem công nợ và ngày được trả (chỉ dữ liệu của chính mình).' },
  { path: '/kho', name: 'hub', title: 'Kho phụ TP.HCM', roles: ['hub', 'purchasing', 'admin', 'dispatch'], build: 'P2B', preview: 'orders', note: 'Nhận hàng đối chiếu PO, tồn kho theo lô và FEFO, thu hồi lô (P2B); nhận xe lạnh, ghép hải sản, chia khung giờ / tuyến, xuất kho (P2C).' },
  { path: '/truy-xuat', name: 'trace', title: 'Truy xuất nguồn gốc', roles: ['hub', 'purchasing', 'admin'], build: 'P2B', preview: 'orders', note: 'Tra cứu nguồn nguyên liệu, mẻ sơ chế, túi, thùng và các đơn bị ảnh hưởng theo lô.' },
  { path: '/logistics', name: 'logistics', title: 'Logistics', roles: ['dispatch', 'admin'], build: 'P2C', preview: 'orders', note: 'Khu và sức chứa khung giờ, chuyến chặng dài, lập tuyến, ngoại lệ giao hàng, chuỗi lạnh, chi phí và KPI.' },
  { path: '/giao-hang', name: 'shipper', title: 'Giao hàng', roles: ['shipper', 'dispatch', 'admin'], build: 'P2C', preview: 'orders', note: 'Điểm giao theo thứ tự, gọi khách (SĐT che một phần), đã giao / không giao được.' },
  { path: '/tai-chinh', name: 'finance', title: 'Tài chính & kế toán', roles: ['accounting', 'admin'], build: 'P2D', preview: 'orders', note: 'Sổ Fresh Credit 2 ngăn, đối soát thu VietQR và thẻ, doanh thu và hóa đơn, giá vốn và margin, công nợ và đợt chi, dòng tiền 30 ngày, xuất bút toán CSV.' },
  { path: '/giam-sat', name: 'monitoring', title: 'Giám sát nhà cung cấp', roles: ['admin', 'purchasing'], build: 'P2D', preview: 'suppliers', note: 'Thẻ điểm: giao đúng hạn, đáp ứng PO, đạt QC, chênh khối lượng, vượt nhiệt, khiếu nại, chênh giá so thị trường.' },
  { path: '/demo', name: 'demo', title: 'Bảng demo', roles: ['admin'], build: 'P0', preview: null, note: 'Đồng hồ máy chủ, chạy job, dữ liệu mẫu và tiền ngân hàng giả (chỉ bản dev).' }
];

import { devToolsEnabled } from '../shared/api/devApi';

/** Bảng demo (công cụ dev) chỉ có ở bản build VITE_DEV_TOOLS=true. */
export const modulesFor = (role, env = import.meta.env) => MODULES.filter((m) => m.roles.includes(role) && (m.name !== 'demo' || devToolsEnabled(env)));
