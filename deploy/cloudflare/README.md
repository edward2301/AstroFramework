# Cloudflare Pages 部署与运维说明

本站托管在 **Cloudflare Pages**：构建产物 `dist/` 是纯静态文件，由 Pages 在全球边缘分发。
**交互数据存放在 Cloudflare D1，统一用 Wrangler CLI 保存与读写。**

职责边界先说清楚，避免误判：

| 层 | 由谁负责 | 说明 |
|---|---|---|
| 页面与内容 | Astro 静态构建 → `dist/` | 无运行期服务端，不接数据库；`npm run build` 后即可部署 |
| 托管、HTTPS、CDN、回滚 | Cloudflare Pages | 自动证书、预览部署、按部署版本回滚，无需管理服务器 |
| 路由规则 | `public/_headers` / `public/_redirects` | 缓存头、404 直访、旧链接 301，随产物一起上传；型号旧路径 301 由构建期追加到 `dist/_redirects`，尾斜杠由 Pages 默认补齐 |
| 交互数据 | Cloudflare D1 + Wrangler CLI | 询盘与运营记录由运维用 `wrangler d1` 写入、查询、导出 |

> 询价页 `src/components/pages/QuoteBody.astro` 仍是纯前端 `mailto:` 表单，**不会自动写入 D1**。
> D1 里的数据由运维通过 Wrangler 录入或批量导入，站点代码不连库——这是当前选定的方案，
> 不引入 adapter、不引入运行期端点。

---

## 1. 环境配置

### 1.1 本地

- Node 版本以 `.nvmrc` 为准：先 `nvm use`（或 fnm / volta）；低于 Astro 7 的 `engines` 下限会直接拒绝构建。
- `npm ci` 安装依赖，`wrangler` 已在 `devDependencies`，无需全局安装。
- 登录 Cloudflare：

```sh
npx wrangler login
```

CI 环境改用环境变量，不要写进仓库（`.env` 已在 `.gitignore` 中）：

| 变量 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 具备「Cloudflare Pages: Edit」「D1: Edit」权限的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 账户 ID，`wrangler whoami` 可查 |

### 1.2 `wrangler.toml`

| 字段 | 值 | 上线前 |
|---|---|---|
| `name` | `astro-framework` | 改成 Pages 控制台里的项目名 |
| `pages_build_output_dir` | `dist` | 不要改，Pages 从这里取产物 |
| `compatibility_date` | `2025-01-01` | 一般不动 |
| `[[d1_databases]].database_name` | `astro-framework-interactions` | 与第 2 步创建的库名一致 |
| `[[d1_databases]].database_id` | 全零占位 | **必须回填**第 2 步 `d1 create` 输出的真实 ID |

`binding = "DB"` 供日后接入 Pages Functions 时用；当前静态产物不读它。

### 1.3 创建 Pages 项目

**统一发布方式**：本地执行 `npm run deploy`，由 Wrangler 把 `dist/` 直接上传到 Pages
（首次执行会按 `wrangler.toml` 的 `name` 创建项目）。

如需改用控制台的 Git 集成自动构建，配置：

| 配置项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 与 `.nvmrc` 一致（或设置 `NODE_VERSION` 为同一版本） |
| Root directory | `/` |

直传与 Git 集成跑的是同一个 `npm run build`，因此内容体检、链接检查与分语言 404 产物
（`scripts/build-guard.mjs` 挂在 `astro:build:start` / `astro:build:done`）在云端同样生效，
`dist/` 无需额外步骤即可上传。

**Git 集成的环境前提**：`src/lib/seo/lastmod.ts` 用 `git log` 取逐页 `lastmod`。
若构建环境是浅克隆，需在 Pages 构建配置里关闭浅克隆（或使用完整历史），
否则 `lastmod` 会按设计静默省略——不会报错，但 sitemap 会缺少时间字段。

---

## 2. 首次初始化 D1

