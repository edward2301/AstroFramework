#!/usr/bin/env node
/**
 * 内容体检。由 `scripts/build-guard.mjs` 在每次 `astro build` 开始时调用，
 * 也可单独执行 `npm run validate`。发现错误即退出码 1，中断构建。
 *
 * schema 能保证字段类型与取值范围，但保证不了这些：
 *   1. 标题与描述的长度，以及标题在全站（含页面级文案）的唯一性
 *   2. 引用指向的条目是否真的存在（含 guides / faqs 的 reference）
 *   3. 型号编码与文件名是否一致（编码同时出现在字段、文件名、URL 三处）
 *   4. 品类对比表的列，是否每个型号的参数里都有对应键
 *
 * 四条都依赖跨条目的关系，无法写进单个集合的 zod schema，因此单独成脚本。
 *
 * 标题后缀、长度区间、页面级文案与 slug/字符计数规则全部从 src 下的 TS 模块
 * 直接导入（Node 24 支持类型擦除），避免规则漂移。
 */
import fs from 'node:fs';
import path from 'node:path';
import { SEO_LIMITS } from '../src/data/site.ts';
import { PAGES } from '../src/data/pages/index.ts';
import { applyTitleSuffix } from '../src/lib/seo/branding.ts';
import {
  findDescriptionIssues,
  findTitleIssues,
  hasPlaceholder,
} from '../src/lib/seo/copy.ts';
import { displayWidth, toSlug } from '../src/lib/utils/text.ts';
import { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS, bareSlug, localeOfEntryId } from '../src/i18n/routing.ts';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const PUBLIC_DIR = path.join(ROOT, 'public');

/* ---------- 工具 ---------- */

const errors = [];
const warnings = [];

const fail = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/** 品牌后缀拼接：唯一实现在 lib/seo/branding.ts，与运行时 buildMeta 共用 */
const withSuffix = applyTitleSuffix;

/** 取 YAML frontmatter 正文；没有则返回 null */
function frontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/** frontmatter 之后的 Markdown 正文，用于「有文件无内容」的检查 */
function bodyOf(raw) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
}

function pickScalar(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return undefined;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/** 支持 `key: [a, b]` 与 `key:\n  - a\n  - b` 两种写法 */
function pickList(block, key) {
  const inline = block.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]\\s*$`, 'm'));
  if (inline) {
    return inline[1]
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  const lines = block.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start === -1) return [];

  const items = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (/^\S/.test(line)) break;
    const item = line.match(/^\s*-\s*(.+?)\s*$/);
    if (item) items.push(item[1].replace(/^['"]|['"]$/g, ''));
  }
  return items;
}

function readJsonCollection(name) {
  const dir = path.join(CONTENT_DIR, name);
  if (!fs.existsSync(dir)) return [];

  /**
   * 递归扫描，与 content.config.ts 的递归 glob 保持一致：
   * 只扫顶层会让子目录条目被 Astro 收录进站点、却逃过本脚本的全部校验。
   * 注意 readdirSync recursive 在 Windows 下返回反斜杠路径，需统一为 posix，
   * 且 Astro 对递归 glob 的条目 id 是「不含扩展名的相对路径」，这里保持同构。
   */
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const rel = `src/content/${name}/${f.replace(/\\/g, '/')}`;
      // f 相对集合目录，Astro 的条目 id 即「不含扩展名的相对路径」，保持同构
      const id = f.replace(/\\/g, '/').replace(/\.json$/, '');
      try {
        return {
          id,
          file: rel,
          data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
        };
      } catch (e) {
        fail(rel, `JSON 解析失败：${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function readMarkdownCollection(name) {
  const dir = path.join(CONTENT_DIR, name);
  if (!fs.existsSync(dir)) return [];
  // 递归扫描，与 JSON 集合同理：Markdown 集合的递归 glob 覆盖子目录，校验不能只看顶层
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const rel = `src/content/${name}/${f.replace(/\\/g, '/')}`;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const block = frontmatter(raw);
      if (!block) {
        fail(rel, '缺少 frontmatter');
        return null;
      }
      return {
        id: f.replace(/\\/g, '/').replace(/\.md$/, ''),
        // 语言由目录前缀表达（guides/zh/foo.md → zh），与路由和 schema 同一条规则
        locale: localeOfEntryId(f.replace(/\\/g, '/').replace(/\.md$/, '')),
        slug: bareSlug(f.replace(/\\/g, '/').replace(/\.md$/, '')),
        file: rel,
        data: {
          draft: pickScalar(block, 'draft') === 'true',
          title: pickScalar(block, 'title'),
          question: pickScalar(block, 'question'),
          seoTitle: pickScalar(block, 'seoTitle'),
          seoDescription: pickScalar(block, 'seoDescription'),
          relatedModels: pickList(block, 'relatedModels'),
          relatedApplications: pickList(block, 'relatedApplications'),
          relatedFaqs: pickList(block, 'relatedFaqs'),
          /** frontmatter 之后的正文，用于「建了文件但正文是空的」这类检查 */
          body: bodyOf(raw),
        },
      };
    })
    .filter(Boolean);
}

