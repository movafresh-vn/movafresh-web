// api.ops phần chạy trên backend thật (async, qua http.js). Tên hàm giữ như bản giả lập để màn hình đổi ít nhất:
// tham số đầu `ctx` còn đó cho khỏi sửa chỗ gọi nhưng KHÔNG dùng nữa (danh tính và vai trò lấy từ token Supabase).
// Khác app khách: lỗi ném HttpError { code, status, details } (không có phong bì {status:'error'}).
// Nhóm chưa chuyển (kho phụ tồn/thu hồi/nhận xe, logistics, tài chính, demo) vẫn ở bản giả lập trong index.js.
import { http as sharedHttp } from './http';
import { fillPath } from './routes';
import { OPS_ROUTES, SUPPLIER_ROUTES } from './opsRoutes';
import { syncServerTime } from '../utils/time';
import { PHOTO_PURPOSE, isDataUrl, uploadPhoto } from './uploads';

/** Bỏ khóa null / undefined (máy chủ chỉ nhận "vắng mặt", không nhận null) của một đối tượng nông. */
export const compact = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) : o);

/** Bỏ khóa null / undefined / chuỗi rỗng (ô trống trên form thì không gửi). */
export const dropEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ''));

/** Bảng kê thu mua: người bán và từng dòng bỏ trường rỗng (phone, cccd... để trống thì không gửi). */
const statementBody = ({ seller, items, method }) => ({
  seller: compact({ ...seller, phone: seller.phone || undefined }),
  items: items.map((i) => compact({ ...i, name: i.name || undefined, unit: i.unit || undefined })),
  method
});

