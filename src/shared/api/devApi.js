// Công cụ dev của máy chủ (/api/v2/dev/*): đồng hồ nghiệp vụ, chạy job, dữ liệu mẫu, tiền ngân hàng giả đã ký.
// Máy chủ chỉ gắn các đường này khi DEV_TOOLS_ENABLED=true và NODE_ENV khác production; web chỉ hiện bảng khi VITE_DEV_TOOLS=true.
// Không còn "reset dữ liệu": muốn làm lại thì tạo lại CSDL cục bộ (npm run stack:down && npm run stack:up).
import { http as sharedHttp } from './http';
import { fillPath } from './routes';
import { syncServerTime } from '../utils/time';

export const DEV_ROUTES = {
  state: ['GET', '/dev/state'],
  clock: ['GET', '/dev/clock'],
  setClock: ['POST', '/dev/clock'],
  jump: ['POST', '/dev/clock/jump'],
  resetClock: ['POST', '/dev/clock/reset'],
  jobsRun: ['POST', '/dev/jobs/run'],
  seedTrips: ['POST', '/dev/seed/trips'],
  seedTrace: ['POST', '/dev/seed/trace'],
  bankTransfer: ['POST', '/dev/bank-transfer'],
  sampleAccounts: ['GET', '/dev/sample-accounts']
};

/** Bảng dev chỉ hiện ở bản build có VITE_DEV_TOOLS=true (không bao giờ ở bản production). */
export function devToolsEnabled(env = import.meta.env) {
  return Boolean(env && env.VITE_DEV_TOOLS === 'true');
}

export const BANK_SCENARIOS = ['pack', 'weeks', 'stranger'];
export const JUMP_KINDS = ['charge', 'cutoff', 'delivery', 'hub'];

/** Máy chủ trả "không có /dev" (404) hoặc chặn (401/403) thì bảng ẩn đi, không phải lỗi. */
export const isDevMissing = (e) => Boolean(e && (e.status === 404 || e.status === 401 || e.status === 403));

export function createDevApi({ http = sharedHttp, enabled = devToolsEnabled } = {}) {
  const h = () => (typeof http === 'function' ? http() : http);
  const on = () => (typeof enabled === 'function' ? enabled() : Boolean(enabled));
  const call = (name, { body, query } = {}) => {
    const [verb, path] = DEV_ROUTES[name];
    return h().request(verb, fillPath(path, {}), { body, query });
  };
  /** Mỗi lần máy chủ trả đồng hồ thì web đồng bộ độ lệch để mọi màn dùng chung một "bây giờ". */
  const synced = async (p) => {
    const r = await p;
    if (r && typeof r.now === 'string') syncServerTime(r.now);
    return r;
  };

  return {
    enabled: on,
    /** true khi bảng dùng được: cờ build bật VÀ máy chủ có /dev (404 thì false). Lỗi khác (mạng) vẫn ném. */
    async available() {
      if (!on()) return false;
      try {
        await call('clock');
        return true;
      } catch (e) {
        if (isDevMissing(e)) return false;
        throw e;
      }
    },
    state: () => synced(call('state')),
    clock: () => synced(call('clock')),
    /** `at` là Date hoặc ISO; mặc định chỉ đi tới (allowBackward=true mới lùi). */
    setNow: (at, { freeze, allowBackward, runJobs } = {}) =>
      synced(
        call('setClock', {
          body: {
            at: at instanceof Date ? at.toISOString() : at,
            ...(freeze !== undefined ? { freeze } : {}),
            ...(allowBackward ? { allow_backward: true } : {}),
            ...(runJobs !== undefined ? { run_jobs: runJobs } : {})
          }
        })
      ),
    /** kind: 'charge' | 'cutoff' | 'delivery' | 'hub'. */
    jumpTo(kind) {
      if (!JUMP_KINDS.includes(kind)) throw new Error(`Mốc không hợp lệ: ${kind}`);
      return synced(call('jump', { body: { kind } }));
    },
    resetClock: () => synced(call('resetClock', { body: {} })),
    runJobs: (jobs) => synced(call('jobsRun', { body: jobs && jobs.length ? { jobs } : {} })),
    seedTrips: (day) => call('seedTrips', { body: day ? { day } : {} }),
    seedTrace: (day) => call('seedTrace', { body: day ? { day } : {} }),
    /** scenario: 'pack' | 'weeks' | 'stranger'; pack/weeks cần userId (id khách). */
    bankTransfer({ scenario, userId, packId, amountVnd, transactionId } = {}) {
      if (!BANK_SCENARIOS.includes(scenario)) throw new Error(`Kịch bản không hợp lệ: ${scenario}`);
      return call('bankTransfer', {
        body: {
          scenario,
          ...(userId ? { user_id: userId } : {}),
          ...(packId ? { pack_id: packId } : {}),
          ...(amountVnd ? { amount_vnd: amountVnd } : {}),
          ...(transactionId ? { transaction_id: transactionId } : {})
        }
      });
    },
    sampleAccounts: () => call('sampleAccounts')
  };
}