/* ---------- 载入 ---------- */

const categories = readJsonCollection('categories');
const models = readJsonCollection('models');
const applications = readJsonCollection('applications');
const cases = readJsonCollection('cases');
const downloads = readJsonCollection('downloads');
const guides = readMarkdownCollection('guides');
const faqs = readMarkdownCollection('faqs');

/** 引用校验只认已发布条目：已发布页面不得链接到草稿 */
const published = (list) => list.filter((entry) => !entry.data.draft);
const publishedCategories = published(categories);
const publishedModels = published(models);
const publishedApplications = published(applications);
const publishedCases = published(cases);
const publishedGuides = published(guides);
const publishedFaqs = published(faqs);

const index = {
  categories: new Set(publishedCategories.map((c) => c.id)),
  models: new Set(publishedModels.map((m) => m.id)),
  applications: new Set(publishedApplications.map((a) => a.id)),
  cases: new Set(publishedCases.map((c) => c.id)),
  // guides / faqs 按语言分文件，id 带语言前缀；引用既可以写带前缀的 id，
  // 也可以写语言无关的 slug（推荐后者，中文文件不必关心自己在哪个目录）
  guides: new Set(publishedGuides.flatMap((g) => [g.id, g.slug])),
  faqs: new Set(publishedFaqs.flatMap((f) => [f.id, f.slug])),
};

/* ---------- 1. 标题与描述（内容集合 + 页面级文案） ---------- */

const seenTitles = new Map();

function checkSeo(entry, label) {
  const { data, file } = entry;

  if (typeof data.seoTitle !== 'string' || data.seoTitle.trim() === '') {
    fail(file, `缺少 seoTitle${label ? `（${label}）` : ''}`);
  } else {
    const title = withSuffix(data.seoTitle);
    const len = displayWidth(title);
    if (len < SEO_LIMITS.titleMin || len > SEO_LIMITS.titleMax) {
      fail(file, `标题宽度 ${len}，应在 ${SEO_LIMITS.titleMin}–${SEO_LIMITS.titleMax}：${title}`);
    }
    const prev = seenTitles.get(title);
    if (prev) fail(file, `标题与 ${prev} 重复：${title}`);
    else seenTitles.set(title, file);

    // 内容质量：长度合规但被模板填充 / 截断的标题一律拦下
    for (const issue of findTitleIssues(data.seoTitle)) fail(file, issue);
    // 占位词只告警：demo 目录整批是 placeholder，错误级会永久阻断构建
    if (hasPlaceholder(data.seoTitle)) warn(file, '标题含占位词（内容待替换）');
  }

  if (typeof data.seoDescription !== 'string' || data.seoDescription.trim() === '') {
    fail(file, '缺少 seoDescription');
  } else {
    const len = displayWidth(data.seoDescription);
    if (len < SEO_LIMITS.descriptionMin || len > SEO_LIMITS.descriptionMax) {
      fail(file, `描述宽度 ${len}，应在 ${SEO_LIMITS.descriptionMin}–${SEO_LIMITS.descriptionMax}`);
    }

    // 同上：重复填充句不会影响宽度，只能按内容判
    for (const issue of findDescriptionIssues(data.seoDescription)) fail(file, issue);
    if (hasPlaceholder(data.seoDescription)) warn(file, '描述含占位词（内容待替换）');
  }
}

