import { BUSINESS } from '../config/business';
import { ROLES } from '../config/roles';
import { SKUS, SUPPLIERS, SAUCES } from '../data/catalog';
import { getServer } from '../mock-server/server';
import { cutoffAtFor } from '../domain/delivery';
import { applyOrderStatus, applySubstitution, upsertLot } from '../domain/opsEvents';
import { dishItemGrams, emptyFactory, shortageGrams } from '../domain/factory';
import { createCustomerApi as createMockCustomerApi } from './customer';
import { createCustomerApi } from './customerApi';
import { createOpsFactoryApi } from './opsFactory';
import { createProcurementApi } from './opsProcurement';
import { createLogisticsApi } from './opsLogistics';
import { createFinanceApi } from './opsFinance';
import { seedTraceScenario } from '../data/traceScenario';
import { seedTripsScenario } from '../data/logisticsScenario';
import { atDay } from '../utils/time';
import { ForbiddenError, viewOrder, viewPo, viewSupplier } from './views';

export { ForbiddenError };

const ROLE_CAN = {
  listOrders: ['workshop', 'hub', 'shipper', 'dispatch', 'purchasing', 'accounting', 'admin'],
  productionPlans: ['workshop', 'hub', 'dispatch', 'purchasing', 'accounting', 'admin'],
  purchaseOrders: ['purchasing', 'accounting', 'admin', 'supplier'],
  suppliers: ['purchasing', 'accounting', 'admin', 'supplier'],
  demo: ['admin'],
  // Ghi trạng thái giao và thông báo cho khách (xưởng báo đang sản xuất, kho / shipper báo đang giao, đã giao)
  fulfilment: ['workshop', 'hub', 'shipper', 'dispatch', 'admin'],
  // P2B: mua hàng cũng được áp món thay cho đơn bị ảnh hưởng khi nhà cung cấp xác nhận thiếu
  substitution: ['workshop', 'hub', 'dispatch', 'purchasing', 'admin'],
  lots: ['workshop', 'admin'],
  // P2A: kế hoạch & chốt sổ (điều phối, mua hàng, admin); xưởng ghi (xưởng, admin); xưởng đọc (thêm điều phối, mua hàng)
  planning: ['dispatch', 'purchasing', 'admin'],
  factory: ['workshop', 'admin'],
  factoryRead: ['workshop', 'admin', 'dispatch', 'purchasing'],
  // P2B: mua hàng đọc (kế toán xem công nợ), mua hàng ghi, trả nhà cung cấp, cài đặt mẫu bảng kê (kế toán chọn)
  procRead: ['purchasing', 'accounting', 'admin'],
  procWrite: ['purchasing', 'admin'],
  payment: ['purchasing', 'accounting', 'admin'],
  settingsWrite: ['accounting', 'admin'],
  // P2B: kho phụ (nhận hàng, tồn, truy xuất, thu hồi). Bù Fresh Credit khi thu hồi là tiền của MOVA nên chỉ mua hàng và admin.
  hubOps: ['hub', 'purchasing', 'admin'],
  recallCompensate: ['purchasing', 'admin'],
  // P2B: cổng nhà cung cấp (admin xem thử một nhà cung cấp)
  supplierPortal: ['supplier', 'admin'],
  // P2C: điều phối (sức chứa, chuyến xe, ngoại lệ, chi phí, KPI); xem cấu hình logistics
  dispatchOps: ['dispatch', 'admin'],
  logisticsView: ['dispatch', 'hub', 'admin', 'shipper'],
  // P2C: lập tuyến (điều phối, kho phụ, admin); thao tác kho phụ (nhận xe, ghép hải sản, chia tuyến, xuất kho); đọc bảng kho phụ
  routePlan: ['dispatch', 'hub', 'admin'],
  hubFlow: ['hub', 'admin'],
  hubFlowRead: ['hub', 'dispatch', 'admin'],
  // P2C: chuỗi lạnh (QC quyết định giữ / hủy), chi phí đã đẩy cho Tài chính
  coldChain: ['hub', 'dispatch', 'admin'],
  costRead: ['dispatch', 'accounting', 'admin'],
  // P2C: app shipper (shipper ghi; điều phối chỉ xem thử; admin thao tác thay)
  shipperApp: ['shipper', 'dispatch', 'admin'],
  shipperWrite: ['shipper', 'admin'],
  // P2D: tài chính & kế toán (xem, ghi); kế toán đề nghị điều chỉnh Fresh Credit, admin duyệt; thẻ điểm nhà cung cấp; tổng quan founder
  financeRead: ['accounting', 'admin'],
  financeWrite: ['accounting', 'admin'],
  adjustRequest: ['accounting'],
  adjustApprove: ['admin'],
  scorecard: ['purchasing', 'admin'],
  overview: ['admin']
};

