---
name: doc-sync
description: "每次代码、内容、配置、命令、规则、技能或目录结构变更后，判定并同步应更新的文档；无文档影响时也必须说明理由。当用户说「同步文档 / 更新文档 / 文档过时 / 文档和代码不一致 / 文档颗粒度 / doc sync / docs out of date」时使用。不写内容条目（用 content-*）、不写 SEO 文案（用 seo-copy）、不执行部署（用 deploy-ops），也不做全仓文档重构或去重。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、相关规则与目标文档，确认事实源。
> 2. 写入前列出将改文档与章节；涉及用户资产或大段重写时先确认。
> 3. 只改与本变更相关的 owner 层与镜像，不顺手重构其他文档。
> 4. 每次写入后立即回读，确认章节、表格与引用完整。
> 5. 完成后只报改动、验证结果与 `Docs:` 行。

# 文档同步（doc-sync）

## 目标与边界
- 负责每次变更后的文档归属判断、颗粒度选择、镜像同步与验证。
- 一次只处理一个逻辑变更；先分类，再决定改哪一层。
- 不写内容条目（去 `content-*`）、不写 SEO 文案（去 `seo-copy`）、不执行部署（去 `deploy-ops`）。
- 不做全仓文档去重或重构；只保证本次变更涉及的事实一致。

## 事实源
文档分层与颗粒度：

| 层 | 文件 | 颗粒度 |
|---|---|---|
| 索引/总览 | `README.md` | 一屏定位、命令、目录、部署入口；不写逐步操作 |
| 上手/操作 | `docs/上手指南.md` | 步骤、改哪里、报错→修法；不写设计论证 |
| 设计/取舍 | `docs/开发框架设计.md` | 为什么、约束、边界；schema/代码只放摘要并指向源码 |
| 运维手册 | `deploy/cloudflare/README.md` | 可复制命令、D1、烟测、占位清单 |
| Agent 入口 | `.codebuddy/CODEBUDDY.md` | 一段架构、命令表、规则与技能索引 |
| 约束卡 | `.codebuddy/rules/*.md` | 只写必须遵守的约束，不写步骤 |
| 流程卡 | `.codebuddy/skills/*/SKILL.md` | 触发、步骤、不变量、模板、验证、移交 |
| 局部原因 | 源码文件头/JSDoc | 只解释本文件“为什么”，不复述跨文件流程 |

单一事实源与允许的短回声：

| 事实 | 唯一 owner | 允许的短回声 |
|---|---|---|
| 命令/脚本 | `package.json` → `scripts` | README/CODEBUDDY 6 行菜单；指南 §2.2 完整表；部署 §3 部署序列 |
| 质量门 | 指南 §2.2 | 其他文档一句指针 |
| Node/npm | `.nvmrc` / `.node-version` / `package.json` 的 `engines` | 只写“以 `.nvmrc` / `engines` 为准”，不写数字 |
| 测试池 | `vitest.config.ts` | 指南 §9、部署 §3 一句指针 |
| SEO 阈值 | `src/data/site.ts` 的 `SEO_LIMITS` | 仅指南 §9 保留数值；其余读 `SEO_LIMITS` |
| 内容计数 | 无 owner，来自目录/`collections` | 只写名称/“见目录”，不写数字 |
| 对比表 | 设计 §5.1 + 脚本 §1.1/§4 | 各文档一句“对应单元格渲染 `—`” |
| 新语言 | `.codebuddy/skills/add-locale/SKILL.md` | 指南 §5.6 索引；architecture 一句指针 |
| 目录树 | 设计 §3 | README 5 行顶层树 |
| schema/必填译文 | `src/content.config.ts` + `REQUIRED_TRANSLATION` | 设计 §5.1 字段表；技能模板标“结构示例” |
| 校验规则 | `scripts/*.mjs` | 指南 §9 四关表；设计 §8.4 职责表 |
| 部署/D1/占位 | `deploy/cloudflare/README.md` | deploy-ops 检查表；README 指针 |
| 图片规格 | 设计 §7.5 + 脚本 §6 | 指南/技能一句“四属性 + 路径规则” |
| 设计令牌 | `tokens.css` / `global.css` | 设计 §8.2 分组；ui-component 指针 |

## 步骤
1. 分类变更：内容、页面/路由、版式、语言、命令、校验、UI、部署、依赖、技能/规则、纯重构。
2. 按下方矩阵找 owner；只改 owner 层对应颗粒度的内容。
3. `rg` 搜索镜像事实（命令、质量门、计数、阈值、测试池、新语言清单），要么全部更新，要么把副本改成指向 owner 的一句话。
4. 用 `grep -n '^## \|^### '` 核对被引用的 `§` 章节确实存在，且指向正确。
5. 验证：docs-only 跑 `git diff --check` 与引用检查；code/config 跑质量门；涉及命令/路由/部署时再跑 `npm run build`。
6. 在最终报告中写 `Docs:` 行；没有文档影响也要写理由。

