import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import router from '../../router';
import { DISHES } from '../data/catalog';

describe('V2.3 UX Polish & Legal Pages Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Clear localStorage for clean test state
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('StepAbout: Adults & Children steppers & auto-preferences', () => {
    it('khởi tạo mặc định 2 người lớn, 0 trẻ em, tổng size 2', () => {
      const store = usePlanFlowStore();
      expect(store.answers.adults).toBe(2);
      expect(store.answers.children).toBe(0);
      expect(store.answers.size).toBe(2);
      expect(store.answers.needs).toEqual([]);
      expect(store.answers.avoid).toEqual([]);
    });

    it('tính lại household_size = adults + children khi đổi adults', () => {
      const store = usePlanFlowStore();
      store.setAnswer('adults', 4);
      expect(store.answers.adults).toBe(4);
      expect(store.answers.children).toBe(0);
      expect(store.answers.size).toBe(4);
    });

    it('khi có trẻ em (children > 0), tự động bật young_child và no_spicy', () => {
      const store = usePlanFlowStore();
      store.setAnswer('adults', 2);
      store.setAnswer('children', 1);

      expect(store.answers.size).toBe(3);
      expect(store.answers.needs).toContain('young_child');
      expect(store.answers.avoid).toContain('no_spicy');
    });

    it('giới hạn household_size tối đa 10 người và tối thiểu 1 người', () => {
      const store = usePlanFlowStore();
      store.setAnswer('adults', 8);
      store.setAnswer('children', 5); // tổng 13 -> clamp 10
      expect(store.answers.size).toBe(10);

      store.setAnswer('adults', 0);
      store.setAnswer('children', 0); // tổng 0 -> clamp 1
      expect(store.answers.size).toBe(1);
    });

    it('khi cập nhật size trực tiếp, tự điều chỉnh adults = size và children = 0 nếu lệch', () => {
      const store = usePlanFlowStore();
      store.setAnswer('size', 4);
      expect(store.answers.size).toBe(4);
      expect(store.answers.adults).toBe(4);
      expect(store.answers.children).toBe(0);
    });
  });

  describe('StepCheckout: Hướng dẫn giao hàng lạnh & Lịch cố định', () => {
    it('mặc định hướng dẫn giao lạnh là Gọi điện trước 15 phút khi tới', () => {
      const store = usePlanFlowStore();
      expect(store.checkout.deliveryInstruction).toBe('Gọi điện trước 15 phút khi tới');
      expect(store.checkout.customInstruction).toBe('');
    });

    it('hàm scheduleRequest gắn đúng delivery_instruction tiêu chuẩn', () => {
      const store = usePlanFlowStore();
      store.options = {
        province: 'TP. Hồ Chí Minh',
        districts: ['Quận 7'],
        options: [
          { preferred_days: ['tuesday'], slots: [{ slot_id: 'evening_18_21', label: '18:00 - 21:00' }] }
        ]
      };
      store.checkout.optionIndex = 0;
      store.checkout.slotId = 'evening_18_21';
      store.checkout.street = '12 Nguyễn Văn Linh';
      store.checkout.district = 'Quận 7';
      store.checkout.name = 'Chị Lan';
      store.checkout.phone = '0987654321';
      store.checkout.deliveryInstruction = 'Gửi lễ tân / bảo vệ chung cư (thùng giữ lạnh 6 giờ)';

      const req = store.scheduleRequest();
      expect(req).not.toBeNull();
      expect(req.shipping_address.delivery_instruction).toBe('Gửi lễ tân / bảo vệ chung cư (thùng giữ lạnh 6 giờ)');
    });

    it('hàm scheduleRequest định dạng đúng khi chọn Ghi chú riêng...', () => {
      const store = usePlanFlowStore();
      store.options = {
        province: 'TP. Hồ Chí Minh',
        districts: ['Quận 7'],
        options: [
          { preferred_days: ['friday'], slots: [{ slot_id: 'morning_08_12', label: '08:00 - 12:00' }] }
        ]
      };
      store.checkout.optionIndex = 0;
      store.checkout.slotId = 'morning_08_12';
      store.checkout.street = '45 Lê Duẩn';
      store.checkout.district = 'Quận 1';
      store.checkout.name = 'Anh Tuấn';
      store.checkout.phone = '0912345678';
      store.checkout.deliveryInstruction = 'other';
      store.checkout.customInstruction = 'Bấm chuông lầu 3 căn 302';

      const req = store.scheduleRequest();
      expect(req).not.toBeNull();
      expect(req.shipping_address.delivery_instruction).toBe('Ghi chú: Bấm chuông lầu 3 căn 302');
    });
  });

  describe('Router & Legal / Menus views', () => {
    it('chứa đầy đủ các routes V2.3 công khai', () => {
      const routes = router.getRoutes();
      const paths = routes.map((r) => r.path);

      expect(paths).toContain('/');
      expect(paths).toContain('/menus');
      expect(paths).toContain('/plans');
      expect(paths).toContain('/terms');
      expect(paths).toContain('/refund-policy');
      expect(paths).toContain('/privacy');
      expect(paths).toContain('/faq');
      expect(paths).toContain('/account');
    });

    it('chuyển hướng /dashboard sang /account', async () => {
      const routes = router.getRoutes();
      const dashRoute = routes.find((r) => r.path === '/dashboard');
      expect(dashRoute).toBeDefined();
      expect(dashRoute.redirect).toBe('/account');
    });
  });

  describe('DISHES metadata cho Modal chi tiết món & Terroir', () => {
    it('toàn bộ 21 món trong catalog đều có đủ thông tin Terroir và hướng dẫn nấu 15 phút', () => {
      const dishList = Object.values(DISHES);
      expect(dishList.length).toBe(21);
      for (const dish of dishList) {
        expect(dish.id).toBeTruthy();
        expect(dish.name).toBeTruthy();
        expect(dish.kind).toBeTruthy();
        expect(dish.terroir_region).toBeTruthy();
        expect(dish.terroir_story).toBeTruthy();
        expect(dish.chef_note).toBeTruthy();
        expect(dish.portion_specs).toBeDefined();
        expect(dish.nutrition_per_serving).toBeDefined();
        expect(dish.nutrition_per_serving.calories).toBeGreaterThan(0);
        expect(dish.cooking_steps).toBeInstanceOf(Array);
        expect(dish.cooking_steps.length).toBeGreaterThan(0);
      }
    });
  });
});
