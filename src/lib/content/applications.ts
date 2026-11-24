import { getCollection, getEntry, getEntries } from 'astro:content';
import { localizePath, type Locale } from '../../i18n/routing';
import { detailPath } from '../../data/routes';
import { applicationView } from './localize';

/** 应用方向查询。 */

export async function getAllApplications() {
  const all = await getCollection('applications', ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getApplication(id: string) {
  const entry = await getEntry('applications', id);
  if (!entry || entry.data.draft) return null;
  const models = entry.data.recommended.length
    ? (await getEntries(entry.data.recommended)).filter((m) => !m.data.draft)
    : [];
  return { ...entry, models };
}

/**
 * 导航用列表。label 经 applicationView 按语言回落：
 * 缺译显示源语言，而不是让中文导航出现英文条目。
 */
export async function getApplicationNav(locale: Locale) {
  const all = await getAllApplications();
  return all.map((a) => ({
    label: applicationView(a, locale).name,
    href: localizePath(locale, detailPath.application(a.id)),
  }));
}
