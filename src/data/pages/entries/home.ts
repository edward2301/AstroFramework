import { definePage } from '../contract.ts';

/** 首页。数据来自品类与型号集合，见 lib/pages/render.ts 的 home 版式 */
export default definePage({
  path: '/',
  layout: 'home',
  seo: {
    en: {
      title: 'Industrial Components for OEM and Distributors',
      description:
        'Standard-model industrial components with full specifications, dimensional drawings, datasheets and replacement guidance for OEM and distributor sourcing.',
    },
    zh: {
      title: '工业标准件型号目录 — 压力变送器、流量计与选型支持',
      description:
        '提供压力变送器与流量计的完整型号目录，含技术规格、安装尺寸、替代型号与可下载资料，面向 OEM 与经销商的采购选型需求。可按品类、量程、接口与防护等级快速筛选。',
    },
  },
});
