import { definePage } from '../contract.ts';

/**
 * 404。
 *
 * 两种语言各一份产物：默认语言由 pages/404.astro 输出 dist/404.html，
 * 其余语言由 pages/[lang]/404.astro 输出 dist/<prefix>/404/index.html，
 * 再由构建守卫 build-guard.mjs 按 LOCALES 复制成 dist/<prefix>/404.html
 * 供 Cloudflare Pages 按前缀就近查找。
 * 分发器完全跳过本版式（分发器是全站唯一页面组件，import 进来的组件
 * 会把样式带进所有页面的公共 CSS）。
 */
export default definePage({
  path: '/404/',
  layout: 'notFound',
  seo: {
    en: {
      title: 'Page not found — Browse Industrial Components',
      description:
        'The page you requested could not be found. Browse industrial components by category, or contact our sales team for help with model selection.',
    },
    zh: {
      title: '页面不存在 — 浏览工业标准件品类、型号与技术资料',
      description:
        '该地址可能已变更，或型号已下线。你可以按品类浏览全部在售型号，或直接联系我们确认替代方案与供货情况，产品目录与询价入口都在一页之内，通常一分钟内即可完成。',
    },
  },
});
