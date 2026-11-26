---
name: layout-body
description: "新增页面版式、Body 组件或调整页面结构。当用户说「新版式 / 加 Body / 改页面结构 / 带筛选的列表页 / layout」时使用；只调颜色间距用 ui-component，只加静态页用 page-entry，只改导航用 nav-footer。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/architecture.md` 与 `ai-collaboration.md`。
> 2. 这是结构改动：先给 2–3 个方案与影响面，等用户确认后再写。
> 3. 只做被确认的方案，不顺手改设计系统或其他页面。
> 4. 每次写入后立即回读，确认联合类型、switch 与分发器分支都齐全。
> 5. 完成后只报改动、CSS 体积与验证结果。

# 版式与 Body 组件

## 目标与边界
- 负责新增 `src/components/pages/*Body.astro`，并把它接入页面装配链路。
- 负责区分"静态版式"（条目驱动）与"内容详情版式"（集合驱动）。
- 不负责内容录入（去对应 `content-*`），不负责纯视觉调整（去 `ui-component`）。

## 事实源
- 页面契约：`src/data/pages/contract.ts` 的 `PageDef` 联合。
- 静态装配：`src/lib/pages/static.ts` 的 `switch (def.layout)` 与 `sectionContent()`。
- 详情装配：`src/lib/pages/render.ts` 的 `PageInput`、`BodyKey`、`RenderedPage`、`loadPage`。
- 路由：`src/pages/[...slug].astro` 的 `getStaticPaths` 与条件渲染。
- 路径：`src/data/routes.ts` 的 `detailPath`。
- 样式：`src/styles/tokens.css`、`global.css`；共享组件在 `src/components/{layout,cards,pages}/`。

## 步骤
1. 先证明现有版式（`PageDef`）无法复用；列出复用方案与新版的差异，给 2–3 个选项等确认。
2. 判断属于哪条路径：
   - **静态版式**：数据来自页面条目，`PageInput` 仍是 `{ kind: 'static' }`。
   - **内容详情版式**：数据来自集合，需要新的 `PageInput` kind 与路由枚举。
3. 新建 `XBody.astro`：props 从 `RenderedPage` 的对应变体派生；组件只渲染，不 `getCollection`，不写 SEO。
4. 复用 `PageHeader`、`CtaBand`、`MetricStrip`、`FeatureRow`；不要复制第四套 hero 或按钮。
5. 静态版式接线：
   - `contract.ts` 加 interface 并加入 `PageDef` 联合；
   - `static.ts` 的 `switch (def.layout)` 加 `case`，返回 `body: '<key>'` 与 `bodyProps`；
   - `render.ts` 的 `BodyKey` 与 `RenderedPage` 加变体；
   - `[...slug].astro` 加 import 与条件分支；
   - 新建 entry 并在 `src/data/pages/index.ts` 注册（见 `page-entry`）。
6. 详情版式接线：
   - `render.ts` 的 `PageInput` 加 kind；
   - `[...slug].astro` 的 `getStaticPaths` 加集合枚举（按 `LOCALES` 产出全语言路由）；
   - `src/data/routes.ts` 的 `detailPath` 加路径；
   - `src/lib/content/` 加取数函数；
   - `loadPage` 加取数、面包屑、schema、`bodyProps` 分支；
   - 再加 `BodyKey`/`RenderedPage` 变体与分发器分支。详情版式不需要 entry；若要栏目入口页，另按 `page-entry` 建。
7. 所有 `<img>` 补 `width`、`height`、`alt`、`loading`；主图按现有约定决定 eager/lazy。
8. 跑 `npm run check` 与 `npm run build`；对比构建前后 CSS 体积。

## 不变量
- 两条路径的触点缺一不可：漏一个通常表现为页面不渲染、类型报错或路由 404。
- `contract.ts` 只放类型与不变量，不放页面文案。
- Body 不直接取数；所有数据由 `static.ts` / `render.ts` 装配。
- `[...slug].astro` import 的每个 Body 都会进入全站公共 CSS；低频版式先评估体积，404 继续保持独立路由。
- 新详情路由必须在 `LOCALES` 的每种语言下都产出，否则 `check-links` 的语言配对会失败。
- 不新增依赖；图片继续走 `public/` 原样复制，不做构建期图片处理。
- 常见失败：
  - 新增了 `PageDef` 但没加 `static.ts` 的 `case`：页面生成但 body 为空/类型不匹配。
  - 新增了 `BodyKey` 但没加分发器分支：页面白屏或 404。
  - 新增详情路由但没加 `getStaticPaths`：构建没有该路由。
  - 把 `NotFoundBody` 接进分发器：全站 CSS 体积上涨。

## 模板
Body props 骨架：
```astro
---
import PageHeader from '../layout/PageHeader.astro';
import type { RenderedPage } from '../../lib/pages/render';

type Page = Extract<RenderedPage, { body: 'newBody' }>;
const { locale, crumbs, heading } = Astro.props as Page['bodyProps'];
---

<PageHeader locale={locale} crumbs={crumbs} title={heading} />
<section class="section">
  <div class="container">
    <!-- 只渲染传入的数据，不在这里 getCollection -->
  </div>
</section>
```
接线清单（逐条打勾）：
```text
[ ] contract.ts：interface + PageDef 联合
[ ] static.ts 或 render.ts：装配分支
[ ] render.ts：BodyKey + RenderedPage 变体
[ ] [...slug].astro：import + 条件分支
[ ] 静态版式：entry + index.ts 注册
[ ] 详情版式：PageInput + getStaticPaths + detailPath + 取数函数
[ ] <img> 四属性
[ ] 构建后 CSS 体积对比
```

## 验证
- `npm run check`：联合类型与 props 无错误。
- `npm run build`：内容体检、链接检查、语言配对通过。
- 开发态查看新版式的 en/zh 页面与移动端。
- 对比 `dist/_astro/*.css` 体积；若明显上涨，评估是否拆分路由。
- 写后回读所有触点文件，确认没有漏分支或重复定义。

## 移交
- 只加静态页/栏目：`page-entry`。
- 只调视觉/组件样式：`ui-component`。
- 内容数据：对应 `content-*`。
- 校验/构建报错：`validate-fix`。
