import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'www');
const ROOT_CONFIG = resolve(ROOT, 'app-config.json');

function toRelativeAsset(rawPath) {
  return String(rawPath || '').replace(/^\.\//, '').replace(/^\/+/, '');
}

function isLocalAsset(rawPath) {
  return Boolean(rawPath) && !/^(https?:)?\/\//i.test(rawPath) && !rawPath.startsWith('data:');
}

function parseBuiltHtml(html) {
  const listCSS = [];
  const listSyncJS = [];
  const listAsyncJS = [];

  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = /\brel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() || '';
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1] || '';
    if (!isLocalAsset(href)) continue;
    if (rel === 'stylesheet') listCSS.push(toRelativeAsset(href));
    else if (rel === 'modulepreload') listAsyncJS.push(toRelativeAsset(href));
  }

  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    const src = m[1];
    if (!isLocalAsset(src)) continue;
    const rel = toRelativeAsset(src);
    if (/\basync\b/i.test(tag)) listAsyncJS.push(rel);
    else listSyncJS.push(rel);
  }

  return {
    listCSS: [...new Set(listCSS)],
    listSyncJS: [...new Set(listSyncJS)],
    listAsyncJS: [...new Set(listAsyncJS)]
  };
}

function writeInlineBootstrap() {
  const inlineJs = [
    '// Khởi tạo metadata chuẩn WebView Zalo Mini App (viewport-fit=cover cho safe-area iOS/Android).',
    '(function(){',
    '  var head = document.head;',
    '  if (!head) return;',
    '  if (!head.querySelector(\'meta[name="viewport"]\')) {',
    '    var vp = document.createElement("meta");',
    '    vp.name = "viewport";',
    '    vp.content = "width=device-width, initial-scale=1, viewport-fit=cover";',
    '    head.appendChild(vp);',
    '  }',
    '  if (!head.querySelector(\'meta[name="theme-color"]\')) {',
    '    var tc = document.createElement("meta");',
    '    tc.name = "theme-color";',
    '    tc.content = "#0B9C63";',
    '    head.appendChild(tc);',
    '  }',
    '  if (!head.querySelector(\'link[href*="fonts.googleapis.com"]\')) {',
    '    var fl = document.createElement("link");',
    '    fl.rel = "stylesheet";',
    '    fl.href = "https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800&subset=vietnamese&display=swap";',
    '    head.appendChild(fl);',
    '  }',
    '})();',
    ''
  ].join('\n');
  writeFileSync(resolve(OUT_DIR, 'inline.js'), inlineJs, 'utf8');
}

function main() {
  const viteBin = resolve(ROOT, 'node_modules/.bin/vite');
  execFileSync(viteBin, ['build', '--mode', 'zmp'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_ZALO_MINIAPP: 'true' }
  });

  const builtHtmlPath = resolve(OUT_DIR, 'index.html');
  if (!existsSync(builtHtmlPath)) {
    throw new Error(`Không tìm thấy ${builtHtmlPath} sau khi build ZMP.`);
  }
  const html = readFileSync(builtHtmlPath, 'utf8');
  const assets = parseBuiltHtml(html);
  if (!assets.listSyncJS.length && !assets.listAsyncJS.length) {
    throw new Error('Không tìm thấy bundle JS trong www/index.html.');
  }

  writeInlineBootstrap();
  const baseConfig = JSON.parse(readFileSync(ROOT_CONFIG, 'utf8'));
  const nextConfig = {
    ...baseConfig,
    listCSS: assets.listCSS,
    listSyncJS: ['inline.js', ...assets.listSyncJS],
    listAsyncJS: assets.listAsyncJS
  };

  const formatted = `${JSON.stringify(nextConfig, null, 2)}\n`;
  writeFileSync(ROOT_CONFIG, formatted, 'utf8');
  writeFileSync(resolve(OUT_DIR, 'app-config.json'), formatted, 'utf8');

  console.log('ZMP build completed:', {
    outDir: 'www',
    listCSS: nextConfig.listCSS,
    listSyncJS: nextConfig.listSyncJS,
    listAsyncJS: nextConfig.listAsyncJS
  });
}

main();
