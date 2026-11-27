---
name: industrial-design
description: "全站视觉改版与产品线版式：全宽流式容器、德系工业极简、扁平型号 URL、全型号目录、四页并行 lane。当用户说「改版 / 风格不对 / 两边空白 / 全宽 / 型号层级 / 产品目录 / 并行改页面 / German industrial minimal」时使用；只加新页面用 layout-body，只调单个 token 用 ui-component。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/` 与本技能。
> 2. 这是结构性改版：先确认用户已选定方向（全宽 / 扁平型号 / 德系极简 / 首轮四页），不再逐页重问。
> 3. 并行时严格按 lane 文件所有权施工；共享文件只在 Wave 0 由主代理写。
> 4. 每次写入后立即回读，确认 `<style>` 块数量、联合类型与路由分支完整。
> 5. 完成后只报改动、验证结果与 `Docs:` 行。

# 工业站视觉与版式契约

## 目标与边界
- 负责全站宽度体系、德系工业极简视觉、产品线四页（Home / Products / Category / Model）的版式。
- 负责型号 URL 扁平化与 `/products/` 全型号目录的页面契约。
- 不负责内容字段（去 `content-*`），不负责单页新增（去 `layout-body`），不负责导航栏目（去 `nav-footer`）。

## 设计契约（唯一事实源：`src/styles/tokens.css`）

- **全宽流式**：`--container: 1920px`；`--container-narrow: 1280px`（详情页）；`--gutter: clamp(24px, 2.5vw, 40px)`；背景色带挂在 `<section>` 上，内容用 `.container`。
- **直角**：`--radius-*` 全部 `0`；不再新增圆角组件。
- **无阴影**：`--shadow-*` 为 `none`；层级靠 1px 细线与底色差。
- **颜色**：白 + 冷石墨（`--graphite-900 #0d1117` … `--graphite-600 #3a424b`）；蓝色只用于主按钮、链接、焦点；不再用铜色装饰。
- **字体**：大标题 `--fs-h1` 上限 4.5rem、`--lh-tight 1.05`、`--ls-tight -0.02em`；小标签 `--fs-xs` + `--ls-wide 0.1em` + 大写；型号编码一律 `.mono`。
- **网格**：不新增断点；卡片/规格网格用 `repeat(auto-fit|auto-fill, minmax(min(100%, Npx), 1fr))`。
- **表格**：`.data-table` / `.spec-table` 更紧，数字 `tabular-nums`；外层必须 `.table-scroll`（`tabindex="0"` + `role="region"` + `aria-label`）。
- **按钮**：只用全局 `.btn` 变体；每个视口区域一个填充主按钮。

## IA 契约

- 型号页：`/products/<modelId>/`（中文 `/zh/products/<modelId>/`）；品类不再进 URL。
- 产品总览：`/products/` = 全型号目录（品类筛选 + 搜索）；品类页 `/products/<categoryId>/` 保留为对比入口。
- 面包屑可保留 Home › Products › 品类 › 型号；品类 crumb 链接仍有效。
- model id 与 category id 必须不相交；`validate-content` 与 `tests/content.test.ts` 双重校验。
- 旧路径 `/products/<category>/<model>/` 由 `scripts/model-redirects.mjs` 在构建时生成 301，写入 `dist/_redirects`；不手工维护。

## 四页配方

### Home
纯石墨 hero（无渐变，8/4 栏，事实列表用编号 + 细线）→ 品类网格（图上文下）→ 精选型号网格（图上文下、`.mono` 编码）→ `CtaBand`。

### Products
`PageHeader` + 品类 pill（真实链接到品类页）+ 默认隐藏的搜索表单 + `aria-live` 计数 + 密集表：
Model（48px 缩略图 + `.mono` 编码 + 名称）/ Category / Key parameters（5 组 `k: v`）/ Status / Details。
所有行服务器渲染；JS 只做行过滤与计数；脚本用 `<script is:inline>`，不得进入全站共享 JS。

