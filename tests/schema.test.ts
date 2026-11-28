import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../src/lib/seo/meta';
import {
  articleSchema,
  breadcrumbSchema,
  collectionSchema,
  faqSchema,
  organizationNode,
  productSchema,
  websiteNode,
} from '../src/lib/seo/schema';

describe('全站节点', () => {
  it('Organization 含地址与联系方式，空 sameAs 不输出', () => {
    const node = organizationNode('en');
    expect(node).toMatchObject({
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      address: { '@type': 'PostalAddress', addressCountry: 'CN' },
      contactPoint: { '@type': 'ContactPoint' },
    });
    expect(Object.prototype.hasOwnProperty.call(node, 'sameAs')).toBe(false);
  });

  it('组织简介按页面语言取', () => {
    expect(organizationNode('zh').description).toContain('专业生产');
  });

  it('WebSite 的 @id / url / inLanguage 按语言派生', () => {
    expect(websiteNode('zh')).toMatchObject({
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/zh/#website`,
      url: `${SITE_ORIGIN}/zh/`,
      inLanguage: 'zh-CN',
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    });
  });
});

describe('页面类型节点', () => {
  it('Product 的 URL 按语言本地化，停产状态透传', () => {
    expect(
      productSchema({
        locale: 'zh',
        code: 'a1',
        name: 'A1',
        description: 'd',
        path: '/products/a1/',
        brand: 'Example',
        availability: 'Discontinued',
      })
    ).toMatchObject({
      '@type': 'Product',
      name: 'A1',
      sku: 'a1',
      url: `${SITE_ORIGIN}/zh/products/a1/`,
      offers: {
        availability: 'https://schema.org/Discontinued',
        seller: { '@id': `${SITE_ORIGIN}/#organization` },
      },
    });
  });

  it('Product 名称在型号名已含 code 时不重复拼接', () => {
    const base = { locale: 'en' as const, description: 'd', path: '/products/a1/', brand: 'Example' };
    expect(productSchema({ ...base, code: 'A1', name: 'Model A1' })).toMatchObject({
      name: 'Model A1',
    });
    expect(
      productSchema({ ...base, code: 'SX-200', name: 'Pressure Transmitter' })
    ).toMatchObject({ name: 'SX-200 Pressure Transmitter' });
  });

  it('Product 名称按词边界匹配，大小写不敏感', () => {
    const base = { locale: 'en' as const, description: 'd', path: '/products/a1/', brand: 'Example' };
    expect(productSchema({ ...base, code: 'A1', name: 'Model A123' })).toMatchObject({
      name: 'A1 Model A123',
    });
    expect(productSchema({ ...base, code: 'a1', name: 'MODEL A1' })).toMatchObject({
      name: 'MODEL A1',
    });
  });

  it('CollectionPage 的 ItemList 位置从 1 开始且 URL 本地化', () => {
    expect(
      collectionSchema({
        locale: 'en',
        name: 'Category A',
        description: 'd',
        path: '/products/category-a/',
        items: [
          { name: 'A1', path: '/products/a1/' },
          { name: 'A2', path: '/products/a2/' },
        ],
      })
    ).toMatchObject({
      '@type': 'CollectionPage',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 2,
        itemListElement: [
          { '@type': 'ListItem', position: 1, url: `${SITE_ORIGIN}/products/a1/` },
          { '@type': 'ListItem', position: 2, url: `${SITE_ORIGIN}/products/a2/` },
        ],
      },
    });
  });

  it('FAQPage 的问答文本原样输出', () => {
    expect(
      faqSchema({
        locale: 'en',
        question: 'Q?',
        answer: 'A.',
        path: '/resources/faq/x/',
      })
    ).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Q?',
          acceptedAnswer: { '@type': 'Answer', text: 'A.' },
        },
      ],
    });
  });

  it('Article 未给 dateModified 时回退 datePublished', () => {
    expect(
      articleSchema({
        locale: 'en',
        headline: 'H',
        description: 'd',
        path: '/resources/guides/x/',
        datePublished: '2026-01-01',
      })
    ).toMatchObject({
      '@type': 'Article',
      datePublished: '2026-01-01',
      dateModified: '2026-01-01',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    });
  });

  it('BreadcrumbList 位置连续且 item 为绝对地址', () => {
    expect(
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Products', url: '/products/' },
      ])
    ).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, item: `${SITE_ORIGIN}/products/` },
      ],
    });
  });
});
