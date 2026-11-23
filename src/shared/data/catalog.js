// Danh mục mẫu dùng chung cho cả hai app (mã NL-*, XOT-*, HS-* theo docs/factory-requests/README.md).
// Bảng giá thực tế V2.2 (Meeting 17/11 & Market Pricing Sync).

/** nhóm nhiệt: chill (ngăn mát) | frozen (ngăn đông) | ambient (nhiệt độ thường) */
export const SKUS = {
  'NL-BO-01': { id: 'NL-BO-01', name: 'Thịt bò đùi nạc thái mỏng', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 235000, marketPriceVnd: 250000, requiresLot: true },
  'NL-BO-02': { id: 'NL-BO-02', name: 'Thăn bò cắt steak', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 280000, marketPriceVnd: 300000, requiresLot: true, hub: true },
  'NL-HEO-02': { id: 'NL-HEO-02', name: 'Ba rọi heo thảo mộc', unit: 'kg', temp: 'frozen', yield: 0.97, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 135000, marketPriceVnd: 145000, requiresLot: false },
  'NL-GA-03': { id: 'NL-GA-03', name: 'Ức gà phi lê', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 82000, marketPriceVnd: 90000, requiresLot: false },
  'NL-SUON-04': { id: 'NL-SUON-04', name: 'Sườn non heo cắt khúc', unit: 'kg', temp: 'frozen', yield: 0.85, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 135000, marketPriceVnd: 145000, requiresLot: false },
  'NL-RAU-01': { id: 'NL-RAU-01', name: 'Bông cải xanh baby', unit: 'kg', temp: 'chill', yield: 0.75, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 45000, marketPriceVnd: 50000, requiresLot: false },
  'NL-RAU-02': { id: 'NL-RAU-02', name: 'Cải ngọt Đắk Lắk', unit: 'kg', temp: 'chill', yield: 0.75, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 16000, marketPriceVnd: 20000, requiresLot: false },
  'NL-BI-05': { id: 'NL-BI-05', name: 'Bí đỏ gọt vỏ', unit: 'kg', temp: 'chill', yield: 0.70, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 15000, marketPriceVnd: 18000, requiresLot: false },
  'NL-CACHUA-06': { id: 'NL-CACHUA-06', name: 'Cà chua rửa sạch', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 20000, marketPriceVnd: 24000, requiresLot: false },
  'NL-GAO-01': { id: 'NL-GAO-01', name: 'Gạo ST25 hữu cơ', unit: 'kg', temp: 'ambient', yield: 1.0, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 36000, marketPriceVnd: 40000, requiresLot: true, hub: true },
  'NL-BUN-01': { id: 'NL-BUN-01', name: 'Bún gạo khô Tây Nguyên', unit: 'kg', temp: 'ambient', yield: 1.0, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 33000, marketPriceVnd: 38000, requiresLot: false },
  'NL-KHOAI-01': { id: 'NL-KHOAI-01', name: 'Khoai lang mật', unit: 'kg', temp: 'ambient', yield: 0.90, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 18000, marketPriceVnd: 22000, requiresLot: false },
  'NL-TRAI-02': { id: 'NL-TRAI-02', name: 'Chuối tiêu chín cây', unit: 'kg', temp: 'ambient', yield: 0.60, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 14000, marketPriceVnd: 17000, requiresLot: false },
  'NL-TRAI-03': { id: 'NL-TRAI-03', name: 'Vải thiều cấp đông nhanh IQF tách hạt', unit: 'kg', temp: 'frozen', yield: 0.85, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 38000, marketPriceVnd: 42000, requiresLot: false },
  'NL-BANHMI-01': { id: 'NL-BANHMI-01', name: 'Bánh mì baguette mini', unit: 'kg', temp: 'ambient', yield: 1.0, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 38000, marketPriceVnd: 42000, requiresLot: false, hub: true },
  'NL-MI-01': { id: 'NL-MI-01', name: 'Mì Ý khô', unit: 'kg', temp: 'ambient', yield: 1.0, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 48000, marketPriceVnd: 52000, requiresLot: false, hub: true },
  'HS-CA-01': { id: 'HS-CA-01', name: 'Cá bớp cắt khoanh', unit: 'kg', temp: 'chill', yield: 0.70, taxGroup: 'processed', supplierId: 'S-SEAFOOD', priceVnd: 190000, marketPriceVnd: 205000, requiresLot: false, hub: true },
  'HS-TOM-02': { id: 'HS-TOM-02', name: 'Tôm sú lột vỏ bỏ chỉ bóc nõn', unit: 'kg', temp: 'frozen', yield: 0.95, taxGroup: 'processed', supplierId: 'S-SEAFOOD', priceVnd: 270000, marketPriceVnd: 290000, requiresLot: false, hub: true },
  'BB-THUNG-01': { id: 'BB-THUNG-01', name: 'Bộ thùng cách nhiệt (thùng carton 3 lớp + túi xốp bạc + đá gel)', unit: 'pcs', temp: 'ambient', yield: 1.0, taxGroup: 'processed', supplierId: 'S-PACK', priceVnd: 14000, marketPriceVnd: 15500, requiresLot: false }
};

export const PACKAGING_SKU = 'BB-THUNG-01';

/** Gói xốt. Nhà máy tự chiết rót nên không có PO riêng, chỉ có số túi trong phiếu sản xuất. */
export const SAUCES = {
  'XOT-01': { id: 'XOT-01', name: 'Xốt Kho Tàu Củ Sen', grams: 80, shelfLifeDays: 14 },
  'XOT-02': { id: 'XOT-02', name: 'Xốt Tiêu Đen Tây Nguyên', grams: 60, shelfLifeDays: 21 },
  'XOT-03': { id: 'XOT-03', name: 'Xốt Canh Chua Nam Bộ', grams: 90, shelfLifeDays: 14 },
  'XOT-04': { id: 'XOT-04', name: 'Xốt Xào Tỏi Gừng', grams: 50, shelfLifeDays: 30 },
  'XOT-05': { id: 'XOT-05', name: 'Xốt Kho Tộ', grams: 70, shelfLifeDays: 14 },
  'XOT-06': { id: 'XOT-06', name: 'Xốt Kem Nấm Bơ Tỏi', grams: 80, shelfLifeDays: 14 },
  'XOT-07': { id: 'XOT-07', name: 'Xốt Rượu Vang Đỏ', grams: 60, shelfLifeDays: 21 },
  'XOT-08': { id: 'XOT-08', name: 'Xốt BBQ Khói', grams: 70, shelfLifeDays: 21 }
};

