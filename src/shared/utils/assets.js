// Helper trả về đường dẫn tài nguyên tĩnh hoạt động đồng nhất trên Web (/) và Zalo Mini App (./).
export function figmaImg(fileName, baseUrl) {
  const rawBase = baseUrl ?? (import.meta.env?.BASE_URL || '/');
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const cleanName = String(fileName || '').replace(/^\/+/, '');
  return `${normalizedBase}images/figma/${cleanName}`;
}
