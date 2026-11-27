import { t } from '../../i18n/ui';
import { ROUTES, detailPath } from '../../data/routes';
import { localizePath, type Locale } from '../../i18n/routing';

export interface Crumb {
  name: string;
  url: string;
}

/**
 * 面包屑构造。
 *
 * 页面可见面包屑与 BreadcrumbList 结构化数据共用同一份数据，
 * 保证两者层级完全一致 —— 只输出标记而页面不可见属违规实现。
 *
 * 所有函数都要传 locale：标签（首页 / 产品中心）随语言变化，
 * URL 也要带对应语言前缀。若这里返回英文再由页面替换，两处必然对不上。
 */

export function homeCrumb(locale: Locale): Crumb {
  return { name: t(locale).breadcrumb.home, url: localizePath(locale, '/') };
}

export function crumb(name: string, url: string): Crumb {
  return { name, url };
}

/** 产品总览：首页 › 产品 */
export function productsCrumbs(locale: Locale): Crumb[] {
  return [
    homeCrumb(locale),
    crumb(t(locale).breadcrumb.products, localizePath(locale, ROUTES.products)),
  ];
}

/** 品类页：首页 › 产品 › 品类 */
export function categoryCrumbs(
  locale: Locale,
  categoryName: string,
  categoryId: string
): Crumb[] {
  return [
    ...productsCrumbs(locale),
    crumb(categoryName, localizePath(locale, detailPath.category(categoryId))),
  ];
}

/** 型号页：首页 › 产品 › 品类 › 型号 */
export function modelCrumbs(
  locale: Locale,
  categoryName: string,
  categoryId: string,
  modelCode: string,
  modelId: string
): Crumb[] {
  return [
    ...categoryCrumbs(locale, categoryName, categoryId),
    crumb(modelCode, localizePath(locale, detailPath.model(modelId))),
  ];
}

/** 二级内容页：首页 › 栏目 › 当前页 */
export function sectionCrumbs(
  locale: Locale,
  sectionName: string,
  sectionUrl: string,
  currentName: string,
  currentUrl: string
): Crumb[] {
  return [
    homeCrumb(locale),
    crumb(sectionName, localizePath(locale, sectionUrl)),
    crumb(currentName, localizePath(locale, currentUrl)),
  ];
}
