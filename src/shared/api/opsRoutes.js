// Bảng đường gọi của app vận hành: một dòng cho mỗi lệnh gọi backend đã có. Cột: [HTTP, đường dẫn sau /api/v2, tùy chọn].
// Bài test w4Routes đối chiếu từng dòng với movafresh-platform/backend/src/routes, nên thêm đường backend chưa có thì test đỏ.
export const OPS_ROUTES = {
  me: ['GET', '/ops/me'],
  summary: ['GET', '/ops/summary'],
  uploadTicket: ['POST', '/ops/uploads'],

  // Đơn
  listOrders: ['GET', '/ops/orders'],
  transitionOrder: ['POST', '/ops/orders/:week_id/transition'],
  substituteDish: ['POST', '/ops/orders/:order/substitutions'],

  // Lô giao: chốt sổ, sơ chế, lệnh mua, nhãn thùng
  batchList: ['GET', '/ops/batches'],
  batchGet: ['GET', '/ops/batches/:date'],
  batchLock: ['POST', '/ops/batches/:date/lock'],
  batchStartPrep: ['POST', '/ops/batches/:date/start-prep'],
  batchPoCsv: ['GET', '/ops/batches/:date/purchase-orders.csv'],
  batchLabels: ['GET', '/ops/batches/:date/labels'],

  // Thanh toán muộn
  exceptionList: ['GET', '/ops/payment-exceptions'],
  exceptionAccept: ['POST', '/ops/payment-exceptions/:id/accept'],
  exceptionReject: ['POST', '/ops/payment-exceptions/:id/reject'],

  // Kế hoạch và xưởng
  planningOverview: ['GET', '/ops/planning/overview'],
  factoryCatalog: ['GET', '/ops/factory/catalog'],
  factorySnapshot: ['GET', '/ops/factory/snapshot'],
  factoryForecast: ['GET', '/ops/factory/forecast'],
  factoryOps: ['POST', '/ops/factory/ops'],
  factoryImpact: ['GET', '/ops/factory/shortages/:id/impact'],
  yieldCreate: ['POST', '/ops/factory/yield-logs'],
  yieldList: ['GET', '/ops/factory/yield-logs'],
  handoverCreate: ['POST', '/ops/handovers'],
  handoverList: ['GET', '/ops/handovers'],
  shortPickPreview: ['POST', '/ops/factory/short-pick/preview'],
  shortPickConfirm: ['POST', '/ops/factory/short-pick/confirm'],
  shortPickList: ['GET', '/ops/factory/short-picks'],

  // Lô nguyên liệu, giá vốn, sức chứa chu kỳ
  lotSave: ['PUT', '/ops/lots'],
  lotList: ['GET', '/ops/lots'],
  costingDishes: ['GET', '/ops/costing/dishes'],
  cycleCapacityList: ['GET', '/ops/logistics/cycle-capacity'],
  cycleCapacityPut: ['PUT', '/ops/logistics/cycle-capacity/:date']
};