export const SUPPLIERS = {
  'S-FACTORY': { id: 'S-FACTORY', name: 'Nhà máy sơ chế MOVA Đắk Lắk', type: 'factory', termDays: 30, contact: 'Quản đốc nhà máy' },
  'S-SEAFOOD': { id: 'S-SEAFOOD', name: 'Đầu mối hải sản Vũng Tàu', type: 'seafood', termDays: 15, contact: 'Chủ đầu mối' },
  'S-TRUCK': { id: 'S-TRUCK', name: 'Nhà xe lạnh Tây Nguyên – Sài Gòn', type: 'long_haul', termDays: 15, contact: 'Điều độ xe' },
  'S-LASTMILE': { id: 'S-LASTMILE', name: 'Đội giao hàng chặng cuối', type: 'last_mile', termDays: 7, contact: 'Trưởng đội' },
  'S-PACK': { id: 'S-PACK', name: 'Xưởng bao bì cách nhiệt', type: 'packaging', termDays: 30, contact: 'Kinh doanh' }
};

/**
 * Món. kind: protein | veg | soup | carb | dessert.
 * western: món Tây, chỉ dùng cho bữa Tây (không nằm trong mâm cơm Việt).
 * carbAlt: các món tinh bột khác hợp với món này (mặc định luôn là cơm).
 * bom: gram nguyên liệu đã sơ chế cho MỖI NGƯỜI. sauce: mã xốt (1 túi cho mỗi món mỗi hộ).
 * tags: dùng cho lọc kiêng cữ (beef, pork, seafood, spicy, gluten, lactose).
 */
/** Cơ sở dinh dưỡng của mọi món: kcal/đạm tính cho 1 người ăn trong 1 bữa (không phải cả hộ, không phải 100g). */
export const NUTRITION_BASIS = 'per_person_per_meal';

/**
 * Phần cắt của từng món (F11). group: pork | beef | chicken | seafood | veg | soup | carb | fruit.
 * part: phần thịt/loại cụ thể (thigh_drumstick = má đùi gà, breast = ức gà...).
 * LƯU Ý: danh sách 16 món thật do đầu bếp (Anh Hiếu) cấp; 21 món dưới đây và giá trị cut/kcal/đạm
 * chỉ là DỮ LIỆU TẠM (placeholder) để dựng cấu trúc + validator, cần thay khi có danh sách chính thức.
 * D-PRT-003: BOM hiện vẫn là NL-GA-03 (ức gà phi lê) nhưng cut tạm ghi má đùi gà; đầu bếp cần chốt lại.
 */
export const DISH_CUTS = {
  'D-PRT-001': { group: 'pork', part: 'belly', label: 'Ba rọi heo' },
  'D-PRT-002': { group: 'beef', part: 'round', label: 'Đùi bò nạc' },
  'D-PRT-003': { group: 'chicken', part: 'thigh_drumstick', label: 'Má đùi gà' },
  'D-PRT-004': { group: 'pork', part: 'spare_rib', label: 'Sườn non heo' },
  'D-PRT-005': { group: 'seafood', part: 'fish_steak', label: 'Cá bớp cắt khoanh' },
  'D-PRT-006': { group: 'seafood', part: 'shrimp', label: 'Tôm sú bóc nõn' },
  'D-WST-001': { group: 'beef', part: 'tenderloin', label: 'Thăn ngoại bò' },
  'D-WST-002': { group: 'chicken', part: 'breast', label: 'Ức gà phi lê' },
  'D-WST-003': { group: 'pork', part: 'spare_rib', label: 'Sườn heo' },
  'D-VEG-001': { group: 'veg', part: 'floret', label: 'Bông cải xanh baby' },
  'D-VEG-002': { group: 'veg', part: 'leaf', label: 'Cải ngọt' },
  'D-SUP-001': { group: 'soup', part: 'spare_rib_pumpkin', label: 'Sườn non và bí đỏ' },
  'D-SUP-002': { group: 'soup', part: 'tomato', label: 'Cà chua' },
  'D-SUP-003': { group: 'soup', part: 'minced_chicken_breast', label: 'Cải ngọt và ức gà bằm' },
  'D-CRB-001': { group: 'carb', part: 'rice', label: 'Gạo ST25' },
  'D-CRB-002': { group: 'carb', part: 'rice_noodle', label: 'Bún gạo khô' },
  'D-CRB-003': { group: 'carb', part: 'sweet_potato', label: 'Khoai lang mật' },
  'D-CRB-004': { group: 'carb', part: 'baguette', label: 'Bánh mì baguette mini' },
  'D-CRB-005': { group: 'carb', part: 'pasta', label: 'Mì Ý khô' },
  'D-DST-002': { group: 'fruit', part: 'banana', label: 'Chuối tiêu' },
  'D-DST-003': { group: 'fruit', part: 'lychee', label: 'Vải thiều IQF tách hạt' }
};

const dish = (id, kind, name, o) => {
  const region = o.terroir_region || o.terroir || 'Đắk Lắk';
  const nutriServing = o.nutrition_per_serving || {
    calories: o.nutrition?.kcal || 0,
    protein_g: o.nutrition?.protein || 0,
    carbs_g: o.nutrition?.carb || 0,
    fat_g: o.nutrition?.fat || 0
  };
  const nutriCompat = o.nutrition || {
    kcal: nutriServing.calories,
    protein: nutriServing.protein_g,
    carb: nutriServing.carbs_g,
    fat: nutriServing.fat_g
  };
  const portion = o.portion_specs || {
    net_weight_grams: o.bom?.[0]?.gramsPerPerson || 100,
    size_detail: o.spec || '',
    storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày'
  };
  return {
    id,
    kind,
    name,
    tags: [],
    sauce: null,
    prepMinutes: 15,
    terroir_region: region,
    terroir: region,
    terroir_story: '',
    chef_note: '',
    spec: portion.size_detail || '',
    portion_specs: portion,
    nutrition_per_serving: nutriServing,
    nutrition: nutriCompat,
    cooking_steps: [],
    // F11: phần cắt + cơ sở tính dinh dưỡng (1 người / 1 bữa). Kiểm bởi shared/domain/catalogValidate.js.
    cut: DISH_CUTS[id] || null,
    nutrition_basis: NUTRITION_BASIS,
    ...o
  };
};

