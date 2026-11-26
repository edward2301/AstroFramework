---
name: page-entry
description: "新增、修改或删除静态页与两段式栏目条目（path、seo、nav、section content）。当用户说「加一个页面 / 新增栏目页 / page entry / 页面 SEO / 加一栏」时使用；新版式用 layout-body，只调导航顺序用 nav-footer，独立 SEO 文案用 seo-copy。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/architecture.md`。
> 2. 写入前列出将改路径；涉及页面条目与文案时先得到确认。
> 3. 只做本任务的最小改动，不顺手重构路由或版式。
> 4. 每次写入后立即回读，确认 entry 的 seo/content/nav 结构完整。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 静态页与栏目条目（page entries）

## 目标与边界
- 负责 `src/data/pages/entries/<name>.ts` 与 `src/data/pages/index.ts` 的登记。
- 静态页路由、导航、sitemap、SEO 校验由条目自动派生，不写 `getStaticPaths`。
- 不新增版式（去 `layout-body`），不调整已有导航顺序（去 `nav-footer`）。

## 事实源
- 契约：`src/data/pages/contract.ts` 的 `PageDef`、`NavDef`、`SectionCopy`、`crumbLabel()`。
- 汇总：`src/data/pages/index.ts`（import + `PAGES`）。
- 装配：`src/lib/pages/static.ts` 的 `switch (def.layout)` 与 `sectionContent()`。
- 路由常量：`src/data/routes.ts`。
- 校验：`scripts/validate-content.mjs` 第 1 节（路径/SEO/导航 order）。
- 参照样本：`src/data/pages/entries/applications.ts`、`resources-guides.ts`。

## 步骤
1. 选 layout：`home`、`products`、`about`、`quote`、`section`、`notFound`。栏目页用 `section` 并写 `content.heading/intro/current`。
2. 新建 `src/data/pages/entries/<name>.ts`，用 `definePage({ ... })`。
3. `path` 必须小写、以 `/` 开头结尾；去尾斜杠后不得与现有条目重复。
4. `seo` 必须写全 `Locale` 的 `title` 与 `description`；按 `seo-copy` 的规则自检。
5. 需要进导航才写 `nav`：`main` 主导航、`footer` 页脚某栏；`order` 在目标区内唯一。
6. 在 `index.ts` 加一行 import 与 `PAGES` 中一项；import 必须带 `.ts` 扩展名。
7. 若栏目要列某个集合，在 `static.ts` 的 `sectionContent()` 按 `path` 加分支；未登记时页面照常生成，只是列表为空。
8. 仅当其他代码需要链接到新页面时，才在 `src/data/routes.ts` 的 `ROUTES` 加 key（`ROUTES` 不会自动新增 key）。
9. 跑 `npm run validate` 与 `npm run check`；开发态看两个语言 URL、导航、页脚与面包屑。

## 不变量
- `path` 必须匹配 `^/$|^/[a-z0-9-]+(/[a-z0-9-]+)*/$`，去尾斜杠后唯一。
- `seo` 不缺语言；`pageSeo()` 运行时缺语言会抛错。
- `main` order 全局唯一；`footer` order 在各自 column 内唯一。
- `draft: true` 不建路由、不进导航，但**仍参与 path/SEO/order 校验**。
- `notFound` 条目必须保持发布；默认语言 404 由 `pages/404.astro` 单独产出。
- 一个页面一个文件；`contract.ts` 不放页面文案。
- 改已有 `path` 是破坏性变更：先规划旧路径 301（`_redirects`）与站内链接更新，再改。
- 删除页面前先查导航/页脚与站内链接引用；不要留下断链。
- 常见失败：
  - `路径 ... 格式不合法：须以 / 开头与结尾，段内只允许小写字母、数字与连字符`
  - `路径 ... 与 ... 重复（去除尾斜杠后相同）`
  - `主导航 order 30 与 ... 重复，顺序将取决于声明顺序`

## 模板
```ts
import { definePage } from '../contract.ts';

export default definePage({
  path: '/new-section/',
  layout: 'section',
  nav: {
    main: { order: 55, label: { en: 'New Section', zh: '新栏目' } },
    footer: { column: 'resources', order: 40, label: { en: 'New Section', zh: '新栏目' } },
  },
  seo: {
    en: { title: '<按 seo-copy 规则撰写>', description: '<按 seo-copy 规则撰写>' },
    zh: { title: '<按 seo-copy 规则撰写>', description: '<按 seo-copy 规则撰写>' },
  },
  content: {
    en: { heading: 'New Section', intro: '<定位段>', current: '<当前状态段>' },
    zh: { heading: '新栏目', intro: '<定位段>', current: '<当前状态段>' },
  },
});
```
模板只展示结构；SEO 占位文本必须按 `seo-copy` 重写，`order` 必须与现有导航避让。

**完成后报告：**
```text
改动：<文件/字段>
检查：<owner/镜像/§ 引用>
验证：<命令与结果>
遗留：<none 或下一步>
Docs: updated/no change — <文件/章节 或 理由>
```

## 验证
- `npm run validate`：路径、SEO、导航 order 无错误。
- `npm run check`：`PageDef` 联合与 props 类型通过。
- `npm run test`：`tests/nav.test.ts` 通过；新增导航项时同步预期。
- 开发态检查 `/new-section/` 与 `/zh/new-section/`、Header/Footer 落点、面包屑。
- 若接了集合列表，确认列表非空或空状态正常。
- 写后回读 entry，确认 seo/content 两种语言都完整。

## 移交
- 新版式或 Body：`layout-body`。
- 导航顺序/页脚列：`nav-footer`。
- 独立 SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
- 旧路径 301：`deploy-ops`。
