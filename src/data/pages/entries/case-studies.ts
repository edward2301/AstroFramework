import { definePage } from '../contract.ts';

/** 应用案例栏目页。详情页由内容集合产出 */
export default definePage({
  path: '/case-studies/',
  layout: 'section',
  nav: {
    main: { order: 30, label: { en: 'Case Studies', zh: '应用案例' } },
    footer: { column: 'company', order: 20, label: { en: 'Case Studies', zh: '应用案例' } },
  },
  seo: {
    en: {
      title: 'Case Studies — Component Deployment Notes',
      description:
        'Real deployment notes: what the customer needed, which models were selected, and how the installation performs, written for engineering evaluation.',
    },
    zh: {
      title: '应用案例 — 客户现场部署情况与型号选型记录',
      description:
        '真实部署记录：客户当时的工况需求、最终选定的型号与安装后的运行表现，为工程师与采购提供可对照的选型依据。每篇案例列出工况条件、选型理由与交付配置。',
    },
  },
  content: {
    en: {
      heading: 'Case Studies',
      intro:
        'Case studies document real deliveries: the operating conditions behind an enquiry, the model that was selected and why, and how the installation has performed since commissioning.',
      current:
        'Model pages list the application directions and replacement options relevant to each product.',
    },
    zh: {
      heading: '应用案例',
      intro: '案例记录真实交付：询价背后的工况、最终选定的型号与理由，以及投运后的表现。',
      current:
        '型号页已列出各产品相关的应用方向与替代型号，可作为选型参考。',
    },
  },
});
