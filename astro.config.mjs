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

  /** 与 URL 规范一致：所有地址末尾带斜杠 */
  trailingSlash: 'always',

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
