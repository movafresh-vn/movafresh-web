import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import HomeView from './views/HomeView.vue';
import ModuleView from './views/ModuleView.vue';
import DemoView from './views/DemoView.vue';
import PlanView from './views/PlanView.vue';
import LatePaymentsView from './views/LatePaymentsView.vue';
import WorkshopLayout from './views/workshop/WorkshopLayout.vue';
import PurchasingLayout from './views/purchasing/PurchasingLayout.vue';
import HubLayout from './views/hub/HubLayout.vue';
import SupplierPortalView from './views/supplier/SupplierPortalView.vue';
import LogisticsLayout from './views/logistics/LogisticsLayout.vue';
import ShipperView from './views/shipper/ShipperView.vue';
import FinanceLayout from './views/finance/FinanceLayout.vue';
import ScorecardView from './views/ScorecardView.vue';
import { MODULES } from './modules';
import { devToolsEnabled } from '../shared/api/devApi';
import { session } from './session';
import { guardNavigation } from './guard';
import { ROLES } from '../shared/config/roles';

// Màn thật: tổng quan founder (P2D), kế hoạch (P2A), cổng nhà cung cấp (P2B), giao hàng (P2C), giám sát nhà cung cấp (P2D). ModuleView chỉ còn là dự phòng.
const COMPONENTS = { overview: HomeView, plan: PlanView, 'late-payments': LatePaymentsView, supplier: SupplierPortalView, shipper: ShipperView, monitoring: ScorecardView, trace: () => import('./views/hub/TraceView.vue') };

const workshopChildren = [
  { path: '', name: 'workshop', component: () => import('./views/workshop/TodayView.vue') },
  { path: '7-ngay', name: 'workshop-week', component: () => import('./views/workshop/WeekView.vue') },
  { path: 'nhan-nguyen-lieu', name: 'workshop-receive', component: () => import('./views/workshop/ReceiveView.vue') },
  { path: 'dong-goi', name: 'workshop-pack', component: () => import('./views/workshop/PackView.vue') },
  { path: 'san-luong', name: 'workshop-yield', component: () => import('./views/workshop/YieldView.vue'), meta: { perm: 'yieldLog' } },
  { path: 'xuat-xe', name: 'workshop-load', component: () => import('./views/workshop/LoadView.vue') },
  { path: 'bao-thieu', name: 'workshop-shortage', component: () => import('./views/workshop/ShortageView.vue') }
];

