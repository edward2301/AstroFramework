/**
 * 页面条目汇总（唯一登记点）。
 *
 * 新增一个页面 = 在 entries/ 下新建一个文件 + 在这里加一行 import 与一项。
 * 这一行是刻意的：它让 Node 侧（scripts/validate-content.mjs）与 Astro 侧
 * 导入同一个模块，校验规则与运行时数据不可能出现两份副本。
 *
 * 之所以不用 import.meta.glob 自动扫目录：该 API 只存在于 Vite，
 * 纯 Node 跑的校验脚本里没有它，自动扫目录会被迫写第二套加载逻辑，
 * 而两份加载逻辑必然漂移 —— 这正是本仓明确要避免的问题。
 *
 * 本文件与 entries/*.ts 之间的导入一律带 .ts 扩展名，
 * 原因同 lib/seo/branding.ts：这些模块要被 Node 的类型擦除直接加载。
 */
import about from './entries/about.ts';
import applications from './entries/applications.ts';
import caseStudies from './entries/case-studies.ts';
import certifications from './entries/certifications.ts';
import home from './entries/home.ts';
import notFound from './entries/not-found.ts';
import products from './entries/products.ts';
import quote from './entries/quote.ts';
import downloads from './entries/resources-downloads.ts';
import faq from './entries/resources-faq.ts';
import guides from './entries/resources-guides.ts';
import type { PageDef, PageSeo } from './contract.ts';
import type { Locale } from '../../i18n/routing.ts';

export const PAGES = {
  home,
  products,
  about,
  quote,
  applications,
  caseStudies,
  certifications,
  guides,
  faq,
  downloads,
  notFound,
} satisfies Record<string, PageDef>;

export type PageId = keyof typeof PAGES;

/**
 * 已发布页面：draft 条目不建路由、不进导航。
 *
 * PAGES 用 `satisfies` 保留了每个条目的字面量类型（便于逐条校验），
 * 因此这里统一收宽为 PageDef —— 汇总消费方不需要知道某条是哪种版式。
 */
export function publishedPages(): PageDef[] {
  return (Object.values(PAGES) as PageDef[]).filter((def) => !def.draft);
}

/**
 * 已发布页面（带 id），供路由分发器枚举。
 *
 * 分发器需要 id 才能回传给 loadPage —— 只有 id 是路由入参，
 * 页面对象本身不进入 props（getStaticPaths 的 props 必须是可序列化数据）。
 */
export function publishedPageEntries(): { id: PageId; def: PageDef }[] {
  return allPageEntries().filter(({ def }) => !def.draft);
}

/**
 * 全部条目（含 id）。
 *
 * 不对外导出：外部只需要「已发布」的视图，是否 draft 的过滤只有一处。
 */
function allPageEntries(): { id: PageId; def: PageDef }[] {
  return (Object.keys(PAGES) as PageId[]).map((id) => ({ id, def: PAGES[id] as PageDef }));
}

/** 取某页面的条目；id 由类型约束，不会拼错 */
export function pageDef(id: PageId): PageDef {
  return PAGES[id];
}

/** 取某页面某语言的 SEO 文案；类型已保证语言齐全，缺失只可能是运行时篡改 */
export function pageSeo(id: PageId, locale: Locale): PageSeo {
  const seo = PAGES[id].seo[locale];
  if (!seo) {
    throw new Error(`[seo] 页面 ${id} 缺少 ${locale} 语言的标题与描述`);
  }
  return seo;
}

export { crumbLabel, type PageDef, type PageSeo } from './contract.ts';
export type { FooterColumnKey } from './contract.ts';