```sh
npx wrangler d1 create astro-framework-interactions
```

把输出里的 `database_id` 回填到 `wrangler.toml`，然后建表：

```sh
npx wrangler d1 execute astro-framework-interactions --remote --command "CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')), locale TEXT NOT NULL DEFAULT 'en', model TEXT, qty TEXT, conditions TEXT, company TEXT, contact_name TEXT, email TEXT, notes TEXT, source TEXT NOT NULL DEFAULT 'wrangler', status TEXT NOT NULL DEFAULT 'new'); CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at); CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);"
```

**字段映射**（运维录入时按这张表对应，表单字段名与列名不完全同名）：

| 询价表单 `name` | D1 列 | 说明 |
|---|---|---|
| `model` | `model` | 型号编码 |
| `qty` | `qty` | 数量 |
| `conditions` | `conditions` | 工况/交期等条件 |
| `company` | `company` | 公司名 |
| `name` | `contact_name` | 联系人，列名避免与站内其它「名称」混淆 |
| `email` | `email` | 邮箱 |
| `notes` | `notes` | 备注 |

`locale` 由运维按询盘语言填写；`id` / `created_at` / `source` / `status` 由默认值填充，不从表单取。

本地演练加 `--local`（数据落在 `.wrangler/`，已忽略），去掉 `--local` 且带 `--remote` 才是操作线上库：

```sh
npx wrangler d1 execute astro-framework-interactions --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 3. 部署流程

```sh
nvm use
npm ci
npm run test        # 单测（固定 vmForks，见 vitest.config.ts）；check / validate / 链接检查已随 npm run build 执行
npm run deploy      # 构建 → wrangler pages deploy
```

`npm run deploy` 展开为：

```sh
npm run build
wrangler pages deploy
```

质量门与执行时机见 `docs/上手指南.md` §2.2；发布时不必重复跑：`npm run build` 内的构建守卫已执行内容体检与链接检查。

`npm run build` 本身已包含**分语言 404 产物的复制**：构建守卫
（`scripts/build-guard.mjs` 的 `astro:build:done`）按 `LOCALES` 把
`dist/<前缀>/404/index.html` 复制成 `dist/<前缀>/404.html`，
供 Pages 按路径前缀就近查找。因此无论本地部署还是云端 Git 构建，
`dist/` 都是可直接上传的完整产物，无需额外钩子或手工步骤；
新增语言时这里也无需改动。详见第 6 节。

首次上线前先把 `astro.config.mjs` 的 `site` 换成真实域名并绑定自定义域；
`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时，仍是 `example.com` 会直接构建失败。

### 预览与回滚

```sh
npx wrangler pages deploy --branch preview     # 生成独立预览 URL，不影响生产
npx wrangler pages deployment list            # 列出历史部署
```

每次部署是 Pages 的一个不可变版本，控制台可一键回滚；回滚只影响静态产物，D1 数据不受影响。

---

## 4. 交互数据的保存与读写

全部通过 Wrangler CLI，`<DB>` = `astro-framework-interactions`。

### 写入（保存）

```sh
npx wrangler d1 execute <DB> --remote --command "INSERT INTO inquiries (locale, model, qty, conditions, company, contact_name, email, notes) VALUES ('en','a1','200','FOB Shanghai','ACME','J. Smith','buyer@example.com','Need quote for Q3');"
```

批量导入时把语句写成 `.sql` 文件，用 `--file` 代替 `--command`：

```sh
npx wrangler d1 execute <DB> --remote --file=./inquiries-batch.sql
```

### 读取（查询）

```sh
npx wrangler d1 execute <DB> --remote --command "SELECT id, created_at, model, company, status FROM inquiries ORDER BY created_at DESC LIMIT 20;"
npx wrangler d1 execute <DB> --remote --command "SELECT * FROM inquiries WHERE status='new' AND created_at >= '2026-01-01';"
```

