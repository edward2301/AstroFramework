import { definePage } from '../contract.ts';

/** 应用方向栏目页。详情页由内容集合产出，此条目只负责栏目入口 */
export default definePage({
  path: '/applications/',
  layout: 'section',
  nav: {
    main: { order: 20, label: { en: 'Applications', zh: '应用方向' } },
    footer: { column: 'applications', order: 10, dynamic: 'applications' },
  },
  seo: {
    en: {
      title: 'Application Directions — Match Parts to Conditions',
      description:
        'Browse components by the conditions they face: temperature, media, protection rating and mounting. Each direction lists verified suitable models.',
    },
    zh: {
      title: '应用方向 — 按工况条件匹配标准型号工业部件',
      description:
        '按工作温度、介质、防护等级与安装方式浏览工业部件，每个应用方向列出经过验证的适用型号与注意事项，帮助工程与采购在询价前缩小范围，支持按条件对比参数。',
    },
  },
  content: {
    en: {
      heading: 'Application Directions',
      intro:
        'Application directions group components by the conditions they must survive — ambient temperature, process media, protection rating and mounting style. Each direction will list the models that have been verified against those conditions, with cautions for edge cases.',
      current:
        'The fastest way to narrow a selection is the parameter comparison on each category page, or send us the operating conditions and we will reply with candidates.',
    },
    zh: {
      heading: '应用方向',
      intro:
        '应用方向按部件必须承受的工况组织选型——环境温度、介质、防护等级与安装方式。每个方向会列出经工况验证的适用型号，并标注边界条件下的注意事项。',
      current:
        '缩小选型范围最快的方式是查看各品类页的参数对比，或直接把使用条件发给我们，由我们回复候选型号。',
    },
  },
});