// P2B: mua hàng (đơn mua, nhà cung cấp, SKU, bảng giá, dự báo, công nợ, mua trực tiếp, cài đặt) và kho phụ (nhận hàng, tồn kho, thu hồi)
const purchasingChildren = [
  { path: '', name: 'purchasing', component: () => import('./views/purchasing/PoView.vue') },
  { path: 'nha-cung-cap', name: 'purchasing-suppliers', component: () => import('./views/purchasing/SuppliersView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'sku', name: 'purchasing-sku', component: () => import('./views/purchasing/SkuView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'bang-gia', name: 'purchasing-prices', component: () => import('./views/purchasing/PricesView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'du-bao', name: 'purchasing-forecast', component: () => import('./views/purchasing/ForecastView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'cong-no', name: 'purchasing-payables', component: () => import('./views/purchasing/PayablesView.vue') },
  { path: 'mua-truc-tiep', name: 'purchasing-direct', component: () => import('./views/purchasing/DirectBuyView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'cai-dat', name: 'purchasing-settings', component: () => import('./views/purchasing/SettingsView.vue') }
];

const hubChildren = [
  { path: '', name: 'hub', component: () => import('./views/hub/ReceiveGoodsView.vue') },
  { path: 'ton-kho', name: 'hub-stock', component: () => import('./views/hub/StockView.vue') },
  { path: 'thu-hoi', name: 'hub-recall', component: () => import('./views/hub/RecallView.vue') },
  // P2C: nhận xe lạnh, ghép hải sản, chia khung giờ / tuyến, xuất kho
  { path: 'nhan-xe', name: 'hub-arrival', component: () => import('./views/hub/ArrivalView.vue'), meta: { roles: ['hub', 'admin'] } },
  { path: 'ghep-hai-san', name: 'hub-seafood', component: () => import('./views/hub/SeafoodView.vue'), meta: { roles: ['hub', 'admin'] } },
  { path: 'chia-tuyen', name: 'hub-sort', component: () => import('./views/hub/SortView.vue'), meta: { roles: ['hub', 'admin', 'dispatch'] } },
  { path: 'xuat-kho', name: 'hub-dispatch', component: () => import('./views/hub/DispatchOutView.vue'), meta: { roles: ['hub', 'admin'] } }
];

// P2C: điều phối logistics
const logisticsChildren = [
  { path: '', name: 'logistics', component: () => import('./views/logistics/CapacityView.vue') },
  { path: 'chuyen-xe', name: 'logistics-trips', component: () => import('./views/logistics/TripsView.vue') },
  { path: 'lap-tuyen', name: 'logistics-routes', component: () => import('./views/logistics/RoutesView.vue') },
  { path: 'giao-hang', name: 'logistics-exceptions', component: () => import('./views/logistics/ExceptionsView.vue') },
  { path: 'chuoi-lanh', name: 'logistics-cold', component: () => import('./views/logistics/ColdChainView.vue') },
  { path: 'chi-phi-kpi', name: 'logistics-cost', component: () => import('./views/logistics/CostKpiView.vue') }
];

// P2D: tài chính & kế toán (kế toán và admin)
const financeChildren = [
  { path: '', name: 'finance', component: () => import('./views/finance/CreditLedgerView.vue') },
  { path: 'thu-tien', name: 'finance-bank', component: () => import('./views/finance/ReconcileView.vue') },
  { path: 'doanh-thu', name: 'finance-revenue', component: () => import('./views/finance/RevenueView.vue') },
  { path: 'gia-von', name: 'finance-margin', component: () => import('./views/finance/MarginView.vue') },
  { path: 'gia-von-mon', name: 'finance-costing', component: () => import('./views/finance/CostingView.vue'), meta: { perm: 'costing' } },
  { path: 'cong-no', name: 'finance-payables', component: () => import('./views/finance/PayablesFinView.vue') },
  { path: 'dong-tien', name: 'finance-cashflow', component: () => import('./views/finance/CashflowView.vue') },
  { path: 'xuat-but-toan', name: 'finance-journal', component: () => import('./views/finance/JournalView.vue') },
  { path: 'cai-dat', name: 'finance-settings', component: () => import('./views/finance/FinSettingsView.vue') }
];

const LAYOUTS = { workshop: [WorkshopLayout, workshopChildren], purchasing: [PurchasingLayout, purchasingChildren], hub: [HubLayout, hubChildren], logistics: [LogisticsLayout, logisticsChildren], finance: [FinanceLayout, financeChildren] };

const moduleRoutes = MODULES.filter((m) => m.name !== 'demo').map((m) =>
  LAYOUTS[m.name]
    ? { path: m.path, component: LAYOUTS[m.name][0], meta: { module: m }, children: LAYOUTS[m.name][1] }
    : { path: m.path, name: m.name, component: COMPONENTS[m.name] || ModuleView, meta: { module: m } }
);

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/demo', name: 'demo', component: DemoView, meta: { module: MODULES.find((m) => m.name === 'demo') } },
  ...moduleRoutes,
  { path: '/kho/truy-xuat', redirect: '/truy-xuat' },
  { path: '/', redirect: () => (session.value ? ROLES[session.value.role].home : '/login') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

// App vận hành dùng hash history để không cần cấu hình lại redirect của Netlify.
const router = createRouter({ history: createWebHashHistory(), routes });

// Chặn theo hồ sơ nhân viên của máy chủ: vai trò (phân hệ và màn con) và quyền cụ thể (meta.perm). Xem guard.js.
router.beforeEach((to) => guardNavigation(session.value, to, { dev: devToolsEnabled() }));

export default router;
