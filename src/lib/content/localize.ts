import type { CollectionEntry } from 'astro:content';
import type { z } from 'astro/zod';
import type { Locale } from '../../i18n/routing';
import {
  modelLocales,
  categoryLocales,
  applicationLocales,
  caseLocales,
} from '../../content.config';

/**
 * 内容的多语言视图。
 *
 * 条目顶层字段是「源语言」（英文），译文放在 `locales[语言代码]` 里。
 * 页面不该到处写 `locale === 'zh' ? ... : ...`，那样的判断会渗透进每个模板，
 * 且每新增一种语言就要全站改一遍。这里统一收敛成「取某语言下的视图对象」，
 * 页面只认视图，不认字段来源。
 *
 * 两条规则决定了这里是语言无关的：
 *
 * 1. **按语言键查表，不判具体语言。** 无论两种语言还是将来五种，逻辑都是
 *    `locales[locale]`，不存在「漏写某个语言的判断分支」这种情况。
 * 2. **缺译回落源语言，但缺译本身要被看见。** 回落保证页面不会出现空字段
 *    （空字段是空表格，比语言不一致更难发现）；「这条内容缺哪种语言」
 *    由 `scripts/validate-content.mjs` 逐条列出，不靠人肉比对。
 *
 * 译文类型由各集合的 locales 子 schema 用 `z.output<S>` 派生
 * （定义在 content.config.ts）—— schema 改字段时视图的编译会跟着变，不会静默漂移。
 */

/**
 * 取条目的指定语言译文；无该语言译文时返回 undefined。
 * 泛型 S 是该集合的 locales 子 schema，`as` 只出现在这一个出口。
 */
function translationOf<S extends z.ZodType>(
  data: { locales?: Partial<Record<Locale, unknown>> },
  locale: Locale
): z.output<S> | undefined {
  return data.locales?.[locale] as z.output<S> | undefined;
}

/** 品类在指定语言下的展示视图 */
export function categoryView(entry: CollectionEntry<'categories'>, locale: Locale) {
  const d = entry.data;
  const tr = translationOf<typeof categoryLocales>(d, locale);

  return {
    name: tr?.name ?? d.name,
    intro: tr?.intro ?? d.intro,
    /** 封面路径与语言无关，直接透传 */
    image: d.image,
    /** 品类色：页头底色（深色调，语言无关） */
    color: d.color,
    comparisonParams: tr?.comparisonParams ?? d.comparisonParams,
    selectionPoints: tr?.selectionPoints ?? d.selectionPoints,
    purchaseInfo: {
      moq: tr?.purchaseInfo?.moq ?? d.purchaseInfo.moq,
      leadTime: tr?.purchaseInfo?.leadTime ?? d.purchaseInfo.leadTime,
      payment: tr?.purchaseInfo?.payment ?? d.purchaseInfo.payment,
      certifications: tr?.purchaseInfo?.certifications ?? d.purchaseInfo.certifications,
    },
    seoTitle: tr?.seoTitle ?? d.seoTitle,
    seoDescription: tr?.seoDescription ?? d.seoDescription,
  };
}

/** 型号在指定语言下的展示视图 */
export function modelView(entry: CollectionEntry<'models'>, locale: Locale) {
  const d = entry.data;
  const tr = translationOf<typeof modelLocales>(d, locale);

  return {
    code: d.code,
    name: tr?.name ?? d.name,
    status: d.status,
    keyParams: tr?.keyParams ?? d.keyParams,
    specGroups: tr?.specGroups ?? d.specGroups,
    dimensions: tr?.dimensions ?? d.dimensions,
    interface: tr?.interface ?? d.interface,
    certifications: d.certifications,
    /** 图片路径与语言无关，直接透传 */
    image: d.image,
    seoTitle: tr?.seoTitle ?? d.seoTitle,
    seoDescription: tr?.seoDescription ?? d.seoDescription,
  };
}

/** 应用方向在指定语言下的展示视图 */
export function applicationView(entry: CollectionEntry<'applications'>, locale: Locale) {
  const d = entry.data;
  const tr = translationOf<typeof applicationLocales>(d, locale);

  return {
    name: tr?.name ?? d.name,
    condition: tr?.condition ?? d.condition,
    criteria: tr?.criteria ?? d.criteria,
    cautions: tr?.cautions ?? d.cautions,
    seoTitle: tr?.seoTitle ?? d.seoTitle,
    seoDescription: tr?.seoDescription ?? d.seoDescription,
  };
}

/** 案例在指定语言下的展示视图 */
export function caseView(entry: CollectionEntry<'cases'>, locale: Locale) {
  const d = entry.data;
  const tr = translationOf<typeof caseLocales>(d, locale);

  return {
    title: tr?.title ?? d.title,
    background: tr?.background ?? d.background,
    requirements: tr?.requirements ?? d.requirements,
    selection: tr?.selection ?? d.selection,
    results: tr?.results ?? d.results,
    date: d.date,
    seoTitle: tr?.seoTitle ?? d.seoTitle,
    seoDescription: tr?.seoDescription ?? d.seoDescription,
  };
}

/*
 * 注意：guides / faqs 不在这里。这两个集合的正文要独立成篇，语言按目录分文件
 * （guides/zh/*.md），条目本身就是「某语言的完整内容」，不存在「按语言回落」
 * 这一步，也就不需要视图函数 —— 直接读 entry.data 即可。详见 routing.ts 的
 * localeOfEntryId 与 docs/开发框架设计.md 的「两种翻译结构」一节。
 */
