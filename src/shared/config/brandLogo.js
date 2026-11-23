// Cấu hình logo MOVA FRESH (thuần dữ liệu, test được trong node).
// Kích thước theo Figma: khung 126,43 x 50,32; MOVA cao 24,75; FRESH cao 20,33; chữ O gồm hai nét cam.
// CSS Figma không có path vector, nên hình chữ dưới đây là BẢN XẤP XỈ (nét hình học).
// Khi có SVG xuất từ Figma, chỉ cần thay LOGO_GLYPHS (và BrandLogo.vue nếu bố cục khác).

export const BRAND_NAME = 'MOVA FRESH';
export const BRAND_TAGLINE = 'Bữa ngon từ nông sản Đắk Lắk, sơ chế sẵn, giao tận bếp';

export const LOGO_SIZE = { width: 126.43, height: 50.32 };
export const LOGO_ROWS = {
  mova: { top: 0, height: 24.75, stroke: 5 },
  fresh: { top: 29.99, height: 20.33, stroke: 4.2 }
};

export const LOGO_COLORS = {
  orange: '#F89122',
  redOrange: '#F25A29',
  green: '#0B9C63',
  brown: '#543F18',
  cream: '#F9F7EC',
  white: '#FFFFFF',
  black: '#000000'
};

// bg: nền mà biến thể này dùng; mova/fresh: màu chữ; oA/oB: hai nét của chữ O
export const LOGO_VARIANTS = {
  onWhite: { bg: LOGO_COLORS.white, mova: LOGO_COLORS.green, fresh: LOGO_COLORS.brown, oA: LOGO_COLORS.orange, oB: LOGO_COLORS.redOrange },
  onGreen: { bg: LOGO_COLORS.green, mova: LOGO_COLORS.cream, fresh: LOGO_COLORS.cream, oA: LOGO_COLORS.orange, oB: LOGO_COLORS.redOrange },
  onBrown: { bg: LOGO_COLORS.brown, mova: LOGO_COLORS.cream, fresh: LOGO_COLORS.orange, oA: LOGO_COLORS.orange, oB: LOGO_COLORS.redOrange },
  onBlack: { bg: LOGO_COLORS.black, mova: LOGO_COLORS.white, fresh: LOGO_COLORS.white, oA: LOGO_COLORS.orange, oB: LOGO_COLORS.redOrange }
};

export const LOGO_VARIANT_NAMES = Object.keys(LOGO_VARIANTS);

// Nét chữ, toạ độ tương đối trong từng hàng (đã trừ nửa bề dày nét).
// MOVA: 4 chữ rộng 26, cách nhau 7,47. FRESH: 5 chữ rộng 21, cách nhau 5,36.
const MOVA_X = [0, 33.47, 66.94, 100.41];
const FRESH_X = [0, 26.36, 52.72, 79.08, 105.43];

export const LOGO_GLYPHS = {
  mova: [
    { x: MOVA_X[0], d: 'M2.5 22.25V2.5L13 15L23.5 2.5V22.25' },
    // chữ O: nửa trái và nửa phải là hai nét cam khác nhau
    { x: MOVA_X[1], d: 'M13 2.475A9.9 9.9 0 0 0 13 22.275', tone: 'oA' },
    { x: MOVA_X[1], d: 'M13 2.475A9.9 9.9 0 0 1 13 22.275', tone: 'oB' },
    { x: MOVA_X[2], d: 'M2.5 2.5L13 22.25L23.5 2.5' },
    { x: MOVA_X[3], d: 'M2.5 22.25L13 2.5L23.5 22.25M6.8 16.2H19.2' }
  ],
  fresh: [
    { x: FRESH_X[0], d: 'M2.1 18.2V2.1H18.9M2.1 10.2H15' },
    { x: FRESH_X[1], d: 'M2.1 18.2V2.1H13.4A4.4 4.4 0 0 1 13.4 10.9H2.1M11.4 10.9L18.9 18.2' },
    { x: FRESH_X[2], d: 'M18.9 2.1H2.1V18.2H18.9M2.1 10.2H15' },
    { x: FRESH_X[3], d: 'M18.5 4.6C17.6 2.8 15 2.1 11 2.1C6.6 2.1 3.6 3.6 3.6 6.2C3.6 11 18.4 8.8 18.4 14C18.4 16.7 15.4 18.2 10.6 18.2C6.4 18.2 3.2 17 2.1 14.4' },
    { x: FRESH_X[4], d: 'M2.1 2.1V18.2M18.9 2.1V18.2M2.1 10.2H18.9' }
  ]
};

export function logoVariant(name) {
  return LOGO_VARIANTS[name] || LOGO_VARIANTS.onWhite;
}

// Chiều cao theo chiều rộng, giữ đúng tỉ lệ Figma
export function logoHeight(width) {
  return Math.round((width * LOGO_SIZE.height / LOGO_SIZE.width) * 100) / 100;
}
