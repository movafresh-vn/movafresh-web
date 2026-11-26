// Bảng đường gọi của app vận hành: một dòng cho mỗi lệnh gọi backend đã có. Cột: [HTTP, đường dẫn sau /api/v2, tùy chọn].
// Bài test w4Routes đối chiếu từng dòng với movafresh-platform/backend/src/routes, nên thêm đường backend chưa có thì test đỏ.
export const OPS_ROUTES = {
  me: ['GET', '/ops/me'],
  summary: ['GET', '/ops/summary'],
  supportRequests: ['GET', '/ops/support-requests'],
  replySupportRequest: ['PATCH', '/ops/support-requests/:id'],
  uploadTicket: ['POST', '/ops/uploads'],
  photoSignedUrl: ['GET', '/ops/uploads/signed-url'],

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
  hubRecallClose: ['POST', '/ops/hub/recalls/:id/close'],

  // Điều phối logistics (C16): cấu hình, bảng sức chứa, chuyến xe, ngoại lệ, chuỗi lạnh, chi phí, KPI
  logConfig: ['GET', '/ops/logistics/config'],
  logCapacityBoard: ['GET', '/ops/logistics/capacity-board'],
  logSetCapacity: ['PUT', '/ops/logistics/capacity'],
  logTrips: ['GET', '/ops/logistics/trips'],
  logSaveTrip: ['PUT', '/ops/logistics/trips'],
  logExceptions: ['GET', '/ops/logistics/exceptions'],
  logResolve: ['POST', '/ops/logistics/exceptions/:id/resolve'],
  logColdChain: ['GET', '/ops/logistics/cold-chain'],
  logColdDecision: ['POST', '/ops/logistics/cold-chain/decision'],
  logCosts: ['GET', '/ops/logistics/costs'],
  logHubCost: ['PUT', '/ops/logistics/hub-costs'],
  logPublishedCosts: ['GET', '/ops/logistics/costs/published'],
  logKpis: ['GET', '/ops/logistics/kpis'],

  // Giao nhanh 24-36 giờ (ĐỀ XUẤT 2.4.0, mặc định tắt): cài đặt/chính sách, báo giá, so sánh, kịch bản, chặng cuối thủ công, QA lô, đơn giao nhanh
  expSettings: ['GET', '/ops/logistics/express/settings'],
  expSaveSettings: ['PUT', '/ops/logistics/express/settings'],
  expQuotes: ['GET', '/ops/logistics/express/quotes'],
  expAddQuote: ['POST', '/ops/logistics/express/quotes'],
  expRevokeQuote: ['POST', '/ops/logistics/express/quotes/:id/revoke'],
  expCompare: ['POST', '/ops/logistics/express/long-haul/compare'],
  expScenarios: ['POST', '/ops/logistics/express/scenarios'],
  expLastMile: ['GET', '/ops/logistics/express/last-mile/requests'],
  expLastMileConfirm: ['POST', '/ops/logistics/express/last-mile/requests/:id/confirm'],
  expLastMileReject: ['POST', '/ops/logistics/express/last-mile/requests/:id/reject'],
  expCapacity: ['GET', '/ops/logistics/express/carrier-capacity'],
  expPutCapacity: ['POST', '/ops/logistics/express/carrier-capacity'],
  expLotQa: ['GET', '/ops/logistics/express/lot-qa'],
  expSetLotQa: ['POST', '/ops/logistics/express/lot-qa'],
  expOrders: ['GET', '/ops/logistics/express/orders'],
  expAdvance: ['POST', '/ops/logistics/express/orders/:id/advance'],

  // Lập tuyến
  routeBoard: ['GET', '/ops/routes/board'],
  routePlan: ['POST', '/ops/routes/plan'],
  routeMoveStop: ['POST', '/ops/routes/move-stop'],

  // Kho phụ: nhận xe, ghép hải sản, chia tuyến, xuất kho
  hubArrivals: ['GET', '/ops/hub/arrivals'],
  hubArrivalScan: ['POST', '/ops/hub/arrivals/scan'],
  hubArrivalClose: ['POST', '/ops/hub/arrivals/close'],
  hubSeafood: ['GET', '/ops/hub/seafood'],
  hubSeafoodTick: ['POST', '/ops/hub/seafood/tick'],
  hubSeafoodClose: ['POST', '/ops/hub/seafood/close'],
  hubSort: ['POST', '/ops/hub/routes/:id/sort'],
  hubDispatch: ['POST', '/ops/hub/routes/:id/dispatch'],
  hubRouteSheet: ['GET', '/ops/hub/routes/:id/sheet'],

  // Tài chính & kế toán (C17). Ba đường CSV trả text/csv thô kèm tiêu đề X-Count / X-Total-Vnd / X-Balanced / X-Unmapped.
  finCreditIntegrity: ['GET', '/ops/finance/credit/integrity'],
  finCreditSummary: ['GET', '/ops/finance/credit/summary'],
  finCreditLedger: ['GET', '/ops/finance/credit/ledger'],
  finAdjustments: ['GET', '/ops/finance/credit/adjustments'],
  finRequestAdjustment: ['POST', '/ops/finance/credit/adjustments'],
  finDecideAdjustment: ['POST', '/ops/finance/credit/adjustments/:id/decision'],
  finReconciliation: ['GET', '/ops/finance/reconciliation'],
  finConfirmRefund: ['POST', '/ops/finance/refunds/:id/confirmation'],
  finImportBankLine: ['POST', '/ops/finance/bank-transactions'],
  finManualMatch: ['POST', '/ops/finance/bank-transactions/:id/match'],
  finIgnoreBankTxn: ['POST', '/ops/finance/bank-transactions/:id/ignore'],
  finRevenue: ['GET', '/ops/finance/revenue'],
  finInvoices: ['GET', '/ops/finance/invoices'],
  finIssueInvoices: ['POST', '/ops/finance/invoices/issue'],
  finMargins: ['GET', '/ops/finance/margins'],
  finBoxCost: ['GET', '/ops/finance/box-cost/:order'],
  finPayables: ['GET', '/ops/finance/payables'],
  finPayRunFile: ['GET', '/ops/finance/pay-run/file'],
  finPayRun: ['POST', '/ops/finance/pay-run'],
  finCashflow: ['GET', '/ops/finance/cashflow'],
  finJournal: ['GET', '/ops/finance/journal'],
  finJournalCsv: ['GET', '/ops/finance/journal.csv'],
  finStatementsCsv: ['GET', '/ops/finance/statements.csv'],
  finSettings: ['GET', '/ops/finance/settings'],
  finSaveSettings: ['PUT', '/ops/finance/settings'],
  monScorecard: ['GET', '/ops/monitoring/scorecard'],
  ovFounder: ['GET', '/ops/overview/founder']
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

// App shipper: nằm ngoài /ops. Shipper thật bị ép về chính mình; điều phối / admin xem thử bằng as_shipper_id.
export const SHIPPER_ROUTES = {
  board: ['GET', '/shipper/board'],
  call: ['POST', '/shipper/stops/:ref/call'],
  deliver: ['POST', '/shipper/stops/:ref/deliver'],
  fail: ['POST', '/shipper/stops/:ref/fail']
};
