# 架构

## 数据流（单向）

```
src/content/** → src/content.config.ts → src/lib/content/*
  → src/lib/pages/render.ts → src/data/pages/entries/*.ts
  → src/lib/pages/static.ts → src/lib/nav.ts
  → src/pages/[...slug].astro → src/layouts/BaseLayout.astro
```

- 页面组件不直接调 `getCollection`，一律经 `src/lib/content/` 的具体模块（每集合一个，不设 barrel）。`localize.ts` 负责语言视图与字段回落；`relations.ts` 负责反向引用；`site.ts` 是布局层唯一允许的内容查询。
- **内容集合**：models/categories/applications/cases/downloads 为 JSON，guides/faqs 为 Markdown（中文按 `zh/` 分文件）。字段与长度约束以 `src/content.config.ts` 为准；downloads 无独立 SEO，只有可选 `locales.<lang>.title`。
- **`draft: true`** 不生成路由、不进列表、不参与关联解析；已发布条目引用草稿会在体检时报错。

## 双语与 i18n

- `src/i18n/routing.ts` 是语言与路径映射的唯一来源（`LOCALES`、`LOCALE_PREFIX`、`LOCALE_LABELS`、`LOCALE_META`、`localizePath`/`parsePath`/`alternatePaths`）。`astro.config.mjs` 的 i18n 与 sitemap locales 直接从这里导入，无需另改。
- `LOCALE_PREFIX` 等是 `Record<Locale,…>`，漏加会编译失败；新增语言的完整清单见 `.codebuddy/skills/add-locale/SKILL.md`（含 tests 语言断言与 Footer 语言分支），指南 §5.6 是索引版。
- 译文按形态分两类：参数型写在条目的 `locales.<lang>`，补充字段可缺省回落；guides/faqs 按目录分语言。`REQUIRED_TRANSLATION` 必填字段与整块缺译由构建脚本判错。
- 界面文案在 `src/i18n/ui.ts`；导航/页脚标签在条目 `nav.label`；页面级 SEO 在条目 `seo`。

## 校验脚本（scripts/）

- `validate-content.mjs`：宽度按 `SEO_LIMITS` 与显示宽度；标题全站唯一；文件名/引用/对比表列/缺译/路径/导航/图片属性。对比表键名不一致时构建不报错，对应单元格渲染 `—`，是本仓最易踩的坑。
- `check-links.mjs`：站内断链 + 语言版本配对（`PENDING_ROUTES` / `SINGLE_LOCALE_PAGES` 例外）。
- `build-guard.mjs`：把体检与链接检查挂进构建，并复制分语言 404。

## 关键修改点速查

| 要改什么 | 位置 |
|---|---|
| 域名 | `astro.config.mjs` 的 `site`（唯一来源） |
| 公司信息 | `src/data/organization.ts` |
| 导航与页脚 | 页面条目的 `nav` 字段（`src/data/pages/entries/*.ts`） |
| 页面 SEO | `src/data/pages/entries/*.ts` 的 `seo` |
| 设计变量 | `src/styles/tokens.css` 与 `global.css` |
| 加新语言 | 从 `src/i18n/routing.ts` 的 `LOCALES` 起；完整清单见 `add-locale` 技能 |
| 部署 | `wrangler.toml`、`deploy/cloudflare/README.md` |
| D1 | `wrangler.toml` 的 `[[d1_databases]]`；命令见 `deploy/cloudflare/README.md` |
