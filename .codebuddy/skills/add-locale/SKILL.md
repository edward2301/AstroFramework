---
name: add-locale
description: "新增语言（第三种及以后）并完成全站接入：routing、UI 字典、内容译文、页面 seo、404 规则与测试。当用户说「加日语 / 加德语 / 新增语言 / third locale / 多语言扩展」时使用；只补单条内容译文用对应 content-*，只改导航标签用 nav-footer。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/architecture.md` 与 `docs/上手指南.md` §5.6。
> 2. 这是跨全站改动：先列出将改文件与内容范围，等用户确认后再写。
> 3. 按清单逐项完成，不跳过测试与部署规则。
> 4. 每批写入后立即回读，确认 Record 类型与文件配对完整。
> 5. 完成后只报改动、验证结果与仍未翻译的条目。

# 新增语言

## 目标与边界
- 负责把新语言接入路由、UI、内容、页面 SEO、404 规则、测试与页脚格式。
- 路由分发器、`[lang]/404.astro`、build-guard、sitemap、hreflang 都按 `LOCALES` 自动跟随，不需要改。
- 不负责单条内容的日常维护（去对应 `content-*`），不负责导航顺序（去 `nav-footer`）。

## 事实源
- 语言与路径：`src/i18n/routing.ts` 的 `LOCALES`、`LOCALE_PREFIX`、`LOCALE_LABELS`、`LOCALE_META`。
- UI 字典：`src/i18n/ui.ts` 的 `Dict`、`UI: Record<Locale, Dict>`。
- 内容 schema：`src/content.config.ts`（语言枚举来自 `LOCALES`）。
- 页面条目：`src/data/pages/entries/*.ts` 的 `seo`、`heading`、`crumb`、`nav.label`、`fallbackLabel`。
- 组织信息：`src/data/organization.ts` 的 `locales`。
- 部署规则：`public/_headers`、`public/_redirects`。
- 测试：`tests/routing.test.ts`、`tests/dict.test.ts`、`tests/content.test.ts`、`tests/nav.test.ts`。
- 页脚格式：`src/components/layout/Footer.astro` 的 `locale === 'zh'` 分支。

## 步骤
1. `src/i18n/routing.ts`：`LOCALES` 加语言；补 `LOCALE_PREFIX`、`LOCALE_LABELS`、`LOCALE_META`（都是 `Record<Locale,…>`，漏加编译失败）。
2. `src/i18n/ui.ts`：补整份 `Dict` 翻译；键集合与数组长度必须与 en/zh 一致。
3. 内容译文：
   - categories / models / applications / cases：每个已发布条目的 `locales.<lang>` 补齐 `REQUIRED_TRANSLATION` 字段；
   - guides / faqs：建 `<lang>/<slug>.md`，与默认语言同 slug 一一对应；
   - downloads：按需补 `locales.<lang>.title`。
4. 页面条目：给每个 `entries/*.ts` 的 `seo` 补新语言；`heading`、`crumb`、`nav.label`、`fallbackLabel` 若存在也会被 `Record<Locale,…>` 强制补齐。
5. `src/data/organization.ts`：按需补 `locales.<lang>` 的描述与地址；不补则按字段回落英文。
6. 部署规则：`public/_headers` 补 2 条 `no-store`；`public/_redirects` 补 2 条直访 301。路径为 `<prefix>/404.html` 与 `<prefix>/404/index.html`。
7. 测试与页脚：
   - `tests/routing.test.ts` 的 `alternatePaths` 期望值写死了 `zh-CN`，必须改为按 `LOCALE_META[locale].htmlLang` 生成；
   - `tests/dict.test.ts` 与 `tests/content.test.ts` 只覆盖 en/zh，应把循环扩展到 `LOCALES`；
   - `tests/nav.test.ts` 按需补新语言断言；
   - `Footer.astro` 的 `locale === 'zh'` 地址分隔符分支改为按语言判断。
8. 全量验证：`npm run validate && npm run check && npm run test && npm run build`；再跑 `npm run check-links`。

## 不变量
- `Record<Locale,…>` 的漏项会在编译期失败，不要用 `any` 或可选字段绕过。
- 路由、404 生成、build-guard、sitemap、hreflang 自动跟随 `LOCALES`，不要手写第二套清单。
- 不允许整块缺译后静默回落；缺译由 validator 判错。
- `_headers` / `_redirects` 的 2+2 条规则不会编译检查，漏了只会在部署后表现为 404 缓存或 200 直访。
- `check-links` 要求每个路由在每种语言下都有配对页面；缺内容会导致构建失败。
- 新增语言后，`Footer` 的地址格式、测试里的语言断言、`ui.ts` 的数组长度必须同步。
- 常见失败：
  - 编译报错 `Property 'ja' is missing in type ...`：routing 或 UI 的 Record 漏项。
  - `缺少日语版本，应新建 src/content/guides/ja/xxx.md`
  - `[链接检查] 缺少语言版本：/ja/...`

## 模板
`src/i18n/routing.ts`：
```ts
export const LOCALES = ['en', 'zh', 'ja'] as const;

export const LOCALE_PREFIX: Record<Locale, string> = {
  en: '',
  zh: '/zh',
  ja: '/ja',
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export const LOCALE_META: Record<Locale, { htmlLang: string; ogLocale: string }> = {
  en: { htmlLang: 'en', ogLocale: 'en_US' },
  zh: { htmlLang: 'zh-CN', ogLocale: 'zh_CN' },
  ja: { htmlLang: 'ja', ogLocale: 'ja_JP' },
};
```

`public/_headers`：
```text
/ja/404.html
  Cache-Control: no-store
/ja/404/index.html
  Cache-Control: no-store
```

`public/_redirects`：
```text
/ja/404.html  /ja/  301
/ja/404/index.html  /ja/  301
```
模板只展示 ja 的写法；实际前缀、显示名与 htmlLang 按新语言替换。

## 验证
- `npm run validate`：译文完整度、SEO、Markdown 配对无错误。
- `npm run check`：所有 `Record<Locale,…>` 编译通过。
- `npm run test`：routing / dict / content / nav 测试通过；新增语言断言已更新。
- `npm run build`：404 复制、链接检查、语言配对通过。
- `npm run check-links`：每个路由在新语言下有配对。
- 抽查新前缀首页、一个详情页、`<prefix>/404.html` 与 sitemap。
- 写后回读 routing、ui、Footer 与新增语言目录，确认没有漏项。

## 移交
- 批量内容翻译：对应 `content-*`。
- 页面条目结构：`page-entry`。
- 导航标签：`nav-footer`。
- 部署与自定义域：`deploy-ops`。
