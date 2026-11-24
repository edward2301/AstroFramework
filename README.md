# B2B 工业品出口站

> 适用版本：Node 24.14.1 · Astro 7.x（以 `.nvmrc` / `package.json` 为准）

B2B 工业品出口品牌站。Astro 静态构建，静态产物托管在 Cloudflare Pages，交互数据存 Cloudflare D1 并由 Wrangler CLI 保存与读写；页面无运行期服务端，内容以文件形式随代码同仓。

**中英文双语**：英文在根路径（`/products/category-a/a1/`），中文在 `/zh` 前缀下（`/zh/products/category-a/a1/`）。
除分语言 404 由独立页面产出外，两种语言由同一个路由分发器 `src/pages/[...slug].astro` 按 `LOCALES` 产出：静态页载荷由 `src/lib/pages/static.ts` 按版式装配（文案在 `src/data/pages/entries/`，一页一文件），内容页载荷由 `src/lib/pages/render.ts` 按集合装配，导航由 `src/lib/nav.ts` 从页面条目派生。

- 想快速上手（怎么跑、改哪里、怎么排查）：[`docs/上手指南.md`](docs/上手指南.md)
- 想看设计取舍与编码约束：[`docs/开发框架设计.md`](docs/开发框架设计.md)

## 环境

Node **24.14.1**。`.nvmrc` 与 `.node-version` 写精确版本，`package.json` 的 `engines.node` 为 `^24.14.1`（允许 24.x 内升级）。

Astro 7 的硬性下限是 22.23.4，低于此版本构建会直接拒绝执行。若 `node -v` 显示更低版本，先切换再构建 —— 这是环境问题，不是代码问题。

```sh
nvm use            # 或 fnm use / volta，均会读取 .nvmrc
```

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发，默认 4321 端口。IDE 环境下用 `astro dev --background` 启动，`astro dev stop / status / logs` 管理后台进程 |
| `npm run validate` | 单独执行内容体检，提交前自查用 |
| `npm run check` | `astro check`：TypeScript strict 与 Astro 文件类型检查 |
| `npm run test` | Vitest 单测：routing / branding / copy / content / nav / dict / text / check-links 共 8 组用例 |
| `npm run check-links` | 只检查 `dist/` 的站内链接与语言版本配对（需先构建） |
| `npm run build` | 先 `astro check`，再内容体检 → 生成页面 → 链接检查，任一错误即中止 |
| `npm run preview` | 预览构建产物 |
| `npm run deploy` | 构建并把 `dist/` 部署到 Cloudflare Pages（构建已含分语言 404 复制） |

