/**
 * 页面契约（公共层）。
 *
 * 本文件只放类型与不变量，**不允许出现任何页面文案**。
 * 页面文案一律写在 `entries/<页面>.ts` 里 —— 一个页面一个文件，互不相干。
 *
 * 三层约定：
 *   · contract.ts（本文件）  定义"什么算一个页面"
 *   · entries/*.ts           一个页面 = 一个文件，只写该页的数据
 *   · index.ts               唯一汇总点，只增不改
 *
 * 新增页面不需要动 render.ts / 路由分发器 / navigation.ts：
 * 路由由 index.ts 汇总后自动枚举，导航由条目里的 nav 字段自动派生。
 */
import type { Locale } from '../../i18n/routing.ts';
import type { FooterColumnKey } from '../navigation.ts';

export type { FooterColumnKey };

/** 站点语言表：seo 与 content 都按此索引，缺一种语言编译期即报错 */
export type LocaleText = Record<Locale, string>;

export interface PageSeo {
  title: string;
  description: string;
}

/** 栏目页正文：标题 + 定位段 + 当前状态段 */
export interface SectionCopy {
  heading: string;
  intro: string;
  current: string;
}

/* 页脚分区类型与顺序都在 data/navigation.ts，此处只做转发，避免同一联合类型两处定义 */

/**
 * 导航落点。不写 nav 就不出现在导航里：
 * 页面文件存在即上线，未上线就是没有这个页面的条目。
 */
export interface NavDef {
  /** 主导航；order 决定顺序，dynamic 表示该栏由内容（品类）填充子项 */
  main?: { order: number; label: LocaleText; dynamic?: 'categories' };
  /**
   * 页脚链接。dynamic 列（products / applications）由内容填充，
   * 只有 categories 有兜底链接（内容为空时指向本页）。
   */
  footer?:
    | { column: FooterColumnKey; order: number; dynamic?: undefined; label: LocaleText }
    | {
        column: 'products' | 'applications';
        order: number;
        dynamic: 'categories' | 'applications';
        /** 仅在 dynamic === 'categories' 时使用：品类为空时的兜底链接文案 */
        fallbackLabel?: LocaleText;
      };
}

interface PageBase {
  /** URL 形态，语言无关，如 /certifications/。唯一性由构建期校验负责 */
  path: string;
  /** 页面级 SEO，双语必填 —— 缺一个语言编译期就报错，不允许回落到英文 */
  seo: Record<Locale, PageSeo>;
  nav?: NavDef;
  /** 页面正文标题（h1）。栏目页用 content.heading，其余版式由该字段提供 */
  heading?: LocaleText;
  /** 面包屑当前项文案；缺省取 heading，栏目页再缺省取 content.heading，都没有则用 SEO 标题 */
  crumb?: LocaleText;
  /**
   * 先写好但不发布：不建路由、不进导航。要下线已有页面请直接删条目。
   *
   * 唯一例外是 notFound：默认语言 404 由 pages/404.astro 单独产出，
   * 标 draft 会让英文 404 保留、中文 404 消失，由链接检查的语言配对报错兜住。
   */
  draft?: boolean;
}

/** 两段式栏目页：正文来自本条目，版式由 SectionBody 渲染 */
export interface SectionPageDef extends PageBase {
  layout: 'section';
  content: Record<Locale, SectionCopy>;
}

/** 首页：数据来自品类与型号集合 */
export interface HomePageDef extends PageBase {
  layout: 'home';
}

/** 产品总览：数据来自品类集合 */
export interface ProductsPageDef extends PageBase {
  layout: 'products';
}

/** 关于页：正文来自组织数据与界面文案，本条目只提供 SEO 与导航落点 */
export interface AboutPageDef extends PageBase {
  layout: 'about';
}

/** 询价页：联系方式来自组织数据 */
export interface QuotePageDef extends PageBase {
  layout: 'quote';
}

/** 404：内容由界面文案提供，条目只提供 SEO 与产出规则 */
export interface NotFoundPageDef extends PageBase {
  layout: 'notFound';
}

export type PageDef =
  | SectionPageDef
  | HomePageDef
  | ProductsPageDef
  | AboutPageDef
  | QuotePageDef
  | NotFoundPageDef;

/**
 * 返回该页面的面包屑当前项文案。
 *
 * 三级：显式 crumb → 页面标题（heading，栏目页为 content.heading）→ SEO 标题。
 * 询价页需要显式 crumb：它在主导航里叫「联系」，面包屑叫「获取报价」。
 */
export function crumbLabel(def: PageDef, locale: Locale): string {
  if (def.crumb) return def.crumb[locale];
  if (def.heading) return def.heading[locale];
  return def.layout === 'section' ? def.content[locale].heading : def.seo[locale].title;
}

/** 身份函数：给条目写法提供类型检查与补全，不做任何运行时处理 */
export function definePage<T extends PageDef>(def: T): T {
  return def;
}
