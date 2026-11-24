import { getCollection, getEntry } from 'astro:content';

/** 资料查询。 */

export async function getAllDownloads() {
  const all = await getCollection('downloads', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.updated.valueOf() - a.data.updated.valueOf());
}

/** 按文档类型分组，对应资料中心的分类浏览 */
export async function getDownloadsByType() {
  const all = await getAllDownloads();
  const groups = new Map<string, typeof all>();
  for (const item of all) {
    const key = item.data.docType;
    /* 桶模式：取出（或新建）桶后写入，避免非空断言绕过类型检查 */
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

export async function getDownload(id: string) {
  const entry = await getEntry('downloads', id);
  return entry && !entry.data.draft ? entry : null;
}
