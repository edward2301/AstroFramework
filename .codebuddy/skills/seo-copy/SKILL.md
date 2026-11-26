---
name: seo-copy
description: "撰写或返修 seoTitle、seoDescription 与页面级 meta 文案。当用户说「写 SEO 标题 / 描述超长 / 标题重复 / meta 文案 / title width / 标题太短」时使用；只处理文案规则与测量，不新增内容条目（用对应 content-*），不修构建错误（用 validate-fix）。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md` 与 `.codebuddy/rules/seo.md`。
> 2. 写入前列出将改路径；涉及 `src/content/` 或页面条目时先得到确认。
> 3. 只改目标文案，不顺手改内容结构。
> 4. 每次写入后立即回读，确认标题/描述字段没有被截断或重复。
> 5. 完成后只报改动与验证结果，不写长篇设计说明。

# SEO 文案（seoTitle / seoDescription）

## 目标与边界
- 负责内容条目、译文块、页面条目里的 `seoTitle` / `seoDescription`。
- 负责判断"标题为什么超宽/太短/被判重复"，并给出可落地的改法。
- 不负责新增型号/品类/案例/资源（去对应 `content-*`），不负责改校验脚本。

## 事实源
- 阈值：`src/data/site.ts` 的 `SEO_LIMITS`（当前值以文件为准，不在本技能复制）。
- 后缀：`src/lib/seo/branding.ts` 的 `applyTitleSuffix()`；站点名与分隔符在 `src/data/site.ts`。
- 测量：`src/lib/utils/text.ts` 的 `displayWidth()`（中文全角计 2，英文计 1）。
- 组装与抛错：`src/lib/seo/meta.ts` 的 `buildMeta()`。
- 机械质检：`src/lib/seo/copy.ts` 的 `findTitleIssues()` / `findDescriptionIssues()` / `hasPlaceholder()`。
- 构建期校验：`scripts/validate-content.mjs` 第 1 节与第 1.1 节。

## 步骤
1. 确认字段归属：内容条目顶层、`locales.<lang>` 译文块、还是页面条目 `seo.<locale>`。
2. 标题只写本体，不写品牌后缀；后缀由 `applyTitleSuffix()` 单点拼接。
3. 用 `displayWidth(applyTitleSuffix(title))` 量标题，必须落在 `SEO_LIMITS` 的标题区间。
4. 用 `displayWidth(description)` 量描述，必须落在 `SEO_LIMITS` 的描述区间。
5. 标题查全站唯一性：内容条目 + 译文标题 + 全部页面条目的 seo 共用一个表；页面条目的 draft 也会参与。
6. 过 `copy.ts` 的机械质检：
   - 标题不得以 `— quick` / `— 快速解答` 等填充桩结尾；
   - 不得以破折号或省略号结尾；
   - 不得有相邻段重复或前段尾部重复；
   - 描述不得有重复句；
   - 占位词只告警，不是错误，但发布前应清理。
7. 描述不需要全站唯一，但不要把同一句复制到多条；每条应写出该页的差异点。
8. 改完交回所属技能落盘（或直接改目标字段），再跑 `npm run validate`；页面级文案改动跑 `npm run build` 触发 `buildMeta()`。

## 不变量
- 后缀只能由 `branding.ts` 拼；内容里的 `seoTitle` 不带后缀。
- `SEO.astro` 收到的 `title` 必须是已含后缀的完整标题；不要在组件里再拼一次。
- 长度按显示宽度，不按字符数；中文全角计 2，实际以 `npm run validate` 的宽度报错为准。
- 标题唯一性是全站一张表；描述只查长度与重复句，不查全站唯一。
- 机械质检只判可机械判定的特征，不做语法推断；不要为了绕开规则写畸形句子。
- 常见失败：
  - `标题宽度 N，应在 <SEO_LIMITS 区间>：<标题>`（太短/太长，补真实参数，不要加虚词）
  - `标题与 ... 重复：<标题>`
  - `标题以破折号结尾，结构上必然是截断`
  - `描述宽度 N，应在 <SEO_LIMITS 区间>`

## 模板
修改前的自检清单（逐条打勾）：
```text
[ ] seoTitle 不含品牌后缀
[ ] displayWidth(applyTitleSuffix(seoTitle)) 在 SEO_LIMITS 标题区间
[ ] displayWidth(seoDescription) 在 SEO_LIMITS 描述区间
[ ] 标题未以 — quick / — 快速解答 / 破折号 / 省略号结尾
[ ] 标题没有相邻段或尾段重复
[ ] 描述没有重复句
[ ] 标题在内容 + 译文 + 页面 seo 的全站表中唯一
[ ] 描述写出了本页差异点，不是复制其他条目
```
没有本地测量工具时，直接跑 `npm run validate`，按报错里的宽度调整；不要凭感觉估。

## 验证
- `npm run validate`：SEO 相关错误清零。
- `npm run check`：改到页面条目/组件时运行。
- `npm run build`：页面级 meta 会经 `buildMeta()`，不合规直接抛错。
- `npm run test`：`tests/branding.test.ts`、`tests/copy.test.ts`、`tests/text.test.ts` 通过。
- 抽查产物 `<title>` 与 `<meta name="description">`，确认后缀只出现一次。

## 移交
- 新增/修改内容条目：对应 `content-model` / `content-category` / `content-application-case` / `content-resources`。
- 新增/修改页面条目：`page-entry`。
- 构建/校验报错：`validate-fix`。
- 改站点名或后缀：先改 `src/data/site.ts`，再全站复验（属于配置变更，先确认）。
