/**
 * 语言与路径映射。
 *
 * 站点采用「默认语言不带前缀、其余语言带前缀」的结构：
 *   英文  /products/a1/
 *   中文  /zh/products/a1/
 *
 * 选这种结构而不是 `/en/` + `/zh/` 双前缀，是因为英文站是面向海外买家的主站，
 * 根路径即英文可以少一层跳转，canonical 与外链地址也保持简洁。
 *
 * 内容 slug（品类、型号编码）两种语言共用同一套：
 * 翻译 slug 会产出两套 URL 体系，收益仅是美观，代价是重定向表与 slug 一致性校验。
 */

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** 各语言的显示名，用于语言切换器 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

/** html lang 与 og:locale，两者格式不同需分开维护 */
export const LOCALE_META: Record<Locale, { htmlLang: string; ogLocale: string }> = {
  en: { htmlLang: 'en', ogLocale: 'en_US' },
  zh: { htmlLang: 'zh-CN', ogLocale: 'zh_CN' },
};

/**
 * 各语言的路径前缀。类型是 `Record<Locale, string>`：
 * 往 LOCALES 里加语言却忘了在这里补一行，编译直接失败，
 * 不会出现「新语言的链接静默回落到无前缀（即默认语言）」。
 */
export const LOCALE_PREFIX: Record<Locale, string> = {
  en: '',
  zh: '/zh',
};

const PREFIX = LOCALE_PREFIX;

/**
 * 把语言无关的路径转成该语言的实际路径。
 * `localizePath('zh', '/products/')` → `/zh/products/`
 */
export function localizePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const prefix = PREFIX[locale];
  if (!prefix) return clean;
  return clean === '/' ? `${prefix}/` : `${prefix}${clean}`;
}

/**
 * 反向解析：从实际路径取出语言与语言无关路径。
 * `/zh/products/` → { locale: 'zh', path: '/products/' }
 */
export function parsePath(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    const prefix = PREFIX[locale];
    if (!prefix) continue;
    if (pathname === `${prefix}/` || pathname === prefix) {
      return { locale, path: '/' };
    }
    if (pathname.startsWith(`${prefix}/`)) {
      return { locale, path: pathname.slice(prefix.length) };
    }
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** 同一页面在另一语言下的路径，用于语言切换器 */
export function switchLocalePath(locale: Locale, pathname: string): string {
  const { path } = parsePath(pathname);
  return localizePath(locale, path);
}

/* ------------------------------------------------------------------ *
 * 内容条目的语言前缀
 *
 * Markdown 集合（guides / faqs）一个语言一个文件，语言写在条目 id 的前缀里：
 *   guides/fm-100-selection.md      → 英文（默认语言，无前缀）
 *   guides/zh/fm-100-selection.md   → 中文
 *
 * Astro 的 glob loader 给条目 id 的就是「不含扩展名的相对路径」，所以语言信息
 * 天然在 id 里，不需要额外的 locale 字段（多一个字段就多一处可能写错的地方）。
 *
 * 这套函数放在 routing.ts 而不是另建模块，是因为它只依赖 LOCALES 与
 * DEFAULT_LOCALE，且构建脚本（validate-content.mjs）也要用同一条规则 ——
 * 规则只此一份，不会出现「脚本按目录分语言、页面按字段分语言」的漂移。
 * ------------------------------------------------------------------ */

/** 条目 id 所属语言：`zh/foo` → zh，`foo` → 默认语言 */
export function localeOfEntryId(id: string): Locale {
  const head = id.split('/')[0];
  if (id.includes('/') && (LOCALES as readonly string[]).includes(head)) {
    return head as Locale;
  }
  return DEFAULT_LOCALE;
}

/** 去掉语言前缀后的 slug：两种语言共用同一套 URL，只差 /zh 前缀 */
export function bareSlug(id: string): string {
  const head = id.split('/')[0];
  if (id.includes('/') && (LOCALES as readonly string[]).includes(head)) {
    return id.slice(head.length + 1);
  }
  return id;
}

/** 某 slug 在指定语言下的条目 id（bareSlug 的逆运算） */
export function entryIdFor(locale: Locale, slug: string): string {
  return locale === DEFAULT_LOCALE ? slug : `${locale}/${slug}`;
}

/** hreflang 用的全语言地址表，含 x-default */
export function alternatePaths(
  path: string
): { hreflang: string; path: string; ogLocale: string }[] {
  return [
    ...LOCALES.map((locale) => ({
      hreflang: LOCALE_META[locale].htmlLang,
      path: localizePath(locale, path),
      ogLocale: LOCALE_META[locale].ogLocale,
    })),
    {
      hreflang: 'x-default',
      path: localizePath(DEFAULT_LOCALE, path),
      ogLocale: LOCALE_META[DEFAULT_LOCALE].ogLocale,
    },
  ];
}
