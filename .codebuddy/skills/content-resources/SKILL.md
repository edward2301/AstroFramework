---
name: content-resources
description: "新增、修改或删除指南、FAQ、下载资料及中英文件配对。当用户说「写指南 / 加 FAQ / 上资料 / downloads / 中文配对 / 技术文章」时使用；只写 SEO 文案用 seo-copy，新增语言目录用 add-locale，报错诊断用 validate-fix。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/` 中与本任务相关的约束。
> 2. 写入前列出将改路径；涉及 `public/`、`src/content/` 时先得到确认。
> 3. 只做本任务的最小改动，不顺手重构其他文件。
> 4. 每次写入后立即回读，确认 frontmatter、正文与文件配对完整。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 技术资源（guides / faqs / downloads）

## 目标与边界
- 负责 `src/content/guides/`、`src/content/faqs/` 的 Markdown 与 `src/content/downloads/` 的 JSON。
- 详情页由分发器自动产出：`/resources/guides/<slug>/`、`/resources/faq/<slug>/`。
- 不写 SEO 独立文案（去 `seo-copy`），不新增语言（去 `add-locale`）。

## 事实源
- Schema：`src/content.config.ts` 的 `guides`、`faqs`、`downloads`。
- 配对与回落：`src/lib/content/guides.ts`、`faqs.ts`。
- 校验：`scripts/validate-content.mjs` 第 1.2 节（Markdown 配对/空正文）与第 3 节（引用）。
- 列表渲染：`src/lib/pages/static.ts` 的 `sectionContent()`。
- 现有样本：`src/content/guides/selection-notes.md`、`src/content/faqs/range-selection.md`。

## 步骤

**动手前一次性确认：**
1) 本次是 guides、faqs 还是 downloads？
2) slug / 关联型号 / 目标语言？
3) 是否中英配对（或新语言目录）？
4) 下载资料文件是否已在 `public/downloads/`？
用户答齐再写；缺项不猜。

### 指南与 FAQ
1. 定 slug；默认语言建 `src/content/guides/<slug>.md` 或 `src/content/faqs/<slug>.md`，其他语言建 `zh/<slug>.md`（新增语言后为 `<lang>/<slug>.md`）。同一 slug 每种语言只能有一个文件。
2. 指南 frontmatter 写 `title`、`tldr`、`updated`、`relatedModels`、`relatedApplications`、`seoTitle`、`seoDescription`。
3. FAQ frontmatter 写 `question`、`cluster`（`selection` / `params` / `install` / `troubleshoot`）、`relatedModels`、`relatedFaqs`、`seoTitle`、`seoDescription`。
4. frontmatter 之后必须有正文；只填 frontmatter 会被判为空壳。
5. 关系字段只在默认语言文件声明；非默认文件的两个关联数组都为空时按 slug 回落默认语言，任一非空则以本语言为准（FAQ 要求 `relatedModels` 与 `relatedFaqs` 都为空才回落）。
6. `relatedFaqs` 写 slug（不带语言前缀），不得指向自身；其他引用写已发布条目 id。
7. 每个语言文件都要独立写 SEO 文案，按 `seo-copy` 自检；不要复制源语言句子。

### 下载资料
8. 新建 `src/content/downloads/<id>.json`，写 `title`、`docType`（`datasheet` / `manual` / `drawing` / `certificate`）、`version`、`updated`、`file`。
9. 可选 `model`（已发布型号 id）、`gated`、`locales.<lang>.title`（至少 4 字）。
10. `file` 放 `public/downloads/`，JSON 写 `/downloads/<file>`；文件缺失 validator 只警告，但 `tests/content.test.ts` 会失败。
11. 下载资料没有独立 SEO 字段；它只出现在 `/resources/downloads/`，`certificate` 类型还会出现在 `/certifications/`。

## 不变量
- guides/faqs 每个 slug 在每个语言下都必须有文件；缺一个就报错，不会拿源语言正文凑页面。
- 同一 slug 在同一语言下出现两个文件会报错（例如 `foo.md` 与 `en/foo.md`）。
- 正文为空报错。
- 所有引用必须是已发布条目；草稿引用会报错。
- 删除 FAQ 前先查其他 FAQ 的 `relatedFaqs`；删除指南/问答不会影响型号，但会影响反向链接页面。
- `downloads` 的 `updated` 可被 `z.coerce.date()` 解析；`locales.title` 至少 4 字。
- 常见失败：
  - `缺少中文版本，应新建 src/content/guides/zh/xxx.md`
  - `slug「xxx」在 zh 下出现两个文件`
  - `正文为空：frontmatter 之后必须有 Markdown 内容`

## 模板
指南（`src/content/guides/<slug>.md`）：
```md
---
title: "<指南标题>"
tldr: "<一两句结论>"
updated: 2026-09-15
relatedModels: ["a1", "a2"]
relatedApplications: ["constant-duty"]
seoTitle: "<按 seo-copy 规则撰写>"
seoDescription: "<按 seo-copy 规则撰写>"
---

<正文；至少一段，不能为空。>
```

FAQ（`src/content/faqs/<slug>.md`）：
```md
---
question: "<问题>"
cluster: selection
relatedModels: ["a1"]
relatedFaqs: ["other-faq-slug"]
seoTitle: "<按 seo-copy 规则撰写>"
seoDescription: "<按 seo-copy 规则撰写>"
---

<答案正文；至少一段，不能为空。>
```

下载资料（`src/content/downloads/<id>.json`）：
```json
{
  "draft": false,
  "title": "<资料标题>",
  "docType": "datasheet",
  "version": "2026.09",
  "updated": "2026-09-25",
  "model": "a1",
  "gated": false,
  "locales": { "zh": { "title": "<中文资料标题>" } },
  "file": "/downloads/a1-datasheet.pdf"
}
```
模板只展示结构；SEO 占位文本必须按 `seo-copy` 重写，`relatedModels` 等引用必须换成真实已发布 id。

**完成后报告：**
```text
改动：<文件/字段>
检查：<owner/镜像/§ 引用>
验证：<命令与结果>
遗留：<none 或下一步>
Docs: updated/no change — <文件/章节 或 理由>
```

## 验证
- `npm run validate`：配对、空正文、引用、译文无错误。
- `npm run test`：`tests/content.test.ts` 的 guides/faqs 配对与 downloads 文件检查通过。
- 开发态查看 `/resources/guides/`、`/resources/faq/`、`/resources/downloads/`、`/certifications/` 的两个语言版本。
- 点击下载链接确认文件可打开。
- 写后回读 frontmatter 与正文，确认文件路径与 slug 一致。

## 移交
- 新增语言目录：`add-locale`。
- 独立 SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
- 资料引用的型号：`content-model`。
