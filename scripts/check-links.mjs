#!/usr/bin/env node
/**
 * 产物内链检查。在 `astro build` 完成后由 build-guard 调用。
 *
 * 只检查站内根路径链接：目标文件必须存在，`PENDING_ROUTES` 中登记的
 * 路径仅警告、不阻断发布。
 *
 * PENDING 清单按「语言无关路径」登记：中文站下同一页面是 /zh/about/，
 * 若按带前缀的字面量登记，每加一种语言就要把清单复制一遍，
 * 漏一条就会把正常的多语言导航判成断链。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, parsePath, localizePath } from '../src/i18n/routing.ts';

/** 有意只保留单语言或尚未建立的路由 */
export const PENDING_ROUTES = new Set([]);

/**
 * 有意只保留单语言的路由；新增此类页面前必须显式登记。
 *
 * 每种语言各有一份完整的 404 产物（英文 dist/404.html，
 * 中文 dist/zh/404/index.html）。Cloudflare Pages 按路径前缀就近查找 404.html，
 * 构建守卫 build-guard.mjs 会把中文那份复制成 dist/zh/404.html。
 */
const SINGLE_LOCALE_PAGES = new Set([]);

/** dist 内的 HTML 文件 → 语言无关的路由形态 */
function toRoute(distDir, file) {
  const rel = path.relative(distDir, file).replace(/\\/g, '/');
  // 默认语言的 404 产物是 404.html（Cloudflare Pages 根目录 404 约定）。
  // 规范化为 /404/，否则它无法与 /zh/404/ 配对，会被误报为「缺少语言版本」。
  if (rel === '404.html') return '/404/';
  // 构建守卫会把 dist/<前缀>/404/index.html 复制成 dist/<前缀>/404.html，
  // 供 Pages 按目录就近查找。两份产物是同一个路由，归一化后去重，
  // 否则单独运行 check-links 时会误报「缺少语言版本：/zh/404.html ↔ /404.html」。
  if (rel.endsWith('/404.html')) return `/${rel.slice(0, -'404.html'.length)}404/`;
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

/**
 * 语言版本配对检查。
 * 每种语言的页面必须存在其余所有语言的对应页面，反之亦然；
 * 否则语言切换器会指向 404，而这种问题在单页链接检查里看不出来
 * （切过去之前没有任何链接指向它）。
 *
 * 语言解析与目标路径生成都走 `routing.ts` 的 parsePath/localizePath，
 * 新增语言时自动覆盖 —— 写死 '/zh' 会让新语言被静默漏检。
 */
function checkLocaleParity(distDir, files) {
  const errors = [];
  const routes = new Set(files.map((file) => toRoute(distDir, file)));

  for (const route of routes) {
    if (SINGLE_LOCALE_PAGES.has(route)) continue;

    const { path: bare } = parsePath(route);
    for (const locale of LOCALES) {
      const counterpart = localizePath(locale, bare);
      if (counterpart === route) continue;

      if (!routes.has(counterpart)) {
        errors.push({
          file: '(路由配对)',
          msg: `缺少语言版本：${route} ↔ ${counterpart}`,
        });
      }
    }
  }

  return errors;
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function exists(distDir, target) {
  if (target === '/' || target === '') {
    return fs.existsSync(path.join(distDir, 'index.html'));
  }

  const clean = target.replace(/^\/+/, '');
  const direct = path.join(distDir, clean);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return true;

  if (target.endsWith('/')) {
    // 默认语言的 404 特例：Astro 固定产出根级 404.html（Cloudflare Pages 根目录
    // 约定），没有 404/index.html —— 与 toRoute 把 404.html 归一化为 /404/ 配套，
    // 否则 404 页页脚语言切换的自链 /404/ 会被误判为断链。
    // clean 只去掉前导斜杠（/404/ → '404/'），比较前先去掉尾部斜杠。
    if (clean.replace(/\/+$/, '') === '404' && fs.existsSync(path.join(distDir, '404.html'))) {
      return true;
    }
    return fs.existsSync(path.join(distDir, clean, 'index.html'));
  }

  // 无扩展名的路径按目录式产物处理
  if (!path.extname(clean)) {
    return (
      fs.existsSync(path.join(distDir, clean, 'index.html')) ||
      fs.existsSync(path.join(distDir, `${clean}.html`))
    );
  }

  return false;
}

export function checkLinks(distDir) {
  const errors = [];
  const warnings = [];
  const files = fs.existsSync(distDir) ? walkHtml(distDir) : [];
  const pending = new Map();

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(distDir, file).replace(/\\/g, '/');

    /*
     * 资源引用（src / stylesheet）：断图与断 CSS 曾经真实发生过（构建期用 dev 缓存时），
     * 只查 href 会漏掉，所以按同一套「文件是否存在」逻辑再扫一遍。
     */
    for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const raw = match[1];
      if (!raw.startsWith('/') || raw.startsWith('//')) continue;
      const target = raw.split('#')[0].split('?')[0];
      if (target === '') continue;
      if (!fs.existsSync(path.join(distDir, target))) {
        errors.push({ file: rel, msg: '图片资源不存在：' + target });
      }
    }

    for (const match of html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)) {
      const raw = match[1];
      if (!raw.startsWith('/') || raw.startsWith('//')) continue;
      const target = raw.split('#')[0].split('?')[0];
      if (!fs.existsSync(path.join(distDir, target))) {
        errors.push({ file: rel, msg: '样式资源不存在：' + target });
      }
    }

    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const raw = match[1];
      if (
        !raw.startsWith('/') ||
        raw.startsWith('//') ||
        raw.startsWith('/#')
      ) {
        continue;
      }

      const target = raw.split('#')[0].split('?')[0];
      if (target === '') continue;

      /* 资源型链接已由上面的 img / link 扫描覆盖，这里跳过，避免同一文件报两次 */
      if (/\.(css|js|png|jpe?g|webp|svg|ico|pdf|xml|txt)$/i.test(target)) continue;

      if (exists(distDir, target)) continue;

      // 去掉语言前缀还原成语言无关路径，用于匹配待建清单（与配对检查同源）
      const bare = parsePath(target).path;
      const normalized = bare.endsWith('/') ? bare : `${bare}/`;
      if (PENDING_ROUTES.has(normalized)) {
        pending.set(target, (pending.get(target) ?? 0) + 1);
      } else {
        errors.push({ file: rel, msg: `站内链接目标不存在：${target}` });
      }
    }
  }

  // 同一待建路由会在每页的导航/页脚重复出现，按目标聚合，避免刷屏
  for (const [target, count] of pending) {
    warnings.push({ file: '(导航/页脚)', msg: `待建页面 ${target}，共 ${count} 处引用` });
  }

  errors.push(...checkLocaleParity(distDir, files));

  return { errors, warnings, files: files.length };
}

function report(distDir) {
  const { errors, warnings, files } = checkLinks(distDir);

  if (warnings.length > 0) {
    console.log(`\n[链接检查] 待建页面（${warnings.length}）`);
    for (const { file, msg } of warnings) console.log(`  ${file}\n    ${msg}`);
  }

  if (errors.length > 0) {
    console.error(`\n[链接检查] 断链（${errors.length}）`);
    for (const { file, msg } of errors) console.error(`  ${file}\n    ${msg}`);
    process.exit(1);
  }

  console.log(`\n[链接检查] 通过，检查 ${files} 个 HTML 文件。`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  report(path.join(process.cwd(), 'dist'));
}
