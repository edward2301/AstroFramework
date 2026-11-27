---
name: industrial-design
description: "全站视觉改版与产品线版式：全宽流式容器、德系工业极简、扁平型号 URL、全型号目录、四页并行 lane。当用户说「改版 / 风格不对 / 两边空白 / 全宽 / 型号层级 / 产品目录 / 并行改页面 / German industrial minimal」时使用；只加新页面用 layout-body，只调单个 token 用 ui-component。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/` 与本技能。
> 2. 这是结构性改版：先确认用户已选定方向（全宽 / 扁平型号 / 德系极简 / 首轮四页），不再逐页重问。
> 3. 并行时严格按 lane 文件所有权施工；共享文件只在 Wave 0 由主代理写。
> 4. 每次写入后立即回读，确认 `<style>` 块数量、联合类型与路由分支完整。
> 5. 版式/CSS 修复走「修复协议」（见下）：修模式不修实例，全站扫双端双语言。
> 6. 完成后只报改动、验证结果与 `Docs:` 行。

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
- **网格**：不新增断点；卡片/规格网格用 `repeat(auto-fit|auto-fill, minmax(min(100%, Npx), 1fr))`；同一断点在组件内只开一个 `@media` 块，新规则并入既有块（置于 base 规则之后）。
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
纯石墨 hero（无渐变，8/4 栏，事实列表用编号 + 细线；英文 ≤480 标题 32–36px、导语 16px、按钮间距 8px、顶部 112–124px；中文 320–480 顶部 120px，481–512 平滑回到 124px；中文标题在逗号后固定换行）→ 品类网格（图上文下）→ 按应用选型（工况卡：无图片、数据驱动、44px 链接）→ `CtaBand`。

### Products
`PageHeader` + 品类 pill（真实链接到品类页）+ 默认隐藏的搜索表单 + `aria-live` 计数 + 密集表：
Model（48px 缩略图 + `.mono` 编码 + 名称）/ Category / Key parameters（5 组 `k: v`）/ Status / Details。
所有行服务器渲染；JS 只做行过滤与计数；脚本用 `<script is:inline>`，不得进入全站共享 JS。

### Category
`PageHeader` + 型号视觉网格（≤1024 两列，桌面 `auto-fill 360px`；≤768 收紧间距）→ 参数对比表 → 采购信息 4-up → 品类说明（8/4）→ `CtaBand`。
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
| A 首页 | `src/components/pages/HomeBody.astro`、`cards/CategoryCard.astro`、`catalog/ApplicationCard.astro` |
| B 产品总览 | `src/components/pages/ProductsBody.astro`、新建 `catalog/CatalogTable.astro` |
| C 品类 | `src/components/pages/CategoryBody.astro`、`catalog/ComparisonTable.astro`、`catalog/PurchaseFacts.astro`、`cards/ModelTile.astro` |
| D 型号 | `src/components/pages/ModelBody.astro` |

**任何 lane 都不得改**：`src/styles/*`、`src/i18n/ui.ts`、`components/layout/*`、`components/seo/Breadcrumb.astro`、`data/routes.ts`、`lib/pages/{render,static}.ts`、`pages/[...slug].astro`、`lib/seo/{breadcrumb,lastmod}.ts`、`scripts/*`、`tests/*`、`public/`、其他 lane 的文件。
缺文案/全局工具时上报主代理，由主代理在 Wave 0 文件中补。

## 修复协议（查 bug / 改 bug 必读）

反复返工的教训都来自「只修被标记的那一处」。任何版式 / CSS 修复按此执行：

1. **先定性**：空带 = 多层边距叠加；双细线 = 页头下边线 + 首块自带分隔线；错位 = order/列宽；文案语言 = locale 链路。
2. **修模式，不修实例**：同类模式全站扫——`npm run build` 后 `npm run check:layout 1600` 与 `npm run check:layout 390`（124 页，含 /404/ 与 /zh/404/，绝不排除任何页面类）。
3. **双语言 + 双端**：zh/en × 桌面 1600 + 移动 390，四个组合都要过。
4. **改完必须视觉抽查**：对被修页面截图确认，不能只凭构建绿灯宣布完成。
5. **知识回写**：新坑追加进下方踩坑清单与 ui-component 的「常见失败」。

### 踩坑清单（每条都真实复发过）

- **空带 = 多层边距叠加**：页头 32px 下内边距 + `.section` 56–112px 上边距 + 首块自带 padding/分隔线，可叠到 80–130px。系统解法：`.page-header + .section`（space-5）+ 首个 `.section-title` / `.notice` 去顶线；**无页头页面（404）不在覆盖内必须单独收紧**（NotFoundBody 已覆写 `.section`）。
- **双细线夹空白像渲染残留**：相邻两条 1px 线之间只要有空白就会被当成 bug——首块不再画分隔线，页头下边线即分隔。
- **`order` 在不对称 grid 列下错位**：reverse 布局用显式 `grid-column` + 列宽互换（FeatureRow 模式），不用 order。
- **astro dev（7.4.13）无尾斜杠拦截在中间件与自定义 404 之前**：合法页 404、未知页弹品牌提示页，middleware/connect 都拦不到——由 astro.config 的 `devTrailingSlash` 集成（connect 栈 unshift）+ `trailingSlash: 'ignore'` 处理；**不要再往 middleware.ts 塞这类逻辑**。
- **Vite 内部自请求带尾斜杠会刷 [404] 日志噪音**：`/@id/__x00__astro:toolbar:internal/`（带斜杠）被 Astro 路由器当页面 404，但工具栏已通过无斜杠路径正常加载（浏览器侧全 200）。集成里对 `/@` 开头且带斜杠的路径做「去斜杠归正」即可消除。
- **astro dev 错误路由匹配不到带前缀 404**：未知 /zh/ 路径回落英文 404——根 404.astro 按路径前缀动态推断语言已缓解。
- **体检脚本两类误报口径**：桌面按设计隐藏的元素（型号页询价条）offsetParent 为 null，不计异常；滚动条 15px 假溢出必须用 `clientWidth` 口径比较；首页 hero 大顶距与透明页眉描边主按钮是设计使然，已豁免。

## 验证

- **布局体检硬门（版式/CSS 改动必跑）**：`npm run build` 后 `npm run check:layout 1600` 与 `npm run check:layout 390`——对 dist 全部 124 页（含 /404/ 与 /zh/404/）自动测空带（页头→首块内容 >72px）、横向溢出（clientWidth 口径）与全部 .btn（高度/主按钮配色/空文案）。退出码非 0 先修再交。
- `npm run test`、`npm run validate`、`npm run check`、`npm run build`。
- 开发态看 1920 / 1440 / 1024 / 768 / 390，en + zh 四页；`scrollWidth === clientWidth`。
- 产物：旧型号 URL 不在 HTML；sitemap 只有扁平型号 URL；canonical / og:url / Product JSON-LD / BreadcrumbList 末项为扁平路径；三条 hreflang 仍在。
- 目录页：无 JS 全行可见 + pill 可跳；有 JS 筛选/搜索/计数/空态/`?category=` 正常。
- 390px：无横向溢出；目录表 ≤768 卡片化、对比表在 ≤1024 有「左右滑动」提示；按钮/筛选 pill/输入框/型号 chip/页眉 logo/语言切换/卡片入口链接/表格内链接/页脚栏目链接 ≥44px。
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
