/**
 * 站内路由常量（由页面条目派生，不另存一份）。
 *
 * 为什么派生而不是重新写一遍字面量：页面条目里的 `path` 决定「页面生成在哪」，
 * 组件里的链接决定「人点到哪」，两者必须是同一个值。各写一份时，改路径只改一处
 * 就会产出「页面在 A、链接指向 B」的产物——构建不报错，只有用户点到 404。
 *
 * 依赖方向：本文件 → `data/pages`（条目）→ contract。条目**不得**反过来引用本文件，
 * 否则形成循环。
 */
import { pageDef } from './pages';

/** 一级路径，取自对应页面条目 */
export const ROUTES = {
  home: pageDef('home').path,
  products: pageDef('products').path,
  applications: pageDef('applications').path,
  caseStudies: pageDef('caseStudies').path,
  certifications: pageDef('certifications').path,
  guides: pageDef('guides').path,
  faq: pageDef('faq').path,
  downloads: pageDef('downloads').path,
  about: pageDef('about').path,
  quote: pageDef('quote').path,
  notFound: pageDef('notFound').path,
} as const;

/**
 * 详情页路径拼接。
 *
 * 斜杠规则只写在这里：手写模板字符串最容易多一个或少一个斜杠，
 * 而 `/products/x//y/` 这类地址在产物里不会报错，只会 404。
 */
export const detailPath = {
  /** 品类页：/products/<品类>/ */
  category: (categoryId: string) => `${ROUTES.products}${categoryId}/`,
  /** 型号页：/products/<品类>/<型号>/ */
  model: (categoryId: string, modelId: string) =>
    `${ROUTES.products}${categoryId}/${modelId}/`,
  /** 应用方向：/applications/<id>/ */
  application: (id: string) => `${ROUTES.applications}${id}/`,
  /** 案例：/case-studies/<id>/ */
  caseStudy: (id: string) => `${ROUTES.caseStudies}${id}/`,
  /** 指南：/resources/guides/<slug>/ */
  guide: (slug: string) => `${ROUTES.guides}${slug}/`,
  /** 问答：/resources/faq/<slug>/ */
  faq: (slug: string) => `${ROUTES.faq}${slug}/`,
} as const;
