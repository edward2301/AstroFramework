/**
 * 型号旧路径 301 检查（静态 + 实际 HTTP）。
 *
 * 用法：
 *   npm run build
 *   node scripts/check-redirects.mjs                         # 只检查 dist/_redirects 与目标产物
 *   npx wrangler pages dev dist --port 8788                 # 另开终端
 *   node scripts/check-redirects.mjs --base http://127.0.0.1:8788
 *
 * 检查内容：
 *   1. 每个已发布型号 × LOCALES × 带/不带斜杠，都在 dist/_redirects 里有精确 301；
 *   2. 目标扁平路径在 dist 下有 index.html；
 *   3. 传 --base 时，逐条请求：旧路径 301 → Location 正确 → 跟随 200 → canonical 为扁平 URL。
 *
 * 退出码 1 表示有缺失、冲突或跳转异常；不要用 `dist/` 手工修补代替重新构建。
 */
import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, LOCALE_PREFIX } from '../src/i18n/routing.ts';

const root = process.cwd();
const dist = path.join(root, 'dist');
const redirectsFile = path.join(dist, '_redirects');
const base = (() => {
  const index = process.argv.indexOf('--base');
  return index !== -1 ? process.argv[index + 1] : process.env.BASE_URL;
})();

if (!fs.existsSync(redirectsFile)) {
  console.error('[redirects] 缺少 dist/_redirects，请先运行 npm run build');
  process.exit(1);
}

const models = fs
  .readdirSync(path.join(root, 'src/content/models'))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .flatMap((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'src/content/models', file), 'utf8'));
    if (data.draft === true) return [];
    const id = file.replace(/\.json$/, '');
    if (typeof data.category !== 'string' || !data.category) {
      throw new Error(`[redirects] 型号 ${id} 缺少 category`);
    }
    return [{ id, category: data.category }];
  });

/** 期望规则：source -> target */
const expected = new Map();
for (const model of models) {
  const flat = `/products/${model.id}/`;
  const old = `/products/${model.category}/${model.id}/`;
  for (const locale of LOCALES) {
    const prefix = LOCALE_PREFIX[locale];
    const target = `${prefix}${flat}`;
    for (const source of [`${prefix}${old}`, `${prefix}${old}`.replace(/\/$/, '')]) {
      expected.set(source, target);
    }
  }
}

/** 实际规则：只取型号旧路径（不把 404 直访规则算进来） */
const actual = new Map();
for (const line of fs.readFileSync(redirectsFile, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [from, to, code] = trimmed.split(/\s+/);
  if (code !== '301' || !from.includes('/products/category-')) continue;
  actual.set(from, to);
}

const problems = [];
for (const [source, target] of expected) {
  if (!actual.has(source)) {
    problems.push(`缺少规则：${source} → ${target}`);
    continue;
  }
  if (actual.get(source) !== target) {
    problems.push(`目标错误：${source} → ${actual.get(source)}，应为 ${target}`);
    continue;
  }
  const targetFile = path.join(dist, target.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(targetFile)) {
    problems.push(`目标产物不存在：${target}`);
  }
}
for (const source of actual.keys()) {
  if (!expected.has(source)) problems.push(`多余规则：${source}`);
}

const summary = {
  models: models.length,
  expected: expected.size,
  actual: actual.size,
  staticFailures: problems.length,
  http: base ? { base, checked: 0, failures: [] } : null,
};

if (base) {
  for (const [source, target] of expected) {
    const first = await fetch(base + source, { redirect: 'manual' });
    const location = first.headers.get('location');
    if (first.status !== 301 || location !== target) {
      problems.push(`HTTP ${source}: ${first.status} ${location ?? '(no location)'}`);
      continue;
    }

    const followed = await fetch(base + source, { redirect: 'follow' });
    if (followed.status !== 200 || new URL(followed.url).pathname !== target) {
      problems.push(`HTTP 跟随 ${source}: ${followed.status} ${followed.url}`);
      continue;
    }

    const html = await followed.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    // 站点域名由 astro.config.mjs 的 site 决定；这里只校验 canonical 的路径部分是扁平目标
    const canonicalPath = canonical ? new URL(canonical).pathname : null;
    if (canonicalPath !== target) {
      problems.push(`canonical ${source}: ${canonical ?? '(missing)'}，路径应为 ${target}`);
      continue;
    }
    summary.http.checked += 1;
  }
}

console.log(JSON.stringify(summary, null, 2));
if (problems.length > 0) {
  for (const problem of problems.slice(0, 10)) console.error(`[redirects] ${problem}`);
  console.error(`[redirects] 未通过：${problems.length} 项问题`);
  process.exit(1);
}
console.log(`[redirects] 通过：${expected.size} 条规则${base ? `，${summary.http.checked} 条实际跳转` : ''}。`);