加 `--json` 可把结果交给脚本处理。

### 更新状态 / 导出备份

```sh
npx wrangler d1 execute <DB> --remote --command "UPDATE inquiries SET status='replied' WHERE id=12;"
npx wrangler d1 export <DB> --remote --output=./backup-inquiries.sql
```

导出的 `.sql` 是客户数据，**不要提交进仓库**（`.gitignore` 已忽略 `*.sql`）；恢复用
`wrangler d1 execute <DB> --remote --file=./backup-inquiries.sql`。
建议按固定周期导出并另存到受控位置。

### 数据与 schema 回滚

Pages 的部署回滚只影响静态产物，**不会回滚 D1 数据**。建表语句已写在本文件第 2 节，
随仓库版本化；若日后改表结构，把变更写成新的 `CREATE` / `ALTER` 语句一并提交。
需要回退数据时，用最近的 `d1 export` 备份文件按上面的 `--file` 命令恢复，
并在操作前先导出一次当前状态。

---

## 5. 部署后验证

Pages 自动签发并续期证书，直接请求即可：

```sh
# ① 不存在的路径必须是 404，不能是 200
curl -sI https://你的域名/this-does-not-exist/ | head -1

# ② 404 产物不能直访（应被 _redirects 301 到首页）
curl -sI https://你的域名/404.html | head -1

# ③ 漏尾斜杠必须被 3xx 补齐（不能是 200 或 404）
curl -sI https://你的域名/products/category-a | head -3

# ④ 正常页面 200
curl -sI https://你的域名/products/category-a/ | head -1

# ⑤ 中文路径的 404 必须是中文页
curl -s https://你的域名/zh/this-does-not-exist/ | grep -o '<html lang="[^"]*"'
# 期望 zh-CN；返回 en 说明 dist/zh/404.html 没有生成

# ⑥ 型号旧路径 301 实际跳转（en/zh、带/不带斜杠；条数见 dist/_redirects）
node scripts/check-redirects.mjs --base https://你的域名
# 期望：规则数与实际跳转数一致；每条 301 → 200 → canonical 为扁平路径
```

① 返回 200 最严重：说明误配了通配 200 rewrite 或 SPA fallback，全站每个错误网址都会变成首页副本。
`public/_redirects` 里**不要**写 `/* /index.html 200` 之类的兜底规则。

② 的 301 只作用于对 `/404.html` 的**直接请求**；Pages 内部渲染 404 时读取
`404.html` 不经过 `_redirects`，二者互不干扰（本地 `wrangler pages dev` 实测：
不存在路径返回 404，`/404.html` 返回 301）。不要为了排查 ① 而删掉这几条直访规则。

---

## 6. 路由规则：`_headers` 与 `_redirects`

两份文件随产物上传，与页面同版本发布、可回滚：

| 规则 | 位置 | 作用 |
|---|---|---|
| 404 产物 `no-store` | `public/_headers` | 404 页禁止被边缘缓存固化；共 3 条路径：`/404.html`、`/zh/404.html`、`/zh/404/index.html` |
| 404 产物直访 301 | `public/_redirects` | 同样 3 条，避免错误页被当成正常页收录 |
| 尾斜杠补齐 | Cloudflare Pages 自动处理 | 目录式产物（`/x/index.html`）由 Pages 默认的 `auto-trailing-slash` 补齐，不要写通配 rewrite 覆盖 |
| `_astro/` 长缓存 | `public/_headers` | 文件名带 hash，可缓存一年 |
| sitemap 与 robots 不缓存 | `public/_headers` | 新页面能被及时发现 |
| 旧链接 301 | `public/_redirects` + 构建期生成 | 手工规则用精确路径匹配，不写正则；型号旧路径 `/products/<品类>/<型号>/` 由 `scripts/model-redirects.mjs` 在 `build:done` 追加到 `dist/_redirects`（含 `/zh` 与不带斜杠形式），源文件不重复维护 |

