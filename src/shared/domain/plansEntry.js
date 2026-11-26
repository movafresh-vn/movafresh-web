import { hasCompletedCustomerProfile } from './profilePreferences';

export const wantsPlansSurveyEdit = (query = {}) =>
  query.edit === '1' ||
  query.reset === 'survey' ||
  (String(query.step || '') === '1' && query.q !== undefined);

/**
 * Quyết định bước đầu tiên khi vào /plans (từ Trang chủ, Navbar, Dashboard hoặc sau khi đặt gói):
 * - Dọn `result` cũ nếu vào lại /plans không có `?step=4` (đặt gói mới thay vì kẹt lại màn hoàn tất cũ).
 * - Chờ reload bản nháp (nếu có) và chờ `mova.refresh()` hoàn tất nếu `account/overview` chưa tải xong.
 * - Tài khoản đã hoàn tất khảo sát hoặc có sẵn hồ sơ/đơn cũ -> vào thẳng step 2 (StepMenu), trừ khi `?edit=1` / `?reset=survey`.
 */
export async function resolvePlansEntry({ routeQuery = {}, mova, store, useSavedProfile }) {
  const editRequested = wantsPlansSurveyEdit(routeQuery);
  const reqStep = routeQuery.step != null ? String(routeQuery.step) : '';

  if (store.result && reqStep !== '4' && !editRequested) {
    store.reset();
  }
  if (store.planId) {
    const ok = await store.reloadPlan();
    if (!ok && !store.result) store.reset();
  }
  if (!mova.loaded) {
    await mova.refresh();
  }

  const hasProfile = Boolean(mova.isLoggedIn && hasCompletedCustomerProfile(mova.account));
  if (!editRequested && !store.result) {
    if (store.planId) {
      if (!reqStep || reqStep === '1') {
        return { step: 2, action: 'resume_plan' };
      }
      const parsed = Number(reqStep);
      return { step: Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : 2, action: 'stay' };
    }
    if (hasProfile) {
      const ok = await useSavedProfile();
      return { step: ok ? 2 : 1, action: ok ? 'loaded_saved_profile' : 'profile_error' };
    }
  }
  const parsed = Number(reqStep);
  return { step: Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : 1, action: 'stay' };
}