for (const entry of [
  ...publishedCategories,
  ...publishedModels,
  ...publishedApplications,
  ...publishedCases,
  ...publishedGuides,
  ...publishedFaqs,
]) {
  checkSeo(entry);
}

// 页面条目与内容集合共用同一份唯一性表；页面标题重复同样会阻断构建。
// 条目按「页面 → 语言」组织，两种语言的标题都要查，否则中文标题超长不会被发现。
// 顺带校验路径唯一性：两条条目指向同一个 URL 时，产物会互相覆盖。
const seenPagePaths = new Map();
/** 主导航内 order → 条目，用于发现顺序冲突 */
const mainOrders = new Map();
/** 页脚各分区内 order → 条目 */
const footerOrders = new Map();

for (const [id, def] of Object.entries(PAGES)) {
  // 带上 path：条目 id 与文件名不同构，按 id 搜不到文件，按 path 能直接定位到条目
  const file = `src/data/pages → ${id}（${def.path}）`;

  /**
   * 路径现在是条目里的数据：写错不会被路由层发现，只会产出一个打不开的地址。
   *
   * 「只许小写」这一条同时堵住了大小写重复：Astro 按路径逐目录产出，
   * 大小写不敏感的文件系统（Windows / macOS）会把 /About/ 与 /about/ 落到同一目录
   * 而互相覆盖，Linux 上却是两个页面 —— 不允许大写就从源头消灭这种平台差异。
   */
  if (!/^\/$|^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/.test(def.path)) {
    fail(
      file,
      `路径 ${def.path} 格式不合法：须以 / 开头与结尾，段内只允许小写字母、数字与连字符`
    );
  }

  const normalized = def.path.replace(/\/+$/, '') || '/';
  const prevPath = seenPagePaths.get(normalized);
  if (prevPath) {
    fail(file, `路径 ${def.path} 与 ${prevPath} 重复（去除尾斜杠后相同），产物会互相覆盖`);
  } else {
    seenPagePaths.set(normalized, file);
  }

  // 导航顺序必须在同一区内唯一：重复时顺序取决于条目声明顺序，改 import 就变。
  if (def.nav?.main) {
    const prev = mainOrders.get(def.nav.main.order);
    if (prev) {
      fail(file, `主导航 order ${def.nav.main.order} 与 ${prev} 重复，顺序将取决于声明顺序`);
    } else {
      mainOrders.set(def.nav.main.order, id);
    }
  }

  if (def.nav?.footer) {
    const column = def.nav.footer.column;
    if (!footerOrders.has(column)) footerOrders.set(column, new Map());
    const bucket = footerOrders.get(column);
    const prev = bucket.get(def.nav.footer.order);
    if (prev) {
      fail(
        file,
        `页脚「${column}」栏 order ${def.nav.footer.order} 与 ${prev} 重复，顺序将取决于声明顺序`
      );
    } else {
      bucket.set(def.nav.footer.order, id);
    }
  }

  for (const [locale, seo] of Object.entries(def.seo)) {
    checkSeo(
      {
        file: `${file}[${locale}]`,
        data: { seoTitle: seo.title, seoDescription: seo.description },
      },
      `页面级 ${locale}`
    );
  }
}

/**
 * 译文元标签校验。
 *
 * 遍历条目上的**所有**语言，而不是写死中文：新增语言后自动纳入校验，
 * 不会出现「新语言的 seoTitle 超长却没人管」。
 * 缺译不算错（允许分批翻译），但一旦填了就必须与源语言同标准。
 */
