/**
 * 导航结构常量。
 *
 * 这里只保留「结构」—— 页脚分区有哪些、按什么顺序排。
 * 具体哪个页面落在哪一栏、叫什么、排第几，写在各自的页面条目里
 * （`src/data/pages/entries/*.ts` 的 `nav` 字段），由 `src/lib/nav.ts` 派生。
 *
 * 这样新增一个栏目页只需要动它自己的条目文件，
 * 本文件只在「页脚分区本身的约定」变化时才改。
 */

/** 页脚分区 */
export type FooterColumnKey = 'products' | 'applications' | 'resources' | 'company' | 'contact';

/**
 * 页脚分区顺序。
 *
 * 五类入口必须全覆盖：产品、应用、资源、公司、联系 —— 页脚是兜底导航，
 * 任一栏目缺席都会让部分页面只剩一条到达路径。
 * 分区内没有链接时整列不渲染（见 lib/nav.ts）。
 */
export const FOOTER_COLUMN_ORDER: FooterColumnKey[] = [
  'products',
  'applications',
  'resources',
  'company',
  'contact',
];


