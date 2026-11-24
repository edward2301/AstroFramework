import { definePage } from '../contract.ts';

/** 常见问题栏目页。详情页由 faqs 集合产出 */
export default definePage({
  path: '/resources/faq/',
  layout: 'section',
  nav: {
    footer: { column: 'resources', order: 20, label: { en: 'FAQ', zh: '常见问题' } },
  },
  seo: {
    en: {
      title: 'FAQ — Specs, Ordering and After-sales Support',
      description:
        'Answers to common questions on specifications, ordering, lead times and after-sales support, maintained by our technical sales team for buyers.',
    },
    zh: {
      title: '常见问题 — 规格解读、订购流程与售后支持说明',
      description:
        '汇总关于规格解读、订购流程、交货周期与售后支持的常见问题，由技术销售团队维护并定期更新，未覆盖的问题可直接来信，通常一个工作日内回复，报价不含内部折扣条款。',
    },
  },
  content: {
    en: {
      heading: 'Frequently Asked Questions',
      intro:
        'Answers here cover specification reading, ordering steps, lead times and after-sales handling. Questions are added as they arrive through the quote form and email.',
      current:
        'Questions come from real enquiries. If your question is not listed, send it through the quote form and we will answer it directly.',
    },
    zh: {
      heading: '常见问题',
      intro:
        '这里的问题覆盖规格解读、订购流程、交货周期与售后处理，来自询价表单与邮件中的真实提问。',
      current: '若你的问题暂未列出，可通过询价表单直接发来，我们会逐条答复。',
    },
  },
});