### 变更类型 → 文档矩阵

| 变更 | 必须检查的文档 | 颗粒度 |
|---|---|---|
| 集合/字段/必填译文 | 设计 §5.1 字段表 + `content.config.ts`；指南 §5.3 一句 | 取舍 + 指针 |
| 静态页/条目/path/seo/nav | 指南 §6/§8、`page-entry`/`nav-footer` | 步骤 |
| 版式/Body/详情 kind | 设计 §3/§4、`layout-body`；指南 §3/§6 指向 | 取舍 + 步骤 |
| 新增语言 | `add-locale`；指南 §5.6 索引；architecture 一句 | 索引 + 指针 |
| 命令/构建步骤/质量门 | 指南 §2.2（完整表/质量门）；README/CODEBUDDY 6 行菜单；设计 §8.4 原因；部署 §3 序列 | owner + 短回声 |
| 校验规则/脚本节号 | `scripts/*.mjs`；指南 §9；设计 §8.4 职责表；`validate-fix` 报错表 | owner + 索引 |
| UI token/组件/断点 | `tokens.css`/`global.css`；`ui-component`；设计 §8.2 分组；指南 §6 | 取舍 + 步骤 |
| 部署/Cloudflare/D1 | 部署 README；README 部署节；`wrangler.toml`；`_headers`/`_redirects` | 运维命令 |
| 依赖/Node/Vitest | `package.json`/`engines`、`vitest.config.ts`；文档只写文件指针 | 指针，不写值 |
| 新技能/规则 | 新 `SKILL.md` / `rules/*.md`、CODEBUDDY 索引、相关技能“移交” | 流程 + 索引 |
| 纯重构/格式 | 通常无；报告 `Docs: no change — 原因` | 无 |
| 文档修正 | 目标文档 + 入站引用 + 章节号 | 按目标层 |

## 不变量
- 同一事实只有一个 owner；其他文档只放指针或一句安全警告，不复制整表/数值/代码。
- 不写数字计数；不写 SEO 阈值副本（仅指南 §9 一处人类回声）；不复制可执行代码。
- 对比表不匹配说“对应单元格渲染 `—`”，不说“空列”；引用校验器原始报错时保留原文。
- README 不写逐步操作；指南不写设计论证；设计文档不复制完整 schema/脚本。
- `§` 引用必须能对应到真实标题；改章节号时同步所有引用。
- 新增/修改技能或规则时，更新 `.codebuddy/CODEBUDDY.md` 的技能/规则索引。
- 文档修正不得改变代码行为；涉及 `public/`、`src/content/` 时先确认。
- 常见失败：
  - 只改 README，漏掉指南/设计/部署里的同一事实。
  - 把设计取舍写进上手指南，导致两套解释。
  - 写死组件数/用例数/集合数，或把 Node 版本、SEO 阈值复制到多处。
  - 引用 `§5.6` 但章节已改名。
  - 用“文档没问题”代替 `Docs:` 行。

## 模板
```text
Docs: updated — README.md（目录）、docs/上手指南.md §6、docs/开发框架设计.md §8.4
Docs: no change — 仅重命名内部变量，无行为、命令、schema 或流程变化
```
变更说明一行式：
```text
Docs: <updated|no change> — <文件/章节 或 理由>
```

## 验证
- docs-only：`git diff --check`；相对链接目标存在；`§` 引用可解析。
- grep 扫描：组件数/用例数/集合数等硬编码计数、过期字数/宽度示例、“空列”描述应为零（校验器的原始报错引用除外）；SEO 数值只允许指南 §9；质量门字符串只允许指南 §2.2。
- code/config：`npm run validate && npm run check && npm run test`；涉及命令/路由/部署时加 `npm run build`。
- 新技能：`find .codebuddy/skills -name SKILL.md | wc -l`，并用 `MSYS_NO_PATHCONV=1 codebuddy -p "/skills"` 确认列表。
- 写后回读每个被改文档，确认表格、代码块与引用没有断裂。

## 移交
- 内容录入：`content-model` / `content-category` / `content-application-case` / `content-resources`。
- SEO 文案：`seo-copy`。
- 页面/导航/版式：`page-entry` / `nav-footer` / `layout-body` / `ui-component`。
- 校验失败：`validate-fix`。
- 部署/D1：`deploy-ops`。
- 新增技能或规则：本技能负责更新 `CODEBUDDY.md` 索引。
