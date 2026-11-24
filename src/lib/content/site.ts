import { getCategoryNav } from './categories';
import { getApplicationNav } from './applications';
import type { Locale } from '../../i18n/routing';

/**
 * 站点级导航数据。
 *
 * 这是布局层唯一允许调用的内容查询。导航属于站点结构而非页面业务数据，
 * 若逐页取数再透传，会让每个页面都背上一段与自身无关的查询。
 * 除此之外，布局与组件不得调用任何内容查询。
 *
 * 传入语言：返回的 label 与 href 都已按该语言处理完毕，
 * 头部与页脚因此不需要知道语言前缀规则。
 */
export async function getSiteNav(locale: Locale) {
  const [categories, applications] = await Promise.all([
    getCategoryNav(locale),
    getApplicationNav(locale),
  ]);
  return { categories, applications };
}
