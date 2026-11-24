import { SEO_LIMITS } from '../../data/site';
import { applyTitleSuffix } from './branding';
import { displayWidth } from '../utils/text';

/**
 * 标题与描述的组装与校验。
 *
 * 原则：标题与描述由编辑在内容中显式提供，不用模板自动拼接。
 * 自动拼接会让 300 个型号页产出 300 条结构雷同的标题，既无区分度，
 * 也可能因截断产生语义破损。此处只做后缀补全与长度校验。
 */

export interface MetaResult {
  title: string;
  description: string;
}

/**
 * 补全品牌后缀，并校验长度。
 *
 * 校验失败直接抛错，不用返回值传递 —— 元标签不合规的页面不应该进入产物，
 * 而「返回一个 issues 数组、调用方自己决定要不要处理」在实际项目里必然被忽略。
 *
 * @param pageLabel 出错时用于定位的页面标识
 */
export function buildMeta(
  rawTitle: string,
  rawDescription: string,
  pageLabel = ''
): MetaResult {
  // 后缀拼接的唯一实现在 branding.ts，校验脚本与此共用
  const title = applyTitleSuffix(rawTitle);

  const description = rawDescription.trim();

  const problems: string[] = [];

  const tLen = displayWidth(title);
  if (tLen < SEO_LIMITS.titleMin || tLen > SEO_LIMITS.titleMax) {
    problems.push(
      `标题宽度 ${tLen}，应在 ${SEO_LIMITS.titleMin}–${SEO_LIMITS.titleMax} 之间：${title}`
    );
  }

  const dLen = displayWidth(description);
  if (dLen < SEO_LIMITS.descriptionMin || dLen > SEO_LIMITS.descriptionMax) {
    problems.push(
      `描述宽度 ${dLen}，应在 ${SEO_LIMITS.descriptionMin}–${SEO_LIMITS.descriptionMax} 之间`
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `[seo] ${pageLabel ? `${pageLabel}：` : ''}${problems.join('；')}`
    );
  }

  return { title, description };
}

/**
 * 站点源。
 *
 * 唯一来源是 `astro.config.mjs` 的 `site`，Astro 将其注入 `import.meta.env.SITE`。
 * 不在 data/site.ts 里再写一份 —— 域名出现两个副本时，改一处漏一处会让
 * canonical、og:url、JSON-LD 与 sitemap 分属两个域，而这在产物里看不出异常。
 */
const RAW_SITE: string | undefined = import.meta.env.SITE;

if (!RAW_SITE) {
  throw new Error(
    '[seo] astro.config.mjs 未配置 site。canonical、og:url 与结构化数据的绝对地址都依赖它。'
  );
}

/** 去掉末尾斜杠，避免拼接出 //#organization 这类双斜杠 @id */
export const SITE_ORIGIN = RAW_SITE.replace(/\/+$/, '');

/**
 * 站内基路径。当前方案用 Pages 自定义域根路径，默认 `/`；框架支持由 `astro.config.mjs` 的 `base` 提供子路径。
 * 所有 canonical 都经过此处，避免「子路径部署时路径被根路径拼掉」。
 */
const SITE_BASE: string = import.meta.env.BASE_URL ?? '/';

/** 绝对 URL 生成。canonical 与结构化数据统一走此处。 */
export function absoluteUrl(path: string): string {
  const base = SITE_BASE.endsWith('/') ? SITE_BASE : `${SITE_BASE}/`;
  const relative = path.replace(/^\/+/, '');
  return new URL(`${base}${relative}`, `${SITE_ORIGIN}/`).toString();
}
