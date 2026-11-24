import { definePage } from '../contract.ts';

/** 关于我们。正文来自组织数据与界面文案，条目只提供 SEO 与导航落点 */
export default definePage({
  path: '/about/',
  layout: 'about',
  nav: {
    main: { order: 50, label: { en: 'About', zh: '关于我们' } },
    footer: { column: 'company', order: 10, label: { en: 'About Us', zh: '关于我们' } },
  },
  // 页面标题与面包屑共用这一份；页脚那条是「About Us」，与它不同，写在页脚自己的 label 里
  heading: { en: 'About', zh: '关于我们' },
  seo: {
    en: {
      title: 'About Example Industrial — OEM Component Supplier',
      description:
        'Example Industrial manufactures standard-model industrial components for OEM and distributor partners worldwide, with documented specifications.',
    },
    zh: {
      title: '关于我们 — Example Industrial 公司介绍与资质',
      description:
        '面向 OEM 与经销商提供标准型号工业部件，规格文档齐全，支持出口包装与批量交付。本页汇总公司背景、生产与质检安排、联系方式，以及询价与售后的响应时效承诺。',
    },
  },
});
