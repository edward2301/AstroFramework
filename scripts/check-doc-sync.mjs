/**
 * 文档对账（doc-sync 的机械校验）。
 *
 * 只检查本仓真实踩过的漂移类型，不做通用文档质检：
 *  1. 随内容变化的数字计数写进文档（124 页 / 108 条）
 *  2. 依赖版本号写进文档（owner 是 package.json）
 *  3. public/_redirects 里的 trailingSlash 说明与 astro.config.mjs 不一致
 *  4. README / CODEBUDDY 命令表不是 上手指南 §2.2 的子集
 *  5. add-locale 预登记债回潮：路由测试硬编码 zh-CN、Footer 硬编码 locale === 'zh'
 *
 * 退出码 1 = 有漂移；由 npm run check:docs 与 build-guard 共同调用。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const numberedLines = (rel) => read(rel).split(/\r?\n/);

const issues = [];
const report = (file, line, msg) => {
  issues.push(`${file}${line > 0 ? `:${line}` : ''} — ${msg}`);
};

// 技能目录可能新增，按目录枚举。选型 HTML 含竞品实测数字（如「462 页」），自动计数扫描会误报；
// 其实现事实在全仓对账时人工核对，故不列入 docFiles。
const skillDir = path.join(root, '.codebuddy', 'skills');
const skillDocs = readdirSync(skillDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `.codebuddy/skills/${entry.name}/SKILL.md`)
  .filter((rel) => existsSync(path.join(root, rel)));

const docFiles = [
  'README.md',
  'docs/上手指南.md',
  'docs/开发框架设计.md',
  'deploy/cloudflare/README.md',
  '.codebuddy/CODEBUDDY.md',
  ...['architecture', 'seo', 'ai-collaboration'].map((name) => `.codebuddy/rules/${name}.md`),
  ...skillDocs,
];

// 1) 内容计数：两位数以上 + 页/条/个…。个位数多为机制条数（如「2+2 条规则」），不算内容计数；
//    404/301 等是 HTTP 状态码，不是计数。
const COUNT = /(\d{2,})\s*(页|条|个页面|个用例|个组件|个集合)/g;
const HTTP_CODES = new Set(['301', '302', '404', '500']);
for (const rel of docFiles) {
  numberedLines(rel).forEach((line, i) => {
    const hits = [...line.matchAll(COUNT)].filter((hit) => !HTTP_CODES.has(hit[1]));
    if (hits.length) {
      report(rel, i + 1, `硬编码计数 ${hits.map((hit) => hit[0]).join('、')}；改为指针（见 doc-sync「内容计数」owner）`);
    }
  });
}

// 2) 依赖版本：owner 是 package.json，文档只写指针。
const CARET_VERSION = /\^\d+\.\d+\.\d+/g;
for (const rel of docFiles) {
  numberedLines(rel).forEach((line, i) => {
    const hits = [...line.matchAll(CARET_VERSION)];
    if (hits.length) {
      report(rel, i + 1, `写死依赖版本 ${hits.map((hit) => hit[0]).join('、')}；改为「见 package.json」`);
    }
  });
}

// 3) trailingSlash 说明与配置一致。
const configMatch = read('astro.config.mjs').match(/trailingSlash:\s*'([^']+)'/);
if (configMatch) {
  const value = configMatch[1];
  numberedLines('public/_redirects').forEach((line, i) => {
    if (/trailingSlash/.test(line) && !line.includes(`'${value}'`)) {
      report('public/_redirects', i + 1, `与 astro.config.mjs 的 trailingSlash: '${value}' 不一致`);
    }
  });
}

// 4) 命令表镜像：README / CODEBUDDY 表格里出现的 npm run X 必须都能在 指南 §2.2 找到。
function commandsFrom(text) {
  const out = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue;
    for (const match of line.matchAll(/npm run ([\w:.-]+)/g)) out.add(match[1]);
  }
  return out;
}
const guideSection = read('docs/上手指南.md').match(/### 2\.2 命令([\s\S]*?)(?=\n### |\n## )/);
if (!guideSection) {
  issues.push('docs/上手指南.md — 找不到 §2.2 命令小节（owner）');
} else {
  const owner = commandsFrom(guideSection[1]);
  for (const rel of ['README.md', '.codebuddy/CODEBUDDY.md']) {
    for (const cmd of commandsFrom(read(rel))) {
      if (!owner.has(cmd)) report(rel, 0, `命令 npm run ${cmd} 不在 上手指南 §2.2（owner）里`);
    }
  }
}

// 5) add-locale 预登记债。
numberedLines('tests/routing.test.ts').forEach((line, i) => {
  if (/'zh-CN'/.test(line)) {
    report('tests/routing.test.ts', i + 1, '硬编码 zh-CN；改用 LOCALE_META[locale].htmlLang');
  }
});
for (const rel of ['src/components/layout/Footer.astro', '.codebuddy/skills/add-locale/SKILL.md']) {
  numberedLines(rel).forEach((line, i) => {
    if (/locale\s*===\s*'zh'/.test(line)) {
      report(rel, i + 1, '仍描述 Footer 的 locale === \'zh\' 硬编码分支；改用 LOCALE_META[locale].addressSeparator');
    }
  });
}

if (issues.length) {
  console.error(`[文档对账] 发现 ${issues.length} 处漂移：`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log('[文档对账] 通过');
