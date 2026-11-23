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

describe('W2-02: hướng dẫn giao bắt buộc, mặc định để ở lễ tân + chụp ảnh', () => {
  it('W2-02: mặc định đã chọn sẵn leave_at_reception + photo_required, không có lựa chọn "bỏ trống"', () => {
    const s = usePlanFlowStore();
    expect(s.checkout.instruction).toMatchObject({ mode: 'leave_at_reception', photo_required: true });
    expect(INSTRUCTION_MODES.every((m) => m.mode && m.label)).toBe(true);
    expect(INSTRUCTION_MODES.find((m) => m.mode === 'leave_at_reception').label).toMatch(/lễ tân.*chụp ảnh/);
    const tpl = read('components/plans/StepCheckout.vue');
    expect(tpl).toMatch(/data-testid="instruction"/);
    expect(tpl).toMatch(/type="radio" name="coInstruction"/);
    expect(tpl).not.toMatch(/<select id="coDeliveryInstruct"/);
  });

  it('W2-02: để lại hàng thì ảnh luôn bắt buộc (kể cả khi client gửi photo_required=false); chế độ lạ về mặc định', () => {
    expect(normalizeInstruction({ mode: 'leave_at_door', photo_required: false })).toEqual({ mode: 'leave_at_door', photo_required: true });
    expect(normalizeInstruction({ mode: 'leave_at_reception' })).toEqual({ mode: 'leave_at_reception', photo_required: true });
    expect(normalizeInstruction({ mode: 'hand_to_customer' })).toEqual({ mode: 'hand_to_customer', photo_required: false });
    expect(normalizeInstruction({ mode: 'hack' })).toEqual({ ...DEFAULT_INSTRUCTION });
    expect(normalizeInstruction(undefined)).toEqual({ ...DEFAULT_INSTRUCTION });
    expect(normalizeInstruction({ mode: 'call_on_arrival', note: '  Bấm chuông  ' })).toEqual({ mode: 'call_on_arrival', photo_required: false, note: 'Bấm chuông' });
    expect(normalizeInstruction({ mode: 'call_on_arrival', note: 'x'.repeat(300) }).note).toHaveLength(200);
  });

  it('W2-02: yêu cầu gửi máy chủ luôn mang delivery_instruction hợp lệ', () => {
    const base = { profile_id: 'p', plan_id: 'pl', duration_weeks: 4, payment_method: 'card', schedule: { preferred_days: ['monday'], first_dates: { monday: '2026-12-07' }, preferred_time_slot: 's', shipping_address: {} } };
    const meals = () => [{ dishes: { protein: 'D-PRT-001', carb: 'D-CRB-001' } }];
    const a = buildSubscriptionBody({ req: base, servings: 2, weeksOfMeals: meals });
    expect(a.body.schedule.delivery_instruction).toEqual({ ...DEFAULT_INSTRUCTION });
    const b = buildSubscriptionBody({ req: { ...base, schedule: { ...base.schedule, delivery_instruction: { mode: 'leave_at_door', photo_required: false } } }, servings: 2, weeksOfMeals: meals });
    expect(b.body.schedule.delivery_instruction.photo_required).toBe(true);
  });
});