function checkLocalizedSeo(entry) {
  const locales = entry.data.locales ?? {};

  for (const [locale, tr] of Object.entries(locales)) {
    if (!tr) continue;
    const label = LOCALE_LABELS[locale] ?? locale;

    if (tr.seoTitle) {
      const title = withSuffix(tr.seoTitle);
      const len = displayWidth(title);
      if (len < SEO_LIMITS.titleMin || len > SEO_LIMITS.titleMax) {
        fail(
          entry.file,
          `${label}标题宽度 ${len}，应在 ${SEO_LIMITS.titleMin}–${SEO_LIMITS.titleMax}：${title}`
        );
      }
      const prev = seenTitles.get(title);
      if (prev) fail(entry.file, `${label}标题与 ${prev} 重复：${title}`);
      else seenTitles.set(title, `${entry.file}（${label}）`);
    }

    if (tr.seoDescription) {
      const len = displayWidth(tr.seoDescription);
      if (len < SEO_LIMITS.descriptionMin || len > SEO_LIMITS.descriptionMax) {
        fail(
          entry.file,
          `${label}描述宽度 ${len}，应在 ${SEO_LIMITS.descriptionMin}–${SEO_LIMITS.descriptionMax}`
        );
      }
    }
  }
}

for (const entry of [
  ...publishedCategories,
  ...publishedModels,
  ...publishedApplications,
  ...publishedCases,
  ...publishedGuides,
  ...publishedFaqs,
]) {
  checkLocalizedSeo(entry);
}

/* ---------- 1.1 译文完整度与对比表 ---------- */

/**
 * 对比表的列必须由同一语言的 keyParams 覆盖。
 *
 * 按语言逐个校验，而不是只查中文：翻一半的典型表现就是
 * 「品类列名翻了、型号参数键没翻」，中文（或任何语言）页整列渲染成「—」——
 * 页面看得见、构建不报错，正是需要脚本拦住的那类问题。
 */
for (const cat of publishedCategories) {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const label = LOCALE_LABELS[locale] ?? locale;
    const columns = cat.data.locales?.[locale]?.comparisonParams;

    for (const m of publishedModels.filter((model) => model.data.category === cat.id)) {
      const keys = new Set(
        (m.data.locales?.[locale]?.keyParams ?? []).map((p) => p.k)
      );

      // 两边必须同时翻译，否则列名与键语言不一致，整列空白
      if (columns && keys.size === 0) {
        fail(
          m.file,
          `品类 ${cat.id} 已提供${label}对比列，但该型号没有${label} keyParams；对比表会整列空白`
        );
        continue;
      }
      if (!columns && keys.size > 0) {
        fail(
          m.file,
          `该型号已提供${label} keyParams，但品类 ${cat.id} 没有${label} comparisonParams；对比表列名与键语言不一致`
        );
        continue;
      }
      if (!columns) continue;

      const missing = columns.filter((c) => !keys.has(c));
      if (missing.length > 0) {
        fail(
          m.file,
          `${label}对比列 ${missing.join(', ')} 在 keyParams 中缺少同名键（品类：${cat.id}）`
        );
      }
    }
  }
}

/**
 * 译文完整度。
 *
 * 这里是**错误**而不是告警：一旦允许「缺译也发布」，该语言页面就会整片显示源语言内容 ——
 * 构建通过、链接正确、页面全英文。这种状态比构建失败糟得多，
 * 因为它只会在上线后被客户看到。
 *
 * 若确实要「先出英文、后补译文」，正确做法是暂时不发布该语言的这个页面，
 * 而不是带着源语言内容上线。
 */
