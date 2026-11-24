import { getCollection, getEntry, getEntries, render } from 'astro:content';

/** Markdown 渲染产物的组件类型：从 render 的返回推导，避免到处写 any */
export type RenderedContent = Awaited<ReturnType<typeof render>>['Content'];
import { DEFAULT_LOCALE, entryIdFor, localeOfEntryId, type Locale } from '../../i18n/routing';

/**
 * 指南查询。
 *
 * 一个语言一个文件（guides/*.md 与 guides/zh/*.md），所以「取某语言的指南」
 * 就是按 id 前缀过滤，不存在跨语言回落。缺中文文件时中文页**根本不会生成** ——
 * 这正是要的效果：宁可少一个页面，也不上线「英文正文 + 中文标题」的假中文页。
 *
 * 关联字段（relatedModels / relatedApplications）只在默认语言文件里声明一次：
 * 关联指向的是 models / applications 这类「字段内嵌译文」的集合，同一条目在
 * 两种语言下都能取到对应译文，不需要按语言复制一遍关系。
 */

/** 某语言下已发布的全部指南，按更新时间倒序 */
export async function getAllGuides(locale: Locale) {
  const all = await getCollection(
    'guides',
    ({ data, id }) => !data.draft && localeOfEntryId(id) === locale
  );
  return all.sort((a, b) => b.data.updated.valueOf() - a.data.updated.valueOf());
}

/** 指南详情。slug 是语言无关的（两种语言同一套 URL，只差 /zh 前缀） */
export async function getGuideDetail(locale: Locale, slug: string) {
  const entry = await getEntry('guides', entryIdFor(locale, slug));
  if (!entry || entry.data.draft) return null;

  // 非默认语言的关联字段缺省为空，按 slug 回落默认语言文件里声明的关联
  let relationSource = entry;
  if (locale !== DEFAULT_LOCALE && entry.data.relatedModels.length === 0) {
    const source = await getEntry('guides', slug);
    if (source && !source.data.draft) relationSource = source;
  }

  const relatedModels = relationSource.data.relatedModels;

  const [{ Content }, models] = await Promise.all([
    render(entry),
    relatedModels.length ? getEntries(relatedModels) : [],
  ]);

  return { ...entry, slug, Content, models: models.filter((m) => !m.data.draft) };
}
