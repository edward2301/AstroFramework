---
name: content-category
description: "新增、修改或删除品类与品类对比表（comparisonParams、intro、selectionPoints、purchaseInfo）。当用户说「加品类 / 改对比列 / 对比表空列 / 渲染 — / category intro」时使用；只改单个型号参数用 content-model，读校验报错用 validate-fix，独立 SEO 文案用 seo-copy。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/` 中与本任务相关的约束。
> 2. 写入前列出将改路径；涉及 `public/`、`src/content/` 时先得到确认。
> 3. 只做本任务的最小改动，不顺手重构其他文件。
> 4. 每次写入后立即回读，确认 JSON 结构完整、无重复键。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# 品类内容（categories）

## 目标与边界
- 负责 `src/content/categories/<id>.json` 的新增、修改、下线与删除。
- 品类页与产品总览由分发器和 `static.ts` 自动产出，不写路由。
- 不修改单个型号的参数键（去 `content-model`），不做独立 SEO 文案返修（去 `seo-copy`）。
- 对比表是本技能的最高风险点：列名与型号键名对不上时，构建不报错，页面整列渲染 `—`。

## 事实源
- Schema：`src/content.config.ts` 的 `categories`。
- 对比表映射：`src/lib/pages/render.ts` 的 `comparisonParams.map(... keyParams.find(...) ?? '—')`。
- 校验：`scripts/validate-content.mjs` 第 1.1 节（逐语言列覆盖）与第 4 节（默认语言列覆盖）。
- 参照样本：`src/content/categories/category-a.json`。
- 渲染消费：`src/components/pages/CategoryBody.astro`、`src/lib/pages/static.ts`。

## 步骤
1. 定小写 id 与文件 `src/content/categories/<id>.json`；引用方使用这个 id。
2. 写必填字段：`name`、`intro`、`comparisonParams`、`purchaseInfo`、`color`、`seoTitle`、`seoDescription`。
3. `intro` 至少 300 字；`comparisonParams` 5–7 项；`purchaseInfo` 写 `moq`、`leadTime`、`payment`，`certifications` 可选；`color` 为深色调 hex（`#rrggbb`，如 `#1f3a5f`），用于品类页与所属型号页的 PageHeader 底色——必须够深以保证 `--color-on-dark*` 浅字对比度，不要用亮色。
4. `order` 建议显式写且不重复（默认 100，只影响品类排序）。
5. 枚举该品类下**全部已发布型号**，逐列核对每个型号的 `keyParams.k`；新增品类时至少确认没有遗留型号。
6. 要改列名或删列时，先列出所有受影响型号，给出"改列还是改型号键"的方案并等确认；不得静默删列。
7. 补 `locales.zh`：`name`、`intro`（至少 150 字）、`comparisonParams`（必填）、`seoTitle`、`seoDescription`；`selectionPoints` 与 `purchaseInfo` 按需翻。
8. 写品类图前先列出路径并确认；母版 PNG 放 `assets-src/images/categories/`，跑 `npm run images:optimize` 得 `/images/categories/<id>.webp`；引用 webp 且文件必须存在于 `public/`。
9. 跑 `npm run validate`；开发态逐语言查看 `/products/<id>/` 与 `/zh/products/<id>/`。

## 不变量
- `comparisonParams` 5–7 项；`intro` 源语言 ≥300 字、译文 ≥150 字。
- 每个已发布型号的 `keyParams.k` 必须覆盖同语言品类列；缺少即构建报错。
- 品类列与型号键必须"同语言同时翻译"：只翻列名不翻键、或只翻键不翻列名，都会报错。
- 空品类只告警，但品类页对比表是空的；新增品类后尽快补型号或先不要发布。
- 删除品类前，先迁移或删除其全部型号，否则型号的 `category` 引用会报错。
- **改 `content.config.ts` 的 schema（新增/改必填字段，如 `color`）后，必须重启 dev 服务器**（必要时清 `.astro` 缓存）：运行中的 dev 拿着旧内容缓存，新 schema 校验旧缓存失败会把该集合判为空，表现为「首页品类区、产品中心菜单消失」，但 `npm run build` 产物正常——这是缓存问题，不是代码删了东西。
- 常见失败：
  - `对比表列 IP Rating 在 keyParams 中缺少同名键（品类：category-a）`
  - `品类 category-a 已提供中文对比列，但该型号没有中文 keyParams；对比表会整列空白`（实际对应单元格渲染 `—`）
  - `该型号已提供中文 keyParams，但品类 category-a 没有中文 comparisonParams`

## 模板
```json
{
  "draft": false,
  "name": "Pressure Sensors",
  "intro": "<300 字以上的品类介绍>",
  "image": "/images/categories/category-a.webp",
  "comparisonParams": ["Range", "Accuracy", "Output", "Connection", "IP Rating"],
  "selectionPoints": ["<选型要点>"],
  "purchaseInfo": {
    "moq": "<起订量>",
    "leadTime": "<交期>",
    "payment": "<付款方式>",
    "certifications": ["CE", "RoHS"]
  },
  "order": 10,
  "seoTitle": "<按 seo-copy 规则撰写>",
  "seoDescription": "<按 seo-copy 规则撰写>",
  "locales": {
    "zh": {
      "name": "<中文品类名>",
      "intro": "<150 字以上的中文介绍>",
      "comparisonParams": ["<量程>", "<精度>", "<输出>", "<接口>", "<防护等级>"],
      "selectionPoints": ["<中文选型要点>"],
      "purchaseInfo": {
        "moq": "<起订量>",
        "leadTime": "<交期>",
        "payment": "<付款方式>",
        "certifications": ["CE", "RoHS"]
      },
      "seoTitle": "<按 seo-copy 规则撰写>",
      "seoDescription": "<按 seo-copy 规则撰写>"
    }
  }
}
```
示例只展示结构；中文 `comparisonParams` 必须与同语言型号的 `keyParams.k` 逐项对齐。

**反例**：品类列写 `IP Rating`，型号 `keyParams` 写 `Protection` → 对应单元格渲染 `—`，构建不报错；改列前必须列出全部受影响型号。

**完成后报告：**
```text
改动：<文件/字段>
检查：<owner/镜像/§ 引用>
验证：<命令与结果>
遗留：<none 或下一步>
Docs: updated/no change — <文件/章节 或 理由>
```

**收尾**：报告后只给一个具体下一步（验证/提交/继续下一项），不泛泛问。

## 验证
- `npm run validate`：重点看对比表与译文完整度错误。
- `npm run test`：`tests/content.test.ts` 的品类列/封面检查通过。
- 开发态逐语言看品类页：对比表每一列都有值，不出现整列 `—`。
- 改列后回查该品类所有型号的 `keyParams`（en 与 zh 各一遍）。
- 写后回读 JSON，确认列数 5–7、`locales.zh` 完整。

## 移交
- 型号键或新型号：`content-model`。
- 独立 SEO 文案：`seo-copy`。
- 校验/构建报错：`validate-fix`。
- 新增语言：`add-locale`。