const REQUIRED_TRANSLATION = {
  categories: ['name', 'intro', 'comparisonParams', 'seoTitle', 'seoDescription'],
  models: ['name', 'keyParams', 'specGroups', 'seoTitle', 'seoDescription'],
  applications: ['name', 'condition', 'criteria', 'seoTitle', 'seoDescription'],
  cases: ['title', 'background', 'requirements', 'selection', 'seoTitle', 'seoDescription'],
  // guides / faqs 不在此列：这两个集合的语言按目录分文件，缺译表现为「缺文件」，
  // 由下面的 checkMarkdownPairs 校验。
};

function checkTranslation(entry, collection) {
  const required = REQUIRED_TRANSLATION[collection];
  if (!required) return;

  const locales = entry.data.locales ?? {};

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const label = LOCALE_LABELS[locale] ?? locale;
    const tr = locales[locale];

    if (!tr) {
      fail(
        entry.file,
        `缺少${label}译文：该语言页面会整片显示源语言内容。` +
          `请补 locales.${locale}，或先不要发布该语言的这个页面`
      );
      continue;
    }

    const missing = required.filter((key) => tr[key] === undefined);
    if (missing.length > 0) {
      fail(entry.file, `${label}译文缺少字段 ${missing.join(', ')}：该语言页面会出现源语言内容`);
    }
  }
}

for (const [collection, list] of Object.entries({
  categories: publishedCategories,
  models: publishedModels,
  applications: publishedApplications,
  cases: publishedCases,
})) {
  for (const entry of list) checkTranslation(entry, collection);
}

/* ---------- 1.2 Markdown 集合的语言配对 ---------- */

/**
 * guides / faqs 按目录分语言（zh/*.md），「缺译」指缺该语言的文件。
 * 这里按 slug 配对检查三件事：
 *
 * 1. **每个 slug 在每个语言下都有文件** —— 缺一个，该语言就少一个可索引页面，
 *    而且缺的那一版通常是搜索量更小的语言，补起来最容易被无限推迟；
 * 2. **同一 slug 在同一语言下只能有一个文件** —— 英文写 foo.md、又写 en/foo.md
 *    会产出两条同 URL 的路由，Astro 报错信息很难看懂，在这里先拦；
 * 3. **正文不能为空** —— 建了文件却只填 frontmatter，页面会是一个有标题无内容的空壳。
 */
function checkMarkdownPairs(list, collection) {
  const bySlug = new Map();

  for (const entry of list) {
    if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, new Map());
    const bucket = bySlug.get(entry.slug);
    const prev = bucket.get(entry.locale);
    if (prev) {
      fail(
        entry.file,
        `slug「${entry.slug}」在 ${entry.locale} 下出现两个文件（另一个是 ${prev.file}）。` +
          `默认语言不要加目录前缀，其他语言才用 ${entry.locale}/ 前缀`
      );
      continue;
    }
    bucket.set(entry.locale, entry);

    if (!entry.data.body) {
      fail(entry.file, '正文为空：frontmatter 之后必须有 Markdown 内容');
    }
  }

  for (const [slug, bucket] of bySlug) {
    for (const locale of LOCALES) {
      if (bucket.has(locale)) continue;
      const source = bucket.get(DEFAULT_LOCALE) ?? [...bucket.values()][0];
      const expected =
        locale === DEFAULT_LOCALE
          ? `src/content/${collection}/${slug}.md`
          : `src/content/${collection}/${locale}/${slug}.md`;
      fail(
        source.file,
        `缺少${LOCALE_LABELS[locale] ?? locale}版本，应新建 ${expected}。` +
          `缺译文时该语言页面不会生成（不会拿源语言正文凑页面）`
      );
    }
  }
}

for (const [collection, list] of Object.entries({
  guides: publishedGuides,
  faqs: publishedFaqs,
})) {
  checkMarkdownPairs(list, collection);
}

// downloads 没有独立 SEO 字段，它只出现在资料列表页

/* ---------- 2. 型号编码与文件名一致 ---------- */

