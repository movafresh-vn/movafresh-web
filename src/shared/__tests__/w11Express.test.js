import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildSubscriptionBody } from '../api/adapters/checkout';
import { OPS_ROUTES } from '../api/opsRoutes';
import { CUSTOMER_ROUTES } from '../api/routes';

const base = (extra = {}) => ({
  req: {
    profile_id: 'p1', plan_id: 'pl1', duration_weeks: 4, payment_method: 'bank_transfer_4w',
    schedule: { preferred_days: ['thursday'], first_dates: { thursday: '2026-12-10' }, preferred_time_slot: 'evening_18_21', shipping_address: { street: '1 A', district: 'Quận 1', city: 'TP. HCM', receiver_name: 'A', receiver_phone: '0987654321' } },
    ...extra
  },
  servings: 3,
  weeksOfMeals: () => [{ dishes: { protein: 'D-PRT-001' } }]
});

describe('W11-01: giao nhanh 24-36 giờ không đổi hành vi cũ khi không chọn', () => {
  it('W11-01: không có express thì body như cũ (không express_hold_id, ngày tuần 1 theo lịch thường)', () => {
    const { body } = buildSubscriptionBody(base());
    expect(body.express_hold_id).toBeUndefined();
    expect(body.weeks[0].delivery_date).toBe('2026-12-10');
    expect(body.payment_method).toBe('bank_transfer_4w');
  });

  it('W11-01: có chỗ giữ giao nhanh thì tuần 1 giao đúng ngày đã giữ, trả Fresh Credit, tuần sau giữ lịch thường', () => {
    const { body } = buildSubscriptionBody(base({ express: { hold_id: 'XH-000123', day: '2026-12-02' } }));
    expect(body.express_hold_id).toBe('XH-000123');
    expect(body.weeks[0].delivery_date).toBe('2026-12-02');
    expect(body.weeks[1].delivery_date).toBe('2026-12-17');
    expect(body.payment_method).toBe('fresh_credit');
    expect(body.weeks).toHaveLength(4);
  });
});

describe('W11-02: bảng đường gọi giao nhanh', () => {
  it('W11-02: app khách có đúng 3 đường giao nhanh', () => {
    expect(CUSTOMER_ROUTES.expressOptions).toEqual(['POST', '/delivery/express/options']);
    expect(CUSTOMER_ROUTES.expressHold).toEqual(['POST', '/delivery/express/holds']);
    expect(CUSTOMER_ROUTES.expressRelease).toEqual(['POST', '/delivery/express/holds/:id/release']);
  });

  const backend = resolve(process.cwd(), '../movafresh-platform/backend/src/routes');
  it.skipIf(!existsSync(join(backend, 'express.ts')))('W11-02: mọi đường giao nhanh (khách và vận hành) có thật ở backend', () => {
    const src = readFileSync(join(backend, 'express.ts'), 'utf8') + readFileSync(join(backend, 'ops/express.ts'), 'utf8');
    const server = new Set([...src.matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`));
    for (const [name, [method, path]] of Object.entries({ ...CUSTOMER_ROUTES, ...OPS_ROUTES })) {
      if (!/express/i.test(name) && !/^exp[A-Z]/.test(name)) continue;
      const rel = path.replace(/^\/ops/, '');
      expect(server.has(`${method} ${rel}`), `${name}: ${method} ${path}`).toBe(true);
    }
  });
});
