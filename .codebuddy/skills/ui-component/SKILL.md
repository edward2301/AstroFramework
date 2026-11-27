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
- 令牌：`src/styles/tokens.css`（L0 primitives → L1 面/文字/边 → L2 动作/数据 → L3 排版 → L4 布局 → L5 形状/动效/z）。
- 全局：`src/styles/global.css`（reset、排版、容器与 12 栏、`.section`、`.band`/`.aside-panel`、链接、`.btn` 变体、`.card/.badge/.chip`、`.data-table/.spec-table/.table-scroll`、`.table-hint`、`.field`、详情页复用片段 `.stack/.lede/.intro/.detail-meta/.aside-title/.points`、列表工具 `.grid-list/.chip-list`、目录文本 `.model-code/.model-name`、focus-visible、reduced-motion）。
- 共享组件：`src/components/layout/`（PageHeader、SectionTitle、CtaBand、FeatureRow、Header、Footer）。
- 目录组件：`src/components/catalog/`（ComparisonTable、PurchaseFacts）。
- 卡片：`src/components/cards/`（CategoryCard）；`src/components/catalog/`（ApplicationCard、ModelTile）。
- 页面 Body：`src/components/pages/*Body.astro`。
- 样式作用域警告：`src/pages/[...slug].astro` 顶部注释（所有 Body 共享一份 CSS）。

## 步骤
1. 判定改动层级：token → 共享组件 → 页面局部。优先改 token；只有确实没有对应 token 时才写局部值。
2. 先搜现有组件与类：按钮只有全局 `.btn` 一套（变体 `--primary/--secondary/--ghost/--on-dark`），表格用 `.data-table/.spec-table` + `.table-scroll`，能扩展就不新造。
3. 要合并重复按钮、相关链接块或卡片时，先列出所有调用点与差异，给方案等确认。
4. 一次只改一个值（颜色、间距、字号、断点分开改），让用户看效果后再继续。
5. 保持 props 向后兼容；新增可选 prop 优先，不重命名现有 prop。
6. 界面文案进 `src/i18n/ui.ts`，不写死在组件里；内容文案来自内容集合。
7. 所有 `<img>` 必须有 `width`、`height`、`alt`、`loading`；主图按现有约定用 eager/lazy。
8. 检查可访问性：PageHeader 是全站唯一 `<h1>`、标题层级不跳级、`focus-visible`、`aria-current`、表单 label、页脚栏标题用 `<p>` 避免标题跳级。
9. 断点只用 480 / 768 / 1024 / 1280 / 1440；不新增断点；卡片/规格网格优先用 `repeat(auto-fit|auto-fill, minmax(min(100%, Npx), 1fr))`。
10. 跑 `npm run check` 与 `npm run build`；对比构建前后 CSS 体积。

## 不变量
- 颜色、间距、字号一律用 token；组件不写死色值（深色带上的 `#fff` 例外）。信号蓝（`--color-action/link/focus`）只用于主按钮填充、链接、焦点；`--color-data` 已改为石墨，不再用铜色装饰。
- 全宽契约：`--container` 1920px、`--container-narrow` 1280px、`--gutter` 24–40px；背景色带挂 `<section>`，不挂 `.container`。
- 形状契约：`--radius-*` 全为 0，`--shadow-*` 为 none；不要再新写圆角、阴影或 hover 抬升。
- 移动端可点击目标（按钮 / 筛选 pill / 输入框 / 卡片入口链接 / 表格内链接）≥44px；会横滚的表格在 ≤1024 显示一行「左右滑动」提示。
- 同一断点一个块：每个组件 style 块内同一断点只开一个 `@media`，新规则并入既有块并置于对应 base 规则之后（media 不提升优先级，覆盖靠源顺序）；Footer 的 max-768 块保持在 min-width 块之后，768px 整点才维持两列。
- 型号编码用全局 `.mono`；表格表头小号大写 + `--ls-wide`。
- 按钮全站唯一：任何局部 `.btn-*`/`.cta-*`/`.header-cta`/`.cat-cta` 都是违规，一律迁到全局变体；每个视口区域只一个填充主按钮。
- PageHeader 是 full-bleed 带、放 `.section` 之外（内部自带 container），全站唯一 h1；SectionTitle 管 h2；related 分组用 h3。
- 表格必须套 `.table-scroll`（`tabindex="0"` + `role="region"` + `aria-label`），只在表内横滚。
- `CategoryCard` 与 `ApplicationCard` / `ModelTile`（含 `compact`）是刻意拆分（网格卡 vs 应用选型卡 vs 次级磁贴），不盲目合并。
- 组件不取数、不调用 `getCollection`、不写内容文案。
- 所有 Body 经 `[...slug].astro` 共享一份 CSS；低频样式先评估体积，404 继续独立路由。
- 一次只改一个变量；禁止把尺寸、断点、布局方案捆在一次改动里。
- 常见失败：
  - 直接写 `#0b5fff` 或 `padding: 37px`：应先用 `--color-action` / `--space-*`。
  - 再写一套 `.btn-quote`：页面出现第二套按钮。
  - PageHeader 塞进 `.section > .container`：双重内缩 + 双 h1 结构。
  - 页脚栏标题用 `<h3>`：标题层级从 h1 跳到 h3。
  - `<img>` 缺 `width/height`：构建期校验直接失败。
  - reverse 布局用 `order` 换位：不对称 grid 列（如 380px/1fr）下图会落进宽列——用显式 `grid-column` + 列宽互换。
  - 首块自带分隔线紧贴页头下边线：两条 1px 线夹空白像渲染残留——首块去线，间距规则见 industrial-design「修复协议」。

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
- **布局体检硬门（样式改动必跑）**：`npm run build` 后 `npm run check:layout 1600` 与 `npm run check:layout 390`——124 页全扫（含 404），空带 / 溢出 / 按钮几何自动判定，退出码非 0 先修再交。
- 开发态看 en/zh、桌面/移动端；一次改动只对比一个变量。
- 对比 `dist/_astro/*.css` 体积；明显上涨时拆回页面局部或拆分路由。
- 写后回读文件，确认 `<style>` 块没有重复、没有误删既有规则。

## 移交
- 版式/结构：`layout-body`。
- 内容字段：对应 `content-*`。
- SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
