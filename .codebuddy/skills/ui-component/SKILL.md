---
name: ui-component
description: "修改设计令牌、共享组件、按钮与卡片样式。当用户说「调样式 / 按钮重复 / 设计变量 / 统一卡片 / design token / 移动端样式」时使用；版式重排用 layout-body，内容字段用 content-*，SEO 文案用 seo-copy。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/ai-collaboration.md` 与 `docs/开发框架设计.md` §8.2。
> 2. 一次只改一个值/一个组件，让用户看效果；不要捆绑尺寸、断点与布局方案。
> 3. 合并重复结构前先列调用点，等用户确认。
> 4. 每次写入后立即回读，确认样式块数量与结构完整。
> 5. 完成后只报改动、影响范围与验证结果。

# UI 组件与设计系统

## 目标与边界
- 负责 `src/styles/tokens.css`、`global.css`、`src/components/` 的视觉与共享组件。
- 负责按钮、卡片、列表、表格等展示层的复用与一致性。
- 不负责版式/路由结构（去 `layout-body`），不负责内容数据（去 `content-*`），不写 SEO 文案。

## 事实源
- 令牌：`src/styles/tokens.css`（颜色、字号、间距、容器、圆角、阴影）。
- 全局：`src/styles/global.css`（reset、排版、容器、`.section`、链接、focus-visible）。
- 共享组件：`src/components/layout/`（PageHeader、CtaBand、MetricStrip、FeatureRow、Carousel、Header、Footer）。
- 卡片：`src/components/cards/`（CategoryCard、CategoryRow、ModelCard、ModelTile）。
- 页面 Body：`src/components/pages/*Body.astro`。
- 样式作用域警告：`src/pages/[...slug].astro` 顶部注释（所有 Body 共享一份 CSS）。

## 步骤
1. 判定改动层级：token → 共享组件 → 页面局部。优先改 token；只有确实没有对应 token 时才写局部值。
2. 先搜现有组件与类：四套 hero（Home / PageHeader / Category / Model）和按钮类已经重复，能扩展就不新造第五套/第六套。
3. 要合并重复按钮、相关链接块或卡片时，先列出所有调用点与差异，给方案等确认。
4. 一次只改一个值（颜色、间距、字号、断点分开改），让用户看效果后再继续。
5. 保持 props 向后兼容；新增可选 prop 优先，不重命名现有 prop。
6. 界面文案进 `src/i18n/ui.ts`，不写死在组件里；内容文案来自内容集合。
7. 所有 `<img>` 必须有 `width`、`height`、`alt`、`loading`；主图按现有约定用 eager/lazy。
8. 检查可访问性：一个 `<h1>`、标题层级不跳级、`focus-visible`、`aria-current`、表单 label、页脚栏标题用 `<p>` 避免标题跳级。
9. 断点沿用现有 CSS（`global.css` 与组件），不新增；移动端优先检查现有移动断点。
10. 跑 `npm run check` 与 `npm run build`；对比构建前后 CSS 体积。

## 不变量
- 颜色、间距、字号优先用 token；现有代码存在 `#fff`、72px header、760px prose、320/380px aside、13px breadcrumb 等局部值，确无对应 token 时可保留并说明，不新增同义 token。
- `CategoryCard` 与 `CategoryRow`、`ModelCard` 与 `ModelTile` 是刻意拆分（首页轮播 vs 目录页），不盲目合并。
- 现有按钮类 `.btn`、`.btn-secondary`、`.cta-btn`、`.cat-cta`、`.header-cta` 已重复；新增按钮前先复用或提出统一方案。
- `Carousel` 没有默认 `--per-view`，由调用方在响应式规则里设置；`perView` 是固定值。
- 组件不取数、不调用 `getCollection`、不写内容文案。
- 所有 Body 经 `[...slug].astro` 共享一份 CSS；低频样式先评估体积，404 继续独立路由。
- 一次只改一个变量；禁止把尺寸、断点、布局方案捆在一次改动里。
- 常见失败：
  - 直接写 `#0b5fff` 或 `padding: 37px`：应先用 `--color-brand` / `--space-*`。
  - 再写一套 `.btn-quote`：页面出现第六种按钮。
  - 页脚栏标题用 `<h3>`：标题层级从 h1 跳到 h3。
  - `<img>` 缺 `width/height`：构建期校验直接失败。

## 模板
优先使用 token：
```css
.card {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
}
```
改动前自检：
```text
[ ] 是否已有同类组件/类可扩展
[ ] 是否优先用了 token
[ ] 是否只改了一个值/一个组件
[ ] props 是否保持兼容
[ ] 文案是否在 ui.ts
[ ] <img> 四属性是否齐全
[ ] 标题层级与 focus-visible 是否正常
[ ] 是否引入新的全站 CSS 体积
```

**完成后报告：**
```text
改动：<文件/字段>
检查：<owner/镜像/§ 引用>
验证：<命令与结果>
遗留：<none 或下一步>
Docs: updated/no change — <文件/章节 或 理由>
```

## 验证
- `npm run check`：Astro/TS 通过。
- `npm run build`：内容体检、链接检查通过。
- 开发态看 en/zh、桌面/移动端；一次改动只对比一个变量。
- 对比 `dist/_astro/*.css` 体积；明显上涨时拆回页面局部或拆分路由。
- 写后回读文件，确认 `<style>` 块没有重复、没有误删既有规则。

## 移交
- 版式/结构：`layout-body`。
- 内容字段：对应 `content-*`。
- SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
