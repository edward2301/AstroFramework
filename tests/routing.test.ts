import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_PREFIX,
  LOCALE_META,
  alternatePaths,
  localizePath,
  parsePath,
  switchLocalePath,
} from '../src/i18n/routing';
import { detailPath } from '../src/data/routes';

describe('localizePath', () => {
  it('默认语言不加前缀', () => {
    expect(localizePath('en', '/products/')).toBe('/products/');
    expect(localizePath('en', '/')).toBe('/');
  });

  it('非默认语言加前缀，且不产生双斜杠', () => {
    expect(localizePath('zh', '/products/sx-200/')).toBe('/zh/products/sx-200/');
    expect(localizePath('zh', '/')).toBe('/zh/');
  });

  it('缺前导斜杠时自动补齐', () => {
    expect(localizePath('zh', 'products/')).toBe('/zh/products/');
  });

  it('LOCALE_PREFIX 覆盖 LOCALES 的每一种语言（新增语言漏登记会编译失败）', () => {
    for (const locale of LOCALES) {
      expect(typeof LOCALE_PREFIX[locale]).toBe('string');
    }
  });
});

describe('parsePath', () => {
  it('默认语言路径解析为 en', () => {
    expect(parsePath('/products/')).toEqual({ locale: 'en', path: '/products/' });
  });

  it('带前缀路径还原语言与语言无关路径', () => {
    expect(parsePath('/zh/products/')).toEqual({ locale: 'zh', path: '/products/' });
  });

  it('语言根路径解析为 /', () => {
    expect(parsePath('/zh/')).toEqual({ locale: 'zh', path: '/' });
  });

  it('localizePath 与 parsePath 互逆', () => {
    for (const locale of LOCALES) {
      const path = '/products/sx-200/';
      expect(parsePath(localizePath(locale, path))).toEqual({ locale, path });
    }
  });
});

describe('switchLocalePath', () => {
  it('同一页面在两种语言下互相切换', () => {
    expect(switchLocalePath('zh', '/products/sx-200/')).toBe('/zh/products/sx-200/');
    expect(switchLocalePath('en', '/zh/products/sx-200/')).toBe('/products/sx-200/');
  });
});

describe('alternatePaths', () => {
  it('含全部语言与 x-default，x-default 指向默认语言', () => {
    const paths = alternatePaths('/about/');
    expect(paths.map((p) => p.hreflang)).toEqual([
      ...LOCALES.map((l) => LOCALE_META[l].htmlLang),
      'x-default',
    ]);

    const def = paths.find((p) => p.hreflang === 'x-default')!;
    expect(def.path).toBe(localizePath(DEFAULT_LOCALE, '/about/'));
  });
});

describe('detailPath', () => {
  it('型号 URL 扁平为 /products/<型号>/，不再带品类', () => {
    expect(detailPath.model('a1')).toBe('/products/a1/');
    expect(detailPath.model('sx-200')).toBe('/products/sx-200/');
  });

  it('品类 URL 保持 /products/<品类>/', () => {
    expect(detailPath.category('category-a')).toBe('/products/category-a/');
  });
});
