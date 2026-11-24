import { getCollection, getEntry, getEntries, render } from 'astro:content';
import { DEFAULT_LOCALE, bareSlug, entryIdFor, localeOfEntryId, type Locale } from '../../i18n/routing';

/**
 * 问答查询。
 *
 * 与指南同一套规则：一个语言一个文件（faqs/*.md 与 faqs/zh/*.md），
 * 按 id 前缀取对应语言，缺译不生成页面。
 *
 * 一处额外处理：relatedFaqs 指向的是问答集合本身，而问答已按语言分文件，
 * 所以同簇互链要按当前语言重新取 id（英文文件里写 `bar`，中文页要取 `zh/bar`），
 * 否则中文页会链到英文问答。
 */

/** 某语言下已发布的全部问答，按问题字母序 */
export async function getAllFaqs(locale: Locale) {
  const all = await getCollection(
    'faqs',
    ({ data, id }) => !data.draft && localeOfEntryId(id) === locale
  );
  return all.sort((a, b) => a.data.question.localeCompare(b.data.question));
}

/** 按主题簇分组，供索引页与同簇互链使用 */
export async function getFaqsByCluster(locale: Locale) {
  const all = await getAllFaqs(locale);
  const groups = new Map<string, typeof all>();
  for (const item of all) {
    const key = item.data.cluster;
    /* 桶模式：取出（或新建）桶后写入，避免非空断言绕过类型检查 */
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

/** 问答详情。slug 语言无关 */
export async function getFaqDetail(locale: Locale, slug: string) {
  const entry = await getEntry('faqs', entryIdFor(locale, slug));
  if (!entry || entry.data.draft) return null;

  // 非默认语言的关联字段缺省为空，按 slug 回落默认语言文件里声明的关联
  let relationSource = entry;
  if (
    locale !== DEFAULT_LOCALE &&
    entry.data.relatedModels.length === 0 &&
    entry.data.relatedFaqs.length === 0
  ) {
    const source = await getEntry('faqs', slug);
    if (source && !source.data.draft) relationSource = source;
  }

  const { relatedModels, relatedFaqs } = relationSource.data;

  // 同簇问答按当前语言取：英文文件里写 `bar`，中文页取 `zh/bar`。
  // relatedFaqs 是 reference() 产出的 { collection, id } 对象，取 slug 要走 ref.id
  const relatedIds = relatedFaqs.map((ref) => entryIdFor(locale, bareSlug(ref.id)));

  const [{ Content }, models, relatedEntries] = await Promise.all([
    render(entry),
    relatedModels.length ? getEntries(relatedModels) : [],
    relatedIds.length ? Promise.all(relatedIds.map((id) => getEntry('faqs', id))) : [],
  ]);

  return {
    ...entry,
    slug,
    Content,
    models: models.filter((m) => !m.data.draft),
    // 引用可能指向已删除的条目，getEntry 会返回 undefined：用 flatMap 直接收窄，
    // 不用 filter 的类型守卫（守卫里 `typeof f` 引用自身参数，TS 不认这次收窄）
    related: relatedEntries.flatMap((f) =>
      f && !f.data.draft ? [{ ...f, slug: bareSlug(f.id) }] : []
    ),
  };
}
