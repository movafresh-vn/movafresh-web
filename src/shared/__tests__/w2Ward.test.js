import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { read } from './helpers/asyncScan';

const cust = vi.hoisted(() => ({ availableSlots: vi.fn(), previewSubscription: vi.fn(), createSubscription: vi.fn(), topUpCredit: vi.fn(), reset: vi.fn() }));
vi.mock('../api', () => ({ api: { customer: cust } }));

import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { adaptPreview, buildSubscriptionBody, DEFAULT_INSTRUCTION, INSTRUCTION_MODES, normalizeInstruction, pickPacks } from '../api/adapters/checkout';

const PACKS = [
  { pack_id: 'standard_4w', label: 'Gói 4 tuần', pay_vnd: 1_500_000, bonus_vnd: 150_000, credit_received_vnd: 1_650_000 },
  { pack_id: 'family_4w', label: 'Gói gia đình', pay_vnd: 2_800_000, bonus_vnd: 300_000, credit_received_vnd: 3_100_000 },
  { pack_id: 'nutrition_13w', label: 'Gói 13 tuần', pay_vnd: 6_000_000, bonus_vnd: 900_000, credit_received_vnd: 6_900_000 }
];
const raw = (over = {}) => ({
  duration_weeks: 4, total_order_amount_vnd: 4_000_000, total_discount_vnd: 400_000, referral: { referee_bonus_vnd: 100_000 },
  weeks: [1, 2, 3, 4].map((i) => ({ week_index: i, delivery_date: `2026-12-${String(i * 7 - 6).padStart(2, '0')}`, charge_at: `2026-11-2${i}T00:00:00Z`, cutoff_at: `2026-11-3${i - 1}T01:00:00Z`, amount_vnd: 1_000_000, discount_vnd: 100_000, pay_vnd: 900_000 })),
  slot_full: false, full_dates: [], ...over
});

beforeEach(() => {
  setActivePinia(createPinia());
  for (const f of Object.values(cust)) f.mockReset();
});

describe('W2-03: phường/xã tùy chọn ở bước thanh toán', () => {
  const opts = { province: 'TP. HCM', districts: ['Quận 7'], options: [{ preferred_days: ['tuesday'], first_dates: { tuesday: '2026-12-01' }, slots: [{ slot_id: 's1', label: 'S' }] }] };
  function ready(s) {
    s.options = opts;
    Object.assign(s.checkout, { optionIndex: 0, slotId: 's1', street: '1 A', district: 'Quận 7', name: 'Lan', phone: '0987654321' });
  }

  it('W2-03: có phường thì gửi ward (đã cắt khoảng trắng), để trống thì không gửi', () => {
    const s = usePlanFlowStore();
    ready(s);
    expect(s.scheduleRequest().shipping_address).not.toHaveProperty('ward');
    s.checkout.ward = '  Tân Phong ';
    expect(s.scheduleRequest().shipping_address.ward).toBe('Tân Phong');
    s.checkout.ward = '   ';
    expect(s.scheduleRequest().shipping_address).not.toHaveProperty('ward');
  });

  it('W2-03: yêu cầu gửi máy chủ giới hạn phường tối đa 60 ký tự; ô nhập là tùy chọn (không nằm trong các mục còn thiếu)', () => {
    const base = { profile_id: 'p', plan_id: 'pl', duration_weeks: 4, payment_method: 'card', schedule: { preferred_days: ['monday'], first_dates: { monday: '2026-12-07' }, preferred_time_slot: 's', shipping_address: { ward: 'P'.repeat(80) } } };
    const r = buildSubscriptionBody({ req: base, servings: 1, weeksOfMeals: () => [{ dishes: { protein: 'D-PRT-001' } }] });
    expect(r.body.schedule.shipping_address.ward).toHaveLength(60);
    const tpl = read('components/plans/StepCheckout.vue');
    expect(tpl).toMatch(/data-testid="ward"/);
    expect(tpl).not.toMatch(/list\.push\('phường/);
  });
});

