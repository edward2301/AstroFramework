# CODEBUDDY.md

> 适用版本：Node 24.14.1 · Astro 7.x（以 `.nvmrc` / `package.json` 为准）

B2B 工业品出口品牌站。Astro 7 静态构建，无运行期服务端。中英双语：英文在根路径，中文在 `/zh` 前缀下；除分语言 404 由独立页面产出外，两种语言由 `src/pages/[...slug].astro` 单路由分发器按 `LOCALES` 产出。载荷装配分两处：静态页（6 种版式 `home` / `products` / `about` / `quote` / `section` / `notFound`）由 `src/lib/pages/static.ts` 按**版式**装配，文案在 `src/data/pages/entries/`（一页一文件）；内容页（品类/型号/应用/案例/指南/问答 6 个 kind）由 `src/lib/pages/render.ts` 按**集合**装配。导航由 `src/lib/nav.ts` 从页面条目的 `nav` 字段派生，渲染由 `src/components/pages/` 的 12 个 Body 组件承担。站点部署在 Cloudflare Pages（配置见 `wrangler.toml` 与 `deploy/cloudflare/README.md`），交互数据存 Cloudflare D1、由 Wrangler CLI 保存与读写，页面代码不连库；路由与缓存规则随产物走 `public/_headers` / `public/_redirects`。完整背景见 `README.md`、`docs/上手指南.md` 与 `docs/开发框架设计.md`。

## 环境

Node **24.14.1**：`.nvmrc` / `.node-version` 为精确版本，`package.json` 的 `engines.node` 为 `^24.14.1`。Astro 7 硬性下限 22.23.4，低版本构建直接拒绝。Windows/PowerShell 下先 `nvm use`（或 fnm/volta）再构建。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发，端口 4321。IDE 环境下用 `astro dev --background` 启动，`astro dev stop / status / logs` 管理后台进程 |
| `npm run validate` | 内容体检：SEO 标题长度/唯一性、编码与文件名一致、引用完整性、对比表参数键、缺译判错、文案质量、`<img>` 必填属性。改内容后、提交前必跑 |
| `npm run check` | `astro check`：TypeScript strict + Astro 类型检查 |
| `npm run test` | Vitest 单测：routing / branding / copy / content / nav / dict / text / check-links 共 8 组用例 |
| `npm run build` | 先 `npm run check`，再内容体检 → 生成页面 → 站内链接检查，任一错误中止 |
| `npm run check-links` | 单独检查 `dist/` 站内链接与语言版本配对（需先构建） |
| `npm run preview` | 预览构建产物 |
| `npm run deploy` | 构建并把 `dist/` 部署到 Cloudflare Pages |

质量门 = `npm run validate && npm run check && npm run test`（Vitest，测试在 `tests/`）；发布前再跑 `npm run build`。守卫脚本挂在 `astro:build:start` / `astro:build:done`（`scripts/build-guard.mjs`）：前者内容体检，后者按 `LOCALES` 复制分语言 404 产物并检查内链，直接 `astro build` 也绕不过，产出的 `dist/` 可直接上传。Cloudflare Pages 用 `npm run build` 作构建命令、`dist/` 作产物目录，每次部署都跑同一套校验；`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时，`site` 仍为 example.com 会构建失败。交互数据由运维用 `wrangler d1 execute` / `d1 export` 读写与备份，见 `deploy/cloudflare/README.md`。

## 规则索引

详细规则按主题拆分在 `.codebuddy/rules/`，启动时自动加载（默认 `alwaysApply: true`）：

- `architecture.md` — 单向数据流、双语与 i18n、校验脚本、关键修改点速查
- `seo.md` — SEO 约束（本仓核心目标）
- `ai-collaboration.md` — AI 协作规则（用户明确要求，永久生效）
