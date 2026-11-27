/**
 * Astro 构建守卫。
 *
 * 目的：让 `astro build` 本身也经过内容体检、分语言 404 产物补齐与站内链接检查，
 * 而不是只在 `npm run build` 这一条路径上串联脚本。
 *
 * - build:start：执行 validate-content.mjs，任一错误即抛出并中断构建
 * - build:done ：把 <前缀>/404/index.html 复制成 <前缀>/404.html（Cloudflare Pages 约定），
 *               再扫描 dist 中的站内链接，未登记的路由缺口直接失败
 *
 * 复制放在这里而不是部署脚本里：无论是本地 `npm run deploy`、CI，
 * 还是 Cloudflare Pages 连接 Git 后执行 `npm run build`，产出的 dist/ 都可直接部署。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, DEFAULT_LOCALE, LOCALE_PREFIX } from '../src/i18n/routing.ts';
import { checkLinks } from './check-links.mjs';
import { appendModelRedirects } from './model-redirects.mjs';

export default function contentGuard() {
  const root = process.cwd();

  return {
    name: 'content-guard',
    hooks: {
      'astro:build:start': () => {
        execFileSync(process.execPath, [path.join(root, 'scripts', 'validate-content.mjs')], {
          cwd: root,
          stdio: 'inherit',
        });
      },

      'astro:build:done': ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);

        // Pages 按目录就近查找 404.html；Astro 的目录式产物是 404/index.html。
        // 逐语言派生前缀，新增语言时这里无需改动。
        for (const locale of LOCALES) {
          if (locale === DEFAULT_LOCALE) continue;
          const prefix = LOCALE_PREFIX[locale].replace(/^\//, '');
          const src = path.join(distDir, prefix, '404', 'index.html');
          if (!fs.existsSync(src)) {
            throw new Error(`[404] 缺少 ${src}，该语言的 404 产物未生成`);
          }
          fs.copyFileSync(src, path.join(distDir, prefix, '404.html'));
        }

        // 型号旧路径 301：/products/<品类>/<型号>/ → /products/<型号>/
        // 规则由内容文件生成，写到产物 _redirects；源文件 public/_redirects 不动。
        const redirects = appendModelRedirects(distDir);
        if (redirects > 0) logger.info(`已写入 ${redirects} 条型号旧路径 301。`);

        const { errors, warnings, files } = checkLinks(distDir);

        for (const { file, msg } of warnings) {
          logger.warn(`${file} → ${msg}`);
        }

        if (errors.length > 0) {
          for (const { file, msg } of errors) {
            logger.error(`${file} → ${msg}`);
          }
          throw new Error(`[链接检查] 发现 ${errors.length} 条断链`);
        }

        logger.info(`链接检查通过，共 ${files} 个 HTML 文件。`);
      },
    },
  };
}
