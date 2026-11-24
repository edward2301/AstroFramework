# 架构

## 数据流（单向）

```
src/content/**（内容源）→ src/content.config.ts（schema 校验）
  → src/lib/content/*（仓储层，页面取数的唯一入口）
  → src/lib/pages/render.ts（内容页装配：按集合取数 + SEO 组装）
  → src/data/pages/entries/*.ts（静态页条目：path · seo · nav? · heading? · crumb? · draft?；content 仅 section 版式）
  → src/lib/pages/static.ts（静态页装配：按版式组装）
  → src/lib/nav.ts（导航派生：读条目 nav 字段）
  → src/pages/[...slug].astro（单路由分发器，getStaticPaths 遍历 LOCALES）
  → src/layouts/BaseLayout.astro（含 hreflang）
```

- **页面组件不直接调 `getCollection`**，一律经 `src/lib/content/` 下的具体模块（每集合一个，直接按模块导入；不设汇总 barrel）。`localize.ts` 负责语言视图：补充字段缺失回落源语言，整块缺译由校验判错。`relations.ts` 负责引用的反向解析（如型号被哪些案例引用）。`site.ts`（`getSiteNav`）是站点级导航查询，为布局层唯一允许调用的内容查询。
- **7 个内容集合**（`src/content/`）：models、categories、applications、cases、downloads 为 JSON；guides、faqs 为 Markdown（中文按 `zh/` 子目录分文件）。schema 全部集中在 `src/content.config.ts`（如 `keyParams` 恰好 5 项、品类 `intro` ≥300 字、译文 `intro` ≥150 字）；downloads 无独立 SEO 字段，只有可选的 `locales.<lang>.title`。
- **`draft: true`** 的条目不生成路由、不进列表、不参与关联解析；已发布条目引用草稿会在体检时报错。

## 双语与 i18n

- `src/i18n/routing.ts` 是语言与路径映射的唯一来源（`LOCALES`、`LOCALE_PREFIX`、`LOCALE_LABELS`、`LOCALE_META`、`localizePath`/`parsePath`/`alternatePaths`）。`astro.config.mjs` 的 i18n 与 sitemap locales 直接从这里导入常量，无需另改；但新增语言不只改这一处：`LOCALE_PREFIX` 等为 `Record<Locale,…>`，漏加会编译失败，另需补 `ui.ts` 的 `UI: Record<Locale, Dict>`、内容译文、页面条目的 `seo`（`src/data/pages/entries/*.ts`）、`src/data/organization.ts` 的 `locales.<新语言>`，以及 `public/_headers` / `public/_redirects` 里各 2 条对应前缀的 404 规则（Cloudflare Pages 按 `<前缀>/404.html` 就近查找；完整操作清单见 `docs/上手指南.md` §5.6）。`[lang]/404.astro` 与 `scripts/build-guard.mjs` 都按 `LOCALES` 派生，无需改动。默认语言（en）不带前缀，zh 带 `/zh`。
- 译文按内容形态分两类：`models` / `categories` / `applications` / `cases` 写在条目的 `locales` 键下（`localized()` 用 `z.partialRecord` 按语言索引），补充字段可缺省并回落源语言，但 `REQUIRED_TRANSLATION` 的必填字段与整块缺译由构建脚本**判错**；`guides` / `faqs` 按目录分语言（`zh/*.md`），缺文件同样判错；`downloads` 只有内联可选的 `locales.<lang>.title`。`src/content.config.ts` 导出 4 个子 schema（`modelLocales` / `categoryLocales` / `applicationLocales` / `caseLocales`），`localize.ts` 用 `z.output<S>`（非 `z.infer`）派生译文类型。
- 界面文案分层：按钮、表头、面包屑、页眉 CTA 与部分页面 h1 在 `src/i18n/ui.ts`；主导航/页脚链接标签写在条目里（`nav.main.label` / `nav.footer.label`），页面级 SEO 在条目的 `seo`，`heading` 用于 about / section 版式的标题。
- 内容页路由只有 `[...slug].astro` 一个分发器（另有 `404.astro`、`[lang]/404.astro`、`robots.txt.ts`），页面由分发器统一产出：新增两段式栏目 = 在 `src/data/pages/entries/` 新建文件 + 在 `src/data/pages/index.ts` 加 import 与一项，路由、导航、校验、sitemap 自动生效；若栏目要展示集合列表，还需在 `static.ts` 的 `sectionContent()` 登记一个 path 分支。新增**版式**需同时改：新建 `*Body.astro`、`contract.ts` 的 `layout` 联合、`static.ts` 的 `switch (def.layout)`、`render.ts` 的 `BodyKey` 与 `RenderedPage` 联合、`[...slug].astro` 的 import 与分发分支。

## 校验脚本（scripts/）

- `validate-content.mjs`：内容体检（标题含后缀后 50–60 / 描述 140–158 按显示宽度计、全角计 2；标题全站唯一；型号编码与文件名一致；引用存在；品类对比表列在型号参数中有同名键——中英分别校验；缺译判错、文案重复填充与占位词、页面路径与导航 `order`、`<img>` 必填属性；集合用 `readdirSync({recursive:true})` 递归扫描子目录，与 Astro 的递归 glob 覆盖一致；品牌后缀从 `src/lib/seo/branding.ts` 导入）。**对比表键名不一致构建不报错只渲染空白列，是本仓最易踩的坑**。
- `check-links.mjs`：产物站内断链检查 + 语言版本配对检查（配对经 `parsePath`/`localizePath`，不写死语言前缀；例外路径登记在 `PENDING_ROUTES` 与 `SINGLE_LOCALE_PAGES`）。
- `build-guard.mjs`：把内容体检与链接检查挂进构建生命周期，并在 `astro:build:done` 按 `LOCALES` 把 `dist/<前缀>/404/index.html` 复制成 `404.html` 供 Pages 就近查找。

## 关键修改点速查

| 要改什么 | 位置 |
|---|---|
| 域名 | `astro.config.mjs` 的 `site`（唯一来源）+ Cloudflare Pages 自定义域绑定 |
| 公司信息 / 组织实体 | `src/data/organization.ts`（中文描述与地址在 `locales.zh`） |
| 导航与页脚栏目 | 页面条目的 `nav` 字段（`src/data/pages/entries/*.ts`） |
| 新增页面 SEO 文案 | `src/data/pages/entries/*.ts` 的 `seo`（与内容标题共用唯一性表） |
| 设计变量与全局样式 | `src/styles/tokens.css` 与 `global.css` |
| 加新语言 | `src/i18n/routing.ts` 的 `LOCALES` 为起点；`LOCALE_PREFIX` / `LOCALE_LABELS` / `LOCALE_META` 为 `Record<Locale,…>`，漏加编译失败，另需补 `ui.ts` 的 `UI`、内容译文与 `public/_headers` / `public/_redirects` 各 2 条分语言 404 规则；404 产物与 astro.config 的 i18n 自动跟随 |
| 部署（Cloudflare Pages） | `wrangler.toml`、`deploy/cloudflare/README.md`；路由规则在 `public/_headers` / `public/_redirects`；分语言 404 复制在 `scripts/build-guard.mjs` 的 `astro:build:done` |
| 交互数据（D1） | `wrangler.toml` 的 `[[d1_databases]]` 绑定；建表、写入、查询与导出命令见 `deploy/cloudflare/README.md` |
