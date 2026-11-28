# B2B 工业品出口站

> 适用版本：Node 以 `.nvmrc` 为准 · Astro 7.x（见 `package.json`）

B2B 工业品出口品牌站。Astro 静态构建，静态产物托管在 Cloudflare Pages，交互数据存 Cloudflare D1 并由 Wrangler CLI 保存与读写；页面无运行期服务端，内容以文件形式随代码同仓。

**中英文双语**：英文在根路径（`/products/a1/`），中文在 `/zh` 前缀下（`/zh/products/a1/`）。
除分语言 404 由独立页面产出外，两种语言由同一个路由分发器 `src/pages/[...slug].astro` 按 `LOCALES` 产出：静态页载荷由 `src/lib/pages/static.ts` 按版式装配（文案在 `src/data/pages/entries/`，一页一文件），内容页载荷由 `src/lib/pages/render.ts` 按集合装配，导航由 `src/lib/nav.ts` 从页面条目派生。

- 想快速上手（怎么跑、改哪里、怎么排查）：[`docs/上手指南.md`](docs/上手指南.md)
- 想看设计取舍与编码约束：[`docs/开发框架设计.md`](docs/开发框架设计.md)

## 环境

Node 版本以 `.nvmrc` 为准（`package.json` 的 `engines` 同时约束 node 与 npm）。先 `nvm use`（或 fnm/volta）；版本不对时构建会报 `Node.js vXX is not supported by Astro`，那是环境问题，不是代码问题。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发，端口见终端输出 |
| `npm run validate` | 内容体检 |
| `npm run check` | TypeScript / Astro 类型检查 |
| `npm run test` | Vitest 单测（清单见 `tests/`） |
| `npm run build` | 类型检查 → 内容体检 → 构建 → 链接检查 |
| `npm run check:docs` | 文档对账（硬编码计数/版本、命令表、trailingSlash、多语言债） |
| `npm run check:layout` | 全站布局体检（含 404：空带 / 溢出 / 按钮几何；页数见 `dist/`），需先 `npm run build`；本地跑 1600 与 390 两个视口 |
| `npm run deploy` | 构建并部署到 Cloudflare Pages |

完整命令与“什么时候用”见 `docs/上手指南.md` §2.2 / `package.json`。

内容体检、分语言 404 复制与链接检查由 `scripts/build-guard.mjs` 挂在构建生命周期上，**直接执行 `astro build` 也无法绕过**，产出的 `dist/` 可直接上传。质量门与执行时机见 `docs/上手指南.md` §2.2；Pages Git 集成需完整 git 历史（逐页 `lastmod` 依赖 `git log`）。`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时，`site` 仍是 `example.com` 会构建失败。

## 目录

```
src/          页面、内容、组件、样式
public/       静态资产与 Pages 规则（_headers / _redirects）
scripts/      内容体检、链接检查、构建守卫
tests/        Vitest 单测
deploy/       Cloudflare Pages / D1 运维手册
.codebuddy/   AI 入口、规则与技能
```

> 完整目录树与每个文件职责见 `docs/开发框架设计.md` §3；此处只列顶层。
部署相关文件在 `src/` 之外：`wrangler.toml`（Pages 项目与 D1 绑定）、`deploy/cloudflare/README.md`（运维手册）、`public/_headers` / `public/_redirects`（路由规则）。测试池固定规则见 `vitest.config.ts` 的注释。

## 录入内容

型号、品类、应用、案例、资料存 JSON，指南与问答存 Markdown。参数型内容的译文写在 `locales.<lang>`；正文型内容按目录分语言（`foo.md` / `zh/foo.md`），缺文件即构建失败。`downloads` 无独立 SEO，只有可选 `locales.<lang>.title`。

所有集合支持 `draft`；草稿不路由、不进列表、不参与关联解析。`seoTitle` 只写本体，后缀由 `src/lib/seo/branding.ts` 单点拼接；`seoTitle` / `seoDescription` 由编辑撰写，程序只校验。

提交前校验的完整清单见 `docs/上手指南.md` §9 与 `scripts/validate-content.mjs`；这里只保留三条最容易踩的：

- 对比表列与型号 `keyParams` 不同名时，对应单元格渲染 `—`，构建不报错。
- 参数型译文整块缺失或必填字段缺失、正文型语言文件未配对：判错。
- `<img>` 必须有 `width` / `height` / `alt` / `loading`，图片路径必须存在。

## 上线前必须替换

占位资产（品牌标识、分享图、型号主图、公司信息、站名后缀）与部署配置
（域名及自定义域、Pages 项目名、D1 数据库 ID、D1 表、凭证）的完整清单见
[`deploy/cloudflare/README.md`](deploy/cloudflare/README.md) 第 7 节，这是唯一权威清单；
本文件不另存副本，避免改一处漏一处。

## 部署

静态产物托管在 **Cloudflare Pages**，不依赖 Node 运行。缓存头、404 直访与旧链接 301 由 `public/_headers` / `public/_redirects` 随产物发布；**交互数据存 Cloudflare D1，由运维用 Wrangler CLI 保存与读写**，站点代码不连库。

环境配置、D1 建表、部署、回滚与部署后 curl 清单见 [`deploy/cloudflare/README.md`](deploy/cloudflare/README.md)。**构建全绿不代表线上没问题，必须按清单实测。**

架构选型的完整论证见 [`docs/Astro-Cloudflare-Pages-D1-品牌站架构方案.html`](docs/Astro-Cloudflare-Pages-D1-品牌站架构方案.html)。
