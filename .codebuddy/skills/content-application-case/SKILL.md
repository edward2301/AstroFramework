---
name: content-application-case
description: "新增、修改或删除应用方向与客户案例（condition、recommended、config、background）。当用户说「加应用 / 应用场景 / 写案例 / case study / 选型案例 / recommended / config」时使用；指南、FAQ、下载资料用 content-resources，独立 SEO 文案用 seo-copy，报错诊断用 validate-fix。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/` 中与本任务相关的约束。
> 2. 写入前列出将改路径；涉及 `src/content/` 时先得到确认。
> 3. 只做本任务的最小改动，不顺手重构其他文件。
> 4. 每次写入后立即回读，确认 JSON 结构完整、无重复键。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 应用方向与客户案例（applications / cases）

## 目标与边界
- 负责 `src/content/applications/<id>.json` 与 `src/content/cases/<id>.json`。
- 详情页由 `src/pages/[...slug].astro` 自动产出：`/applications/<id>/`、`/case-studies/<id>/`。
- 不修改型号参数（去 `content-model`），不新增指南/FAQ/下载（去 `content-resources`）。

## 事实源
- Schema：`src/content.config.ts` 的 `applications` 与 `cases`。
- 路由：`src/data/routes.ts` 的 `detailPath.application` / `detailPath.caseStudy`。
- 校验：`scripts/validate-content.mjs` 第 1.1 节（译文）与第 3 节（引用）。
- 反向引用：`src/lib/content/relations.ts` 的 `getModelBacklinks()`。
- 渲染消费：`src/components/pages/ApplicationDetailBody.astro`、`CaseDetailBody.astro`。

## 步骤
1. 应用方向：新建 `src/content/applications/<id>.json`，写 `name`、`condition`、`criteria`（≥1）、`recommended`（2–5）、`cautions`、`seoTitle`、`seoDescription`。
2. 客户案例：新建 `src/content/cases/<id>.json`，写 `title`、`background`、`requirements`（≥1）、`selection`、`config`（≥1）、`results`、`date`、`seoTitle`、`seoDescription`。
3. `recommended` 与 `config` 只写已发布型号 id（文件名，如 `a1`），不写型号 `code`（如 `A1`）。
4. 补 `locales.zh` 必填：
   - 应用：`name`、`condition`、`criteria`、`seoTitle`、`seoDescription`。
   - 案例：`title`、`background`、`requirements`、`selection`、`seoTitle`、`seoDescription`。
   - `cautions`、`results` 可选；可选字段缺失时回落源语言。
5. SEO 字段按 `seo-copy` 的检查表自检：标题只写本体、宽度读 `SEO_LIMITS`、全站标题不重复。
6. 跑 `npm run validate`；开发态查看两个语言的详情页与列表卡片，确认型号链接可点。

## 不变量
- `recommended` 2–5 个；`config` 至少 1 个；`criteria`、`requirements` 至少 1 条。
- 所有引用必须是已发布条目；草稿引用会报错。
- 条目 id = 文件名；引用写 id，不写 code。
- 案例 `date` 可被 `z.coerce.date()` 解析；JSON 用 ISO 日期字符串。
- 应用按名称排序、案例按日期倒序；不需要手写排序字段。
- `draft: true` 不生成路由、不进列表、不能被引用。
- 删除/改 draft 前先查反向引用：
  - 应用：`models.applications`、`guides.relatedApplications`。
  - 案例：`models.relatedCases`。
- 常见失败：
  - `recommended 引用 ... 不存在`
  - `config 引用 ... 不存在`
  - `缺少中文译文：...` / `中文译文缺少字段 ...`

## 模板
应用方向：
```json
{
  "draft": false,
  "name": "High-Pressure Hydraulic Lines",
  "condition": "<工况与介质描述>",
  "criteria": ["<判据 1>", "<判据 2>"],
  "recommended": ["a1", "a2"],
  "cautions": ["<安装或选型注意事项>"],
  "seoTitle": "<按 seo-copy 规则撰写>",
  "seoDescription": "<按 seo-copy 规则撰写>",
  "locales": {
    "zh": {
      "name": "<中文应用名>",
      "condition": "<中文工况>",
      "criteria": ["<中文判据>"],
      "cautions": ["<中文注意事项>"],
      "seoTitle": "<按 seo-copy 规则撰写>",
      "seoDescription": "<按 seo-copy 规则撰写>"
    }
  }
}
```

客户案例：
```json
{
  "draft": false,
  "title": "<案例标题>",
  "background": "<客户背景与问题>",
  "requirements": ["<要求 1>", "<要求 2>"],
  "selection": "<选型思路>",
  "config": ["a1", "a2"],
  "results": ["<结果 1>", "<结果 2>"],
  "date": "2026-06-22",
  "seoTitle": "<按 seo-copy 规则撰写>",
  "seoDescription": "<按 seo-copy 规则撰写>",
  "locales": {
    "zh": {
      "title": "<中文案例标题>",
      "background": "<中文背景>",
      "requirements": ["<中文要求>"],
      "selection": "<中文选型思路>",
      "results": ["<中文结果>"],
      "seoTitle": "<按 seo-copy 规则撰写>",
      "seoDescription": "<按 seo-copy 规则撰写>"
    }
  }
}
```
模板只展示结构；不得照抄 SEO 占位文本，也不得把 `a1` 当真实引用（换成当前仓库存在的型号 id）。

## 验证
- `npm run validate`：引用与译文无错误。
- `npm run test`：`tests/content.test.ts` 的 recommended/config 引用检查通过。
- 开发态查看 `/applications/<id>/`、`/case-studies/<id>/` 及 `/zh/...`。
- 列表页卡片、详情页相关型号链接均可点。
- 写后回读 JSON，确认引用数组与译文块完整。

## 移交
- 型号字段或新型号：`content-model`。
- 指南/FAQ/下载：`content-resources`。
- 独立 SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
