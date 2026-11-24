/**
 * sitemap 的 `lastmod` 取值。
 *
 * 为什么不是「构建时间」或「内容字段」：
 *
 *   · 用构建时间，122 条 loc 会得到同一个值。同一个时间戳等于没有信息，
 *     搜索引擎会判定该字段不可信并整体忽略。
 *   · 内容层没有统一日期字段：只有 guides / downloads 的 `updated` 与 cases 的
 *     `date`，而 models、categories、applications、faqs 以及全部静态页都没有。
 *     靠内容字段只能覆盖 16 条，剩下的要么编一个日期（假信号），要么留空。
 *
 * 因此取「产出该页的那份源文件最后一次提交时间」：逐页不同、真实存在，
 * 内容被替换后提交即自动更新，不需要任何人手工维护第二份日期。
 *
 * 边界与取舍：
 *   · 只认已提交的内容。工作区里改过但没提交的文件，lastmod 仍是上次提交时间 ——
 *     lastmod 表达的是「这个版本何时对外可见」，与未提交的草稿无关。
 *   · 取不到（不是 git 工作区、git 不可用、页面找不到对应源文件）时返回 null，
 *     由调用方直接省略该字段，**不用构建时间兜底**，避免制造假的更新时间。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LOCALES, parsePath, type Locale } from '../../i18n/routing';
import { detailPath } from '../../data/routes';

/** 源文件仓库内相对路径 → ISO 提交时间（只保留每文件最新一条） */
type GitDates = Map<string, string>;

/** `${locale}:${语言无关路径}` → 源文件仓库内相对路径 */
type PageSources = Map<string, string>;

function listFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else files.push(full);
  }
  return files;
}

/** 集合条目 id：内容根目录下的相对路径去掉扩展名（与 glob loader 的 id 规则一致） */
function entryId(root: string, base: string, file: string): string {
  return relative(join(root, base), file)
    .replace(/\\/g, '/')
    .replace(/\.(json|md)$/, '');
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 一次 `git log` 取全部文件的提交时间。
 *
 * 逐文件调用 `git log -1` 要起几十个进程（Windows 上尤其慢），这里用单次遍历：
 * `git log` 默认从新到旧，某路径首次出现的那条就是它最新的提交时间。
 */
function gitDates(root: string): GitDates {
  const dates: GitDates = new Map();

  let output: string;
  try {
    output = execFileSync('git', ['log', '--pretty=format:%x01%cI', '--name-only'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    /* 不是 git 工作区或 git 不可用：空表 → 全部省略 lastmod */
    return dates;
  }

  let current = '';
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('\u0001')) {
      current = line.slice(1).trim();
      continue;
    }

    if (!current) continue;
    const file = line.replace(/\\/g, '/');
    if (!dates.has(file)) dates.set(file, current);
  }

  return dates;
}

/**
 * 建立「URL → 源文件」映射。
 *
 * 单文件双语的集合（译文内嵌在 `locales` 里）中英两版指向同一份文件；
 * 指南与问答按目录分语言（`guides/zh/*.md`），中英各一份，各自登记。
 */
function pageSources(root: string): PageSources {
  const sources: PageSources = new Map();
  const toRepoPath = (absolute: string) => relative(root, absolute).replace(/\\/g, '/');

  const register = (path: string, file: string, locales: readonly Locale[]) => {
    for (const locale of locales) {
      const key = `${locale}:${path}`;
      if (!sources.has(key)) sources.set(key, toRepoPath(file));
    }
  };

  /* 译文内嵌：一个条目文件同时产出中英两版 */
  const allLocales = [...LOCALES];

  const categories = join(root, 'src/content/categories');
  for (const file of listFiles(categories)) {
    if (!file.endsWith('.json')) continue;
    register(detailPath.category(entryId(root, 'src/content/categories', file)), file, allLocales);
  }

  /* 型号页路径含品类，只能从条目里的 category 字段还原 */
  const models = join(root, 'src/content/models');
  for (const file of listFiles(models)) {
    if (!file.endsWith('.json')) continue;
    const data = readJson(file);
    const category = typeof data?.category === 'string' ? data.category : null;
    if (!category) continue;
    register(detailPath.model(category, entryId(root, 'src/content/models', file)), file, allLocales);
  }

  const applications = join(root, 'src/content/applications');
  for (const file of listFiles(applications)) {
    if (!file.endsWith('.json')) continue;
    register(
      detailPath.application(entryId(root, 'src/content/applications', file)),
      file,
      allLocales
    );
  }

  const cases = join(root, 'src/content/cases');
  for (const file of listFiles(cases)) {
    if (!file.endsWith('.json')) continue;
    register(detailPath.caseStudy(entryId(root, 'src/content/cases', file)), file, allLocales);
  }

  /* 按目录分语言的两个集合：id 形如 `install-checklist` 或 `zh/install-checklist` */
  const perLocale = [
    { dir: 'src/content/guides', toPath: detailPath.guide },
    { dir: 'src/content/faqs', toPath: detailPath.faq },
  ] as const;

  for (const { dir, toPath } of perLocale) {
    for (const file of listFiles(join(root, dir))) {
      if (!file.endsWith('.md')) continue;
      const id = entryId(root, dir, file);
      const [maybeLocale, ...rest] = id.split('/');
      const locale = (LOCALES as readonly string[]).includes(maybeLocale) ? maybeLocale : null;
      const slug = locale ? rest.join('/') : id;
      if (locale) register(toPath(slug), file, [locale as Locale]);
      else register(toPath(slug), file, [LOCALES[0]]);
    }
  }

  /* 静态页：路径写在条目文件里，一个文件对应一个页面（中英共用） */
  const entries = join(root, 'src/data/pages/entries');
  for (const file of listFiles(entries)) {
    if (!file.endsWith('.ts')) continue;
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const matched = /path:\s*'([^']+)'/.exec(text);
    if (!matched) continue;
    register(matched[1], file, allLocales);
  }

  return sources;
}

/**
 * 生成 URL → lastmod 的解析函数。配置阶段调用一次，`serialize` 里逐条调用。
 *
 * 返回提交时间的 UTC ISO 串：sitemap 集成会用 `new Date()` 再序列化一次，
 * 直接给带时区的原值可以保留真实提交时刻，而不是被压成某个整点。
 */
export function createLastmod(root: string): (url: string) => string | null {
  const dates = gitDates(root);
  const sources = pageSources(root);

  return function lastmodFor(url: string): string | null {
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }

    const { locale, path } = parsePath(pathname);
    const file = sources.get(`${locale}:${path}`);
    if (!file) return null;

    const committed = dates.get(file);
    if (!committed) return null;

    const stamp = new Date(committed);
    return Number.isNaN(stamp.getTime()) ? null : stamp.toISOString();
  };
}
