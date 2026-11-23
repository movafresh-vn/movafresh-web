import { describe, expect, it } from 'vitest';
import { adaptLatePayment, adaptWeeks } from '../api/adapters/account';
import { read } from './helpers/asyncScan';

const week = (over = {}) => ({
  week_index: 3, status: 'delivered', status_label: 'Đã giao', editable: false, deadline_at: '2026-12-01T01:00:00.000Z', delivery_date: '2026-12-03', slot_id: 'early_morning_06_08',
  order_code: 'MV-261203-0007', order_state: 'COMPLETED', route_id: 'R-Q7-TANPHONG',
  meals: [{ meal_index: 1, kind: 'protein', dish_id: 'D-PRT-001', name: 'Ba rọi', servings: 2, price_vnd: 45000, editable: false }],
  list_vnd: 45000, discount_vnd: 0, amount_vnd: 45000, charge: { state: 'paid', at: '2026-11-30T00:00:00.000Z', amount_vnd: 45000, reason: '' },
  postponed_to_week: null, moved_from_week: null, skip: { allowed: false, code: 'CUTOFF_PASSED', reason: '' }, delivery_instruction: { mode: 'leave_at_reception', photo_required: true },
  delivery_proof: { delivered_at: '2026-12-03T00:30:00.000Z', photo_url: 'https://cdn.example/p.jpg' }, late_payment: null, ...over
});
const sub = { id: 's', status: 'active', weeks: 4, payment_method: 'card', zone_id: 'Z2', zone_name: 'Q7', slot_id: 'early_morning_06_08', skips_used: 0, skips_max: 1, created_at: 'x', cancelled_at: null, first_delivery_date: '2026-12-01', delivery_instruction: null };

describe('W3-02: thẻ tuần hiện ảnh giao hàng và trạng thái thanh toán đến sau giờ chốt sổ', () => {
  it('W3-02: ảnh giao hàng và giờ giao đi vào hộp của tuần', () => {
    const w = adaptWeeks({ subscription: sub, weeks: [week()], now: 'n' }).weeks[0];
    expect(w.boxes[0]).toMatchObject({ photo_url: 'https://cdn.example/p.jpg', delivered_at: '2026-12-03T00:30:00.000Z', phase: 'delivered' });
    expect(w.delivery_proof.photo_url).toBe('https://cdn.example/p.jpg');
    expect(w.order_code).toBe('MV-261203-0007');
    expect(w.route_id).toBe('R-Q7-TANPHONG');
  });

  it('W3-02: chưa có ảnh thì photo_url rỗng (giao diện nhắc "ảnh sẽ hiện ở đây")', () => {
    const w = adaptWeeks({ subscription: sub, weeks: [week({ delivery_proof: { delivered_at: null, photo_url: null } })], now: 'n' }).weeks[0];
    expect(w.boxes[0].photo_url).toBeNull();
    expect(w.boxes[0].delivered_at).toBeNull();
  });

  it('W3-02: các trạng thái thanh toán đến muộn có nhãn tiếng Việt và sắc thái đúng; trạng thái lạ vẫn có nhãn an toàn', () => {
    expect(adaptLatePayment(null)).toBeNull();
    expect(adaptLatePayment({ status: 'pending_review', decision: null })).toMatchObject({ tone: 'wait', label: expect.stringContaining('xem xét') });
    expect(adaptLatePayment({ status: 'accepted', decision: 'accept' })).toMatchObject({ tone: 'good' });
    expect(adaptLatePayment({ status: 'rolled_over', decision: 'reject' })).toMatchObject({ tone: 'info', label: expect.stringContaining('ngày giao kế tiếp') });
    expect(adaptLatePayment({ status: 'credited', decision: null })).toMatchObject({ tone: 'info', label: expect.stringContaining('Fresh Credit') });
    expect(adaptLatePayment({ status: 'mới_lạ', decision: null })).toMatchObject({ tone: 'wait' });
  });

  it('W3-02: tuần có khoản thanh toán đến muộn mang nhãn vào thẻ tuần', () => {
    const w = adaptWeeks({ subscription: sub, weeks: [week({ status: 'editable', status_label: 'Có thể đổi món', late_payment: { status: 'pending_review', decision: null } })], now: 'n' }).weeks[0];
    expect(w.late_payment).toMatchObject({ status: 'pending_review', tone: 'wait' });
  });

  it('W3-02: thẻ tuần có vùng hiển thị trạng thái và ảnh giao hàng', () => {
    const tpl = read('components/dashboard/WeekCard.vue');
    expect(tpl).toMatch(/data-testid="late-payment"/);
    expect(tpl).toMatch(/data-testid="delivery-proof"/);
    expect(tpl).toMatch(/week\.late_payment\.label/);
    expect(tpl).toMatch(/b\.photo_url/);
    expect(tpl).toMatch(/Thanh toán đến sau giờ chốt sổ/);
  });
});
