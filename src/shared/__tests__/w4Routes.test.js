import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { OPS_ROUTES } from '../api/opsRoutes';

const BACKEND = resolve(process.cwd(), '../movafresh-platform');
const have = existsSync(join(BACKEND, 'backend/src/routes/ops'));

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Mọi đường của app vận hành trong backend: r.get('/x') trong routes/ops/*.ts thành "GET /ops/x". */
function backendOpsRoutes() {
  const out = new Set();
  for (const f of files(join(BACKEND, 'backend/src/routes/ops'))) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\br\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)) out.add(`${m[1].toUpperCase()} /ops${m[2]}`);
  }
  return out;
}

describe('W4-routes: bảng đường gọi của app vận hành khớp backend', () => {
  it('W4-routes: mỗi dòng có HTTP hợp lệ, đường bắt đầu bằng /ops, không trùng cặp HTTP + đường', () => {
    const seen = new Set();
    for (const [name, [method, path]] of Object.entries(OPS_ROUTES)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], name).toContain(method);
      expect(path.startsWith('/ops/'), name).toBe(true);
      expect(seen.has(`${method} ${path}`), `trùng ${name}`).toBe(false);
      seen.add(`${method} ${path}`);
    }
  });

  it.skipIf(!have)('W4-routes: mọi đường có thật trong mã nguồn backend (không gọi đường không tồn tại)', () => {
    const server = backendOpsRoutes();
    for (const [name, [method, path]] of Object.entries(OPS_ROUTES)) {
      expect(server.has(`${method} ${path}`), `${name}: ${method} ${path}`).toBe(true);
    }
  });
});
