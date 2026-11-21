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
  cycleCapacityPut: ['PUT', '/ops/logistics/cycle-capacity/:date'],

  // Mua hàng (C14): nhà cung cấp, SKU, giá, dự báo, PO, đối chiếu, thanh toán, mua trực tiếp, cài đặt
  procSuppliers: ['GET', '/ops/procurement/suppliers'],
  procSaveSupplier: ['PUT', '/ops/procurement/suppliers'],
  procAddCert: ['POST', '/ops/procurement/suppliers/:id/certs'],
  procRemoveCert: ['DELETE', '/ops/procurement/suppliers/:id/certs/:certId'],
  procSkus: ['GET', '/ops/procurement/skus'],
  procPrices: ['GET', '/ops/procurement/prices'],
  procAddPrice: ['POST', '/ops/procurement/price-entries'],
  procForecast: ['GET', '/ops/procurement/forecast'],
  procSendForecast: ['POST', '/ops/procurement/forecast/send'],
  procPos: ['GET', '/ops/procurement/pos'],
  procPo: ['GET', '/ops/procurement/pos/:id'],
  procEditLine: ['PATCH', '/ops/procurement/pos/:id/lines/:sku'],
  procApprove: ['POST', '/ops/procurement/pos/:id/approve'],
  procSend: ['POST', '/ops/procurement/pos/:id/send'],
  procInvoice: ['POST', '/ops/procurement/pos/:id/invoice'],
  procMatch: ['POST', '/ops/procurement/pos/:id/match'],
  procPay: ['POST', '/ops/procurement/pos/:id/pay'],
  procInvoiceFile: ['GET', '/ops/procurement/invoices/:id/file'],
  procPayables: ['GET', '/ops/procurement/payables'],
  procDirect: ['GET', '/ops/procurement/direct-purchases'],
  procDirectPreview: ['POST', '/ops/procurement/direct-purchases/preview'],
  procDirectRecord: ['POST', '/ops/procurement/direct-purchases'],
  procSettings: ['GET', '/ops/procurement/settings'],
  procSaveSettings: ['PUT', '/ops/procurement/settings'],

  // Kho phụ: nhận hàng theo PO
  hubReceivable: ['GET', '/ops/hub/receivable'],
  hubReceive: ['POST', '/ops/hub/receipts'],
  hubReceipts: ['GET', '/ops/hub/receipts'],

  // Kho phụ: tồn kho theo lô (FEFO), truy xuất, thu hồi (C15)
  hubStock: ['GET', '/ops/hub/stock'],
  hubFefo: ['GET', '/ops/hub/stock/fefo'],
  hubIssue: ['POST', '/ops/hub/stock/issue'],
  hubWaste: ['POST', '/ops/hub/stock/waste'],
  hubCount: ['POST', '/ops/hub/stock/count'],
  hubTraceLots: ['GET', '/ops/hub/trace/lots'],
  hubTraceLookup: ['GET', '/ops/hub/trace/lookup'],
  hubRecalls: ['GET', '/ops/hub/recalls'],
  hubRecallCreate: ['POST', '/ops/hub/recalls'],
  hubRecall: ['GET', '/ops/hub/recalls/:id'],
  hubRecallHold: ['POST', '/ops/hub/recalls/:id/hold'],
  hubRecallNotify: ['POST', '/ops/hub/recalls/:id/notify'],
  hubRecallCompensate: ['POST', '/ops/hub/recalls/:id/compensate'],
  hubRecallWasteHeld: ['POST', '/ops/hub/recalls/:id/waste-held'],
  hubRecallClose: ['POST', '/ops/hub/recalls/:id/close']
};

// Cổng nhà cung cấp: nằm ngoài /ops. Nhà cung cấp luôn bị ép về chính mình; admin xem thử bằng ?as_supplier_id=.
export const SUPPLIER_ROUTES = {
  overview: ['GET', '/supplier/overview'],
  confirmPo: ['POST', '/supplier/pos/:id/confirm'],
  invoice: ['POST', '/supplier/pos/:id/invoice'],
  replyClaim: ['POST', '/supplier/claims/:id/reply'],
  contact: ['PATCH', '/supplier/contact'],
  addCert: ['POST', '/supplier/certs']
};
