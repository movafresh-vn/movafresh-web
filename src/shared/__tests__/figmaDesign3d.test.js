import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { figmaImg } from '../utils/assets';

const ROOT = resolve(process.cwd());
const readRoot = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('Figma DFL24 Design Tokens, Contrast & 3D Assets', () => {
  it('tokens.css không có biến tự tham chiếu vòng lặp và định nghĩa đủ token tương phản', () => {
    const css = readRoot('src/assets/styles/tokens.css');

    // Chống tuyệt đối lỗi cyclic CSS custom property (--foo: var(--foo))
    const cyclic = [...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*var\(\s*\1\s*\)/g)];
    expect(cyclic).toEqual([]);

    for (const token of [
      '--green-d:',
      '--forest:',
      '--harvest-gold:',
      '--red-orange-d:',
      '--cream:',
      '--cream-warm:',
      '--sand:',
      '--text-on-primary:',
      '--text-on-accent:',
      '--text-on-dark:',
      '--text-on-yellow:',
      '--font:',
      '--font-display:',
      '--shadow-sm:',
      '--shadow-md:',
      '--shadow-lg:'
    ]) {
      expect(css).toContain(token);
    }
  });

  it('figmaImg() tạo đúng URL tương thích cả Web (/) và Zalo Mini App (./)', () => {
    expect(figmaImg('meal-mam-com-viet.webp', '/')).toBe('/images/figma/meal-mam-com-viet.webp');
    expect(figmaImg('/produce-basket-cutout.png', './')).toBe('./images/figma/produce-basket-cutout.png');
  });

  it('Mọi file ảnh Figma được tham chiếu đều tồn tại trong public/images/figma/ và không còn URL bên ngoài dễ lỗi 403', () => {
    const filesToCheck = [
      'src/components/store/HeroSection.vue',
      'src/components/store/MealKitVideoHook.vue',
      'src/components/store/SampleMeals.vue',
      'src/components/store/BoxInsideSection.vue',
      'src/components/plans/StepAbout.vue'
    ];

    for (const rel of filesToCheck) {
      const code = readRoot(rel);
      expect(code).not.toMatch(/unsplash\.com|mixkit\.co/i);
      const refs = [...code.matchAll(/figmaImg\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const fileName of refs) {
        expect(existsSync(resolve(ROOT, 'public/images/figma', fileName))).toBe(true);
      }
    }
  });

  it('MovaBox3D, use3dTilt & Landing 3D hỗ trợ hạ tải an toàn trên ZMP và prefers-reduced-motion', () => {
    const box = readRoot('src/components/store/MovaBox3D.vue');
    expect(box).toContain('isZaloMiniApp');
    expect(box).toContain('prefers-reduced-motion');
    expect(box).toContain('(animation-timeline: view()) and (animation-range: entry)');

    const tilt = readRoot('src/composables/use3dTilt.js');
    expect(tilt).toContain('isZaloMiniApp');
    expect(tilt).toContain('prefers-reduced-motion');

    const hero = readRoot('src/components/store/HeroSection.vue');
    expect(hero).toContain('use3dTilt');
    expect(hero).toContain('prefers-reduced-motion');
  });
});
