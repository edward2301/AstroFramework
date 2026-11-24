import { getCollection, getEntry, getEntries } from 'astro:content';

/**
 * 型号查询。
 * 关联对象在此一并解析，页面直接使用。
 */

/** 某品类下的型号；默认排除停产 */
export async function getModelsByCategory(
  categoryId: string,
  includeDiscontinued = false
) {
  const list = await getCollection(
    'models',
    ({ data }) =>
      !data.draft &&
      data.category.id === categoryId &&
      (includeDiscontinued || data.status === 'active')
  );
  return list.sort((a, b) => a.data.code.localeCompare(b.data.code));
}

/**
 * 全部型号。
 *
 * 默认只返回在售型号，用于列表与首页精选。
 * 路由生成必须传 true —— 停产型号页要保留：型号词仍有搜索量，
 * 直接不生成页面等于把这部分访问丢掉，而页面本身是承接它的唯一落点。
 */
export async function getAllModels(includeDiscontinued = false) {
  const list = await getCollection(
    'models',
    ({ data }) => !data.draft && (includeDiscontinued || data.status === 'active')
  );
  return list.sort((a, b) => a.data.code.localeCompare(b.data.code));
}

/** 单个型号，含已解析的替代型号、应用方向、案例 */
export async function getModelDetail(id: string) {
  const entry = await getEntry('models', id);
  if (!entry || entry.data.draft) return null;

  const [replacements, applications, cases] = await Promise.all([
    entry.data.replacement.length ? getEntries(entry.data.replacement) : [],
    entry.data.applications.length ? getEntries(entry.data.applications) : [],
    entry.data.relatedCases.length ? getEntries(entry.data.relatedCases) : [],
  ]);

  // 被引用的条目可能是草稿，草稿不应出现在已发布页面上
  const published = <T extends { data: { draft: boolean } }>(list: T[]) =>
    list.filter((item) => !item.data.draft);

  return {
    ...entry,
    replacements: published(replacements),
    applications: published(applications),
    cases: published(cases),
  };
}
