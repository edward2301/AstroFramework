import { definePage } from '../contract.ts';

/** 产品总览。主导航首项，带品类下拉；页脚"产品"列由品类填充 */
export default definePage({
  path: '/products/',
  layout: 'products',
  nav: {
    main: { order: 10, label: { en: 'Products', zh: '产品中心' }, dynamic: 'categories' },
    footer: {
      column: 'products',
      order: 10,
      dynamic: 'categories',
      fallbackLabel: { en: 'All products', zh: '全部产品' },
    },
  },
  seo: {
    en: {
      title: 'Industrial Components Catalog and Model Range',
      description:
        'Browse the full range of standard-model industrial components: pressure sensors and flow meters, with specifications, datasheets and replacement guidance.',
    },
    zh: {
      title: '产品总览 — 全部品类、标准型号与参数对比表',
      description:
        '按品类浏览全部在售型号，页面提供参数对比表、选型要点与采购信息，可直接进入型号页查看完整规格与替代方案，无需反复询价即可完成初步选型，节省沟通成本。',
    },
  },
});
