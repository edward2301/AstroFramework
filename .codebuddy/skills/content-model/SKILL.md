---
name: content-model
description: "新增、修改或删除工业品型号 JSON（code、keyParams、specGroups、图片与中文译文）。当用户说「加一个型号 / 新增型号 / 改型号参数 / 停产替代 / model spec」时使用；只处理型号数据本身，SEO 文案规则见 seo-copy，品类对比列定义见 content-category，报错诊断见 validate-fix。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/` 中与本任务相关的约束。
> 2. 写入前列出将改路径；涉及 `public/`、`src/content/` 时先得到确认。
> 3. 只做本任务的最小改动，不顺手重构其他文件。
> 4. 每次写入后立即回读，确认 JSON 结构完整、无重复键。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 型号内容（models）

## 目标与边界
- 负责 `src/content/models/<slug>.json` 的新增、修改、下线与删除。
- 型号页由 `src/pages/[...slug].astro` 自动产出，不写路由、不改分发器。
- 不定义品类对比列（去 `content-category`），不做独立 SEO 文案返修（去 `seo-copy`）。

## 事实源
- Schema：`src/content.config.ts` 的 `models`。
- 文件名规则：`src/lib/utils/text.ts` 的 `toSlug()`。
- 校验：`scripts/validate-content.mjs` 第 2 节（文件名/引用）与第 4 节（对比表列）。
- 参照样本：`src/content/models/a1.json`。
- 品类列：`src/content/categories/<category-id>.json` 的 `comparisonParams`。
- 渲染消费：`src/components/pages/ModelBody.astro`。

## 步骤
1. 读目标品类的 en 与 zh 两套 `comparisonParams`，再读 1–2 个同品类已发布型号。
2. 用 `toSlug(code)` 算文件名；新建 `src/content/models/<slug>.json`。条目 id 就是文件名。
3. 写必填字段：`code`、`name`、`category`、`status`、`keyParams`、`specGroups`、`seoTitle`、`seoDescription`。
4. `keyParams` 恰好 5 项；en 的 `k` 覆盖 en 品类列，zh 的 `k` 覆盖 zh 品类列。列多出来可以，键缺一个都不行。
5. `specGroups` 至少 1 组，每组 `rows` 至少 1 行。
6. 可选字段按需：`dimensions`、`interface`、`certifications`、`datasheet`、`image`。写图片前先列出路径并确认；路径形如 `/images/models/<slug>.png`，文件必须真实存在于 `public/`。
7. 补 `locales.zh` 必填：`name`、`keyParams`、`specGroups`、`seoTitle`、`seoDescription`。
8. 引用只写已发布条目 id，不写型号 code：`category`、`replacement`、`applications`、`relatedCases`。
9. 写 `seoTitle` / `seoDescription` 时按 `seo-copy` 的检查表自检：标题只写本体、补后缀后宽度 50–60、描述 140–158、全站标题不重复。
10. 跑 `npm run validate`；再跑 `npm run test`。开发态查看 `/products/<category>/<slug>/` 与 `/zh/products/<category>/<slug>/`。

## 不变量
- 文件名 = `toSlug(code)`；条目 id 与文件名一致。
- `keyParams` 恰好 5 项；中英键集合分别覆盖同语言品类列。
- 型号 `category` 用品类 id（文件名），不是品类显示名。
- 引用必须存在且已发布；`replacement` 不得指向自身；草稿条目不能被引用。
- `image` 可省略；一旦写了，文件必须存在，否则构建报错。
- `draft: true` 不生成路由、不进列表、不能被其他条目引用。
- 停产型号建议填 `replacement`；当前测试只断言它是数组，不是非空，不要把它当硬规则。
- 删除或改 draft 前，先查这些反向引用并更新：`applications.recommended`、`cases.config`、其他型号的 `replacement`、`downloads.model`、`guides.relatedModels`、`faqs.relatedModels`。
- 常见失败：
  - `型号编码 X 对应的 slug 为 y，与文件名 z 不一致`
  - `对比表列 ... 在 keyParams 中缺少同名键（品类：...）`
  - `category 引用 ... 不存在` / `缺少中文译文：...`

## 模板
```json
{
  "draft": false,
  "code": "A4",
  "name": "Pressure Sensor",
  "category": "category-a",
  "status": "active",
  "replacement": [],
  "keyParams": [
    { "k": "Range", "v": "0–40 MPa" },
    { "k": "Accuracy", "v": "±0.5% FS" },
    { "k": "Output", "v": "4–20 mA" },
    { "k": "Connection", "v": "G1/2" },
    { "k": "IP Rating", "v": "IP67" }
  ],
  "specGroups": [
    { "title": "General", "rows": [{ "k": "Housing", "v": "304 SS" }] }
  ],
  "dimensions": "Ø32 × 80 mm",
  "interface": "G1/2",
  "certifications": ["CE", "RoHS"],
  "image": "/images/models/a4.png",
  "applications": [],
  "relatedCases": [],
  "seoTitle": "<按 seo-copy 规则撰写>",
  "seoDescription": "<按 seo-copy 规则撰写>",
  "locales": {
    "zh": {
      "name": "<中文型号名>",
      "keyParams": [
        { "k": "<中文列 1>", "v": "<值>" },
        { "k": "<中文列 2>", "v": "<值>" },
        { "k": "<中文列 3>", "v": "<值>" },
        { "k": "<中文列 4>", "v": "<值>" },
        { "k": "<中文列 5>", "v": "<值>" }
      ],
      "specGroups": [
        { "title": "<中文分组>", "rows": [{ "k": "<键>", "v": "<值>" }] }
      ],
      "seoTitle": "<按 seo-copy 规则撰写>",
      "seoDescription": "<按 seo-copy 规则撰写>"
    }
  }
}
```
示例只展示结构；`seoTitle`/`seoDescription` 和中文键必须按实际品类与文案重写，不能照抄。

## 验证
- `npm run validate`：无错误；警告逐条判断。
- `npm run test`：`tests/content.test.ts` 通过。
- `npm run check`：只有改到 TS/组件时才需要。
- 开发态检查两个语言页面、品类页对比表无 `—` 空列。
- 写后回读 JSON，确认 5 项 keyParams、`locales.zh` 完整、无重复键。

## 移交
- 独立 SEO 文案返修：`seo-copy`。
- 品类列本身要改：`content-category`。
- 校验/构建报错：`validate-fix`。
- 新增语言：`add-locale`。
