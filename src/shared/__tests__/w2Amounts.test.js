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
  week1_payable_vnd: 900_000,
  weeks: [1, 2, 3, 4].map((i) => ({ week_index: i, delivery_date: `2026-12-${String(i * 7 - 6).padStart(2, '0')}`, charge_at: `2026-11-2${i}T00:00:00Z`, cutoff_at: `2026-11-3${i - 1}T01:00:00Z`, amount_vnd: 1_000_000, discount_vnd: 100_000, pay_vnd: 900_000 })),
  slot_full: false, full_dates: [], ...over
});

beforeEach(() => {
  setActivePinia(createPinia());
  for (const f of Object.values(cust)) f.mockReset();
});

describe('W2-05: số tiền ở bước thanh toán do máy chủ tính', () => {
  it('W2-05: chuyển khoản trọn gói, thẻ tuần đầu, ưu đãi lấy đúng số máy chủ trả', () => {
    const v = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 0 });
    expect(v.bank_transfer_4w.pay_vnd).toBe(3_600_000);
    expect(v.card.charge_now_vnd).toBe(900_000);
    expect(v.card.charges).toHaveLength(4);
    expect(v.package_value_vnd).toBe(4_000_000);
    expect(v.gift_total_vnd).toBe(400_000);
    expect(v.referral.referee_bonus_vnd).toBe(100_000);
    expect(v.cycle_weeks.map((w) => w.amount_vnd)).toEqual([900_000, 900_000, 900_000, 900_000]);
  });

  it('W2-05: Fresh Credit chỉ cần đủ tiền tuần 1; chọn gói nhỏ nhất đủ phần còn thiếu', () => {
    const need = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 0 }).fresh_credit;
    expect(need).toMatchObject({ covered: false, need_vnd: 900_000, pack_id: 'standard_4w', pay_vnd: 1_500_000, credit_received_vnd: 1_650_000 });
    expect(need.packs.map((p) => p.pack_id)).toEqual(['family_4w', 'nutrition_13w']);
  });

  it('W2-05: trừ số dư hiện có khỏi tiền tuần 1 trước khi chọn gói', () => {
    const partial = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 200_000 }).fresh_credit;
    expect(partial).toMatchObject({ need_vnd: 700_000, pack_id: 'standard_4w' });
    expect(partial.packs.map((p) => p.pack_id)).toEqual(['family_4w', 'nutrition_13w']);
    const covered = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 900_000 }).fresh_credit;
    expect(covered).toMatchObject({ covered: true, pay_vnd: 0, pack_id: null, need_vnd: 0 });
    expect(pickPacks([], 100).exact).toBeNull();
  });

  it('W2-05: store: số phải trả khi dùng Fresh Credit là giá gói đang chọn; chọn gói lớn hơn đổi số tiền', () => {
    const s = usePlanFlowStore();
    s.preview = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 200_000 });
    expect(s.selectedPackId()).toBe('standard_4w');
    expect(s.selectedTopupPay()).toBe(1_500_000);
    s.checkout.packId = 'nutrition_13w';
    expect(s.selectedPackId()).toBe('nutrition_13w');
    expect(s.selectedTopupPay()).toBe(6_000_000);
    s.checkout.packId = 'gói-lạ';
    expect(s.selectedPackId()).toBe('standard_4w');
    s.preview = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 900_000 });
    expect(s.selectedPackId()).toBeNull();
    expect(s.selectedTopupPay()).toBe(0);
  });

  it('W2-05: giao diện thanh toán không còn con số ưu đãi tự tính hay mã giảm giá giả', () => {
    const tpl = read('components/plans/StepCheckout.vue');
    expect(tpl).not.toMatch(/100000|15000|20000|25000/);
    expect(tpl).not.toMatch(/MOVA20|FREESHIP/);
    expect(tpl).toMatch(/data-testid="pay-breakdown"/);
    expect(tpl).toMatch(/preview\.referral|referral\.referee_bonus_vnd/);
  });

  it('W2-05: xem trước gửi mã giới thiệu để máy chủ tính ưu đãi; Fresh Credit chưa đủ thì tạo lệnh mua gói (không nạp tiền lẻ)', async () => {
    const s = usePlanFlowStore();
    s.options = { zone_id: 'Z', province: 'P', districts: ['Q'], options: [{ preferred_days: ['monday'], first_dates: { monday: '2026-12-07' }, slots: [] }] };
    Object.assign(s.checkout, { optionIndex: 0, slotId: 'x', street: '1', district: 'Q', name: 'N', phone: '0987654321' });
    s.refCode = 'MOVA-AB12';
    cust.previewSubscription.mockResolvedValue({ status: 'success', data: { ok: true } });
    await s.loadPreview();
    expect(cust.previewSubscription.mock.calls[0][0]).toMatchObject({ referral_code: 'MOVA-AB12', payment_method: 'fresh_credit' });
    s.preview = adaptPreview(raw(), { perWeek: 1, packs: PACKS, balanceVnd: 200_000 });
    cust.topUpCredit.mockResolvedValue({ status: 'success', data: { transfer_content: 'MOVA-X', pay_vnd: 1_500_000 } });
    const o = await s.orderSelectedPack();
    expect(cust.topUpCredit).toHaveBeenCalledWith({ pack_id: 'standard_4w' });
    expect(o.ok).toBe(true);
  });

  it('W2-05: chưa xác thực số điện thoại thì xem trước trả AUTH_REQUIRED và không có giá', async () => {
    const s = usePlanFlowStore();
    s.options = { zone_id: 'Z', province: 'P', districts: ['Q'], options: [{ preferred_days: ['monday'], first_dates: { monday: '2026-12-07' }, slots: [] }] };
    Object.assign(s.checkout, { optionIndex: 0, slotId: 'x' });
    cust.previewSubscription.mockResolvedValue({ status: 'error', error: { code: 'AUTH_REQUIRED', message: 'Hãy xác thực' } });
    await s.loadPreview();
    expect(s.preview).toBeNull();
    expect(s.errorCode).toBe('AUTH_REQUIRED');
  });
});
