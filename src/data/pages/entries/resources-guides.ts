import { definePage } from '../contract.ts';

/**
 * 技术指南栏目页。详情页由 guides 集合产出。
 * 主导航标签是「Resources / 技术资源」，与页面标题本体的「Technical Guides」不同，
 * 所以导航文案写在 nav.label 里，不跟 heading 共用。
 */
export default definePage({
  path: '/resources/guides/',
  layout: 'section',
  nav: {
    main: { order: 40, label: { en: 'Technical Guides', zh: '技术指南' } },
    footer: { column: 'resources', order: 10, label: { en: 'Technical Guides', zh: '技术指南' } },
  },
  seo: {
    en: {
      title: 'Technical Guides — Selection, Installation, Care',
      description:
        'Engineering guides covering model selection, installation practice and maintenance for industrial components, written to support buying decisions.',
    },
    zh: {
      title: '技术指南 — 部件选型方法、安装实践与维护要点',
      description:
        '面向工程与采购的技术文章，覆盖工业部件的选型方法、安装实践与维护要点，帮助你在发起询价之前对适配性形成初步判断，文章附型号关联可直达规格页。',
    },
  },
  content: {
    en: {
      heading: 'Technical Guides',
      intro:
        'Guides cover the questions our sales engineers answer most often: how to read a specification sheet, which parameters actually decide a selection, and what to check before installation.',
      current:
        'Model pages carry the key parameters and datasheet references you need for an initial review.',
    },
    zh: {
      heading: '技术指南',
      intro:
        '指南覆盖销售工程师最常被问到的问题：如何读规格表、哪些参数真正决定选型、安装前要确认什么。',
      current: '型号页已载明关键参数与规格书信息，足以支撑初步评估。',
    },
  },
});
