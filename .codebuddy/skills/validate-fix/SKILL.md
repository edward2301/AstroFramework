---
name: validate-fix
description: "解读并修复 npm run validate、build、check-links 的失败。当用户说「校验失败 / 构建报错 / 断链 / 缺译 / validate error / 构建不过」时使用；内容改写回到对应 content-*，SEO 文案回 seo-copy，不得通过删校验或滥用例外绕过。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`docs/上手指南.md` §10 与相关规则。
> 2. 先复现，再只读第一条错误；不要一次改全部。
> 3. 只做最小修复，不顺手重构；不编辑 `dist/`。
> 4. 每次修复后重跑同一命令，并回读被改文件。
> 5. 报告必须含命令、错误、修复文件、复验结果。

# 校验与构建失败诊断

## 目标与边界
- 负责把 `npm run validate`、`npm run build`、`npm run check-links` 的失败定位到责任技能与文件。
- 负责最小的内容/配置修复与复验。
- 不负责大规模内容改写（去对应 `content-*`），不负责重新设计校验规则（先提方案）。

## 事实源
- 内容体检：`scripts/validate-content.mjs`（错误 exit 1，警告不阻断）。
- 构建守卫：`scripts/build-guard.mjs`（`astro:build:start` 跑内容体检，`astro:build:done` 跑链接检查）。
- 链接检查：`scripts/check-links.mjs`（`PENDING_ROUTES`、`SINGLE_LOCALE_PAGES`）。
- 命令：`package.json` 的 `validate`、`check`、`test`、`build`、`check-links`。
- 排查手册：`docs/上手指南.md` §10。

## 步骤
1. 原样复现失败命令，记录完整命令与第一条错误；不要先猜。
2. 判断失败阶段：内容体检、TypeScript、Vitest、链接检查、域名守卫。
3. 按下方路由表定位责任技能与文件。
4. 做最小修复；一次只改一个变量。
5. 重跑同一命令；通过后再跑 `npm run validate && npm run check && npm run test`。
6. 若判断是规则本身不合理，单独提出脚本改动方案与测试，不静默改校验器。

### 错误路由表

| 错误 / 现象 | 去这里 |
|---|---|
| `Node.js vX is not supported by Astro` | `nvm use`（版本见 `.nvmrc`），不是代码问题 |
| `标题宽度 ... 应在 <SEO_LIMITS 区间>` / `标题与 ... 重复` / 填充桩 | `seo-copy` |
| `对比表列 ... 在 keyParams 中缺少同名键` | `content-category` + `content-model` |
| `缺少中文译文` / `译文缺少字段` | 对应 `content-*`；新语言用 `add-locale` |
| `缺少中文版本，应新建 .../zh/xxx.md` / 正文为空 | `content-resources` |
| `型号编码 ... 与文件名 ... 不一致` | `content-model` |
| `category / replacement / recommended / config 引用 ... 不存在` | 对应 `content-*` |
| `image ... 在 public/ 下不存在` | `content-model` / `content-category` |
| `<img> 缺少 width, height, alt, loading` | `ui-component` / `layout-body` |
| `路径 ... 格式不合法` / `order ... 重复` | `page-entry` / `nav-footer` |
| `[链接检查] 站内链接目标不存在` | 修链接；仅计划内页面才登记 `PENDING_ROUTES` |
| `[链接检查] 缺少语言版本` | 补页面/译文；仅确属单语言才登记 `SINGLE_LOCALE_PAGES` |
| `[seo] astro.config.mjs 未配置 site` / 域名守卫 | `deploy-ops`（改 `astro.config.mjs` 的 `site`） |
| TypeScript 报错（props/联合类型） | 改代码的 `layout-body` / `ui-component` / `page-entry` |

## 不变量
- 不编辑 `dist/`；链接检查读产物，修的是源文件，修完重新构建。
- 不删除、不弱化校验规则；规则缺陷先提方案。
- 警告不阻断构建；不要为了消警告改坏内容，逐条判断是否真实缺陷。
- `PENDING_ROUTES` 只用于已确认的计划内页面，并注明何时移除；它不是掩盖错链的免死金牌。
- `SINGLE_LOCALE_PAGES` 只用于确属单语言的页面；不能拿来跳过翻译。
- 一次只改一个变量；不要把 SEO、内容、导航混在一次修复里。
- 常见失败：
  - 只改 `dist/` 里的 HTML：下次构建被覆盖，问题仍在。
  - 把错链登记进 `PENDING_ROUTES`：构建绿了，线上仍 404。
  - 为消 `image` 警告删掉图片字段：页面少图，问题没解决。

## 模板
复验命令见指南 §2.2；涉及产物链接时加 `npm run build` / `npm run check-links`。

报告格式：
```text
命令：npm run validate
第一条错误：<原文>
责任技能：<skill>
修复文件：<path>
复验：npm run validate（通过）/ npm run check && npm run test（通过）
```

## 验证
- 原失败命令通过。
- 全量质量门（见指南 §2.2）通过。
- 涉及产物链接时，`npm run build` 与 `npm run check-links` 通过。
- `git diff --stat` 只包含预期文件；没有 `dist/` 改动。
- 写后回读被改文件，确认没有引入重复键、缺语言或断链。

## 移交
- 内容数据：`content-model` / `content-category` / `content-application-case` / `content-resources`。
- SEO 文案：`seo-copy`。
- 页面/导航：`page-entry` / `nav-footer`。
- 语言接入：`add-locale`。
- 发布/域名：`deploy-ops`。
