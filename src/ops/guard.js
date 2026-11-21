// Chặn route của app vận hành theo hồ sơ nhân viên do máy chủ trả (vai trò + quyền). Máy chủ vẫn là nơi quyết định thật,
// đây chỉ để không hiện màn mà người đó không dùng được.

/** `to` có `meta.module.roles` (phân hệ), `meta.roles` (màn con) và/hoặc `meta.perm` (quyền cụ thể). */
export function routeAllowed(session, to) {
  if (!session) return false;
  const role = session.role;
  const mod = to.meta && to.meta.module;
  if (mod && !mod.roles.includes(role)) return false;
  const sub = (to.matched || []).map((r) => r.meta && r.meta.roles).filter(Boolean).pop();
  if (sub && !sub.includes(role)) return false;
  const perm = (to.matched || []).map((r) => r.meta && r.meta.perm).filter(Boolean).pop();
  if (perm && !(session.permissions || []).includes(perm)) return false;
  return true;
}

/** Trả đường dẫn cần chuyển tới, hoặc true nếu cho vào. */
export function guardNavigation(session, to, { dev = false } = {}) {
  if (to.name === 'login') return session ? '/' : true;
  if (!session) return '/login';
  // Bảng demo chỉ có ở bản build dev (VITE_DEV_TOOLS=true).
  if (to.name === 'demo' && !dev) return '/';
  return routeAllowed(session, to) ? true : '/';
}
