/**
 * 导航派生（公共层）。
 *
 * 每个页面条目在自己的 `nav` 字段里声明「出现在哪个区、第几位、叫什么」，
 * 本模块只做排序与拼语言前缀。因此新增一个栏目页时，
 * navigation.ts 与 Header/Footer 都不需要改。
 *
 * 分区顺序这类「结构」仍是常量（data/navigation.ts），因为它是全站约定，
 * 不属于任何一个页面。
 */
import { publishedPages, type FooterColumnKey } from '../data/pages';
import { FOOTER_COLUMN_ORDER } from '../data/navigation';
import { t } from '../i18n/ui';
import { localizePath, type Locale } from '../i18n/routing';

export interface NavLink {
  label: string;
  href: string;
}

export interface MainNavItem extends NavLink {
  /** 该栏由内容（品类）填充下拉子项 */
  dynamic?: 'categories';
}

export interface FooterColumnView {
  key: FooterColumnKey;
  title: string;
  links: NavLink[];
  /** 联系栏在链接之后追加邮箱/电话/城市 */
  withContact?: boolean;
}

/** 主导航：按 order 升序，label 与 href 已按当前语言处理 */
export function buildMainNav(locale: Locale): MainNavItem[] {
  return publishedPages()
    .flatMap((def) => {
      const main = def.nav?.main;
      return main ? [{ def, main }] : [];
    })
    .sort((a, b) => a.main.order - b.main.order)
    .map(({ def, main }) => ({
      label: main.label[locale],
      href: localizePath(locale, def.path),
      dynamic: main.dynamic,
    }));
}

/**
 * 页脚：按 data/navigation.ts 的分区顺序组装。
 *
 * 两条规则：
 *   · 品类列用内容填充，内容为空时回落到本页（"全部产品"）；
 *   · 应用方向列同样由内容填充，但没有兜底 —— 内容为空时整列不渲染，
 *     否则会指向一个空列表页。
 */
export function buildFooterNav(
  locale: Locale,
  categories: NavLink[],
  applications: NavLink[]
): FooterColumnView[] {
  const dict = t(locale);
  const links = new Map<FooterColumnKey, { order: number; link: NavLink }[]>();
  /** 品类为空时的兜底链接；只有「产品」列由内容填充，故只需一个变量 */
  let productsFallback: NavLink | undefined;

  for (const def of publishedPages()) {
    const footer = def.nav?.footer;
    if (!footer) continue;

    // 普通链接：文案在条目里
    if ('label' in footer) {
      const list = links.get(footer.column) ?? [];
      list.push({
        order: footer.order,
        link: { label: footer.label[locale], href: localizePath(locale, def.path) },
      });
      links.set(footer.column, list);
      continue;
    }

    // 动态列：整列由内容填充，条目本身不产生链接。
    // 只有品类列保留兜底 —— 应用方向列为空时整列不渲染，避免指向空列表页。
    if (
      footer.column === 'products' &&
      footer.dynamic === 'categories' &&
      footer.fallbackLabel
    ) {
      productsFallback = {
        label: footer.fallbackLabel[locale],
        href: localizePath(locale, def.path),
      };
    }
  }

  return FOOTER_COLUMN_ORDER.map((key) => {
    let columnLinks: NavLink[];

    if (key === 'products') {
      /**
       * 品类全量列出：页脚是真实的导航入口，截断成「查看全部」会逼用户多跳一步。
       * 数量多时的美观问题由 Footer 处理——超过 4 个拆成两列，高度按一半速度增长。
       */
      columnLinks =
        categories.length > 0 ? categories : productsFallback ? [productsFallback] : [];
    } else if (key === 'applications') {
      columnLinks = applications;
    } else {
      columnLinks = (links.get(key) ?? [])
        .sort((a, b) => a.order - b.order)
        .map((item) => item.link);
    }

    return {
      key,
      title: dict.footer.columns[key],
      links: columnLinks,
      withContact: key === 'contact',
    };
  }).filter((column) => column.links.length > 0);
}