`_astro/` 只写 `Cache-Control`、不叠加 `expires`；同一路径被两条规则匹配时响应头会被合并
（如 `no-store, no-store`），所以 sitemap 只写通配 `/sitemap-*.xml` 一条，不再单列
`/sitemap-index.xml`。HTML 页面沿用 Pages 默认缓存，不额外配置规则。

### 分语言 404

| 请求路径 | Pages 使用 | 来源 |
|---|---|---|
| `/zh/...` 的无效路径 | `dist/zh/404.html` | `src/pages/[lang]/404.astro` 产出 `dist/zh/404/index.html`，构建守卫复制为 `404.html` |
| 其他无效路径 | `dist/404.html` | `src/pages/404.astro`（Pages 根目录 404 约定） |

**新增语言时**不需要建页面文件，也不需要改构建脚本：`[lang]/404.astro` 的 `getStaticPaths`
按 `routing.ts` 的 `LOCALES` 自动产出该语言的 404，`build-guard.mjs` 同步按 `LOCALES` 复制。
只需给两份规则文件各补 2 条（`<新前缀>/404.html` 与 `<新前缀>/404/index.html`）：

1. `public/_headers`：两条 `no-store`；
2. `public/_redirects`：两条直访 301（分别指向 `<新前缀>/`）。

`dist/zh/404.html` 由 `npm run build` 生成，仓库快照与 `src/` 里不存在该文件。

---

## 7. 上线前必须替换（全仓唯一权威清单）

`README.md`、`docs/上手指南.md` 与架构方案 HTML 都指向本节，不另存副本。

| 项 | 位置 | 说明 |
|---|---|---|
| 域名 | `astro.config.mjs` 的 `site` | 唯一来源，canonical / sitemap / robots 全从它推导 |
| 域名绑定 | Cloudflare Pages 自定义域 | 与 `site` 保持一致 |
| Pages 项目名 | `wrangler.toml` 的 `name` | 与控制台项目名一致 |
| D1 数据库 ID | `wrangler.toml` 的 `database_id` | `d1 create` 输出的真实值，当前为全零占位 |
| D1 表 | 第 2 节建表语句 | 上线前在线上库执行一次 |
| 品牌标识 | `public/logo.png` | 当前为占位图 |
| 分享图 | `public/og-default.png` | 占位图，1200×630 |
| 型号主图 | `public/images/models/<型号编码>.png` | 占位图，运营同名覆盖 |
| 公司信息 / 组织实体 | `src/data/organization.ts` | 名称、地址、联系方式；中文描述与地址在 `locales.zh` |
| 站名与标题后缀 | `src/data/site.ts` | 占位品牌名 |
| 凭证 | 环境变量 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | 仅 Wrangler 直传需要，不进仓库 |

替换后按第 5 节的 `curl` 清单逐条实测。`CI=true` 或 `REQUIRE_REAL_DOMAIN=1` 时，
`site` 仍是 `example.com` 会直接构建失败——这是故意的域名守卫。

---

## 8. 常见运维操作

| 想做什么 | 命令 / 位置 |
|---|---|
| 看当前账号与权限 | `npx wrangler whoami` |
| 看 D1 库列表 | `npx wrangler d1 list` |
| 本地调 D1，不碰线上 | 命令加 `--local`、去掉 `--remote` |
| 看表结构 | `wrangler d1 execute <DB> --remote --command "PRAGMA table_info(inquiries);"` |
| 看 Pages 部署历史 / 回滚 | `npx wrangler pages deployment list` / Cloudflare 控制台 |
| 看构建期校验是否通过 | 部署日志里的 `validate-content.mjs` 与 `check-links.mjs` 输出 |
| 抓取与访问趋势 | Cloudflare Web Analytics（无需再维护访问日志轮转） |
| 数据备份 | 第 4 节的 `wrangler d1 export` |
