import { SITE } from '../../data/site';
import { organizationFor } from '../../data/organization';
import { localizePath, LOCALE_META, type Locale } from '../../i18n/routing';
import { SITE_ORIGIN, absoluteUrl } from './meta';

/**
 * 结构化数据构造。
 *
 * 每种页面类型只输出一个主类型，类型之间的关系用 @id 串联：
 * Organization 是根，WebSite 与各页面通过 publisher / isPartOf 指回它。
 *
 * 各函数只返回节点，不带 @context —— 由 `JsonLd.astro` 统一包成 @graph，
 * 避免同一份输出里出现多层重复的 @context。
 */

type Json = Record<string, unknown>;

/**
 * 全站组织实体。
 * 字段取自 data/organization.ts：address 与 contactPoint 是可验证经营主体的
 * 基本信号，缺了会削弱实体识别。
 * sameAs 只有真实账号才输出 —— 空数组时省略该字段，不输出空值，
 * 也不该用示例账号占位冒充实体关系。
 */
export function organizationNode(locale: Locale) {
  const org = organizationFor(locale);

  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: org.name,
    legalName: org.legalName,
    url: SITE_ORIGIN,
    logo: absoluteUrl(org.logo),
    /** 简介按页面语言取；品牌名不译，保证两种语言下指向同一个实体 */
    description: org.description,
    foundingDate: org.foundingDate,
    ...(org.sameAs.length > 0 ? { sameAs: [...org.sameAs] } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: org.address.street,
      addressLocality: org.address.city,
      addressRegion: org.address.region,
      postalCode: org.address.postalCode,
      addressCountry: org.address.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: org.contactPoint.telephone,
      contactType: org.contactPoint.contactType,
      email: org.contactPoint.email,
      availableLanguage: [...org.contactPoint.availableLanguage],
    },
  };
}

/**
 * 站点节点，按语言各一个。
 *
 * `@id` 由该语言的首页地址派生（`/#website` 与 `/zh/#website`），
 * 而不是全语言共用一个 —— 共用会出现「同一个 @id 在不同页面声明不同 url 与 inLanguage」
 * 的自相矛盾，等于告诉搜索引擎这两个节点是同一个东西却又互相冲突。
 *
 * 不输出 SearchAction。
 */
export function websiteNode(locale: Locale) {
  const home = absoluteUrl(localizePath(locale, '/'));
  return {
    '@type': 'WebSite',
    '@id': `${home}#website`,
    url: home,
    name: SITE.name,
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    inLanguage: LOCALE_META[locale].htmlLang,
  };
}

/** 某语言下 WebSite 节点的 @id，供各页面类型引用 */
function websiteId(locale: Locale): string {
  return `${absoluteUrl(localizePath(locale, '/'))}#website`;
}

/**
 * 型号页：Product。
 *
 * `availability` 必须由页面按 `status` 传入。停产型号若仍标记 InStock，
 * 与页面可见的停产提示直接矛盾，属于错误的结构化数据。
 */
export function productSchema(input: {
  /** 当前页面语言，决定 url 是否带语言前缀 */
  locale: Locale;
  code: string;
  name: string;
  description: string;
  /** 语言无关路径，如 /products/a1/ */
  path: string;
  image?: string;
  brand: string;
  availability?: 'InStock' | 'Discontinued';
}): Json {
  const availability = input.availability ?? 'InStock';
  // 结构化数据里的 url 必须是当前语言的实际地址：
  // 中文页若指向英文 URL，等于把该实体的归属交给另一个语言版本
  const url = absoluteUrl(localizePath(input.locale, input.path));
  return {
    '@type': 'Product',
    name: `${input.code} ${input.name}`,
    sku: input.code,
    description: input.description,
    url,
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    brand: { '@type': 'Brand', name: input.brand },
    manufacturer: { '@id': `${SITE_ORIGIN}/#organization` },
    offers: {
      '@type': 'Offer',
      availability: `https://schema.org/${availability}`,
      priceCurrency: 'USD',
      // 工业品以询价方式交易，不标具体价格；此处不追求商品富媒体结果
      url,
      seller: { '@id': `${SITE_ORIGIN}/#organization` },
    },
  };
}

/** 品类页：CollectionPage + ItemList */
export function collectionSchema(input: {
  locale: Locale;
  name: string;
  description: string;
  /** 语言无关路径 */
  path: string;
  items: { name: string; path: string }[];
}): Json {
  return {
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: absoluteUrl(localizePath(input.locale, input.path)),
    isPartOf: { '@id': websiteId(input.locale) },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: absoluteUrl(localizePath(input.locale, item.path)),
      })),
    },
  };
}

/** 问答页：FAQPage。问答内容必须与页面可见文本完全一致。 */
export function faqSchema(input: {
  locale: Locale;
  question: string;
  answer: string;
  path: string;
}): Json {
  return {
    '@type': 'FAQPage',
    url: absoluteUrl(localizePath(input.locale, input.path)),
    mainEntity: [
      {
        '@type': 'Question',
        name: input.question,
        acceptedAnswer: { '@type': 'Answer', text: input.answer },
      },
    ],
  };
}

/** 指南与案例：Article */
export function articleSchema(input: {
  locale: Locale;
  headline: string;
  description: string;
  /** 语言无关路径 */
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}): Json {
  return {
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(localizePath(input.locale, input.path)),
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    author: { '@id': `${SITE_ORIGIN}/#organization` },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    isPartOf: { '@id': websiteId(input.locale) },
  };
}

/**
 * 面包屑。层级必须与页面可见面包屑一致。
 * 传入的 item.url 必须已是该语言的实际路径（`crumb` 系列函数已按 locale 生成），
 * 因此这里不加语言前缀 —— 加了会变成 /zh/zh/。
 */
export function breadcrumbSchema(
  items: { name: string; url: string }[]
): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}