for (const m of publishedModels) {
  const expected = toSlug(m.data.code ?? '');
  // 条目 id 可能含子目录前缀（与 Astro 递归 glob 的 id 同构），文件名比对取 basename
  const basename = m.id.split('/').pop();
  if (expected !== basename) {
    fail(m.file, `型号编码 ${m.data.code} 对应的 slug 为 ${expected}，与文件名 ${m.id} 不一致`);
  }
  if (!index.categories.has(m.data.category)) {
    fail(m.file, `category 引用 ${m.data.category} 不存在`);
  }
  for (const r of m.data.replacement ?? []) {
    if (!index.models.has(r)) fail(m.file, `replacement 引用 ${r} 不存在`);
    if (r === m.id) fail(m.file, 'replacement 指向自身');
  }
  for (const a of m.data.applications ?? []) {
    if (!index.applications.has(a)) fail(m.file, `applications 引用 ${a} 不存在`);
  }
  for (const c of m.data.relatedCases ?? []) {
    if (!index.cases.has(c)) fail(m.file, `relatedCases 引用 ${c} 不存在`);
  }
  if (m.data.datasheet && !fs.existsSync(path.join(PUBLIC_DIR, m.data.datasheet))) {
    warn(m.file, `datasheet ${m.data.datasheet} 在 public/ 下不存在，页面将不输出下载链接`);
  }
}

/*
 * 图片存在性：页面会无条件输出 <img>，文件缺失就是破图。
 * 图片是运营手工替换的资产，最容易在改名后与内容脱钩，必须进校验。
 */
for (const entry of models) {
  if (entry.data.draft || !entry.data.image) continue;
  if (!fs.existsSync(path.join(PUBLIC_DIR, entry.data.image))) {
    fail(entry.file, `image ${entry.data.image} 在 public/ 下不存在（页面会输出破图）`);
  }
}

for (const entry of categories) {
  if (entry.data.draft || !entry.data.image) continue;
  if (!fs.existsSync(path.join(PUBLIC_DIR, entry.data.image))) {
    fail(entry.file, `image ${entry.data.image} 在 public/ 下不存在（页面会输出破图）`);
  }
}

/* ---------- 3. 其它集合的引用完整性 ---------- */

for (const a of publishedApplications) {
  for (const r of a.data.recommended ?? []) {
    if (!index.models.has(r)) fail(a.file, `recommended 引用 ${r} 不存在`);
  }
}

for (const c of publishedCases) {
  for (const r of c.data.config ?? []) {
    if (!index.models.has(r)) fail(c.file, `config 引用 ${r} 不存在`);
  }
}

for (const d of published(downloads)) {
  if (d.data.model && !index.models.has(d.data.model)) {
    fail(d.file, `model 引用 ${d.data.model} 不存在`);
  }
  if (d.data.file && !fs.existsSync(path.join(PUBLIC_DIR, d.data.file))) {
    warn(d.file, `file ${d.data.file} 在 public/ 下不存在`);
  }
}

// Markdown 集合的 reference 同样必须校验
for (const g of publishedGuides) {
  for (const r of g.data.relatedModels ?? []) {
    if (!index.models.has(r)) fail(g.file, `relatedModels 引用 ${r} 不存在`);
  }
  for (const r of g.data.relatedApplications ?? []) {
    if (!index.applications.has(r)) fail(g.file, `relatedApplications 引用 ${r} 不存在`);
  }
}

for (const f of publishedFaqs) {
  for (const r of f.data.relatedModels ?? []) {
    if (!index.models.has(r)) fail(f.file, `relatedModels 引用 ${r} 不存在`);
  }
  for (const r of f.data.relatedFaqs ?? []) {
    if (!index.faqs.has(r)) fail(f.file, `relatedFaqs 引用 ${r} 不存在`);
    if (bareSlug(r) === f.slug) fail(f.file, 'relatedFaqs 指向自身');
  }
}

/* ---------- 4. 品类对比表的列必须被每个型号覆盖 ---------- */

