---
name: nav-footer
description: "调整主导航、页脚栏目、面包屑与 order。当用户说「导航顺序 / 页脚加链接 / 面包屑不对 / order 冲突 / footer column」时使用；新增页面落点用 page-entry，新版式用 layout-body，Header CTA 文案用 ui.ts。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/architecture.md`。
> 2. 写入前列出将改条目/文件；改页面文案或结构时先得到确认。
> 3. 只改导航相关字段，不顺手改页面正文。
> 4. 每次写入后立即回读，确认两种语言的 label 与 order 都完整。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 导航、页脚与面包屑

## 目标与边界
- 负责 `src/data/pages/entries/*.ts` 的 `nav` 字段、`src/data/navigation.ts` 的页脚列顺序、静态页面包屑。
- 不负责新增页面（去 `page-entry`），不负责新版式（去 `layout-body`）。
- 详情页面包屑由 `src/lib/seo/breadcrumb.ts` 的代码生成，不在条目里改。

## 事实源
- 导航契约：`src/data/pages/contract.ts` 的 `NavDef`、`FooterColumnKey`、`crumbLabel()`。
- 页脚列：`src/data/navigation.ts` 的 `FOOTER_COLUMN_ORDER`。
- 派生逻辑：`src/lib/nav.ts` 的 `buildMainNav()`、`buildFooterNav()`。
- 详情页面包屑：`src/lib/seo/breadcrumb.ts` 的 `productsCrumbs/categoryCrumbs/modelCrumbs/sectionCrumbs`。
- 渲染：`src/components/layout/{Header,Footer,PageHeader}.astro`、`src/components/seo/Breadcrumb.astro`。
- 校验：`scripts/validate-content.mjs` 第 1 节（order 唯一性）。

## 步骤
1. 定位目标页面条目；决定只进主导航、只进页脚，还是两者都进。
2. 在目标区选唯一 `order`：`main` 全局唯一；`footer` 在各自 column 内唯一。
3. 写双语 `label`，不要只写一种语言。
4. 动态列：
   - 主导航目前只有产品栏使用 `dynamic: 'categories'`；新增第二个动态栏前先确认 Header 下拉行为。
   - 页脚 products 列可用 `dynamic: 'categories'`，applications 列可用 `dynamic: 'applications'`。
   - 只有 products 的 categories 动态列支持 `fallbackLabel`；applications 列为空时整列不渲染。
5. 页脚列顺序只改 `FOOTER_COLUMN_ORDER`；新增/删除列是结构变更：`FooterColumnKey`、`FOOTER_COLUMN_ORDER`、`ui.ts` 的 `footer.columns` 与 `Footer.astro` 都要同步，先给方案等确认。
6. 静态页面包屑：必要时写显式 `crumb`；否则按 `crumb → heading → section.content.heading → seo.title` 回落。
7. 详情页面包屑：改 `src/lib/seo/breadcrumb.ts` 的函数，不要在条目里加 `crumb`。
8. 跑 `npm run validate` 与 `npm run test`；开发态看两种语言的 Header/Footer 与移动端。

## 不变量
- `main.order` 全局唯一；`footer.order` 在各自 column 内唯一；重复会让顺序取决于 import 顺序。
- `nav.label` 是 `Record<Locale,string>`，所有语言必填。
- 动态列由内容填充，不手写品类/应用链接；品类兜底只用于 products 列。
- 站内 URL 取自条目 `path` 或 `src/data/routes.ts`，不硬编码。
- 页脚分区固定五类：products、applications、resources、company、contact；空列不渲染。
- Header 的询价 CTA 文案在 `src/i18n/ui.ts`，不在 `nav`；语言切换由 `routing.ts` 的路径函数处理。
- 常见失败：
  - `主导航 order 20 与 ... 重复，顺序将取决于声明顺序`
  - `页脚「resources」栏 order 10 与 ... 重复`
  - 新页面加了 `nav` 但只写英文 `label`：类型或渲染缺中文。

## 模板
```ts
nav: {
  main: {
    order: 60,
    label: { en: 'New Section', zh: '新栏目' },
  },
  footer: {
    column: 'company',
    order: 40,
    label: { en: 'New Section', zh: '新栏目' },
  },
},
```
动态列示例（仅 products 列）：
```ts
footer: {
  column: 'products',
  order: 10,
  dynamic: 'categories',
  fallbackLabel: { en: 'All products', zh: '全部产品' },
},
```
模板只展示结构；`order` 必须与现有条目避让，`label` 必须两种语言都写。

## 验证
- `npm run validate`：主导航/页脚 order 无重复。
- `npm run test`：`tests/nav.test.ts` 通过；调整顺序后同步预期数组。
- `npm run check-links`：导航与页脚链接落点存在。
- 开发态检查桌面/移动端 Header、Footer 五列、语言切换与面包屑。
- 写后回读条目，确认 `nav` 字段与两种语言文案完整。

## 移交
- 新增页面：`page-entry`。
- 新版式/页脚结构：`layout-body`。
- Header CTA 文案：`ui.ts`（属于界面文案，不改 nav）。
- 校验/构建报错：`validate-fix`。
