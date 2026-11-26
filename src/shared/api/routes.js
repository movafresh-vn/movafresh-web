// Bảng đường gọi của app khách: một dòng cho mỗi hàm của api.customer. Cột: [HTTP, đường dẫn sau /api/v2].
// Đường có tham số viết dạng /x/:name; hàm `path()` thay giá trị. Bài test w1Routes đối chiếu từng dòng với mã nguồn
// movafresh-platform/backend/src/routes và docs/api-contract.json, nên thêm một đường ở đây mà backend chưa có thì test đỏ.
export const CUSTOMER_ROUTES = {
  // Công khai (không cần đăng nhập)
  checkArea: ['GET', '/delivery/check-area', { auth: false }],
  serviceAreas: ['GET', '/delivery/zones', { auth: false }],
  deliveryOptions: ['GET', '/delivery/options', { auth: false }],
  availableSlots: ['GET', '/delivery/available-slots', { auth: false }],
  availableDates: ['GET', '/delivery/available-dates', { auth: false }],
  captureLead: ['POST', '/leads', { auth: false }],
  joinWaitlist: ['POST', '/leads/waitlist', { auth: false }],
  dishes: ['GET', '/dishes', { auth: false }],
  creditPacks: ['GET', '/credit/packs', { auth: false }],
  traceLot: ['GET', '/lots/:code', { auth: false }],
  sampleLotCodes: ['GET', '/lots', { auth: false }],

  // Cần đăng nhập
  setConsents: ['PUT', '/account/consents'],
  saveSafetyProfile: ['PUT', '/account/profile'],
  previewSubscription: ['POST', '/subscription/preview'],
  // Giao nhanh 24-36 giờ (ĐỀ XUẤT 2.4.0, mặc định tắt ở máy chủ)
  expressOptions: ['POST', '/delivery/express/options'],
  expressHold: ['POST', '/delivery/express/holds'],
  expressRelease: ['POST', '/delivery/express/holds/:id/release'],
  createSubscription: ['POST', '/subscription/create-or-renew'],
  getAccount: ['GET', '/account/overview'],
  supportRequest: ['POST', '/account/support-requests'],
  listSupportRequests: ['GET', '/account/support-requests'],
  myWeeks: ['GET', '/subscription/weeks'],
  mealOptions: ['GET', '/subscription/weeks/:week_index/meals/:meal_index/options'],
  changeMeal: ['POST', '/subscription/meal-change'],
  addWeekMeals: ['POST', '/subscription/week-meals'],
  previewSkip: ['GET', '/subscription/skip-preview'],
  skipWeek: ['POST', '/subscription/skip-week'],
  cancelSubscription: ['POST', '/subscription/cancel'],
  unlinkCard: ['POST', '/account/unlink-card'],
  linkCard: ['POST', '/account/link-card/start'],
  renewalOffer: ['GET', '/subscription/renewal-offer'],
  renewSubscription: ['POST', '/subscription/renew'],
  creditAccount: ['GET', '/credit/account'],
  creditWeekCashflow: ['GET', '/credit/week-cashflow'],
  createPackOrder: ['POST', '/credit/pack-orders'],
  listPackOrders: ['GET', '/credit/pack-orders'],
  notifications: ['GET', '/account/notifications'],
  markNotificationsRead: ['POST', '/account/notifications/read'],
  pendingRatings: ['GET', '/ratings/pending'],
  rateDish: ['POST', '/ratings'],
  rewards: ['GET', '/account/rewards'],
  saveProfile: ['PATCH', '/account/contact'],
  claimShare: ['POST', '/account/share-claims']
};

/** Thay :tham_số bằng giá trị (đã mã hóa URL). Thiếu tham số thì ném lỗi để không gọi nhầm đường. */
export function fillPath(path, params = {}) {
  return path.replace(/:([A-Za-z_]+)/g, (_, k) => {
    if (params[k] === undefined || params[k] === null) throw new Error(`Thiếu tham số đường dẫn: ${k}`);
    return encodeURIComponent(String(params[k]));
  });
}
