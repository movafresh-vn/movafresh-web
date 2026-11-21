import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import DashboardView from '../views/DashboardView.vue';
import PlansView from '../views/PlansView.vue';
import QrTraceView from '../views/QrTraceView.vue';
import MenusView from '../views/MenusView.vue';
import TermsView from '../views/TermsView.vue';
import RefundPolicyView from '../views/RefundPolicyView.vue';
import PrivacyView from '../views/PrivacyView.vue';
import FaqView from '../views/FaqView.vue';

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/menus',
    name: 'menus',
    component: MenusView
  },
  {
    path: '/plans',
    name: 'plans',
    component: PlansView
  },
  {
    path: '/terms',
    name: 'terms',
    component: TermsView
  },
  {
    path: '/refund-policy',
    name: 'refund-policy',
    component: RefundPolicyView
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: PrivacyView
  },
  {
    path: '/faq',
    name: 'faq',
    component: FaqView
  },
  {
    path: '/account',
    name: 'account',
    component: DashboardView
  },
  {
    path: '/dashboard',
    redirect: '/account'
  },
  {
    // Trang mở khi quét QR trên hộp. Không cần đăng nhập.
    path: '/q/:code',
    name: 'trace',
    component: QrTraceView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: typeof window !== 'undefined'
    ? createWebHistory(import.meta.env?.BASE_URL || '/')
    : createMemoryHistory(import.meta.env?.BASE_URL || '/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      };
    }
    return { top: 0, behavior: 'smooth' };
  }
});

export default router;