for (const cat of publishedCategories) {
  const columns = cat.data.comparisonParams ?? [];
  const inCategory = publishedModels.filter((m) => m.data.category === cat.id);

  if (inCategory.length === 0) {
    warn(cat.file, '该品类下没有任何型号，品类页的对比表会是空的');
    continue;
  }

  // 译文侧的列名/键名一致性由 §1.1 逐语言校验，这里只查默认语言
  for (const m of inCategory) {
    const keys = new Set((m.data.keyParams ?? []).map((p) => p.k));
    const missing = columns.filter((c) => !keys.has(c));
    if (missing.length > 0) {
      fail(m.file, `对比表列 ${missing.join(', ')} 在 keyParams 中缺少同名键（品类：${cat.id}）`);
    }
  }
}

/* ---------- 5. 集合为空时的提示 ---------- */

for (const [name, list] of Object.entries({
  applications: publishedApplications,
  cases: publishedCases,
  guides: publishedGuides,
  faqs: publishedFaqs,
  downloads: published(downloads),
})) {
  if (list.length === 0) {
    warn(`src/content/${name}`, '没有已发布内容。Astro 构建时会提示该集合不存在，属预期状态');
  }
}

/* ---------- 6. 图片：裸 <img> 的必填属性 ---------- */

/**
 * 图片标准见 docs/开发框架设计.md §7.5：
 *   · 图片是运营资产，放 `public/images/…`，构建只做原样复制；
 *   · 裸 `<img>` 必须带 width/height/alt/loading —— 不做构建期处理，就更依赖这几个属性。
 * 路径存在性已在上面「图片存在性」一节判错，这里不重复检查。
 */
/** 递归收集 src 下的 .astro 文件 */
function astroFiles(dir, acc = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) astroFiles(full, acc);
    else if (item.name.endsWith('.astro')) acc.push(full);
  }
  return acc;
}

/**
 * 把注释替换为等长空白，再做扫描。
 *
 * 否则「注释里提到 <img>」会被当成真的标签（第一版就误报了）。
 * 等长替换是为了让报错行号仍然准确。行注释只处理独占一行的 `//`，
 * 避免把 `https://` 这类字符串误伤。
 */
function maskComments(source) {
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  return source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/[^\n]*/gm, blank);
}

for (const full of astroFiles(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, full).replace(/\\/g, '/');
  const source = maskComments(fs.readFileSync(full, 'utf8'));

  for (const match of source.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0];
    const line = source.slice(0, match.index).split('\n').length;
    const missing = ['width', 'height', 'alt', 'loading'].filter(
      (attr) => !new RegExp(`\\b${attr}\\s*=`).test(tag)
    );
    if (missing.length > 0) {
      fail(
        `${rel}:${line}`,
        `<img> 缺少 ${missing.join(', ')}（规范见 docs/开发框架设计.md §7.5）`
      );
    }
  }
}

/* ---------- 输出 ---------- */

const print = (items, label) => {
  if (items.length === 0) return;
  console.log(`\n${label}（${items.length}）`);
  for (const { file, msg } of items) console.log(`  ${file}\n    ${msg}`);
};

const summary = [
  `品类 ${categories.length}（含译文 ${publishedCategories.filter((c) => Object.keys(c.data.locales ?? {}).length > 0).length}）`,
  `型号 ${models.length}（含译文 ${publishedModels.filter((m) => Object.keys(m.data.locales ?? {}).length > 0).length}）`,
  `应用 ${applications.length}`,
  `案例 ${cases.length}`,
  `指南 ${guides.length}`,
  `问答 ${faqs.length}`,
  `资料 ${downloads.length}`,
  `页面 ${Object.keys(PAGES).length}`,
].join(' · ');

console.log(`[校验] ${summary}`);

print(warnings, '警告');
print(errors, '错误');

if (errors.length > 0) {
  console.error(`\n[校验] 未通过：${errors.length} 项错误，构建已中止。`);
  process.exit(1);
}

console.log('\n[校验] 通过。');
