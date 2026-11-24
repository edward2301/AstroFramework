import { getCollection, getEntry, getEntries } from 'astro:content';

/** 案例查询。配置清单在取回时一并解析。 */

export async function getAllCases() {
  const all = await getCollection('cases', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getCaseDetail(id: string) {
  const entry = await getEntry('cases', id);
  if (!entry || entry.data.draft) return null;
  const models = entry.data.config.length
    ? (await getEntries(entry.data.config)).filter((m) => !m.data.draft)
    : [];
  return { ...entry, models };
}
