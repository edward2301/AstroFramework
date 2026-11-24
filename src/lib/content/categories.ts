import { getCollection, getEntry } from 'astro:content';
import { categoryView } from './localize';
import { localizePath, type Locale } from '../../i18n/routing';
import { detailPath } from '../../data/routes';

/**
 * 品类查询。
 * 页面不得直接调用 getCollection，一律经此模块。
 */

/** 全部品类，按 order 升序 */
export async function getAllCategories() {
  const all = await getCollection('categories', ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** 单个品类；草稿视同不存在 */
export async function getCategory(id: string) {
  const entry = await getEntry('categories', id);
  return entry && !entry.data.draft ? entry : undefined;
}

/** 导航与页脚用的精简列表；label 取该语言的品类名，href 已带语言前缀 */
export async function getCategoryNav(locale: Locale) {
  const all = await getAllCategories();
  return all.map((c) => ({
    label: categoryView(c, locale).name,
    href: localizePath(locale, detailPath.category(c.id)),
  }));
}
