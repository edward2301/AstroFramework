import { describe, expect, it } from 'vitest';
import { buildFooterNav, buildMainNav } from '../src/lib/nav';

/**
 * 导航派生的行为基线。
 *
 * 导航由页面条目的 nav 字段生成 —— 这里锁住的是「派生结果」
 * 与改造前手写结构等价：顺序、文案、语言前缀、动态列与空列规则。
 */

describe('buildMainNav', () => {
  it('按条目声明的 order 排序，英文无语言前缀', () => {
    const items = buildMainNav('en');

    expect(items.map((item) => item.label)).toEqual([
      'Products',
      'Applications',
      'Case Studies',
      'Technical Guides',
      'Quality',
      'About',
    ]);
    expect(items.map((item) => item.href)).toEqual([
      '/products/',
      '/applications/',
      '/case-studies/',
      '/resources/guides/',
      '/certifications/',
      '/about/',
    ]);
  });

  it('中文导航带 /zh 前缀，且栏目标签与英文各自独立', () => {
    const items = buildMainNav('zh');

    expect(items.map((item) => item.label)).toEqual([
      '产品中心',
      '应用方向',
      '应用案例',
      '技术指南',
      '认证与质量',
      '关于我们',
    ]);
    expect(items.every((item) => item.href.startsWith('/zh/'))).toBe(true);
  });

  it('只有产品栏带品类下拉标记', () => {
    const dynamic = buildMainNav('en').filter((item) => item.dynamic === 'categories');

    expect(dynamic).toHaveLength(1);
    expect(dynamic[0].href).toBe('/products/');
  });
});

describe('buildFooterNav 产品列', () => {
  it('品类多时全量列出（数量多由 Footer 拆列解决，不在派生层截断）', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      label: `Category ${i + 1}`,
      href: `/products/cat-${i + 1}/`,
    }));

    const columns = buildFooterNav('en', many, []);
    const products = columns.find((column) => column.key === 'products');

    expect(products?.links).toHaveLength(6);
    expect(products?.links.map((link) => link.label)).toEqual([
      'Category 1',
      'Category 2',
      'Category 3',
      'Category 4',
      'Category 5',
      'Category 6',
    ]);
  });
});

describe('buildFooterNav', () => {
  const categories = [
    { label: 'Pressure Sensors', href: '/products/pressure-sensors/' },
    { label: 'Flow Meters', href: '/products/flow-meters/' },
  ];

  it('分区顺序固定；应用方向无内容时整列不渲染', () => {
    const columns = buildFooterNav('en', categories, []);

    expect(columns.map((column) => column.key)).toEqual([
      'products',
      'resources',
      'company',
      'contact',
    ]);
  });

  it('分区内链接按条目 order 排序，文案来自条目', () => {
    const columns = buildFooterNav('en', categories, []);
    const byKey = Object.fromEntries(columns.map((column) => [column.key, column]));

    expect(byKey.resources.links.map((link) => link.label)).toEqual([
      'Technical Guides',
      'FAQ',
      'Downloads',
    ]);
    expect(byKey.company.links.map((link) => link.label)).toEqual([
      'About Us',
      'Case Studies',
      'Quality & Certifications',
    ]);
    expect(byKey.company.links.map((link) => link.href)).toEqual([
      '/about/',
      '/case-studies/',
      '/certifications/',
    ]);
  });

  it('联系栏带 withContact 标记（页脚据它追加邮箱与电话）', () => {
    const columns = buildFooterNav('en', categories, []);
    const contact = columns.find((column) => column.key === 'contact');

    expect(contact?.withContact).toBe(true);
    expect(contact?.links).toHaveLength(1);
  });

  it('应用方向有内容时该列出现在产品列之后', () => {
    const applications = [{ label: 'High Pressure', href: '/applications/high-pressure/' }];
    const columns = buildFooterNav('en', categories, applications);

    expect(columns.map((column) => column.key)).toEqual([
      'products',
      'applications',
      'resources',
      'company',
      'contact',
    ]);
  });

  it('品类为空时回落到本页链接，且跟随语言前缀', () => {
    const en = buildFooterNav('en', [], []).find((column) => column.key === 'products');
    const zh = buildFooterNav('zh', [], []).find((column) => column.key === 'products');

    expect(en?.links).toEqual([{ label: 'All products', href: '/products/' }]);
    expect(zh?.links).toEqual([{ label: '全部产品', href: '/zh/products/' }]);
  });

  it('中文页脚的分区标题与链接都取中文', () => {
    const columns = buildFooterNav('zh', categories, []);
    const byKey = Object.fromEntries(columns.map((column) => [column.key, column]));

    expect(byKey.resources.title).toBe('技术资源');
    expect(byKey.company.links[0]).toEqual({ label: '关于我们', href: '/zh/about/' });
  });
});
