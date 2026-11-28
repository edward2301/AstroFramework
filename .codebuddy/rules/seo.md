# SEO 约束（本仓核心目标）

> 「为什么」见 `docs/开发框架设计.md` §6；本文只列必须遵守的约束。

## 单一出口

- 元标签只经 `src/components/seo/SEO.astro` 输出；页面不手写 `<title>` / `<meta name="description">` / `<script type="application/ld+json">`，一律经 `BaseLayout → <SEO> / <JsonLd>`。
- 品牌后缀由 `src/lib/seo/branding.ts` **单点**拼接，`buildMeta()` 与校验脚本共用；**内容里的 `seoTitle` 只写标题本体**，不带后缀、不写模板。
- `SEO.astro` 收到的 `title` 必须是已含后缀的完整标题（后缀由 `buildMeta()` 补，组件不补）。

## 域名与绝对地址

- 域名唯一来源是 `astro.config.mjs` 的 `site`；canonical、`og:url`、JSON-LD、sitemap、`robots.txt` 均由此推导，任何模块不得另存副本。
- 绝对地址一律走 `src/lib/seo/meta.ts` 的 `absoluteUrl()`，不用 `new URL(x, Astro.site)`（后者在 `src/lib/seo` 的 schema 构造里拿不到）。

## URL 形态

- 全部 URL 带尾斜杠：链接层由 `localizePath` 统一（canonical、内链、sitemap 全部以 `/` 结尾），产物目录式（`build.format: 'directory'`）。匹配策略 `trailingSlash: 'ignore'`——`'always'` 会让 astro dev 在路由前拦截无尾斜杠请求（合法页 404、未知页弹品牌提示页）；dev 的 308 归一由 `astro.config.mjs` 的 `devTrailingSlash` 集成完成，与 Pages 线上行为一致。

## sitemap 与 hreflang

- sitemap 集成排除 404 页（noindex 页不进 sitemap）。
- 集成默认只输出 en / zh-CN 两条 alternate，`serialize` 按页面语言表补 `x-default`，指向默认语言版本，与页面 head 的三条 hreflang 保持一致。
- 用 `src/lib/seo/lastmod.ts` 写逐页 `lastmod`（取产出该页的源文件最后提交时间）。

## noindex 页（404）

- 404 等 `noindex` 页**不输出** canonical、`og:url` 与 hreflang（`BaseLayout` 在 `noindex` 时清空 alternates——404 不是「某页面的语言版本」，强行声明会指向未生成路径）；同时输出 `<meta name="robots" content="noindex, follow">`。

## 生成与校验分离

- 页面级：`src/lib/seo/meta.ts` 的 `buildMeta()` 负责补品牌后缀并校验标题/描述长度，**不合规直接抛错**中断构建（不返回 issues）。
- 内容级：`scripts/validate-content.mjs` 负责标题全站唯一、引用完整性、编码与文件名一致、品类对比表列覆盖。
- 长度按**显示宽度**计（中文全角字符计 2）；阈值读 `src/data/site.ts` 的 `SEO_LIMITS`，`buildMeta()` 不合规即抛错。
