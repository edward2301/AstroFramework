import { definePage } from '../contract.ts';

/** 资料下载栏目页。条目由 downloads 集合产出 */
export default definePage({
  path: '/resources/downloads/',
  layout: 'section',
  nav: {
    footer: { column: 'resources', order: 30, label: { en: 'Downloads', zh: '资料下载' } },
  },
  seo: {
    en: {
      title: 'Downloads — Datasheets, Manuals and Certificates',
      description:
        'Download datasheets, installation manuals and compliance certificates for every model, with version numbers and controlled release dates for audit purposes.',
    },
    zh: {
      title: '资料下载页 — 各型号规格书、安装手册与合规证书',
      description:
        '下载各型号的规格书、安装手册与合规证书，附版本号与发布日期，便于归档与审核；文件均提供 PDF 格式，历史版本与打包清单可向来信索取，如需纸质版可随订单附寄。',
    },
  },
  content: {
    en: {
      heading: 'Downloads',
      intro:
        'Downloads gather the controlled documents for each model: datasheets, installation manuals and compliance certificates, each with a version number and release date.',
      current:
        'For a specific datasheet that is not listed, request it through the quote form.',
    },
    zh: {
      heading: '资料下载',
      intro: '资料下载汇集每个型号的受控文档：规格书、安装手册与合规证书，均带版本号与发布日期。',
      current: '若暂未列出你需要的规格书，可通过询价表单向索取。',
    },
  },
});