export function createOpsApi({ http = sharedHttp, fetchImpl } = {}) {
  const h = () => (typeof http === 'function' ? http() : http);

  function call(name, { params, query, body, key, as } = {}) {
    const [verb, path] = OPS_ROUTES[name];
    return h().request(verb, fillPath(path, params), { query, body, key, as });
  }
  /** Khóa idempotency ổn định theo opId để gửi lại cùng một thao tác không tạo hai lần. */
  const keyOf = (opId) => (typeof opId === 'string' && opId.length >= 8 ? opId : undefined);

  const uploadTicket = (purpose, contentType) => call('uploadTicket', { body: { purpose, content_type: contentType } });

  /** Cổng nhà cung cấp: admin xem thử một nhà cung cấp qua ?as_supplier_id= (nhà cung cấp thật bị máy chủ ép về chính mình). */
  function callSupplier(name, { params, body, asSupplierId = null } = {}) {
    const [verb, path] = SUPPLIER_ROUTES[name];
    return h().request(verb, fillPath(path, params), { query: asSupplierId ? { as_supplier_id: asSupplierId } : undefined, body });
  }

  /** Tệp đính kèm là data URL trong form thì tải lên kho trước (vé một lần), gửi lại { name, type, path }. Đã có path thì giữ nguyên. */
  async function attachment(file, purpose) {
    if (!file) return null;
    if (file.path) return { name: file.name, type: file.type, path: file.path };
    if (file.dataUrl && isDataUrl(file.dataUrl)) {
      const path = await uploadPhoto(file.dataUrl, purpose, { ticket: uploadTicket, fetchImpl });
      return { name: file.name, type: file.type, path };
    }
    return null;
  }
  const photoPath = async (photo, purpose) => (photo && isDataUrl(photo) ? uploadPhoto(photo, purpose, { ticket: uploadTicket, fetchImpl }) : photo || undefined);

  return {
    me: () => call('me'),

    /** Tóm tắt + giờ máy chủ. Mỗi lần gọi đồng bộ đồng hồ web (ngày giờ nghiệp vụ do máy chủ quyết định). */
    async summary() {
      const s = await call('summary');
      syncServerTime(s.now);
      const byState = s.orders_by_state || null;
      return {
        now: s.now,
        role: s.role,
        ordersByState: byState,
        ordersTotal: byState ? Object.values(byState).reduce((a, b) => a + b, 0) : undefined
      };
    },

    planning: {
      overview: (_ctx, day = null) => call('planningOverview', { query: { day } })
    },

    factory: {
      catalog: () => call('factoryCatalog'),
      snapshot: (_ctx, day = null) => call('factorySnapshot', { query: { day } }),
      forecast: () => call('factoryForecast'),
      /** Một cửa ghi thao tác của xưởng; `photo` phải là đường dẫn đã tải lên (hàng đợi lo việc này trước khi gửi). */
      apply: (_ctx, op) => call('factoryOps', { body: op, key: keyOf(op && op.opId) }),
      impact: (_ctx, shortageId) => call('factoryImpact', { params: { id: shortageId } }),
      yieldLog: (_ctx, b) =>
        call('yieldCreate', {
          body: { date: b.date, sku_id: b.skuId, raw_received_g: b.rawReceivedG, net_prepped_g: b.netPreppedG, ...(b.lotQrCode ? { lot_qr_code: b.lotQrCode } : {}), ...(b.note ? { note: b.note } : {}) }
        }),
      yieldLogs: (_ctx, date, flagged = null) => call('yieldList', { query: { date, flagged: flagged === null ? undefined : String(flagged) } })
    },

    /** Sổ bàn giao chuỗi lạnh (nhiệt độ + ảnh đã tải lên). */
    handovers: {
      create: (_ctx, b) =>
        call('handoverCreate', { body: { date: b.date, trip_code: b.tripCode, kind: b.kind, temperature_c: b.temperatureC, photo_path: b.photoPath, ...(b.note ? { note: b.note } : {}) } }),
      list: (_ctx, date) => call('handoverList', { query: { date } })
    },

    listOrders: (_ctx, { day = null, status = null, orderState = null } = {}) => call('listOrders', { query: { date: day, status, order_state: orderState } }),

    /** Chuyển trạng thái đơn qua cửa duy nhất của máy chủ (cạnh, vai trò, điều kiện do DB kiểm). */
    transitionOrder: (_ctx, { weekId, to, reason, resolution = null }) =>
      call('transitionOrder', { params: { week_id: weekId }, body: { to, reason, ...(resolution ? { resolution } : {}) } }),

    listProductionPlans: async () => (await call('batchList')).map((b) => ({ ...b, day: b.delivery_date })),
    async getProductionPlan(_ctx, day) {
      try {
        const b = await call('batchGet', { params: { date: day } });
        return { ...b, day: b.delivery_date };
      } catch (e) {
        if (e && e.code === 'BATCH_NOT_FOUND') return null;
        throw e;
      }
    },

    /** Lô giao theo ngày: chốt sổ một chạm, bắt đầu sơ chế, lệnh mua CSV, nhãn thùng. */
    batches: {
      list: () => call('batchList'),
      get: (_ctx, date) => call('batchGet', { params: { date } }),
      lock: (_ctx, { date, force = false, reason = '' }) => call('batchLock', { params: { date }, body: force ? { force: true, reason } : {} }),
      startPrep: (_ctx, date) => call('batchStartPrep', { params: { date }, body: {} }),
      purchaseOrdersCsv: (_ctx, date) => call('batchPoCsv', { params: { date }, as: 'text' }),
      labels: (_ctx, date) => call('batchLabels', { params: { date } })
    },

    /** Thanh toán đến sau khi lô đã khóa: admin nhận vào lô hoặc từ chối (dời ngày / hoàn Fresh Credit). */
    paymentExceptions: {
      list: (_ctx, status = null) => call('exceptionList', { query: { status } }),
      accept: (_ctx, id, reason) => call('exceptionAccept', { params: { id }, body: { reason } }),
      reject: (_ctx, id, reason) => call('exceptionReject', { params: { id }, body: { reason } })
    },

    /** Hoàn tiền thiếu hàng loạt: xem trước (băm) rồi xác nhận. */
    shortPick: {
      preview: (_ctx, { date, skuId, shortageG }) => call('shortPickPreview', { body: { date, sku_id: skuId, shortage_g: shortageG } }),
      confirm: (_ctx, { date, skuId, shortageG, previewHash, reason }) =>
        call('shortPickConfirm', { body: { date, sku_id: skuId, shortage_g: shortageG, preview_hash: previewHash, reason }, key: keyOf(previewHash) }),
      list: (_ctx, date) => call('shortPickList', { query: { date } })
    },

    uploads: {
      ticket: (_ctx, { purpose, contentType }) => uploadTicket(purpose, contentType),
      /** Tải một ảnh (data URL) lên và trả đường dẫn trong kho. */
      photo: (_ctx, dataUrl, purpose) => uploadPhoto(dataUrl, purpose, { ticket: uploadTicket, fetchImpl }),
      purposeOf: (opType) => PHOTO_PURPOSE[opType] || null
    },

    costing: {
      dishes: (_ctx, on = null) => call('costingDishes', { query: { on } })
    },

    cycleCapacity: {
      list: (_ctx, { from = null, days = 14 } = {}) => call('cycleCapacityList', { query: { from, days } }),
      put: (_ctx, date, body) => call('cycleCapacityPut', { params: { date }, body })
    },

    /** Đổi món cho đơn vì nhà máy thiếu hàng (bù Fresh Credit ngăn khuyến mãi và báo khách). `orderId` là mã đơn MV-... */
    substituteDish: (_ctx, { orderId, mealIndex, kind, toDishId, reason = '', compensationVnd = null, shortageId = null, opId = null }) =>
      call('substituteDish', {
        params: { order: orderId },
        body: {
          meal_index: mealIndex,
          kind,
          to_dish_id: toDishId,
          ...(reason ? { reason } : {}),
          ...(compensationVnd !== null && compensationVnd !== undefined ? { compensation_vnd: compensationVnd } : {}),
          ...(shortageId ? { shortage_id: shortageId } : {}),
          ...(opId ? { op_id: opId } : {})
        },
        key: keyOf(opId)
      }),

    saveLot: (_ctx, lot) => call('lotSave', { body: lot }),
    listLots: () => call('lotList'),

    // Hai hàm liệt kê chung của màn "mô-đun" (ModuleView): PO và nhà cung cấp. Nhà cung cấp thật chỉ thấy PO của chính mình.
    listPurchaseOrders: () => call('procPos'),
    listSuppliers: async () => (await call('procSuppliers')).suppliers,

    /** Mua hàng (C14). Hình dạng trả về giống bản giả lập; lỗi ném HttpError (MATCH_DIFF / NOTE_REQUIRED mang details.match). */
    procurement: {
      suppliers: () => call('procSuppliers'),
      saveSupplier: (_ctx, profile) => call('procSaveSupplier', { body: compact({ ...profile, cccd: profile.cccd || undefined, taxId: profile.taxId || undefined, address: profile.address || undefined }) }),
      addCert: (_ctx, { supplierId, cert }) => call('procAddCert', { params: { id: supplierId }, body: { cert: compact({ ...cert, issuer: cert.issuer || undefined }) } }),
      removeCert: (_ctx, { supplierId, certId }) => call('procRemoveCert', { params: { id: supplierId, certId } }),
      skuCatalog: () => call('procSkus'),
      prices: () => call('procPrices'),
      /**
       * Nhập giá mới. Nếu giá làm món vượt trần giá vốn 35%, máy chủ trả CONFIRM_REQUIRED (details.newly_flagged): màn hình hiện danh
       * sách món, người dùng xác nhận thì gọi lại với confirm:true. Trả về bản ghi giá (kèm newlyFlagged).
       */
      async addPrice(_ctx, { sku, priceVnd, effectiveFrom, note = '', confirm = false }) {
        const r = await call('procAddPrice', { body: { sku, priceVnd, effectiveFrom, ...(note ? { note } : {}), ...(confirm ? { confirm: true } : {}) } });
        return { ...r.entry, newlyFlagged: r.newly_flagged || [] };
      },
      forecast: () => call('procForecast'),
      sendForecast: () => call('procSendForecast', { body: {} }),
      listPos: () => call('procPos'),
      getPo: (_ctx, poId) => call('procPo', { params: { id: poId } }),
      invoiceFile: (_ctx, invoiceId) => call('procInvoiceFile', { params: { id: invoiceId } }),
      editLine: (_ctx, { poId, sku, qty }) => call('procEditLine', { params: { id: poId, sku }, body: { qty } }),
      approvePo: (_ctx, poId) => call('procApprove', { params: { id: poId }, body: {} }),
      sendPo: (_ctx, { poId, via = 'link' }) => call('procSend', { params: { id: poId }, body: { via } }),
      async submitInvoice(_ctx, { poId, number, issuedAt, lines, file = null }) {
        const f = await attachment(file, 'invoice');
        return call('procInvoice', { params: { id: poId }, body: { number, issuedAt, ...(lines ? { lines } : {}), ...(f ? { file: f } : {}) } });
      },
      /** Kết quả { po, match }. Lệch mà chưa chấp nhận: HttpError MATCH_DIFF (409) hoặc NOTE_REQUIRED (422) có details.match. */
      matchPo: (_ctx, { poId, acceptDiff = false, acceptInvoicePrice = false, note = '' }) =>
        call('procMatch', { params: { id: poId }, body: { acceptDiff, acceptInvoicePrice, ...(note ? { note } : {}) } }),
      payPo: (_ctx, { poId, method = 'bank_transfer', ref = '' }) => call('procPay', { params: { id: poId }, body: { method, ...(ref ? { ref } : {}) } }),
      payables: () => call('procPayables'),
      directPurchases: () => call('procDirect'),
      previewStatement: (_ctx, { seller, items, method = 'bank_transfer' }) => call('procDirectPreview', { body: statementBody({ seller, items, method }) }),
      recordDirectPurchase: (_ctx, { seller, items, method = 'bank_transfer', intoStock = false, location = null }) =>
        call('procDirectRecord', { body: { ...statementBody({ seller, items, method }), ...(intoStock ? { intoStock: true } : {}), ...(location ? { location } : {}) } }),
      settings: () => call('procSettings'),
      saveSettings: (_ctx, input) => call('procSaveSettings', { body: input })
    },

    /** Kho phụ: phần nhận hàng theo PO chạy thật; tồn kho, FEFO, thu hồi... còn ở bản giả lập (C15). */
    hub: {
      receivable: () => call('hubReceivable'),
      async receive(_ctx, { poId, lines, photo = null, note = '' }) {
        const p = await photoPath(photo, 'receipt');
        return call('hubReceive', { body: { poId, lines: lines.map(dropEmpty), ...(p ? { photo: p } : {}), ...(note ? { note } : {}) } });
      },
      receipts: (_ctx, { limit = 30 } = {}) => call('hubReceipts', { query: { limit } })
    },

    /** Cổng nhà cung cấp (C14): mọi lệnh bị ép về chính nhà cung cấp đăng nhập; asSupplierId chỉ có tác dụng với admin. */
    supplierPortal: {
      overview: (_ctx, { asSupplierId = null } = {}) => callSupplier('overview', { asSupplierId }),
      confirmPo: (_ctx, { poId, result = 'full', lines = [], shortPct = null, note = '', asSupplierId = null }) =>
        callSupplier('confirmPo', {
          params: { id: poId },
          asSupplierId,
          body: { result, ...(lines && lines.length ? { lines } : {}), ...(shortPct !== null && shortPct !== undefined ? { shortPct } : {}), ...(note ? { note } : {}) }
        }),
      async submitInvoice(_ctx, { poId, number, issuedAt, lines, file = null, asSupplierId = null }) {
        const f = await attachment(file, 'invoice');
        return callSupplier('invoice', { params: { id: poId }, asSupplierId, body: { number, issuedAt, ...(lines ? { lines } : {}), ...(f ? { file: f } : {}) } });
      },
      replyClaim: (_ctx, { claimId, reply, asSupplierId = null }) => callSupplier('replyClaim', { params: { id: claimId }, asSupplierId, body: { reply } }),
      updateContact: (_ctx, { name, phone, asSupplierId = null }) => callSupplier('contact', { asSupplierId, body: { name, phone } }),
      addCert: (_ctx, { cert, asSupplierId = null }) => callSupplier('addCert', { asSupplierId, body: { cert: compact({ ...cert, issuer: cert.issuer || undefined }) } })
    }
  };
}