const fromEvent = (res) => {
  if (!res.ok) {
    const e = new Error(res.message);
    e.code = res.code;
    throw e;
  }
  return res;
};

function guard(ctx, action) {
  if (!ctx || !ROLE_CAN[action].includes(ctx.role)) throw new ForbiddenError();
}

/**
 * API dùng chung cho app khách và app vận hành. Hình dạng các luồng đã có khớp
 * movafresh-platform/docs/api-contract.json; chỗ khác contract xem docs/contract-changes.md.
 */
export function createApi(server = getServer()) {
  const cfg = server.cfg || BUSINESS;

  const procurement = createProcurementApi(server, cfg, (ctx, action) => guard(ctx, action));
  const logistics = createLogisticsApi(server, cfg, (ctx, action) => guard(ctx, action));
  const finance = createFinanceApi(server, cfg, (ctx, action) => guard(ctx, action));

  const api = {
    // ---------- Đăng nhập app vận hành (PIN demo) ----------
    auth: {
      login(pin) {
        // P2C: mỗi shipper một PIN riêng (3333 vẫn dùng được, là shipper đầu tiên)
        const sh = cfg.logistics.shippers.find((x) => x.pin === String(pin));
        if (sh) return { role: 'shipper', label: `${ROLES.shipper.label}: ${sh.name}`, home: ROLES.shipper.home, supplierId: null, shipperId: sh.id };
        for (const [role, def] of Object.entries(ROLES)) {
          if (def.pin && def.pin === String(pin)) return { role, label: def.label, home: def.home, supplierId: null, shipperId: null };
        }
        const sup = Object.values(SUPPLIERS).find((s) => s.pin === String(pin));
        if (sup) return { role: 'supplier', label: `${ROLES.supplier.label}: ${sup.name}`, home: ROLES.supplier.home, supplierId: sup.id };
        return null;
      }
    },

    // ---------- App khách (khớp api-contract.json; phần thêm cho phễu /plans xem docs/contract-changes.md) ----------
    customer: createMockCustomerApi(server, cfg),

    // ---------- App vận hành (đã lọc theo vai trò) ----------
    ops: {
      ...createOpsFactoryApi(server, cfg, (ctx, action) => guard(ctx, action)),
      ...procurement,
      ...logistics,
      ...finance,
      // P2C thêm các hàm kho phụ vào cùng nhóm `hub` của P2B
      hub: { ...procurement.hub, ...logistics.hub },

      /** Chạy các job đã tới hạn (trừ tiền, chốt sổ, nhắc khách). Mọi vai trò đã đăng nhập đều gọi được. */
      tick(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.tick();
      },

      listOrders(ctx, { day = null, status = null } = {}) {
        guard(ctx, 'listOrders');
        return server.read((db) =>
          db.orders
            .filter((o) => (!day || o.deliveryDay === day) && (!status || o.status === status))
            .map((o) => viewOrder(o, ctx.role))
        );
      },

      listProductionPlans(ctx) {
        guard(ctx, 'productionPlans');
        return server.read((db) => [...db.productionPlans]);
      },

      getProductionPlan(ctx, day) {
        guard(ctx, 'productionPlans');
        return server.read((db) => db.productionPlans.find((p) => p.day === day) || null);
      },

      listPurchaseOrders(ctx) {
        guard(ctx, 'purchaseOrders');
        return server.read((db) =>
          db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId).map((po) => viewPo(po, ctx.role))
        );
      },

      listSuppliers(ctx) {
        guard(ctx, 'suppliers');
        return server.read(() =>
          Object.values(SUPPLIERS)
            .filter((s) => ctx.role !== 'supplier' || s.id === ctx.supplierId)
            .map(viewSupplier)
        );
      },

      /**
       * Đổi trạng thái đơn sau chốt sổ: 'in_production' | 'shipped' | 'delivered' | 'redelivery' (giao lại).
       * Ghi thông báo cho khách (đang giao, đã giao kèm ảnh, giao lại). P2A / P2C gọi hàm này.
       * Ném Error có `code` nếu đơn không hợp lệ. Không trả về dữ liệu khách.
       */
      setOrderStatus(ctx, { orderId, status, photoUrl = null, note = '' }) {
        guard(ctx, 'fulfilment');
        return server.write((db, now) => {
          const res = fromEvent(applyOrderStatus(db, { orderId, status, photoUrl, note }, now, cfg));
          return { orderId: res.order.id, status: res.order.status };
        });
      },

      /**
       * Nhà máy thiếu hàng nên thay món. Đổi món trong đơn, bù vào Fresh Credit của khách (mặc định phần chênh giá)
       * và báo khách. kind: 'protein' | 'veg' | 'soup' | 'carb' | 'dessert'.
       */
      substituteDish(ctx, { orderId, mealIndex, kind, toDishId, reason = '', compensationVnd = null, shortageId = null, opId = null }) {
        guard(ctx, 'substitution');
        return server.write((db, now) => {
          // P2A: opId khử trùng khi máy xưởng gửi lại (không bù hai lần); shortageId ghi đơn này đã được báo khách
          // vào báo cáo thiếu / hỏng của xưởng.
          db.factory = db.factory || emptyFactory();
          if (opId && db.factory.opIds.includes(opId)) return { orderId, compensationVnd: 0, duplicate: true };
          const before = db.orders.find((o) => o.id === orderId);
          const meal = before && before.meals.find((m) => m.index === mealIndex);
          const fromDishId = meal ? meal.dishes[kind] : null;
          const shortage = shortageId ? db.factory.shortages.find((s) => s.id === shortageId) : null;
          const grams = shortage && meal ? dishItemGrams(fromDishId, shortage.key, meal, before.householdSize) : 0;
          const res = fromEvent(applySubstitution(db, { orderId, mealIndex, kind, toDishId, reason, compensationVnd }, now));
          if (opId) db.factory.opIds.push(opId);
          if (shortage) {
            shortage.handled.push({ orderId, mealIndex, kind, fromDishId, toDishId, compensationVnd: res.compensationVnd, grams, at: now.toISOString() });
            if (shortage.status === 'open' && shortageGrams(shortage) - shortage.handled.reduce((s, h) => s + h.grams, 0) <= 0) shortage.status = 'resolved';
          }
          return { orderId: res.order.id, compensationVnd: res.compensationVnd };
        });
      },

      /** Xưởng ghi lô nguyên liệu / nhãn QR vào db.lots (trang /q/:code đọc từ đây). Khóa là qr_code. */
      saveLot(ctx, lot) {
        guard(ctx, 'lots');
        return server.write((db) => fromEvent(upsertLot(db, lot)).lot);
      },

      listLots(ctx) {
        guard(ctx, 'lots');
        return server.read((db) => [...(db.lots || [])]);
      },

      catalog(ctx) {
        if (!ctx) throw new ForbiddenError();
        return { skus: SKUS, sauces: SAUCES };
      },

      /** Tóm tắt nhanh cho màn hình chính theo vai trò. */
      summary(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.read((db, now) => {
          const out = { now: now.toISOString() };
          if (ROLE_CAN.listOrders.includes(ctx.role)) {
            const byStatus = {};
            for (const o of db.orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
            out.ordersByStatus = byStatus;
            out.ordersTotal = db.orders.length;
          }
          if (ROLE_CAN.productionPlans.includes(ctx.role)) {
            out.closedPlans = db.productionPlans.length;
          }
          if (ROLE_CAN.purchaseOrders.includes(ctx.role)) {
            out.purchaseOrders = db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId).length;
          }
          return out;
        });
      }
    },

    // ---------- Bảng demo (chỉ admin) ----------
    demo: {
      state(ctx) {
        guard(ctx, 'demo');
        return server.read((db, now) => {
          const scheduled = db.orders.filter((o) => o.status === 'scheduled');
          const days = [...new Set(db.orders.map((o) => o.deliveryDay))].sort();
          return {
            now: now.toISOString(),
            running: db.clock.running,
            counts: Object.fromEntries(
              ['scheduled', 'paid', 'charge_failed', 'locked', 'skipped_unpaid'].map((s) => [s, db.orders.filter((o) => o.status === s).length])
            ),
            nextCharge: scheduled.map((o) => o.chargeAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextCutoff: days.filter((d) => !db.firedJobs[`cutoff:${d}`]).map((d) => cutoffAtFor(d, cfg).toISOString()).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextDelivery: db.orders.map((o) => o.deliveryAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            // P2C: mốc xe về kho phụ (ngày giao D lúc 02:00) của ngày đã chốt sổ kế tiếp
            nextHubArrival: db.productionPlans.map((p) => hubJumpAt(p.day).toISOString()).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            firedCutoffs: Object.keys(db.firedJobs).filter((k) => k.startsWith('cutoff:')),
            plans: db.productionPlans.length,
            purchaseOrders: db.purchaseOrders.length
          };
        });
      },

      setNow(ctx, iso) {
        guard(ctx, 'demo');
        return server.setNow(iso);
      },

      /** kind: 'charge' | 'cutoff' | 'delivery' | 'hub' — nhảy tới ngay sau mốc kế tiếp ('hub' = đúng 02:00 ngày giao D, xe về kho phụ). */
      jumpTo(ctx, kind) {
        guard(ctx, 'demo');
        const st = this.state(ctx);
        const target = { charge: st.nextCharge, cutoff: st.nextCutoff, delivery: st.nextDelivery, hub: st.nextHubArrival }[kind];
        if (!target) return [];
        return server.setNow(new Date(Date.parse(target) + (kind === 'hub' ? 0 : 60 * 1000)));
      },

      /**
       * Dựng chuyến xe mẫu cho kho phụ (P2C): trên ngày đã chốt sổ, đóng đủ thùng, lên xe và xuất bến cả hai chuyến (nhiệt độ, niêm phong)
       * để thử Nhận xe → Ghép hải sản → Lập tuyến → Xuất kho → Shipper. Cần đã chốt sổ ít nhất một ngày.
       */
      seedTrips(ctx, opts = {}) {
        guard(ctx, 'demo');
        return seedTripsScenario(server, cfg, opts);
      },

      tick(ctx) {
        guard(ctx, 'demo');
        return server.tick();
      },

      /**
       * Dựng dữ liệu truy xuất mẫu trên ngày đã chốt sổ: hai lô nguyên liệu, mẻ túi, thùng, xe và đơn ở đủ ba trạng thái
       * (chưa xuất / đang giao / đã giao) để thử thu hồi lô. Cần đã chốt sổ ít nhất một ngày.
       */
      seedTrace(ctx, opts = {}) {
        guard(ctx, 'demo');
        return seedTraceScenario(api, server, opts);
      },

      reset(ctx) {
        guard(ctx, 'demo');
        server.reset();
      }
    }
  };
  return api;
}

/** Mốc "xe về kho phụ" dùng cho bảng demo: đúng giờ cấu hình của ngày giao D. */
const hubJumpAt = (day) => atDay(day, BUSINESS.logistics.demoHubJump.hour, BUSINESS.logistics.demoHubJump.min);

// App khách dùng backend thật (async, qua http.js). `createApi(server)` còn dựng bản giả lập cho app vận hành và các bài test của nó đến C28.
const mockApi = createApi();
export const api = { ...mockApi, customer: createCustomerApi() };
