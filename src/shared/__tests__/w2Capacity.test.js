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

describe('W2-04: sức chứa còn lại theo từng ngày giao', () => {
  function withOption(s) {
    s.options = { zone_id: 'Z2', province: 'P', districts: ['Quận 7'], options: [{ preferred_days: ['tuesday'], first_dates: { tuesday: '2026-12-01' }, slots: [{ slot_id: 'early_morning_06_08', label: 'S' }] }] };
    s.checkout.optionIndex = 0;
    s.checkout.slotId = 'early_morning_06_08';
  }

  it('W2-04: lấy sức chứa của khung giờ đang chọn; ngày effective_remaining = 0 là hết chỗ', async () => {
    cust.availableSlots.mockResolvedValue({
      status: 'success',
      data: { zone_id: 'Z2', slots: [
        { slot_id: 'other', dates: [{ date: '2026-12-01', remaining: 9, cycle_remaining: 9, effective_remaining: 9 }] },
        { slot_id: 'early_morning_06_08', dates: [
          { date: '2026-12-01', capacity: 30, booked: 28, remaining: 2, cycle_remaining: 40, effective_remaining: 2 },
          { date: '2026-12-08', capacity: 30, booked: 10, remaining: 20, cycle_remaining: 0, effective_remaining: 0 }
        ] }
      ] }
    });
    const s = usePlanFlowStore();
    withOption(s);
    await s.loadCapacity();
    expect(cust.availableSlots).toHaveBeenCalledWith('Z2', 28, ['tuesday']);
    expect(s.capacity.map((d) => d.effective_remaining)).toEqual([2, 0]);
    expect(s.fullDates).toEqual(['2026-12-08']);
  });

  it('W2-04: chưa chọn khung giờ hoặc lỗi máy chủ thì không có số liệu sức chứa (không đoán)', async () => {
    const s = usePlanFlowStore();
    withOption(s);
    s.checkout.slotId = '';
    await s.loadCapacity();
    expect(s.capacity).toBeNull();
    s.checkout.slotId = 'early_morning_06_08';
    cust.availableSlots.mockResolvedValue({ status: 'error', error: { code: 'OUT_OF_ZONE', message: 'x' } });
    await s.loadCapacity();
    expect(s.capacity).toBeNull();
    cust.availableSlots.mockRejectedValue(Object.assign(new Error('mạng'), { code: 'NETWORK_ERROR' }));
    await s.loadCapacity();
    expect(s.capacity).toBeNull();
  });

  it('W2-04: xem trước báo ngày đầy (slot_full, full_dates) và ngày đầy chặn nút trả tiền ở giao diện', () => {
    const v = adaptPreview(raw({ slot_full: true, full_dates: ['2026-12-08'] }), { perWeek: 1, packs: PACKS, balanceVnd: 0 });
    expect(v.slot_full).toBe(true);
    expect(v.full_dates).toEqual(['2026-12-08']);
    const tpl = read('components/plans/StepCheckout.vue');
    expect(tpl).toMatch(/data-testid="capacity"/);
    expect(tpl).toMatch(/hasFullDate/);
    expect(tpl).toMatch(/list\.push\('ngày giao còn chỗ'\)/);
    expect(tpl).toMatch(/'CYCLE_FULL'/);
  });

  it('W2-04: đăng ký gặp CYCLE_FULL hoặc SLOT_FULL thì trả kind để giao diện làm mới lịch', async () => {
    const s = usePlanFlowStore();
    withOption(s);
    Object.assign(s.checkout, { street: '1 A', district: 'Q', name: 'N', phone: '0987654321', method: 'card' });
    cust.createSubscription.mockResolvedValue({ status: 'error', error: { code: 'CYCLE_FULL', message: 'Chu kỳ đầy', limit: 'truck_kg' } });
    const r = await s.submitOrder();
    expect(r).toMatchObject({ ok: false, kind: 'CYCLE_FULL', message: 'Chu kỳ đầy' });
    cust.createSubscription.mockResolvedValue({ status: 'error', error: { code: 'SLOT_FULL', message: 'Khung giờ đầy' } });
    expect((await s.submitOrder()).kind).toBe('SLOT_FULL');
  });
});

