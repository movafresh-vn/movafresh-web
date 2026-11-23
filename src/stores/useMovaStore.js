import { defineStore } from 'pinia';
import { api } from '../shared/api';
import { otpIdentity } from '../shared/domain/leads';
import { getAccessToken, requestOtp, signOut, verifyOtp } from '../services/supabase';

// Store của phần tài khoản (/account) và các thành phần dùng chung toàn app (toast, modal, ngăn thông báo).
// Danh tính khách là phiên Supabase (đăng nhập bằng mã OTP gửi về số điện thoại). Mọi dữ liệu tài khoản đến từ backend thật qua
// api.customer; web không giữ dữ liệu tài khoản nào ngoài bản sao để hiển thị. Mỗi lần gọi đều chờ (await) kết quả.
const POLL_MS = 20000;

export const useMovaStore = defineStore('mova', {
  state: () => ({
    customerId: null, // mã người dùng của phiên đăng nhập (chỉ để giao diện biết "đã đăng nhập"; máy chủ tự biết khách là ai từ token)
    account: null, // kết quả api.customer.getAccount
    authUser: null,
    notifications: [],
    loaded: false,
    refreshing: false,
    version: 0, // tăng mỗi lần dữ liệu tải lại; các tab theo dõi để tự cập nhật

    // Trạng thái giao diện tạm thời
    toastMessage: '',
    toastVisible: false,
    toastTimer: null,
    notifDrawerOpen: false,
    activeModal: null, // 'login' | 'topup'
    topupSuggest: null // { pay_vnd } gợi ý mức nạp khi mở từ cảnh báo
  }),

  getters: {
    isLoggedIn: (s) => Boolean(s.customerId && s.account),
    hasMovaSession: (s) => Boolean((s.customerId && s.account) || s.authUser),
    userName: (s) => (s.account ? s.account.customer.name : ''),
    unreadNotifsCount: (s) => s.notifications.filter((n) => !n.read).length,
    balance: (s) => (s.account ? s.account.credit : { real_vnd: 0, promo_vnd: 0, total_vnd: 0 }),
    alertCount: (s) => (s.account && s.account.alert ? 1 : 0) + (s.account && s.account.renewal && s.account.renewal.due ? 1 : 0),
    hasActivePlan: (s) => Boolean(s.account && s.account.subscription && s.account.subscription.status === 'active')
  },

  actions: {
    setAuthUser(user) {
      this.authUser = user;
      this.customerId = user ? user.id : null;
      if (!user) {
        this.account = null;
        this.notifications = [];
      }
    },

    toast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastVisible = false;
      }, 3200);
    },

    openModal(name, payload = null) {
      this.activeModal = name;
      if (name === 'topup') this.topupSuggest = payload;
    },

    closeModal() {
      this.activeModal = null;
    },

    /** Tải lại tổng quan và thông báo. Trả false nếu chưa đăng nhập hoặc phiên đã hết hạn. */
    async refresh() {
      if (this.refreshing) return Boolean(this.account);
      this.refreshing = true;
      try {
        const token = await getAccessToken().catch(() => null);
        if (!token) {
          this.account = null;
          this.notifications = [];
          this.loaded = true;
          return false;
        }
        const res = await api.customer.getAccount();
        if (res.status === 'error') {
          // Chỉ đăng xuất khi phiên hết hạn/không hợp lệ (401). Khi 404 (chưa có hồ sơ), giữ nguyên phiên đăng nhập Supabase.
          if (res.error.status === 401 || ['UNAUTHORIZED', 'AUTH_REQUIRED'].includes(res.error.code)) {
            await this.logout(true);
          }
          this.account = null;
          this.notifications = [];
          this.loaded = true;
          return false;
        }
        this.account = res.data;
        this.notifications = await api.customer.notifications();
        this.loaded = true;
        this.version += 1;
        return true;
      } finally {
        this.refreshing = false;
      }
    },

    startPolling() {
      this.stopPolling();
      this._poll = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        void this.refresh();
      }, POLL_MS);
    },

    stopPolling() {
      if (this._poll) clearInterval(this._poll);
      this._poll = null;
    },

    /** Gửi mã OTP về số điện thoại / email. Trả '' nếu gửi được, nếu không trả lời nhắc cho khách. */
    async requestOtp(contact, opts) {
      const id = otpIdentity(contact, opts);
      if (!id) return 'Nhập số điện thoại (ví dụ 0908 123 456, hoặc +81 90 1234 5678 với số nước ngoài) hoặc email hợp lệ.';
      try {
        await requestOtp(id);
        return '';
      } catch (e) {
        return e instanceof Error ? e.message : 'Không gửi được mã OTP.';
      }
    },

    /** Xác thực mã OTP, vào tài khoản và tải dữ liệu. Trả '' nếu thành công. */
    async verifyOtp(contact, code, opts) {
      const id = otpIdentity(contact, opts);
      if (!id) return 'Nhập số điện thoại hoặc email hợp lệ.';
      try {
        const user = await verifyOtp(id, String(code || '').trim());
        this.setAuthUser(user);
      } catch (e) {
        return e instanceof Error ? e.message : 'Mã OTP không đúng.';
      }
      await this.refresh();
      this.toast(this.userName ? `Đã vào tài khoản ${this.userName}` : 'Đăng nhập MOVA thành công.');
      this.closeModal();
      return '';
    },

    async logout(silent = false) {
      this.stopPolling();
      try {
        await signOut();
      } catch {
        // đăng xuất phía máy chủ lỗi: vẫn xóa dữ liệu ở máy này
      }
      api.customer.reset();
      this.setAuthUser(null);
      this.loaded = true;
      if (!silent) this.toast('Đã đăng xuất');
    },

    async markAllNotifsRead() {
      if (!this.customerId) return;
      await api.customer.markNotificationsRead();
      this.notifications = await api.customer.notifications();
      await this.refresh();
    }
  }
});
