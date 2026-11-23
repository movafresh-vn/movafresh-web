// Vai trò của app vận hành (nhãn và trang chủ). Đăng nhập là email + mật khẩu Supabase; vai trò và quyền do máy chủ quyết định (GET /ops/me).

export const ROLES = {
  workshop: { label: 'Xưởng Đắk Lắk', home: '/xuong' },
  hub: { label: 'Kho phụ TP.HCM', home: '/kho' },
  shipper: { label: 'Shipper', home: '/giao-hang' },
  supplier: { label: 'Nhà cung cấp', home: '/nha-cung-cap' },
  dispatch: { label: 'Điều phối logistics', home: '/ke-hoach' },
  purchasing: { label: 'Mua hàng', home: '/mua-hang' },
  accounting: { label: 'Kế toán', home: '/tai-chinh' },
  admin: { label: 'Admin / Founder', home: '/tong-quan' }
};
