// api.ops phần chạy trên backend thật (async, qua http.js). Tên hàm giữ như bản giả lập để màn hình đổi ít nhất:
// tham số đầu `ctx` còn đó cho khỏi sửa chỗ gọi nhưng KHÔNG dùng nữa (danh tính và vai trò lấy từ token Supabase).
// Khác app khách: lỗi ném HttpError { code, status, details } (không có phong bì {status:'error'}).
// Nhóm chưa chuyển (mua hàng, cổng nhà cung cấp, kho phụ tồn/thu hồi, logistics, tài chính, demo) vẫn ở bản giả lập trong index.js.
import { http as sharedHttp } from './http';
import { fillPath } from './routes';
import { OPS_ROUTES } from './opsRoutes';
import { syncServerTime } from '../utils/time';
import { PHOTO_PURPOSE, uploadPhoto } from './uploads';

export function createOpsApi({ http = sharedHttp, fetchImpl } = {}) {
  const h = () => (typeof http === 'function' ? http() : http);

  function call(name, { params, query, body, key, as } = {}) {
    const [verb, path] = OPS_ROUTES[name];
    return h().request(verb, fillPath(path, params), { query, body, key, as });
  }
  /** Khóa idempotency ổn định theo opId để gửi lại cùng một thao tác không tạo hai lần. */
  const keyOf = (opId) => (typeof opId === 'string' && opId.length >= 8 ? opId : undefined);

  const uploadTicket = (purpose, contentType) => call('uploadTicket', { body: { purpose, content_type: contentType } });

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
    listLots: () => call('lotList')
  };
}
