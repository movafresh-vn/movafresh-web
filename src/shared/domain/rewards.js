// Hàm thuần của phần thưởng cho giao diện: hồ sơ đủ chưa. Việc cộng thưởng, giới hạn chia sẻ và mã mời do backend quyết định.

/** Hồ sơ thành viên đủ chưa: dùng để trả thưởng "hoàn thiện hồ sơ" một lần. */
export function profileCompleteness(customer) {
  const members = customer.members || [];
  const checks = [
    { id: 'name', label: 'Tên người nhận', ok: Boolean((customer.name || '').trim()) },
    { id: 'phone', label: 'Số điện thoại', ok: Boolean((customer.phone || '').trim()) },
    { id: 'email', label: 'Email', ok: Boolean((customer.email || '').trim()) },
    { id: 'address', label: 'Địa chỉ giao hàng', ok: Boolean((customer.address || '').trim()) },
    { id: 'members', label: 'Ít nhất một thành viên và lưu ý ăn uống', ok: members.some((m) => (m.name || '').trim() && (m.note || '').trim()) }
  ];
  const done = checks.filter((c) => c.ok).length;
  return { done, total: checks.length, complete: done === checks.length, missing: checks.filter((c) => !c.ok).map((c) => c.label), checks };
}
