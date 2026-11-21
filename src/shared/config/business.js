// MỌI con số kinh doanh và vận hành nằm ở đây. Không viết cứng trong component.
// Các số đánh dấu (giả định) là số minh họa, chờ founder / anh Trung chốt, và số thật
// phải lấy từ nghiên cứu 200 hộ. Xem prompts/README.md, mục "Việc cần làm trước khi chạy".

const SLOTS = {
  morning: { id: 'early_morning_06_08', label: 'Sáng sớm 06:00 – 08:00', startHour: 6, startMin: 0, endHour: 8, endMin: 0, short: 'S' },
  noon: { id: 'noon_11_13', label: 'Buổi trưa 11:00 – 13:00', startHour: 11, startMin: 0, endHour: 13, endMin: 0, short: 'T' },
  evening: { id: 'evening_18_21', label: 'Tối muộn 18:30 – 21:00', startHour: 18, startMin: 30, endHour: 21, endMin: 0, short: 'M' }
};

const slot = (key, capacityBoxes) => ({ ...SLOTS[key], capacityBoxes });

export const BUSINESS = {
  unitEconomics: {
    maxMaterialsAndShippingPct: 0.50, // Ràng buộc cốt lõi: Tổng chi phí Nguyên liệu + Vận chuyển <= 50% giá bán
    maxCogsPct: 0.55, // Hệ số giá vốn tối đa 55% (bao gồm sơ chế & bao bì)
    opexAndMktPct: 0.15, // Opex & MKT 15%
    targetNetMarginPct: 0.30, // Giữ Lợi nhuận ròng mục tiêu ~30%
    standardFillMealsPerDelivery: 6, // Định mức lấp đầy chuẩn: 6 bữa / 1 lần giao
    boxPackaging: {
      sku: 'BB-THUNG-01',
      totalVnd: 14000, // 14.000đ / hộp
      carton3LayersVnd: 5500, // Thùng carton 3 lớp 5.500đ
      foamSilverBagVnd: 3200, // Túi xốp bạc giữ nhiệt 3.200đ
      iceGelVnd: 5300 // Đá gel giữ lạnh 5.300đ
    },
    lastMileDeliveryVnd: 25000, // Phí giao chặng cuối nội thành TP.HCM (Ahamove 4H / Lalamove Van 3H gom tuyến): 25.000đ / lần giao
    allocatedPackagingAndShippingPerMealVnd: 6500, // (14.000 + 25.000) / 6 = 6.500đ / bữa
    allocationRatio: {
      protein: 0.50,
      veg: 0.15,
      soup: 0.15,
      carb: 0.10,
      dessert: 0.10
    }
  },

  subscription: {
    minWeeks: 4,
    defaultWeeks: 4,
    // Tạm hoãn tối đa bao nhiêu tuần trong một chu kỳ (giả định)
    maxSkipWeeksPerCycle: 1,
    // Còn từng này tuần (hoặc ít hơn) chưa giao thì app mời khách gia hạn. Gia hạn luôn cần khách đồng ý rõ ràng.
    renewPromptAtRemainingWeeks: 1
  },

  // Đồng hồ vận hành. Mọi mốc tính theo giờ Việt Nam.
  timings: {
    chargeBeforeDeliveryHours: 72, // trừ tiền trước giờ giao 72 tiếng
    remindBeforeDeliveryHours: 24, // báo khách khung giờ giao trước 24 tiếng
    notifyBeforeChargeHours: 24, // báo khách thực đơn tuần sau + số tiền + hạn đổi món trước mốc trừ tiền 24 tiếng
    cutoffDaysBeforeDelivery: 2, // chốt sổ vào D-2 (giả định, chờ chốt với nhà máy)
    cutoffHour: 8,
    cutoffMinute: 0,
    truckDepartHour: 16, // xe lạnh rời Đắk Lắk lúc 16:00 ngày D-1 (giả định)
    hubArrivalHour: 3 // xe tới kho phụ TP.HCM lúc 03:00 ngày D (giả định)
  },

  incentives: {
    // Thẻ quà tặng trải đều theo tuần. Số 900k chỉ là ví dụ (giả định).
    giftCardWeeklyVnd: [300000, 200000, 200000, 200000],
    // Thẻ quà tặng tối đa bao nhiêu % giá trị gói 4 tuần (gói nhỏ không được miễn phí trọn tuần 1)
    giftCardMaxPctOfPackage: 0.2,
    // Trần tổng ưu đãi chu kỳ đầu = thẻ quà tặng + thưởng nạp (giả định)
    maxFirstCycleDiscountPct: 0.3,
    // Mã thẻ quà tặng phễu /plans gửi kèm khi đăng ký (bản thật do chiến dịch quảng cáo cấp)
    giftCardCode: 'THEQUATANG',
    // Ưu đãi chiết khấu khi mua Gói Suất ăn trả trước khoảng 10%
    topUpPacks: [
      { id: 'standard', label: 'Gói 4 tuần Tiêu chuẩn (20 bữa ~ 40 suất)', payVnd: 1500000, bonusPct: 0.1, weeks: 4, meals: 20, portions: 40 },
      { id: 'family', label: 'Gói 4 tuần Gia đình (24 bữa ~ 72 suất)', payVnd: 2800000, bonusPct: 0.1, weeks: 4, meals: 24, portions: 72 },
      { id: 'premium', label: 'Gói 13 tuần Dinh dưỡng (65 bữa ~ 195 suất)', payVnd: 5000000, bonusPct: 0.1, weeks: 13, meals: 65, portions: 195 }
    ],
    rewards: {
      profileComplete: 20000,
      share: 20000,
      referrer: 100000,
      referee: 100000
    },
    // Chia sẻ nhận thưởng tối đa bao nhiêu lần mỗi tuần (giả định, chống chia sẻ vòng)
    maxShareRewardsPerWeek: 2,
    // Mức nạp thêm tối thiểu ngoài các gói nạp
    minTopUpVnd: 100000
  },

  // Phễu đăng ký /plans
  plan: {
    householdMin: 1,
    householdMax: 10,
    householdDefault: 2,
    mealsPerWeekMin: 3,
    mealsPerWeekMax: 7,
    mealsPerWeekDefault: 5,
    // Số bữa Tây mỗi tuần khi khách chọn "Việt + 1–2 bữa Tây": từ 5 bữa/tuần trở lên thì 2 bữa
    westernMealsWhenMixed: { base: 1, withMealsAtLeast: 5, extra: 2 },
    // Hệ số khi khách trả lời các câu hỏi giá trị ở bước thực đơn
    upsells: { proteinFactor: 1.3, lowCarbCarbFactor: 0.5, lowCarbVegFactor: 1.5 },
    // Mức chi tiêu đi chợ mỗi tuần (câu tùy chọn): trần mềm cho AI, không hiện như tiêu đề
    groceryBudgetChoicesVnd: [500000, 1000000, 1500000, 2500000]
  },

  credit: {
    // Thứ tự trừ hai ngăn Fresh Credit. Mặc định trừ tiền thật trước (giảm nghĩa vụ hoàn tiền).
    spendOrder: ['real', 'promo']
  },

  // Khu giao: nhóm quận/huyện, ngày giao trong tuần (0 = Chủ Nhật), khung giờ và sức chứa (thùng).
  zones: [
    {
      id: 'Z1', name: 'Quận 1 – Quận 3 – Phú Nhuận',
      districts: ['Quận 1', 'Quận 3', 'Phú Nhuận'],
      deliveryDays: [1, 4],
      slots: [slot('morning', 30), slot('noon', 30), slot('evening', 40)]
    },
    {
      id: 'Z2', name: 'Quận 7 – Nhà Bè',
      districts: ['Quận 7', 'Nhà Bè'],
      deliveryDays: [2, 5],
      slots: [slot('morning', 30), slot('evening', 40)]
    },
    {
      id: 'Z3', name: 'Bình Thạnh',
      districts: ['Bình Thạnh'],
      deliveryDays: [1, 4],
      slots: [slot('morning', 25), slot('noon', 25), slot('evening', 35)]
    },
    {
      id: 'Z4', name: 'Thủ Đức',
      districts: ['Thủ Đức', 'TP. Thủ Đức'],
      deliveryDays: [2, 6],
      slots: [slot('morning', 25), slot('evening', 35)]
    },
    {
      id: 'Z5', name: 'Quận 10 – Tân Bình – Tân Phú',
      districts: ['Quận 10', 'Tân Bình', 'Tân Phú'],
      deliveryDays: [3, 6],
      slots: [slot('morning', 25), slot('noon', 25), slot('evening', 35)]
    },
    {
      id: 'Z6', name: 'Gò Vấp – Quận 12',
      districts: ['Gò Vấp', 'Quận 12'],
      deliveryDays: [3, 0],
      slots: [slot('morning', 20), slot('evening', 30)]
    },
    {
      id: 'Z7', name: 'Dĩ An – Thuận An (Bình Dương)',
      districts: ['Dĩ An', 'Thuận An'],
      province: 'Bình Dương',
      deliveryDays: [2, 5],
      slots: [slot('evening', 20)]
    },
    {
      id: 'Z8', name: 'Biên Hòa (Đồng Nai)',
      districts: ['Biên Hòa'],
      province: 'Đồng Nai',
      deliveryDays: [3, 6],
      slots: [slot('evening', 20)]
    }
  ],

  // Ngưỡng nhiệt độ chuỗi lạnh (°C)
  temperature: {
    chill: { min: 0, max: 4 },
    frozen: { max: -18 }
  },

  // Màu sticker theo nhóm nhiệt (chỉ hiện ở app vận hành, không hiện ở app khách)
  stickers: {
    chill: { color: 'green', label: 'Sticker Xanh (Ngăn mát)' },
    frozen: { color: 'blue', label: 'Sticker Xanh Dương (Ngăn đông)' },
    ambient: { color: null, label: 'Không dán sticker' }
  },

  // Xưởng Đắk Lắk (P2A)
  factory: {
    // Chuyến xe lạnh Đắk Lắk -> TP.HCM (giả định). slotIds: các khung giờ giao được chở trên chuyến này.
    // Chuyến 1 rời 16:00 (đúng timings.truckDepartHour), tới kho phụ 03:00 nên kịp khung sáng sớm.
    // Chuyến 2 rời 20:00 tới khoảng 07:00, chở hàng cho khung trưa và tối.
    trips: [
      { id: 'T1', label: 'Chuyến 1', departHour: 16, departMin: 0, slotIds: [SLOTS.morning.id] },
      { id: 'T2', label: 'Chuyến 2', departHour: 20, departMin: 0, slotIds: [SLOTS.noon.id, SLOTS.evening.id] }
    ],
    // Cỡ túi và hạn dùng mặc định khi SKU chưa khai báo ở data/packaging.js (giả định)
    defaultBagGrams: 250,
    shelfDaysByTemp: { chill: 4, frozen: 30, ambient: 60 },
    // Nút cộng nhanh khi ghi số túi đã làm
    quickAdds: [10, 50],
    // Ảnh chụp ở xưởng được thu nhỏ trước khi lưu (cạnh dài tối đa, px) để nhẹ bộ nhớ trình duyệt
    photoMaxPx: 480
  },

  purchasing: {
    // Dự phòng hao hụt khi tạo PO (giả định)
    wasteBufferPct: 0.05,
    // Hàng để lâu (hạn dùng từ ngần này ngày: gạo, bún, mì, bao bì) được trừ tồn kho khả dụng khi lập PO (giả định)
    longLifeShelfDays: 60,
    // Dung sai khi đối chiếu 3 chiều PO / phiếu nhập / hóa đơn. Số lượng: % của số lượng đối chiếu. Giá: % của đơn giá PO (giả định)
    matchTolerance: { qtyPct: 0.01, pricePct: 0 },
    // Giá PO cao hơn giá thị trường (dữ liệu mock của pricing agent) quá ngần này thì tô cảnh báo
    marketDiffWarnPct: 0.05,
    // Hạn trả tính từ ngày: 'invoice' (ngày hóa đơn) hoặc 'receipt' (ngày nhận hàng cuối). Kế toán chốt (giả định)
    dueFrom: 'invoice',
    // Dự báo gửi nhà cung cấp: số tuần
    forecastWeeks: 4,
    // Mẫu bảng kê thu mua nông sản không hóa đơn. KẾ TOÁN CHỌN trong cài đặt; mọi mẫu dưới đây đều chờ kế toán xác nhận
    // còn hiệu lực. Không viết cứng một mẫu: thêm mẫu mới chỉ cần thêm một mục ở đây.
    statementTemplates: {
      internal: {
        label: 'Mẫu nội bộ MOVA',
        title: 'BẢNG KÊ THU MUA HÀNG HÓA KHÔNG CÓ HÓA ĐƠN',
        legalNote: '',
        confirmed: false
      },
      form_01_tndn: {
        label: 'Mẫu 01/TNDN (bảng kê thu mua hàng hóa, dịch vụ không có hóa đơn)',
        title: 'BẢNG KÊ THU MUA HÀNG HÓA, DỊCH VỤ MUA VÀO KHÔNG CÓ HÓA ĐƠN',
        legalNote: 'Mẫu theo hướng dẫn thuế cũ, kế toán cần kiểm tra mẫu này còn hiệu lực trước khi dùng cho hồ sơ thuế.',
        confirmed: false
      },
      custom: {
        label: 'Mẫu do kế toán nhập (tiêu đề và ghi chú tự soạn)',
        title: 'BẢNG KÊ THU MUA',
        legalNote: '',
        confirmed: false,
        editable: true
      }
    },
    // Mặc định khi kế toán chưa chọn
    defaultStatementTemplate: 'internal'
  },

  // Hồ sơ nhà cung cấp (P2B)
  suppliers: {
    // Cảnh báo giấy chứng nhận ATTP / VietGAP trước ngày hết hạn
    certWarnDays: 30,
    kinds: {
      factory: 'Nhà máy',
      htx: 'Hợp tác xã',
      nong_ho: 'Nông hộ',
      lo_mo: 'Lò mổ',
      seafood: 'Hải sản',
      long_haul: 'Nhà xe',
      last_mile: 'Giao hàng',
      packaging: 'Bao bì'
    },
    certTypes: { attp: 'ATTP', vietgap: 'VietGAP', haccp: 'HACCP', other: 'Khác' }
  },

  // Kho phụ TP.HCM (P2B)
  inventory: {
    // Lô còn hạn không quá ngần này ngày thì cảnh báo "sắp hết hạn"
    expiryWarnDays: 2,
    wasteReasons: { expired: 'Hết hạn dùng', spoiled: 'Hỏng / biến chất', damaged: 'Rơi vỡ / hư bao bì', temp_breach: 'Vượt nhiệt độ', recall: 'Thu hồi lô', other: 'Lý do khác' },
    countReasons: { count: 'Kiểm kê định kỳ', spill: 'Hao hụt tự nhiên', mistake: 'Nhập / xuất nhầm', other: 'Lý do khác' }
  },

  // Thu hồi lô (P2B)
  recall: {
    // Khoản bù Fresh Credit mặc định cho đơn đã nhận hàng bị thu hồi = giá trị các món có nguyên liệu của lô, nhân hệ số này (giả định)
    compensationFactor: 1,
    // Trạng thái đơn xếp vào nhóm nào khi thu hồi
    groups: {
      not_shipped: ['locked', 'in_production'],
      in_transit: ['shipped'],
      delivered: ['delivered']
    }
  },

  // Logistics chặng dài, kho phụ và chặng cuối (P2C). Mọi số tiền và hạn mức là giả định, chờ anh Trung chốt.
  logistics: {
    // Shipper: mỗi người có PIN riêng (3333 là PIN shipper đã có từ trước, gán cho shipper đầu tiên) và sức chở (thùng / chuyến).
    shippers: [
      { id: 'SH-01', name: 'Nguyễn Văn Hùng', capacityBoxes: 15 },
      { id: 'SH-02', name: 'Trần Minh Tuấn', capacityBoxes: 15 },
      { id: 'SH-03', name: 'Lê Thị Hoa', capacityBoxes: 12 },
      { id: 'SH-04', name: 'Phạm Quốc Bảo', capacityBoxes: 12 }
    ],
    // Xe lạnh chặng dài: sức chứa mặc định (thùng) và giá mỗi chuyến khi điều phối chưa nhập
    truck: { capacityBoxes: 120, costPerTripVnd: 4500000, carrierSupplierId: 'S-TRUCK' },
    // Chi phí kho phụ TP.HCM mỗi ngày khi kế toán / điều phối chưa nhập
    hubDailyCostVnd: { laborVnd: 1200000, rentVnd: 600000, iceVnd: 350000, otherVnd: 0 },
    // Chặng cuối: mỗi tuyến một khoản cố định, mỗi điểm giao một khoản, mỗi lần giao hụt thêm một khoản
    lastMile: { routeBaseVnd: 120000, perStopVnd: 25000, perFailedAttemptVnd: 10000, standardDeliveryVnd: 25000 },
    // Ước tính thời gian tuyến (bản mock): phút làm việc tại một điểm và di chuyển giữa hai điểm liên tiếp
    minutesPerStop: 8,
    travelMinutes: { sameWard: 4, otherWard: 10, otherZone: 20 },
    // Kho phụ xuất kho trước giờ bắt đầu khung bao nhiêu phút (chỉ nhắc, không chặn)
    dispatchLeadMinutes: 45,
    // Đo nhiệt độ lúc giao có bắt buộc không (shipper vẫn nhập được nếu để false)
    deliveryTempRequired: false,
    // "Không liên lạc được" chỉ báo được khi đã bấm gọi khách ít nhất ngần này lần
    unreachableMinCalls: 1,
    failReasons: { unreachable: 'Không liên lạc được', wrong_address: 'Sai địa chỉ', customer_reschedule: 'Khách hẹn lại' },
    // Giữ lạnh ở kho phụ tối đa bao nhiêu giờ; quá hạn thì cảnh báo hủy hoặc bù
    holdColdMaxHours: 24,
    // Bù Fresh Credit khi không giao được = tỷ lệ giá trị đơn (điều phối không nhập số, admin được chỉnh)
    failedCompensationPct: 1,
    // Thu hồi thùng xốp và túi gel ở lần giao sau: bật / tắt, và số mỗi thùng giao
    recovery: { enabled: true, foamBoxesPerBox: 1, gelPacksPerBox: 2 },
    // Gợi ý gộp ngày cho khu có độ lấp đầy của một ngày giao dưới mức này
    mergeSuggestBelowFillPct: 0.35,
    // Bảng demo: nút nhảy tới mốc xe về kho phụ (giờ ngày giao D)
    // KPI
    kpi: { onTimeGraceMinutes: 0, minRouteMinutes: 15 }
  },

  payables: {
    defaultTermDays: 15
  },

  // Thuế suất theo nhóm hàng. Kế toán xác nhận, chưa phải số đã duyệt.
  tax: {
    groups: {
      fresh: { label: 'Nông sản tươi', rate: null, confirmed: false },
      processed: { label: 'Hàng sơ chế / đóng gói', rate: 0.08, confirmed: false },
      sauce: { label: 'Xốt', rate: 0.08, confirmed: false },
      service: { label: 'Dịch vụ vận chuyển', rate: 0.08, confirmed: false }
    }
  },

  invoicing: {
    // Chốt mặc định: xuất hóa đơn khi giao hàng.
    // Viện dẫn pháp lý: NĐ 254/2026 Điều 9 khoản 1, 3: lập hóa đơn GTGT tại mỗi lần giao hàng.
    issueOn: 'delivery'
  },

  // Tài chính & kế toán (P2D). MOVA KHÔNG tự viết phần mềm kế toán: chỉ giữ sổ phụ nghiệp vụ và xuất bút toán (CSV)
  // qua bảng ánh xạ tài khoản do kế toán cấu hình.
  finance: {
    // Số dư tiền (ngân hàng + quỹ) tại thời điểm bắt đầu theo dõi. Kế toán nhập số thật ở Cài đặt.
    openingCashVnd: 0,
    // Cách xử lý phần KHUYẾN MÃI đã dùng khi giao hàng:
    //   'net'   = doanh thu chỉ ghi theo phần TIỀN THẬT đã dùng; khuyến mãi dùng là chi phí kéo khách ở báo cáo, không hạch toán doanh thu.
    //   'gross' = doanh thu ghi cả phần khuyến mãi, nhưng phần khuyến mãi tách thành bút toán riêng:
    //             Nợ chi phí khuyến mãi / Có doanh thu từ khuyến mãi (MOVA tài trợ).
    promoTreatment: 'net',
    // Giá bán và giá mua coi như ĐÃ GỒM VAT; VAT tách ra theo thuế suất của nhóm hàng (BUSINESS.tax.groups, chưa xác nhận).
    // Thuế suất của khoản nạp Fresh Credit khi xuất hóa đơn lúc nạp. null = chưa xác nhận (không tách VAT)
    topupInvoiceVatRate: null,
    // Cổng thẻ: phí = % x số tiền + phí cố định; tiền về sau ngần này ngày
    card: { feePct: 0.025, feeFixedVnd: 1100, settleDays: 2 },
    // Giá vốn một túi xốt (xưởng tự chiết rót / OEM sachet). Cập nhật bảng giá thực tế V2.2.
    sauceCostPerPackVnd: {
      'XOT-01': 4500, // Xốt Kho Tàu Củ Sen, 80g
      'XOT-02': 4500, // Xốt Tiêu Đen Tây Nguyên, 60g
      'XOT-03': 4500, // Xốt Canh Chua Nam Bộ, 90g
      'XOT-04': 3500, // Xốt Xào Tỏi Gừng, 50g
      'XOT-05': 4000, // Xốt Kho Tộ, 70g
      'XOT-06': 6500, // Xốt Kem Nấm Bơ Tỏi, 80g
      'XOT-07': 6500, // Xốt Rượu Vang Đỏ, 60g
      'XOT-08': 5000, // Xốt BBQ Khói, 70g
      default: 4500
    },
    // Tài khoản nhận tiền chuyển khoản (số giả). Nội dung chuyển khoản phải chứa mã đối soát.
    bank: { bankName: 'Vietcombank', accountNo: '0071000000000', accountName: 'CONG TY MOVA FRESH' },
    // Đề xuất đợt chi: các khoản phải trả đã quá hạn hoặc đến hạn trong ngần này ngày tới
    payRun: { leadDays: 3 },
    // Dòng tiền dự kiến
    cashflow: {
      horizonDays: 30,
      // Tỷ lệ khách gia hạn dùng để ước tiền vào từ gia hạn (mục tiêu giữ chân tháng 2+ >= 50%)
      renewalRate: 0.5,
      // Chi phí logistics chưa có hóa đơn: coi như trả sau ngần này ngày kể từ ngày giao
      logisticsTermDays: 15
    },
    // Tỷ lệ bao phủ: mặc định chỉ tính nợ Fresh Credit phần tiền thật. true = cộng thêm tiền các đơn đã thu trước nhưng chưa giao.
    coverage: { includePrepaidOrders: false },
    // Mốc tuổi nợ theo số ngày QUÁ hạn: chưa đến hạn / 1–7 / 8–15 / 16–30 / >30
    agingDays: [7, 15, 30],
    // Thẻ điểm nhà cung cấp: trọng số (tổng 1) và ngưỡng cảnh báo điểm tổng (giả định, chờ mua hàng chốt)
    scorecard: {
      weights: { onTime: 0.25, fill: 0.2, qc: 0.25, weight: 0.1, temp: 0.1, claims: 0.1 },
      warnBelow: 80,
      weightTolerancePct: 0.03
    },
    // Bảng ánh xạ tài khoản: Thiết lập bộ mã chuẩn Thông tư 99/2025/TT-BTC (áp dụng từ 2026 thay thế TT 200).
    // Hạch toán chuẩn:
    //   - Nạp gói suất ăn trả trước: Nợ 112 / Có 131
    //   - Giao từng lần: Nợ 131 / Có 511, Có 33311
    //   - Phí thành viên năm (nếu có): Nợ 112 / Có 3387, Có 33311; phân bổ hàng tháng Nợ 3387 / Có 511
    accountMap: {
      cash_bank: { label: 'Tiền gửi ngân hàng', code: '112' },
      cash_hand: { label: 'Tiền mặt', code: '111' },
      customer_prepaid: { label: 'Khách hàng trả trước (Gói suất ăn / Fresh Credit tiền thật: Nợ 112 / Có 131)', code: '131' },
      revenue: { label: 'Doanh thu bán hàng', code: '511' },
      revenue_promo: { label: 'Doanh thu từ khuyến mãi (MOVA tài trợ)', code: '' },
      vat_output: { label: 'Thuế GTGT đầu ra', code: '33311' },
      vat_input: { label: 'Thuế GTGT đầu vào', code: '' },
      cogs_materials: { label: 'Giá vốn nguyên liệu, bao bì', code: '' },
      cogs_logistics: { label: 'Giá vốn logistics', code: '' },
      inventory: { label: 'Hàng tồn kho', code: '' },
      payable_supplier: { label: 'Phải trả nhà cung cấp', code: '' },
      payable_logistics: { label: 'Phải trả logistics (tạm tính)', code: '' },
      promo_expense: { label: 'Chi phí khuyến mãi', code: '' },
      card_fee: { label: 'Phí cổng thanh toán', code: '' },
      other_expense: { label: 'Chi phí khác (điều chỉnh)', code: '' },
      membership_deferred: { label: 'Doanh thu chưa thực hiện — Phí thành viên năm: Nợ 112 / Có 3387, 33311; phân bổ vào 511', code: '3387' }
    }
  },

  alerts: {
    minGrossMarginPct: 0.2,
    // Tỷ lệ bao phủ = tiền mặt / nợ Fresh Credit (phần tiền thật)
    minCashCoverageRatio: 1.0,
    // Chi tiền mặt từ 5 triệu trở lên thì mất quyền khấu trừ VAT đầu vào (Luật GTGT 48/2024/QH15)
    cashPaymentVatLimitVnd: 5000000
  },

  // Mỗi khu có thể đổi: tên khung giờ lấy từ SLOTS ở trên.
  slotIds: Object.values(SLOTS).map((s) => s.id)
};

export function getZone(zoneId) {
  return BUSINESS.zones.find((z) => z.id === zoneId) || null;
}

export const DEFAULT_PROVINCE = 'TP. Hồ Chí Minh';
export const zoneProvince = (zone) => (zone && zone.province) || DEFAULT_PROVINCE;

export function findZoneByDistrict(text = '') {
  const t = text.toLowerCase();
  return (
    BUSINESS.zones.find((z) => z.districts.some((d) => t.includes(d.toLowerCase()))) || null
  );
}