内容体检、分语言 404 产物复制与链接检查由 `scripts/build-guard.mjs` 挂在
`astro:build:start` / `astro:build:done` 上，因此**直接执行 `astro build` 也无法绕过**，
`npm run build` 产出的 `dist/` 可直接上传 Cloudflare Pages。
质量门 = `npm run validate && npm run check && npm run test`；发布前再跑 `npm run build`
（类型检查与内容体检已随构建执行）。若走 Pages 的 Git 集成，构建命令同为 `npm run build`、
产物目录 `dist/`，并需使用完整 git 历史（逐页 `lastmod` 依赖 `git log`）。
`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时，`site` 仍是 `example.com` 会直接构建失败。

## 目录

```
src/
├── content/          内容源：models/categories/applications/cases/downloads 为 JSON，guides/faqs 为 Markdown
├── content.config.ts 7 个集合的 schema，约束写在这里
├── data/             站点常量、组织实体；pages/ 下是页面条目（一页一文件）
├── i18n/             语言表与路径映射（routing.ts）、通用界面文案（ui.ts）
├── lib/content/      仓储层：页面只经此取数，不直接调 getCollection；localize.ts 负责语言视图与回落
├── lib/pages/        载荷装配：static.ts 按版式装静态页，render.ts 按集合装内容页
├── lib/nav.ts        导航派生：读页面条目的 nav 字段，产出主导航与页脚
├── lib/seo/          元标签、品牌后缀（branding.ts）、JSON-LD、面包屑、文案质量（copy.ts）、逐页 lastmod
├── lib/utils/        text.ts（toSlug / truncate / displayWidth / charLength）与 mergeById.ts
├── components/
│   ├── pages/        页面主体：12 个 Body 组件，中英文共用同一份渲染结构
│   ├── seo/          SEO / JSON-LD / 面包屑
│   ├── cards/        品类与型号卡片
│   └── layout/       Header / Footer / PageHeader / Carousel / CtaBand / FeatureRow / MetricStrip
├── layouts/          BaseLayout（唯一骨架，含 hreflang 输出）
├── pages/            [...slug].astro 分发器 + 404.astro + [lang]/404.astro + robots.txt.ts
└── styles/           tokens.css（设计变量）与 global.css
```

> 完整目录树与每个文件职责见 `docs/开发框架设计.md` §3；此处只列主要目录。

仓库另有 `tests/`（Vitest 单测，`npm run test` 运行）。
与部署相关的文件在 `src/` 之外：`wrangler.toml`（Pages 项目与 D1 绑定）、
`deploy/cloudflare/README.md`（部署与运维手册）、`public/_headers` 与 `public/_redirects`
（随产物发布的路由规则）、`docs/Astro-Cloudflare-Pages-D1-品牌站架构方案.html`（选型论证）。

## 录入内容

型号、品类、应用、案例、资料存 JSON，指南与问答存 Markdown —— 前者字段密集，后者以长文为主。

**参数型内容（型号/品类/应用/案例）的译文写在条目的 `locales` 里，按语言键索引**（`z.partialRecord` + 导出的 4 个子 schema）。补充字段可缺省（缺失回落源语言），但 `REQUIRED_TRANSLATION` 列出的必填字段缺一即判错。
**正文型内容（指南/问答）按目录分语言**：`guides/install-checklist.md` 与 `guides/zh/install-checklist.md` 各写一份，缺任一种语言的同名文件即构建失败。
**资料（downloads）**无独立 `seoTitle` / `seoDescription`，只有内联的可选 `locales.<lang>.title`（覆盖列表标题，`/certifications/` 与 `/resources/downloads/` 均读取），缺省回落 `title`。

```json
{
  "name": "Pressure Sensors",
  "locales": {
    "zh": { "name": "压力变送器", "seoTitle": "...", "seoDescription": "..." }
  }
}
```

通用界面文案（按钮、表头、面包屑、页眉 CTA 与部分 h1）在 `src/i18n/ui.ts`；主导航/页脚链接标签与页面级 SEO 在页面条目的 `nav.label` / `seo`。

除 downloads 外，每条内容都必须自带 `seoTitle` 与 `seoDescription`，由编辑撰写，程序不代拼。
**`seoTitle` 只写标题本体，不要带品牌后缀**，后缀拼接的单点实现是 `src/lib/seo/branding.ts`，
运行时 `buildMeta()` 与内容校验脚本共用。

所有集合支持 `draft: true`：草稿不生成路由、不进入列表、不参与关联解析。
已发布条目引用草稿会在体检阶段报错。

提交前会校验：

- 标题（**含品牌后缀后**）50–60、描述 140–158（按显示宽度，全角字符计 2，故中文标题约 27 个汉字）
- 标题全站唯一（内容集合、中文译文与页面级文案共用同一份唯一性表）
- 标题/描述的重复填充与占位词（`src/lib/seo/copy.ts`）
- 型号编码经 `toSlug()` 后与文件名一致
- 引用指向的条目存在（含指南与问答的 `related*` 字段）
- 品类对比表的列，在每个型号的参数里都有同名键（英文与中文分别校验）
- 参数型译文整块缺失或必填字段缺失、正文型语言文件未配对：判错
- 页面路径格式与唯一性、导航 `order` 冲突、`<img>` 四个必填属性、图片路径存在性
- 产物中不存在未登记的站内断链
- 每个页面在中英文两侧都有对应版本（含两份 404）

**对比表那条最容易踩**：品类声明 `IP Rating` 列、型号写 `Protection`，对比表会渲染出整列空白，且构建不报错。`npm run validate` 能拦住它。

## 上线前必须替换

占位资产（品牌标识、分享图、型号主图、公司信息、站名后缀）与部署配置
（域名及自定义域、Pages 项目名、D1 数据库 ID、D1 表、凭证）的完整清单见
[`deploy/cloudflare/README.md`](deploy/cloudflare/README.md) 第 7 节，这是唯一权威清单；
本文件不另存副本，避免改一处漏一处。

## 部署

静态产物是纯文件，托管在 **Cloudflare Pages**，不依赖 Node 运行。缓存头、404 直访与旧链接 301
由 `public/_headers` / `public/_redirects` 随产物发布；**交互数据存 Cloudflare D1，
由运维用 Wrangler CLI 保存与读写**，站点代码不连库。

**环境配置、D1 建表、部署与验证步骤见 [`deploy/cloudflare/README.md`](deploy/cloudflare/README.md)**，
里面有 5 条 `curl` 命令，逐条核对状态码。其中最关键的三条：

| 检查 | 期望 | 配错的后果 |
|---|---|---|
| 访问不存在的路径 | `404` | 返回 200 会让每个错误 URL 都变成首页副本，被大量收录 |
| 访问 `/404.html` | `301` | 返回 200 说明该页会被当成正常页收录 |
| 访问缺尾斜杠的目录 | `3xx`（Pages 自动补齐） | 返回 404 是白丢流量；直接返回内容则产生两个 URL |

这三项取决于 Pages 的配置文件与产物结构。**构建全绿不代表线上没问题，必须按清单实测。**

架构选型的完整论证见 [`docs/Astro-Cloudflare-Pages-D1-品牌站架构方案.html`](docs/Astro-Cloudflare-Pages-D1-品牌站架构方案.html)。