export const DISHES = {
  'D-PRT-001': dish('D-PRT-001', 'protein', 'Ba rọi heo thảo mộc Đắk Lắk kho củ sen', {
    bom: [{ sku: 'NL-HEO-02', gramsPerPerson: 120 }], sauce: 'XOT-01', tags: ['pork'], pricePerPersonVnd: 22500,
    terroir_region: 'Cư M\'gar • Đắk Lắk',
    terroir_story: 'Heo được nuôi bằng cám thảo mộc tự nhiên tại các nông trại vùng cao Cư M\'gar, cho thớ thịt săn chắc, tỷ lệ nạc mỡ cân bằng và không tanh. Kết hợp cùng củ sen Đắk Lắk giòn ngọt và xốt kho tàu truyền thống, mang lại mâm cơm đậm đà hương vị gia đình Tây Nguyên.',
    chef_note: 'Áp chảo thịt ba rọi trước cho xém cạnh tứa mỡ thơm lừng rồi mới đổ xốt kho tàu, miếng thịt sẽ bóng đẹp và đậm đà hơn.',
    portion_specs: {
      net_weight_grams: 120,
      size_detail: 'Ba rọi heo thảo mộc thái vuông quân cờ 3x3cm vừa ăn, kèm củ sen tươi thái lát 1cm đóng gói chân không',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày, hoặc ngăn đông -18°C dùng trong 30 ngày (rã đông tự nhiên 15 phút trước khi nấu)'
    },
    nutrition_per_serving: { calories: 460, protein_g: 26, carbs_g: 12, fat_g: 34 },
    nutrition: { kcal: 460, protein: 26, carb: 12, fat: 34 },
    cooking_steps: [
      'Bước 1 (3 phút): Làm nóng chảo, cho ba rọi vào áp chảo xém vàng đều hai mặt để săn thớ thịt.',
      'Bước 2 (9 phút): Đổ túi Xốt Kho Tàu Củ Sen cùng nửa chén nước lọc, đậy nắp om lửa liu riu cho ngấm sâu.',
      'Bước 3 (3 phút): Mở nắp, đảo đều tay trên lửa lớn đến khi xốt sánh bóng bám đều từng miếng thịt.'
    ]
  }),

  'D-PRT-002': dish('D-PRT-002', 'protein', 'Thăn bò ăn cỏ Tây Nguyên lúc lắc tiêu đen Chư Sê', {
    carbAlt: ['D-CRB-004'], bom: [{ sku: 'NL-BO-01', gramsPerPerson: 100 }], sauce: 'XOT-02', tags: ['beef'], pricePerPersonVnd: 29500,
    terroir_region: 'Chư Sê • Gia Lai',
    terroir_story: 'Những chú bò chăn thả tự nhiên trên đồi cỏ Bazan màu mỡ Tây Nguyên cho chất thịt ngọt đậm đà, thớ nạc mềm tự nhiên. Hòa quyện cùng hạt tiêu đen Chư Sê trứ danh vỏ mỏng, cay nồng và thơm phức ngay khi đảo trên chảo gang nóng.',
    chef_note: 'Chảo phải thật nóng trước khi trút bò vào, xào nhanh tay lửa lớn trong 2 phút để khóa trọn nước ngọt bên trong.',
    portion_specs: {
      net_weight_grams: 100,
      size_detail: 'Thăn bò đùi nạc ăn cỏ cắt khối vuông quân cờ lúc lắc 2x2cm, hút chân không chuẩn lạnh 0–2°C',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 48 tiếng để đảm bảo độ tươi ngọt tối đa của thịt bò'
    },
    nutrition_per_serving: { calories: 420, protein_g: 34, carbs_g: 18, fat_g: 24 },
    nutrition: { kcal: 420, protein: 34, carb: 18, fat: 24 },
    cooking_steps: [
      'Bước 1 (2 phút): Làm nóng chảo với 1 muỗng dầu ăn đến khi bốc khói nhẹ, cho thịt bò vào áp chảo 1 phút mỗi mặt.',
      'Bước 2 (8 phút): Rưới túi Xốt Tiêu Đen Chư Sê vào chảo, đảo nhanh tay lửa lớn cho xốt quyện tròn quanh khối thịt.',
      'Bước 3 (2 phút): Tắt bếp ngay khi bò vừa chín tới, dọn ra đĩa để giữ trọn vị mềm mọng.'
    ]
  }),

  'D-PRT-003': dish('D-PRT-003', 'protein', 'Gà đồi thả vườn Đắk Lắk nướng sả mật ong rừng', {
    carbAlt: ['D-CRB-003'], bom: [{ sku: 'NL-GA-03', gramsPerPerson: 120 }], sauce: 'XOT-04', pricePerPersonVnd: 19500,
    terroir_region: 'Buôn Đôn • Đắk Lắk',
    terroir_story: 'Gà thả đồi Buôn Đôn chạy nhảy tự do dưới tán rừng khộp, thịt dai ngọt tự nhiên và da giòn vàng ươm. Mật ong hoa rừng nguyên chất quyện cùng củ sả bản địa tạo nên mùi thơm quyến rũ đặc trưng khó quên.',
    chef_note: 'Nướng bằng nồi chiên không dầu ở 190°C trong 10 phút, phết xốt mật ong ở 2 phút cuối để da gà lên màu cánh gián bóng bẩy mà không bị cháy.',
    portion_specs: {
      net_weight_grams: 120,
      size_detail: 'Ức và đùi gà đồi lọc xương thái con thoi 2.5x5cm, sơ chế sạch da và ướp lạnh nhanh',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày, hoặc cấp đông -18°C'
    },
    nutrition_per_serving: { calories: 380, protein_g: 32, carbs_g: 14, fat_g: 22 },
    nutrition: { kcal: 380, protein: 32, carb: 14, fat: 22 },
    cooking_steps: [
      'Bước 1 (2 phút): Thấm khô miếng gà, phết 2/3 gói xốt sả mật ong lên đều khắp hai mặt.',
      'Bước 2 (10 phút): Nướng nồi chiên không dầu 190°C (hoặc áp chảo lửa vừa 5 phút mỗi mặt) đến khi vàng ruộm.',
      'Bước 3 (3 phút): Phết phần xốt còn lại, nướng thêm 1 phút cho dậy mùi thơm lừng rồi để nghỉ 2 phút trước khi thưởng thức.'
    ]
  }),

  'D-PRT-004': dish('D-PRT-004', 'protein', 'Sườn non heo Đắk Lắk rim mắm tỏi', {
    bom: [{ sku: 'NL-SUON-04', gramsPerPerson: 130 }], sauce: 'XOT-01', tags: ['pork'], pricePerPersonVnd: 26000,
    terroir_region: 'Buôn Ma Thuột • Đắk Lắk',
    terroir_story: 'Sườn non heo sạch từ các trang trại công nghệ cao tại Buôn Ma Thuột, nhiều nạc, dẻ sườn mềm và sụn giòn non. Hòa quyện cùng xốt mắm tỏi phi thơm nồng tạo nên món rim đưa cơm kinh điển của mâm cơm Việt.',
    chef_note: 'Chần sơ sườn trong nước sôi 1 phút trước khi rim sẽ giúp nước thịt trong, thơm và xốt bám óng ả hơn.',
    portion_specs: {
      net_weight_grams: 130,
      size_detail: 'Sườn non dẻ ngắn chặt khúc đều 3.5–4cm chuẩn từng miếng vừa gắp, rửa sạch màng mỡ thừa',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày, hoặc cấp đông sâu -18°C'
    },
    nutrition_per_serving: { calories: 490, protein_g: 30, carbs_g: 16, fat_g: 34 },
    nutrition: { kcal: 490, protein: 30, carb: 16, fat: 34 },
    cooking_steps: [
      'Bước 1 (2 phút): Chần sườn qua nước sôi 1 phút để sạch bọt, vớt ra để ráo nước.',
      'Bước 2 (10 phút): Cho sườn vào chảo cùng gói Xốt Mắm Tỏi và nửa chén nước, đun sôi rồi hạ lửa rim nhỏ.',
      'Bước 3 (3 phút): Đảo đều tay cho nước xốt kẹo lại bao quanh từng dọng sườn vàng cánh gián.'
    ]
  }),

  'D-PRT-005': dish('D-PRT-005', 'protein', 'Cá bớp biển Vũng Tàu kho tộ', {
    carbAlt: ['D-CRB-002'], bom: [{ sku: 'HS-CA-01', gramsPerPerson: 120 }], sauce: 'XOT-05', tags: ['seafood'], pricePerPersonVnd: 34500,
    terroir_region: 'Biển Vũng Tàu',
    terroir_story: 'Cá bớp tươi đánh bắt từ ngư trường Vũng Tàu cập cảng buổi sớm, thịt trắng ngần béo ngậy và lớp da dày giàu collagen tự nhiên. Xốt kho tộ đậm đà kiểu miền Nam ôm trọn từng thớ cá săn chắc, ăn cùng cơm trắng nóng hổi tuyệt hảo.',
    chef_note: 'Kho cá không đậy nắp ở 3 phút cuối để mặt cá săn chắc, mỡ cá tứa ra quyện vào xốt tạo độ bóng mượt tự nhiên.',
    portion_specs: {
      net_weight_grams: 120,
      size_detail: 'Cá bớp tươi làm sạch vảy cắt khoanh dày 2.5cm đều đặn, cấp lạnh nhanh duy trì độ đàn hồi thịt',
      storage_guide: 'Bảo quản ngăn mát 0–2°C dùng trong 48 tiếng để giữ nguyên độ tươi ngọt của biển'
    },
    nutrition_per_serving: { calories: 340, protein_g: 30, carbs_g: 10, fat_g: 18 },
    nutrition: { kcal: 340, protein: 30, carb: 10, fat: 18 },
    cooking_steps: [
      'Bước 1 (2 phút): Xếp từng khoanh cá bớp vào nồi hoặc chảo sâu lòng, rưới đều gói Xốt Kho Tộ lên mặt cá.',
      'Bước 2 (10 phút): Thêm 1/2 chén nước ấm, đun sôi bùng rồi hạ lửa nhỏ om liu riu trong 8–10 phút.',
      'Bước 3 (3 phút): Mở nắp, múc nước xốt rưới liên tục lên mình cá cho đến khi nước kho sánh lại thơm nức.'
    ]
  }),

  'D-PRT-006': dish('D-PRT-006', 'protein', 'Tôm sú biển Vũng Tàu rim cay nhẹ', {
    bom: [{ sku: 'HS-TOM-02', gramsPerPerson: 100 }], sauce: 'XOT-04', tags: ['seafood', 'spicy'], pricePerPersonVnd: 32500,
    terroir_region: 'Biển Vũng Tàu',
    terroir_story: 'Tôm sú tươi tự nhiên đánh bắt gần bờ tại vùng biển Vũng Tàu, nổi tiếng với độ giòn ngọt, vỏ mỏng và thớ thịt chắc nịch. Được bóc nõn tỉ mỉ, bỏ chỉ lưng sạch sẽ rồi rim cùng xốt ớt tỏi cay nhẹ làm ấm nồng mâm cơm chiều.',
    chef_note: 'Tôm biển chín rất nhanh, chỉ cần đảo trên chảo nóng 3–4 phút là thịt vừa giòn mọng, tránh rim quá lâu tôm sẽ teo cứng.',
    portion_specs: {
      net_weight_grams: 100,
      size_detail: 'Tôm sú biển Vũng Tàu bóc nõn rút chỉ sạch 100%, size 25–30 con/kg (khoảng 5–6 con lớn / 2 người)',
      storage_guide: 'Ngăn mát 0–2°C dùng trong ngày, hoặc ngăn đông -18°C (ngâm nước lạnh 5 phút rã đông cấp tốc)'
    },
    nutrition_per_serving: { calories: 280, protein_g: 28, carbs_g: 8, fat_g: 14 },
    nutrition: { kcal: 280, protein: 28, carb: 8, fat: 14 },
    cooking_steps: [
      'Bước 1 (2 phút): Làm nóng chảo với chút dầu ăn, trút tôm vào xào nhanh 1 phút đến khi chuyển màu hồng cam.',
      'Bước 2 (6 phút): Rưới gói Xốt Rim Cay vào chảo, hạ lửa vừa và đảo đều cho xốt phủ đều khắp thân tôm.',
      'Bước 3 (2 phút): Tắt bếp, rắc nhẹ tiêu đen và dọn ra đĩa khi tôm còn bốc khói nghi ngút.'
    ]
  }),

  'D-WST-001': dish('D-WST-001', 'protein', 'Thăn ngoại bò áp chảo xốt rượu vang đỏ kiểu Pháp', {
    western: true, carbAlt: ['D-CRB-003', 'D-CRB-005'], bom: [{ sku: 'NL-BO-02', gramsPerPerson: 130 }], sauce: 'XOT-07', tags: ['beef'], prepMinutes: 12, pricePerPersonVnd: 42500,
    terroir_region: 'Cao Nguyên Đắk Lắk',
    terroir_story: 'Phần thăn ngoại bò tuyển chọn từ đàn bò chăn thả tự nhiên vùng khí hậu ôn hòa Tây Nguyên, vân mỡ mảnh xen kẽ thịt đỏ cho độ mềm tan khi áp chảo. Xốt rượu vang đỏ cô đặc theo công thức bistro Pháp mang lại bữa tối sang trọng ngay tại căn bếp nhỏ.',
    chef_note: 'Lấy steak ra khỏi tủ lạnh 10 phút trước khi nấu và thấm thật khô mặt thịt để có lớp vỏ xém nâu (Maillard) thơm giòn hoàn hảo.',
    portion_specs: {
      net_weight_grams: 130,
      size_detail: 'Thăn ngoại bò cắt steak dày 2.2–2.5cm tiêu chuẩn nhà hàng, hút chân không định lượng từng phần',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 480, protein_g: 38, carbs_g: 8, fat_g: 32 },
    nutrition: { kcal: 480, protein: 38, carb: 8, fat: 32 },
    cooking_steps: [
      'Bước 1 (2 phút): Thấm khô 2 mặt thịt bò bằng giấy bếp, để chảo gang thật nóng với 1 muỗng dầu ô-liu.',
      'Bước 2 (7 phút): Áp chảo thịt 2.5 phút mỗi mặt cho mức Medium-Rare, lấy ra đĩa để thịt nghỉ 3 phút.',
      'Bước 3 (3 phút): Cho gói Xốt Vang Đỏ vào chảo nóng đảo đều 1 phút cho sôi nhẹ rồi rưới lên miếng steak.'
    ]
  }),

  'D-WST-002': dish('D-WST-002', 'protein', 'Ức gà đồi áp chảo xốt kem nấm bơ tỏi kiểu Ý', {
    western: true, carbAlt: ['D-CRB-005', 'D-CRB-004'], bom: [{ sku: 'NL-GA-03', gramsPerPerson: 140 }], sauce: 'XOT-06', tags: ['lactose'], prepMinutes: 12, pricePerPersonVnd: 24500,
    terroir_region: 'Cư M\'gar • Đắk Lắk',
    terroir_story: 'Ức gà phi lê đồi tươi ngon không hề khô bã nhờ chế độ vận động tự nhiên và thức ăn thảo mộc. Đi cùng xốt kem nấm bơ tỏi béo ngậy hương vị Tuscan nước Ý, hòa quyện tuyệt vời với mì Ý hoặc bánh mì giòn rụm.',
    chef_note: 'Áp chảo ức gà lửa vừa để bên ngoài vàng ươm mà bên trong vẫn mọng nước, sau đó hòa xốt kem nấm trực tiếp trong chảo.',
    portion_specs: {
      net_weight_grams: 140,
      size_detail: 'Ức gà phi lê tươi dày 2cm cắt vuông vức, lột da sạch mỡ thừa',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 430, protein_g: 36, carbs_g: 10, fat_g: 26 },
    nutrition: { kcal: 430, protein: 36, carb: 10, fat: 26 },
    cooking_steps: [
      'Bước 1 (2 phút): Thấm khô miếng ức gà, xoa nhẹ chút dầu ăn lên hai mặt.',
      'Bước 2 (8 phút): Áp chảo gà lửa vừa 4 phút mỗi mặt cho chín vàng ươm hai mặt.',
      'Bước 3 (2 phút): Hạ nhỏ lửa, đổ gói Xốt Kem Nấm Bơ Tỏi vào chảo đun lăn tăn 1 phút rồi dọn ra đĩa.'
    ]
  }),

  'D-WST-003': dish('D-WST-003', 'protein', 'Sườn heo nướng xốt BBQ khói kiểu Mỹ', {
    western: true, carbAlt: ['D-CRB-003', 'D-CRB-004'], bom: [{ sku: 'NL-SUON-04', gramsPerPerson: 150 }], sauce: 'XOT-08', tags: ['pork'], prepMinutes: 15, pricePerPersonVnd: 29500,
    terroir_region: 'Đắk Lắk',
    terroir_story: 'Những dẻ sườn heo dày thịt từ trang trại Đắk Lắk được ướp gói xốt BBQ khói gỗ sồi đậm đà chuẩn vị miền Tây nước Mỹ. Khi nướng chín, từng thớ thịt mềm róc xương thơm nức mũi kích thích vị giác cả nhà.',
    chef_note: 'Phết một lớp mỏng dầu ăn vào khay nướng, nướng mặt thịt trước rồi mới trở mặt xương để thịt không bị khô.',
    portion_specs: {
      net_weight_grams: 150,
      size_detail: 'Dẻ sườn non heo chặt tảng vừa khay nướng nồi chiên không dầu (dài 10–12cm)',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày, hoặc ngăn đông -18°C'
    },
    nutrition_per_serving: { calories: 520, protein_g: 32, carbs_g: 18, fat_g: 36 },
    nutrition: { kcal: 520, protein: 32, carb: 18, fat: 36 },
    cooking_steps: [
      'Bước 1 (2 phút): Phết đều 2/3 lượng xốt BBQ khói lên cả hai mặt dẻ sườn.',
      'Bước 2 (10 phút): Nướng nồi chiên không dầu 180°C trong 10 phút, trở mặt ở phút thứ 6.',
      'Bước 3 (3 phút): Phết phần xốt còn lại lên mặt thịt, nướng thêm 2 phút ở 200°C cho bề mặt caramen óng ả.'
    ]
  }),

  'D-VEG-001': dish('D-VEG-001', 'veg', 'Bông cải xanh baby Đà Lạt xốt dầu hào nấm', {
    bom: [{ sku: 'NL-RAU-01', gramsPerPerson: 90 }], sauce: 'XOT-04', prepMinutes: 7, pricePerPersonVnd: 8000,
    terroir_region: 'Đà Lạt • Lâm Đồng',
    terroir_story: 'Bông cải baby thu hoạch sáng sớm tại các nông trại sương mù Đà Lạt ở độ cao 1.500m, cho vị giòn ngọt thanh và giàu vitamin. Sơ chế sạch sẽ bằng công nghệ sục Ozone và cắt nhánh vừa miệng.',
    chef_note: 'Chần sơ bông cải trong nước sôi 45 giây rồi xào nhanh lửa lớn, bông cải sẽ giữ màu xanh mướt và độ giòn ngọt sần sật.',
    portion_specs: {
      net_weight_grams: 90,
      size_detail: 'Bông cải xanh baby Đà Lạt rửa sạch sục Ozone cắt nhánh đều 3–4cm',
      storage_guide: 'Ngăn mát 2–6°C dùng trong 4 ngày'
    },
    nutrition_per_serving: { calories: 90, protein_g: 5, carbs_g: 10, fat_g: 4 },
    nutrition: { kcal: 90, protein: 5, carb: 10, fat: 4 },
    cooking_steps: [
      'Bước 1 (2 phút): Chần bông cải vào nước sôi 45 giây rồi vớt ra ngâm nước lạnh để giữ màu xanh tươi.',
      'Bước 2 (4 phút): Làm nóng chảo với chút dầu, cho bông cải và gói Xốt Xào Dầu Hào Nấm vào đảo lửa lớn.',
      'Bước 3 (1 phút): Đảo đều trong 60 giây cho xốt áo đều từng nhánh cải rồi tắt bếp dọn ra đĩa.'
    ]
  }),

  'D-VEG-002': dish('D-VEG-002', 'veg', 'Cải ngọt hữu cơ Đắk Lắk xào tỏi', {
    bom: [{ sku: 'NL-RAU-02', gramsPerPerson: 100 }], sauce: 'XOT-04', prepMinutes: 5, pricePerPersonVnd: 6000,
    terroir_region: 'Đắk Lắk',
    terroir_story: 'Cải ngọt canh tác theo hướng hữu cơ trên đất đỏ Bazan màu mỡ Đắk Lắk, cọng giòn rụm và vị ngọt đậm đà khác biệt với rau bón đạm. Nhà máy rửa sạch bằng nước ngầm tinh khiết và cắt khúc tiêu chuẩn 4cm.',
    chef_note: 'Cho cọng cải vào xào trước 30 giây rồi mới cho phần lá vào, rau sẽ chín đều hoàn hảo mà không bị dập úa.',
    portion_specs: {
      net_weight_grams: 100,
      size_detail: 'Cải ngọt hữu cơ rửa sạch cắt khúc 4cm đóng khay bảo quản khí quyển biến đổi',
      storage_guide: 'Ngăn mát 2–6°C dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 70, protein_g: 3, carbs_g: 7, fat_g: 3 },
    nutrition: { kcal: 70, protein: 3, carb: 7, fat: 3 },
    cooking_steps: [
      'Bước 1 (1 phút): Phi thơm gói xốt tỏi gừng trên chảo nóng 20 giây cho dậy mùi thơm nức.',
      'Bước 2 (3 phút): Cho phần cọng cải vào xào trước 1 phút, sau đó trút phần lá vào đảo lửa lớn 2 phút.',
      'Bước 3 (1 phút): Tắt bếp khi rau vừa chín tới giữ độ giòn tươi nguyên bản.'
    ]
  }),

  'D-SUP-001': dish('D-SUP-001', 'soup', 'Canh sườn non Đắk Lắk hầm bí đỏ', {
    bom: [{ sku: 'NL-BI-05', gramsPerPerson: 100 }, { sku: 'NL-SUON-04', gramsPerPerson: 50 }], tags: ['pork'], prepMinutes: 15, pricePerPersonVnd: 12000,
    terroir_region: 'Đắk Lắk',
    terroir_story: 'Bí đỏ hồ lô giống bản địa dẻo ngọt bùi bùi được trồng xen trong rẫy cà phê Đắk Lắk, kết hợp cùng sườn non ngọt nước. Bát canh thanh mát bổ dưỡng bồi bổ khí huyết cho cả người lớn tuổi lẫn trẻ nhỏ.',
    chef_note: 'Nấu sườn cho ra nước ngọt trước 8 phút rồi mới thả bí đỏ vào, bí sẽ chín mềm bùi mà không bị nát vụn.',
    portion_specs: {
      net_weight_grams: 150,
      size_detail: 'Bí đỏ gọt vỏ cắt khối 3cm (100g) + Sườn non heo cắt khúc 3cm (50g)',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 150, protein_g: 10, carbs_g: 12, fat_g: 7 },
    nutrition: { kcal: 150, protein: 10, carb: 12, fat: 7 },
    cooking_steps: [
      'Bước 1 (3 phút): Đun sôi 800ml nước, thả sườn non vào hớt bọt cho nước canh trong ngọt.',
      'Bước 2 (9 phút): Thả bí đỏ vào nồi, đậy nắp nấu lửa vừa trong 8 phút đến khi bí chín bở bùi.',
      'Bước 3 (3 phút): Nêm gói gia vị canh vừa miệng, rắc chút hành ngò rồi tắt bếp.'
    ]
  }),

  'D-SUP-002': dish('D-SUP-002', 'soup', 'Canh chua cà chua Đà Lạt nấu kiểu Nam Bộ', {
    carbAlt: ['D-CRB-002'], bom: [{ sku: 'NL-CACHUA-06', gramsPerPerson: 120 }], sauce: 'XOT-03', prepMinutes: 10, pricePerPersonVnd: 7000,
    terroir_region: 'Đà Lạt • Lâm Đồng',
    terroir_story: 'Những trái cà chua chín mọng dưới nắng trời Đà Lạt căng bóng và dồi dào chất chống oxy hóa lycopene. Nấu cùng xốt canh chua me Nam Bộ hài hòa vị chua thanh dịu ngọt, giải ngấy cực tốt cho ngày nắng nóng.',
    chef_note: 'Xào sơ cà chua với xốt 1 phút trước khi đổ nước sôi, canh sẽ có màu đỏ cam tự nhiên tuyệt đẹp.',
    portion_specs: {
      net_weight_grams: 120,
      size_detail: 'Cà chua Đà Lạt rửa sạch cắt múi cau 6 miếng, đi kèm gói xốt canh chua cốt me Nam Bộ',
      storage_guide: 'Ngăn mát 2–6°C dùng trong 4 ngày'
    },
    nutrition_per_serving: { calories: 60, protein_g: 2, carbs_g: 11, fat_g: 1 },
    nutrition: { kcal: 60, protein: 2, carb: 11, fat: 1 },
    cooking_steps: [
      'Bước 1 (2 phút): Đảo sơ 1/2 lượng cà chua trên chảo với 1 muỗng dầu để tạo màu nước canh cam đỏ đẹp mắt.',
      'Bước 2 (6 phút): Đổ 800ml nước ấm và gói Xốt Canh Chua vào đun sôi bùng trong 5 phút.',
      'Bước 3 (2 phút): Cho phần cà chua còn lại vào, đun sôi lại 1 phút rồi tắt bếp để giữ độ giòn của cà.'
    ]
  }),

  'D-SUP-003': dish('D-SUP-003', 'soup', 'Canh cải ngọt Đắk Lắk nấu thịt bằm', {
    bom: [{ sku: 'NL-RAU-02', gramsPerPerson: 80 }, { sku: 'NL-GA-03', gramsPerPerson: 30 }], prepMinutes: 10, pricePerPersonVnd: 7000,
    terroir_region: 'Đắk Lắk',
    terroir_story: 'Món canh quốc dân thanh tao làm mát lòng người Việt: cải ngọt tươi giòn thu hái tại nông trại Đắk Lắk nấu cùng thịt nạc xay ngọt thanh. Nhẹ bụng, dễ tiêu hóa và nấu siêu tốc chỉ trong 8 phút.',
    chef_note: 'Dầm tơi thịt bằm trong nước lọc nguội trước khi bắc lên bếp, thịt sẽ không bị vón cục mà tơi mềm đều đặn.',
    portion_specs: {
      net_weight_grams: 110,
      size_detail: 'Cải ngọt rửa sạch thái nhỏ 2cm (80g) + Thịt ức gà/nạc heo tươi xay nhuyễn (30g)',
      storage_guide: 'Ngăn mát 0–4°C dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 80, protein_g: 8, carbs_g: 4, fat_g: 3 },
    nutrition: { kcal: 80, protein: 8, carb: 4, fat: 3 },
    cooking_steps: [
      'Bước 1 (2 phút): Cho thịt bằm vào nồi cùng 700ml nước, khuấy nhẹ cho tơi thịt rồi bật bếp đun sôi.',
      'Bước 2 (6 phút): Khi nước sôi, hớt nhẹ bọt rồi trút toàn bộ cải ngọt vào nấu sôi lại trong 3 phút.',
      'Bước 3 (2 phút): Nêm vừa khẩu vị, rắc tiêu xay và tắt bếp ngay khi cọng cải vừa trong.'
    ]
  }),

  'D-CRB-001': dish('D-CRB-001', 'carb', 'Gạo thơm dẻo ST25 hữu cơ Sóc Trăng', {
    bom: [{ sku: 'NL-GAO-01', gramsPerPerson: 80 }], prepMinutes: 0, pricePerPersonVnd: 4500,
    terroir_region: 'Sóc Trăng • ĐBSCL',
    terroir_story: 'Giống gạo ngon nhất thế giới trồng trên vùng đất phù sa trù phú Sóc Trăng theo tiêu chuẩn hữu cơ. Hạt gạo dài trắng trong, khi chín cho hạt cơm mềm dẻo, thơm ngát mùi lá dứa và giữ nguyên vị ngọt đậm đà ngay cả khi để nguội.',
    chef_note: 'Gạo ST25 chuẩn không cần vo kỹ làm mất cám; tỷ lệ nước vàng là 1 chén gạo : 1 đến 1.1 chén nước.',
    portion_specs: {
      net_weight_grams: 80,
      size_detail: 'Gạo ST25 hữu cơ nguyên hạt hút chân không túi zip phân liều theo tuần',
      storage_guide: 'Nhiệt độ thường thoáng mát, tránh ánh nắng trực tiếp'
    },
    nutrition_per_serving: { calories: 280, protein_g: 6, carbs_g: 62, fat_g: 1 },
    nutrition: { kcal: 280, protein: 6, carb: 62, fat: 1 },
    cooking_steps: [
      'Bước 1 (1 phút): Tráng nhẹ gạo qua một lần nước sạch, không chà xát mạnh.',
      'Bước 2 (18 phút): Cho vào nồi cơm điện với tỷ lệ 1 bát gạo : 1.1 bát nước, bật chế độ nấu cơm tự động.',
      'Bước 3 (1 phút): Khi cơm chín, xới đều hạt cơm tơi xốp và ủ ấm 5 phút trước khi xới ra bát.'
    ]
  }),

  'D-CRB-002': dish('D-CRB-002', 'carb', 'Bún gạo khô truyền thống Tây Nguyên', {
    bom: [{ sku: 'NL-BUN-01', gramsPerPerson: 70 }], prepMinutes: 5, pricePerPersonVnd: 4000,
    terroir_region: 'Ea Kar • Đắk Lắk',
    terroir_story: 'Bún được làm hoàn toàn từ gạo nương Tây Nguyên và nguồn nước suối nguồn Ea Kar tinh khiết, phơi sấy chậm truyền thống không chất bảo quản. Sợi bún trắng ngà tự nhiên, dai mềm dẻo dai và không bị chua nát.',
    chef_note: 'Chần bún trong nước sôi có pha vài giọt dầu ăn và chút muối, sợi bún sẽ tơi mướt và không bị dính vào nhau.',
    portion_specs: {
      net_weight_grams: 70,
      size_detail: 'Bún gạo khô sợi tròn dài truyền thống đóng gói kín 70g/phần',
      storage_guide: 'Nhiệt độ thường, nơi khô ráo thoáng mát'
    },
    nutrition_per_serving: { calories: 250, protein_g: 4, carbs_g: 56, fat_g: 1 },
    nutrition: { kcal: 250, protein: 4, carb: 56, fat: 1 },
    cooking_steps: [
      'Bước 1 (1 phút): Đun sôi 1 lít nước trên bếp.',
      'Bước 2 (3 phút): Thả bún khô vào luộc trong 3–4 phút đến khi sợi bún mềm dẻo.',
      'Bước 3 (1 phút): Vớt bún ra xả nhanh qua nước lạnh, để ráo nước và dọn kèm món kho hoặc canh.'
    ]
  }),

  'D-CRB-003': dish('D-CRB-003', 'carb', 'Khoai lang mật nướng đất đỏ Đắk Lắk', {
    bom: [{ sku: 'NL-KHOAI-01', gramsPerPerson: 150 }], prepMinutes: 0, pricePerPersonVnd: 5000, lowCarb: true,
    terroir_region: 'Krông Búk • Đắk Lắk',
    terroir_story: 'Khoai lang mật trồng trên vùng đồi Bazan Krông Búk nhiều nắng gió, tích lũy lượng mật tự nhiên ngọt lịm và ruột vàng cam óng ả. Nguồn tinh bột giàu chất xơ, hỗ trợ bữa ăn cân đối (thông tin dinh dưỡng chỉ mang tính tham khảo).',
    chef_note: 'Nướng nồi chiên không dầu ở 180°C trong 15 phút, mật khoai sẽ tứa ra thơm nức mũi như nướng than hoa.',
    portion_specs: {
      net_weight_grams: 150,
      size_detail: 'Khoai lang mật rửa sạch cạo rễ cắt khúc vừa nướng 150g/suất',
      storage_guide: 'Nhiệt độ phòng thoáng mát 5–7 ngày'
    },
    nutrition_per_serving: { calories: 180, protein_g: 3, carbs_g: 41, fat_g: 0 },
    nutrition: { kcal: 180, protein: 3, carb: 41, fat: 0 },
    cooking_steps: [
      'Bước 1 (1 phút): Xếp từng khúc khoai đã cắt vào khay nồi chiên không dầu.',
      'Bước 2 (12 phút): Bật nồi chiên ở nhiệt độ 180°C nướng trong 12 phút.',
      'Bước 3 (2 phút): Trở mặt nướng thêm 3 phút cho mật khoai dẻo quánh vàng ươm.'
    ]
  }),

  'D-CRB-004': dish('D-CRB-004', 'carb', 'Bánh mì baguette mini nướng bơ tỏi', {
    bom: [{ sku: 'NL-BANHMI-01', gramsPerPerson: 60 }], tags: ['gluten', 'lactose'], prepMinutes: 3, pricePerPersonVnd: 4500,
    terroir_region: 'TP.HCM',
    terroir_story: 'Bánh mì baguette mini vỏ mỏng giòn rụm theo phong cách bánh mì Sài Gòn, ruột xốp mềm. Được quết sẵn bơ lạt cao cấp và tỏi băm thơm nức, ăn kèm hoàn hảo với các món bò lúc lắc hoặc gà sốt kem.',
    chef_note: 'Chỉ cần nướng 2–3 phút trong nồi chiên không dầu là bánh giòn rụm, đừng nướng quá lâu bánh sẽ bị khô cứng.',
    portion_specs: {
      net_weight_grams: 60,
      size_detail: '2 chiếc bánh mì baguette mini kèm gói xốt bơ tỏi phết sẵn',
      storage_guide: 'Ngăn mát hoặc nhiệt độ phòng dùng trong 3 ngày'
    },
    nutrition_per_serving: { calories: 230, protein_g: 7, carbs_g: 40, fat_g: 5 },
    nutrition: { kcal: 230, protein: 7, carb: 40, fat: 5 },
    cooking_steps: [
      'Bước 1 (1 phút): Phết đều lớp bơ tỏi lên bề mặt bánh mì mini đã xẻ rãnh.',
      'Bước 2 (2 phút): Cho vào nồi chiên không dầu nướng 170°C trong 2 phút.',
      'Bước 3 (1 phút): Lấy bánh ra khi vỏ vừa vàng giòn rụm và mùi bơ tỏi tỏa ngào ngạt.'
    ]
  }),

  'D-CRB-005': dish('D-CRB-005', 'carb', 'Mì Ý xốt cà chua tươi Đà Lạt', {
    bom: [{ sku: 'NL-MI-01', gramsPerPerson: 80 }], tags: ['gluten'], prepMinutes: 8, pricePerPersonVnd: 5000,
    terroir_region: 'Đà Lạt • Lâm Đồng',
    terroir_story: 'Sợi mì Ý spaghetti nhập khẩu chuẩn Al Dente dai mềm kết hợp cùng xốt cà chua tươi hái từ vườn nhà kính Đà Lạt. Mang lại hương vị Địa Trung Hải tinh tế nhưng quen thuộc, các bé cực kỳ yêu thích.',
    chef_note: 'Luộc mì với nước sôi có thêm 1 nhúm muối nhỏ, vớt ra trộn ngay chút dầu ô liu để sợi mì không dính và bóng mượt.',
    portion_specs: {
      net_weight_grams: 80,
      size_detail: 'Mì Ý khô spaghetti 80g + gói xốt cà chua tươi Đà Lạt cô đặc 60g',
      storage_guide: 'Nhiệt độ phòng khô ráo'
    },
    nutrition_per_serving: { calories: 280, protein_g: 10, carbs_g: 56, fat_g: 2 },
    nutrition: { kcal: 280, protein: 10, carb: 56, fat: 2 },
    cooking_steps: [
      'Bước 1 (2 phút): Đun sôi 1 lít nước với 1/2 muỗng cà phê muối, thả mì Ý vào luộc.',
      'Bước 2 (6 phút): Luộc mì trong 6–7 phút đến độ dai Al Dente, vớt ra để ráo.',
      'Bước 3 (2 phút): Đảo mì nóng với xốt cà chua tươi trên chảo 1 phút cho xốt ngấm sâu vào từng sợi mì.'
    ]
  }),

  'D-DST-002': dish('D-DST-002', 'dessert', 'Chuối tiêu chín cây vườn Đắk Lắk', {
    bom: [{ sku: 'NL-TRAI-02', gramsPerPerson: 120 }], prepMinutes: 0, pricePerPersonVnd: 4500,
    terroir_region: 'Cư M\'gar • Đắk Lắk',
    terroir_story: 'Chuối tiêu giống bản địa chín cây tự nhiên tại các nương rẫy vùng cao Cư M\'gar, vỏ mỏng vàng lốm đốm trứng cuốc, thịt dẻo thơm và vị ngọt đậm đà giàu kali tự nhiên.',
    chef_note: 'Ăn tráng miệng sau bữa chính 15–20 phút giúp tiêu hóa nhẹ nhàng và bổ sung chất xơ hòa tan.',
    portion_specs: {
      net_weight_grams: 120,
      size_detail: 'Chuối tiêu chín cây tự nhiên cắt tỉa từng trái chọn lọc (khoảng 1–2 quả vừa / người)',
      storage_guide: 'Nhiệt độ phòng mát mẻ, không bảo quản ngăn mát tủ lạnh để vỏ chuối không bị thâm'
    },
    nutrition_per_serving: { calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
    nutrition: { kcal: 105, protein: 1, carb: 27, fat: 0 },
    cooking_steps: [
      'Bước 1 (1 phút): Bóc vỏ nhẹ nhàng từ cuống và thưởng thức vị ngọt thơm tự nhiên sau bữa ăn.'
    ]
  }),

  'D-DST-003': dish('D-DST-003', 'dessert', 'Vải thiều cấp đông nhanh IQF (quay lò vi sóng 1 phút tươi 90%)', {
    bom: [{ sku: 'NL-TRAI-03', gramsPerPerson: 100 }], prepMinutes: 1, pricePerPersonVnd: 7500,
    terroir_region: 'Tây Nguyên',
    terroir_story: 'Vải thiều chín rộ được bóc vỏ, tách hạt sạch sẽ và đưa ngay vào buồng cấp đông siêu tốc IQF -40°C trong vòng 2 giờ sau thu hái. Công nghệ giữ nguyên vẹn 90% độ mọng nước, cấu trúc thịt giòn ngọt và dưỡng chất như trái tươi vừa hái tại vườn.',
    chef_note: 'Chỉ cần quay lò vi sóng 60 giây ở mức trung bình (hoặc để ngoài nhiệt độ phòng 5 phút), cắn vào sẽ cảm nhận ngay vị ngọt lịm mọng nước mát lạnh sảng khoái.',
    portion_specs: {
      net_weight_grams: 100,
      size_detail: 'Vải thiều cấp đông nhanh IQF bóc vỏ tách hạt sạch 100%, túi zip kín 100g (khoảng 5–6 quả dày cùi)',
      storage_guide: 'Ngăn đông -18°C dùng trong 6 tháng, rã đông 1 phút lò vi sóng hoặc 5 phút tự nhiên'
    },
    nutrition_per_serving: { calories: 66, protein_g: 1, carbs_g: 17, fat_g: 0 },
    nutrition: { kcal: 66, protein: 1, carb: 17, fat: 0 },
    cooking_steps: [
      'Bước 1 (1 phút): Lấy túi vải thiều IQF ra khỏi ngăn đông, cho vào đĩa sạch.',
      'Bước 2 (1 phút): Quay lò vi sóng 60 giây ở mức trung bình (hoặc ngâm đĩa trong nước ấm 3 phút).',
      'Bước 3 (1 phút): Thưởng thức từng quả vải mọng nước mát lạnh, tươi giòn ngọt lịm.'
    ]
  })
};
