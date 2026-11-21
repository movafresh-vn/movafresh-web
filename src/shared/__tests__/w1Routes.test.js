import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CUSTOMER_ROUTES, fillPath } from '../api/routes';

const BACKEND = resolve(process.cwd(), '../movafresh-platform');
const have = existsSync(join(BACKEND, 'backend/src/routes'));

function routeFiles(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? routeFiles(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Mọi đường khai báo trong mã nguồn backend dạng r.get('/x') ... → "GET /x" (đường nằm dưới /api/v2). */
function backendRoutes() {
  const out = new Set();
  for (const f of routeFiles(join(BACKEND, 'backend/src/routes'))) {
    if (f.includes(`${'ops'}`) && /[\/]ops[\/]/.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)) out.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return out;
}

const contractFlows = () => {
  const c = JSON.parse(readFileSync(join(BACKEND, 'docs/api-contract.json'), 'utf8'));
  return new Set(Object.values(c.flows).map((f) => f.endpoint).filter(Boolean).map((e) => e.replace(/^(\w+) \/api\/v2/, '$1 ')));
};

describe('W1-02: bảng đường gọi của app khách khớp backend và contract', () => {
  it('W1-02: fillPath thay tham số, mã hóa URL, thiếu tham số thì ném lỗi', () => {
    expect(fillPath('/lots/:code', { code: 'MOVA TRACE/1' })).toBe('/lots/MOVA%20TRACE%2F1');
    expect(fillPath('/subscription/weeks/:week_index/meals/:meal_index/options', { week_index: 2, meal_index: 1 })).toBe('/subscription/weeks/2/meals/1/options');
    expect(() => fillPath('/lots/:code', {})).toThrow('Thiếu tham số');
  });

  it('W1-02: mỗi dòng có HTTP hợp lệ và đường bắt đầu bằng /; không trùng tên', () => {
    for (const [name, [method, path]] of Object.entries(CUSTOMER_ROUTES)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], name).toContain(method);
      expect(path.startsWith('/'), name).toBe(true);
    }
  });

  it.skipIf(!have)('W1-02: mọi đường có thật trong mã nguồn backend (không gọi đường không tồn tại)', () => {
    const server = backendRoutes();
    for (const [name, [method, path]] of Object.entries(CUSTOMER_ROUTES)) {
      const hono = path.replace(/:([a-z_]+)/g, ':$1');
      expect(server.has(`${method} ${hono}`), `${name}: ${method} ${path}`).toBe(true);
    }
  });

  it.skipIf(!have)('W1-02: đường nào đã có flow trong api-contract.json thì cùng HTTP + đường dẫn', () => {
    const flows = contractFlows();
    const covered = ['getAccount', 'myWeeks', 'changeMeal', 'renewSubscription', 'previewSubscription', 'createSubscription', 'creditPacks', 'creditAccount', 'rewards', 'claimShare', 'saveProfile', 'pendingRatings', 'rateDish', 'captureLead', 'joinWaitlist', 'dishes', 'serviceAreas', 'deliveryOptions'];
    for (const name of covered) {
      const [method, path] = CUSTOMER_ROUTES[name];
      const norm = path.replace(/:([a-z_]+)/g, ':$1');
      const hit = [...flows].some((f) => f.split('?')[0] === `${method} ${norm}` || f.replace(/\{(\w+)\}/g, ':$1') === `${method} ${norm}`);
      expect(hit, `${name}: ${method} ${path} chưa có trong contract`).toBe(true);
    }
  });
});
