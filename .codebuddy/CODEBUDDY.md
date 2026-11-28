# CODEBUDDY.md

> 适用版本：Node 以 `.nvmrc` 为准 · Astro 7.x（见 `package.json`）

B2B 工业品出口品牌站。Astro 7 静态构建，无运行期服务端。中英双语：英文在根路径，中文在 `/zh` 前缀下；除分语言 404 由独立页面产出外，两种语言由 `src/pages/[...slug].astro` 单路由分发器按 `LOCALES` 产出。载荷装配分两处：静态页由 `src/lib/pages/static.ts` 按 `PageDef` **版式**装配，文案在 `src/data/pages/entries/`（一页一文件）；内容页由 `src/lib/pages/render.ts` 按 `PageInput` **kind** 装配。导航由 `src/lib/nav.ts` 从页面条目的 `nav` 字段派生，渲染由 `src/components/pages/` 的 Body 组件承担。站点部署在 Cloudflare Pages（配置见 `wrangler.toml` 与 `deploy/cloudflare/README.md`），交互数据存 Cloudflare D1、由 Wrangler CLI 保存与读写，页面代码不连库；路由与缓存规则随产物走 `public/_headers` / `public/_redirects`。完整背景见 `README.md`、`docs/上手指南.md` 与 `docs/开发框架设计.md`。

## 环境

Node 版本以 `.nvmrc` 为准，`.node-version` 与 `package.json` 的 `engines` 同步约束。Astro 7 的硬性下限写在 `node_modules/astro/package.json` 的 `engines` 里，低版本构建会直接拒绝。Windows/PowerShell 下先 `nvm use`（或 fnm/volta）再构建。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发 |
| `npm run validate` | 内容体检 |
| `npm run check` | TypeScript / Astro 类型检查 |
| `npm run test` | Vitest 单测（清单见 `tests/`；测试池见 `vitest.config.ts`） |
| `npm run build` | 类型检查 → 内容体检 → 构建 → 链接检查 |
| `npm run check:docs` | 文档对账（计数/版本、命令表、trailingSlash、多语言债） |
| `npm run check:redirects` | 型号旧路径 301 校验（构建后） |
| `npm run check:layout` | 全站布局体检（需先 `npm run build`） |
| `npm run images:optimize` | 图片优化：PNG 母版 → WebP |
| `npm run deploy` | 构建并部署到 Cloudflare Pages |

完整命令与“什么时候用”见 `docs/上手指南.md` §2.2。

质量门与执行时机见 `docs/上手指南.md` §2.2；构建守卫挂在 `astro:build:start` / `astro:build:done`，直接 `astro build` 也绕不过。部署与 D1 见 `deploy/cloudflare/README.md`；`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时占位域名会构建失败。

## 技能索引

项目级技能在 `.codebuddy/skills/`，按任务族分组（`/skills` 查看触发描述）：

- 内容录入：`content-model` · `content-category` · `content-application-case` · `content-resources` · `seo-copy`
- 页面与组件：`page-entry` · `layout-body` · `nav-footer` · `ui-component` · `industrial-design`
- 质量与多语言：`validate-fix` · `add-locale`
- 运维：`deploy-ops`
- 文档同步：`doc-sync`

## 规则索引

详细规则按主题拆分在 `.codebuddy/rules/`，启动时自动加载（默认 `alwaysApply: true`）：

- `architecture.md` — 单向数据流、双语与 i18n、校验脚本、关键修改点速查
- `seo.md` — SEO 约束（本仓核心目标）
- `ai-collaboration.md` — AI 协作规则（用户明确要求，永久生效）
