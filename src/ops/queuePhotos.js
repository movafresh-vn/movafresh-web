// Bước "tải ảnh trước" của hàng đợi offline. Ảnh chụp ở xưởng lạnh nằm trong hàng đợi dưới dạng data URL (không cần mạng);
// khi có mạng, TRƯỚC khi phát lại thao tác, ảnh được tải lên kho riêng tư bằng vé một lần và `photo` của thao tác đổi thành đường dẫn
// trong kho. Máy chủ chỉ nhận đường dẫn đó (nhận nguyên liệu, xuất xe, báo thiếu / hỏng) nên không bao giờ nhận ảnh nhúng.
import { PHOTO_PURPOSE, isDataUrl } from '../shared/api/uploads';

/**
 * @param {{ call: string, args: object }} entry
 * @param {(dataUrl: string, purpose: string) => Promise<string>} upload
 * @returns {Promise<object|null>} `args` mới nếu đã đổi ảnh, null nếu không có ảnh cần tải
 */
export async function preparePhotos(entry, upload) {
  if (!entry || entry.call !== 'factory.apply') return null;
  const purpose = PHOTO_PURPOSE[entry.args && entry.args.type];
  if (!purpose || !isDataUrl(entry.args.photo)) return null;
  const path = await upload(entry.args.photo, purpose);
  return { ...entry.args, photo: path };
}