### Category
`PageHeader` + 型号视觉网格 → 参数对比表 → 采购信息 4-up → 品类说明（8/4）→ `CtaBand`。
对比表首列 sticky；停产行降对比度；采购信息用细线定义网格。

### Model
`PageHeader`（`code name` 作 h1）+ 停产通知条 + 7/5 hero（图 `contain`、上限 960px；关键参数 `.mono`）+ 规格 `auto-fit minmax(420px,1fr)` + 尺寸/接口定义网格 + 相关分组 + `CtaBand` + ≤1024 固定询价条。

### 其余页面（二期）
- 详情页（应用/案例/指南/问答）：`.container.container-narrow` + `DetailLayout`（760px 正文 + 320px sticky 相关栏）；型号链接用 `ModelLinkList`；≤1024 堆叠。
- 栏目页（`SectionBody`）：`MetricStrip` 顶线 + mono 数字；条目用 `auto-fill minmax(min(100%, 300px), 1fr)` 细线卡；侧栏上下细线，无底色。
- 关于页：`FeatureRow` 1px 图框、无阴影；联系区用细线定义网格，不要蓝色卡。
- 询价页：表单 8/4 + 360px aside，`aside-card` 只留细线；表单 JS / 字段名不得改。
- 404：大号 mono 代码 + 细线动作区。

## 并行 lane 与文件所有权

| Lane | 只允许修改 |
|---|---|
| A 首页 | `src/components/pages/HomeBody.astro`、`cards/CategoryCard.astro`、`cards/ModelCard.astro` |
| B 产品总览 | `src/components/pages/ProductsBody.astro`、新建 `catalog/CatalogTable.astro` |
| C 品类 | `src/components/pages/CategoryBody.astro`、`catalog/ComparisonTable.astro`、`catalog/PurchaseFacts.astro`、`cards/ModelTile.astro` |
| D 型号 | `src/components/pages/ModelBody.astro` |

**任何 lane 都不得改**：`src/styles/*`、`src/i18n/ui.ts`、`components/layout/*`、`components/seo/Breadcrumb.astro`、`data/routes.ts`、`lib/pages/{render,static}.ts`、`pages/[...slug].astro`、`lib/seo/{breadcrumb,lastmod}.ts`、`scripts/*`、`tests/*`、`public/`、其他 lane 的文件。
缺文案/全局工具时上报主代理，由主代理在 Wave 0 文件中补。

## 验证

- `npm run test`、`npm run validate`、`npm run check`、`npm run build`。
- 开发态看 1920 / 1440 / 1024 / 768 / 390，en + zh 四页；`scrollWidth === clientWidth`。
- 产物：旧型号 URL 不在 HTML；sitemap 只有扁平型号 URL；canonical / og:url / Product JSON-LD / BreadcrumbList 末项为扁平路径；三条 hreflang 仍在。
- 目录页：无 JS 全行可见 + pill 可跳；有 JS 筛选/搜索/计数/空态/`?category=` 正常。
- `dist/_astro/*.css` 总增量 ≤ +8 KB；`dist/_astro/*.js` 不因目录脚本增长。
- 表格滚动区可键盘聚焦；图片四属性齐全；全站唯一 h1。

## 常见失败
- 把背景色挂进 `.container`：色带被 1920 截断，不是通栏。
- 给 `.card` / `.btn` 新写圆角或阴影：违反直角/无阴影契约。
- 目录页按品类拆不同参数列：不同品类 `keyParams` 键名不同，列会错位。
- 搜索表单在无 JS 时可见但不可用：必须默认 `hidden`，由脚本显示。
- 改 `detailPath.model` 只改签名不改 16 处调用点：类型检查失败。
- 忘记生成 zh 301：中文旧链接 404。

## 移交
- 单页新增/结构：`layout-body`。
- 单个 token/组件样式：`ui-component`。
- 型号/品类内容：`content-model` / `content-category`。
- 校验/构建失败：`validate-fix`。
- 文档同步：`doc-sync`。
