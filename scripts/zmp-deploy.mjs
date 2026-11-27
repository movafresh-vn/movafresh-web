import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MINI_APP_ID = '121806527898668854';

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function resolveZmpEnv() {
  const localEnv = parseEnvFile(resolve(ROOT, '.env'));
  const homeEnv = parseEnvFile(resolve(homedir(), '.env'));
  const appId = process.env.APP_ID || localEnv.APP_ID || homeEnv.APP_ID || DEFAULT_MINI_APP_ID;
  const zmpToken = process.env.ZMP_TOKEN || localEnv.ZMP_TOKEN || homeEnv.ZMP_TOKEN || '';
  return {
    ...process.env,
    APP_ID: appId,
    ...(zmpToken ? { ZMP_TOKEN: zmpToken } : {})
  };
}

function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');
  const testing = args.includes('--testing') || args.includes('-t');
  const descIdx = args.findIndex((a) => a === '-m' || a === '--desc');
  const desc = (descIdx >= 0 && args[descIdx + 1]) || 'Mova Fresh Zalo Mini App';

  if (!skipBuild) {
    execFileSync(process.execPath, [resolve(ROOT, 'scripts/zmp-build.mjs')], {
      cwd: ROOT,
      stdio: 'inherit'
    });
  }

  const deployArgs = ['deploy', '-e', '-o', 'www', '-m', desc];
  if (testing) deployArgs.push('-t');

  execFileSync('zmp', deployArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: resolveZmpEnv()
  });
}

main();
