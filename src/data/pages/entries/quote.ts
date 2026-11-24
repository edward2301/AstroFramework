import { definePage } from '../contract.ts';

/**
 * 询价页。
 *
 * 主导航里叫「Contact」、页脚里叫「Request a Quote」，面包屑沿用页脚那条，
 * 因此 crumb 显式写出 —— 用统一推导规则会把已有产物文案改掉。
 */
export default definePage({
  path: '/contact/quote/',
  layout: 'quote',
  nav: {
    /*
     * 不设主导航项：本页与页眉 CTA「获取报价」指向同一 URL，
     * 导航里再放一次等于同一目标占两个位置；联系方式在「关于我们」页与页脚。
     */
    footer: { column: 'contact', order: 10, label: { en: 'Request a Quote', zh: '获取报价' } },
  },
  crumb: { en: 'Request a Quote', zh: '获取报价' },
  seo: {
    en: {
      title: 'Request a Quote for Industrial Components',
      description:
        'Send your model codes, required quantities and delivery country to our sales team. We reply with pricing, lead time and available alternatives.',
    },
    zh: {
      title: '获取报价 — 只需提供型号、数量与目的国即可',
      description:
        '提交所需型号与数量，我们在 1 个工作日内回复单价、交货期与可选替代方案，支持小批量试单与出口包装要求，也可按要求开具形式发票并支持多种贸易术语。',
    },
  },
});
