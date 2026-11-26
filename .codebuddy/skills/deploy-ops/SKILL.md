---
name: deploy-ops
description: "发布 Cloudflare Pages、配置域名/CI、D1 运维与上线检查。当用户说「部署 / 上线 / wrangler / D1 备份 / 域名 / pages deploy / 回滚」时使用；构建内容错误先用 validate-fix，新增语言用 add-locale，页面/导航问题用 page-entry/nav-footer。"
---

> 工作协议：
> 1. 先读 `.codebuddy/CODEBUDDY.md`、`deploy/cloudflare/README.md` 与 `wrangler.toml`。
> 2. 任何外网部署、生产域名变更、远程 D1 写入前，先列出命令与影响并得到确认。
> 3. 只做被确认的发布/运维动作，不改内容与页面代码。
> 4. 每次远程写入前先备份；每次部署后按清单烟测。
> 5. 完成后只报命令、结果、回滚方式与遗留风险。

# 发布与 Cloudflare 运维

## 目标与边界
- 负责 Cloudflare Pages 发布、预览、回滚，域名/CI 配置，D1 初始化与数据读写。
- 负责上线前占位替换检查（`organization`、`site`、logo、OG 图、ICP）。
- 不负责修内容/构建错误（先 `validate-fix`），不负责改页面结构。

## 事实源
- 脚本：`package.json` 的 `build`、`deploy`、`validate`、`test`、`check-links`。
- 域名：`astro.config.mjs` 的 `site`（唯一来源）。
- Pages/D1：`wrangler.toml`、`deploy/cloudflare/README.md`。
- 路由与缓存：`public/_headers`、`public/_redirects`。
- 构建守卫：`scripts/build-guard.mjs`。
- 组织与占位：`src/data/organization.ts`、`src/data/site.ts`、`public/logo.png`、`public/og-default.png`。

## 步骤
1. 预检：Node 版本见 `.nvmrc`（`nvm use`）、完整 git 历史（sitemap `lastmod` 依赖）、`site` 不是 `example.com`（`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时会直接失败）。
2. 质量门：按指南 §2.2 执行。`npm run build` 只含 check + 构建守卫，不含 Vitest，别把 test 省掉。
3. 构建：`npm run build`；确认 `dist/` 有分语言 404、`sitemap-index.xml`、`robots.txt`。
4. 预览：`npx wrangler pages deploy --branch preview`，拿到独立预览 URL，不影响生产。
5. 生产：`npm run deploy`（= `npm run build && wrangler pages deploy`）。部署前确认当前分支与产物。
6. D1：先 `--local` 演练；远程写入前 `d1 export` 备份；再 `--remote` 执行。`<DB>` 为 `astro-framework-interactions`。
7. 烟测：按 `deploy/cloudflare/README.md` §5 的 curl 清单检查 404、301、尾斜杠、正常页与中文 404。
8. 回滚：Pages 在控制台/`wrangler pages deployment list` 回滚；D1 不会随 Pages 回滚，数据要单独恢复。

## 不变量
- 域名唯一来源是 `astro.config.mjs` 的 `site`；不要在组件或内容里再写一份域名。
- 站点是纯静态，页面代码不连 D1；D1 只由运维用 Wrangler CLI 读写。
- `wrangler.toml` 的 `database_id` 当前是全零占位；首次 `wrangler d1 create` 后必须回填真实 id。
- 远程 D1 写入前必须 `d1 export` 备份；`.sql` 文件不提交仓库。
- Pages 回滚不回滚 D1；数据恢复必须单独执行。
- `_headers`：`/_astro/*` immutable；404、sitemap、robots 用 `no-store`。`_redirects`：只写精确匹配 301，不写通配/SPA fallback。
- `CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时占位域名必失败；这是故意的上线闸门。
- sitemap 的逐页 `lastmod` 需要完整 git 历史；浅克隆会静默缺失。
- 任何生产部署与远程 D1 写入都要先得到用户确认。
- 常见失败：
  - `[seo] astro.config.mjs 未配置 site`：先配 `site`，再构建。
  - 不存在的路径返回 200：检查 `_redirects` 是否误加通配。
  - `/404.html` 返回 200：检查 `_redirects` 的直访 301 是否还在。
  - 中文 404 仍是英文：检查 `<prefix>/404.html` 是否被 build-guard 复制。
  - `wrangler.toml` 的 `database_id` 仍是全零：远程 D1 命令会失败；先 `d1 create` 回填。
  - 部署前未确认当前分支/产物：可能把未合并代码推上线。
  - token 出现在命令历史或日志：用 CI secret，不写进命令行。
  - 预览域名混入 canonical 或 sitemap：预览只用于验收，不写进内容。
  - `_headers` / `_redirects` 不在 `dist/`：先检查构建产物再上传。

## 模板
发布前检查清单：

- [ ] 预检：Node 见 `.nvmrc`、完整 git 历史、`site` 非 `example.com`
- [ ] 质量门按指南 §2.2
- [ ] `npm run build` 产物含分语言 404、sitemap、robots
- [ ] 预览/生产命令见 `deploy/cloudflare/README.md` §3
- [ ] D1 远程写入先 `d1 export`；命令见 §4
- [ ] 烟测 curl 清单见 §5

**反例**：只跑 `npm run build`（不含 Vitest）就发布 → 质量门缺口；必须补 `npm run test`。

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
- 构建成功，`dist/` 含分语言 404、sitemap-index、robots。
- 预览 URL 正常；生产 curl 清单全部符合预期。
- D1 查询返回预期；备份文件存在且未提交。
- 回滚路径已记录（Pages 部署列表 + D1 备份文件）。
- 写后回读 `wrangler.toml`、`_headers`、`_redirects`，确认没有被误改。

## 移交
- 构建/内容错误：`validate-fix`。
- 新增语言：`add-locale`。
- 页面/导航问题：`page-entry` / `nav-footer`。
- 上线占位替换：本技能内完成（organization、site、logo、OG、ICP）。
