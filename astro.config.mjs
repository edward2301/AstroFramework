// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import contentGuard from './scripts/build-guard.mjs';
// 语言配置单一来源：routing.ts 是唯一定义处，这里直接导入常量而非手写副本，
// 新增语言时改 routing.ts 一处即可（Node 24 支持对 TS 模块的类型擦除导入）
import { LOCALES, DEFAULT_LOCALE, LOCALE_META } from './src/i18n/routing.ts';
import { createLastmod } from './src/lib/seo/lastmod.ts';

const site = 'https://example.com';

/** 逐页 lastmod：取产出该页的源文件最后一次提交时间，取不到就省略 */
const lastmodFor = createLastmod(process.cwd());

/**
 * dev 尾斜杠归一（仅 astro dev 生效，构建产物不受影响）。
 *
 * trailingSlash: 'ignore' 时，astro dev 会在进路由前拦截无尾斜杠的请求
 * （7.4.13 实测）：合法页面直接吃默认 404、未知路径弹 Astro 品牌提示页，
 * 且此场景下中间件不会执行。这里用 astro:server:setup 把 308 归一挂在
 * dev 服务器路由层之前，与线上 Cloudflare Pages 的行为对齐：
 * 无尾斜杠先跳带斜杠版本，未知路径再落就近 404（每语言一份）。
 *
 * 豁免：根路径、带扩展名的路径（robots.txt、/_astro/*.css、图片等资源）。
 */
function devTrailingSlash() {
  return {
    name: 'dev-trailing-slash',
    hooks: {
      /**
       * @param {{ server: import('vite').ViteDevServer }} ctx
       */
      'astro:server:setup': (ctx) => {
        const server = ctx.server;
        const normalize = (
          /** @type {import('http').IncomingMessage} */ req,
          /** @type {import('http').ServerResponse} */ res,
          /** @type {() => void} */ next
        ) => {
          const raw = req.url ?? '/';
          const [path, search] = raw.split('?');
          /*
           * Vite 内部自请求偶尔带尾斜杠（/@id/__x00__astro:toolbar:internal/），
           * 会被 Astro 路由器当成页面路由 404（工具栏已通过无斜杠路径正常加载，
           * 这里是纯日志噪音）。归一回无斜杠交给 Vite 模块加载器，消除噪音。
           */
          if (path.startsWith('/@') && path.endsWith('/') && path !== '/@/') {
            req.url = path.replace(/\/+$/, '') + (search ? `?${search}` : '');
            next();
            return;
          }
          /*
           * 豁免清单：
           *   · 根路径 / 带尾斜杠 / 带扩展名（robots.txt、图片等资源）
           *   · Vite 内部路径：/@id/、/@fs/、/@vite/（dev 工具栏与虚拟模块）
           *   · /_astro 与 /node_modules（构建资源与依赖）
           */
          if (
            path === '/' ||
            path.endsWith('/') ||
            /\.[a-zA-Z0-9]+$/.test(path) ||
            path.startsWith('/@') ||
            path.includes('__x00__') ||
            path.startsWith('/_astro') ||
            path.startsWith('/node_modules')
          ) {
            next();
            return;
          }
          res.writeHead(308, { Location: `${path}/${search ? `?${search}` : ''}` });
          res.end();
        };
        /*
         * 必须 unshift 到 connect 栈顶：Astro 自己的路由/尾斜杠拦截器注册在前，
         * 追加（use）的处理器的排不到 —— 无尾斜杠请求永远先被它 404 掉。
         */
        server.middlewares.stack.unshift({ route: '', handle: normalize });
      },
    },
  };
}

/**
 * 域名守卫：CI 或显式要求时，占位域名直接让构建失败。
 * 本地构建不启用，避免没有真实域名时无法验证产物。
 */
const strictDomain = process.env.CI === 'true' || process.env.REQUIRE_REAL_DOMAIN === '1';
if (strictDomain && new URL(site).hostname.endsWith('example.com')) {
  throw new Error(
    '[build] astro.config.mjs 的 site 仍是占位域名。canonical、og:url、JSON-LD 与 sitemap 都依赖它，请先替换为真实域名。'
  );
}

// https://astro.build/config
export default defineConfig({
  /**
   * 正式域名，全站唯一来源。
   * canonical、og:url、JSON-LD 与 sitemap 均由此推导（lib/seo 通过 import.meta.env.SITE 读取），
   * 上线前必须替换为真实域名。
   */
  site,

  /**
   * 尾斜杠策略：链接层由 localizePath 统一带斜杠（canonical、内链、sitemap 全部
   * 以 / 结尾），构建产物为目录式。匹配策略用 'ignore' 而非 'always'——
   * 'always' 会让 astro dev 在路由前拦截无尾斜杠请求（合法页直接 404、
   * 未知页弹 Astro 品牌提示页，中间件也拦不到）；'ignore' 让这类请求正常
   * 走进 devTrailingSlash 集成，308 归一到带斜杠路径，与线上行为一致。
   */
  trailingSlash: 'ignore',

  /** 目录式产物：/products/x/ 输出为 /products/x/index.html，便于 Cloudflare Pages 按路径前缀就近查找 404.html */
  build: {
    format: 'directory',
  },

  /**
   * 多语言：默认语言（英文）不带前缀，其余语言带 LOCALE_PREFIX 前缀。
   * 全部取自 src/i18n/routing.ts，无需人工同步副本。
   */
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: { prefixDefaultLocale: false },
  },

  /** 站点地图（带 hreflang 互指）与构建守卫：内容体检 + 产物链接检查 */
  integrations: [
    devTrailingSlash(),
    sitemap({
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: Object.fromEntries(LOCALES.map((l) => [l, LOCALE_META[l].htmlLang])),
      },

      /**
       * 排除错误页。
       *
       * 每种语言各有一份 404 产物（dist/404.html 与 dist/zh/404.html），它们由 Cloudflare Pages
       * 按路径前缀就近查找后返回，本身是 noindex。把 noindex 页面放进 sitemap 是矛盾信号：
       * 一边说「收录它」，一边说「别收录」。
       */
      filter: (page) => !/\/404\/?$/.test(new URL(page).pathname),

      /**
       * 补 x-default。
       *
       * 集成本身只输出 en / zh-CN 两条 alternate，不生成 x-default，
       * 而页面 head 里是三条（含 x-default）—— 两处不一致时搜索引擎以 sitemap 为准，
       * 等于告诉它「本站没有默认语言版本」。
       *
       * 这里按页面语言表补一条，指向与 head 中 x-default 相同的地址（默认语言版本）。
       */
      serialize(item) {
        /*
         * lastmod 放在最前面：没有 hreflang 的条目会在下面提前 return，
         * 写在后面会让这些页面拿不到时间字段。
         */
        const lastmod = lastmodFor(item.url);
        if (lastmod) item.lastmod = lastmod;

        const links = item.links ?? [];
        if (links.length === 0) return item;
        if (links.some((link) => link.lang === 'x-default')) return item;

        // x-default 指向默认语言版本，与页面 head 中 x-default 相同
        const fallback = links.find((link) => link.lang === LOCALE_META[DEFAULT_LOCALE].htmlLang);
        if (fallback) {
          item.links = [...links, { lang: 'x-default', url: fallback.url }];
        }
        return item;
      },
    }),
    contentGuard(),
  ],
});
