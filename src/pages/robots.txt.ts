import type { APIRoute } from 'astro';
import { SITE_ORIGIN } from '../lib/seo/meta';

/**
 * robots.txt 在构建期生成，而不是放在 public/。
 *
 * 放在 public/ 意味着里面要写死一份域名 —— 那会成为域名的第四个副本，
 * 换域名时最容易漏改的一处，而漏改的后果是 sitemap 地址指向一个不存在的站。
 * 这里直接复用 lib/seo/meta 的 SITE_ORIGIN（唯一来源 import.meta.env.SITE），
 * 与 canonical、JSON-LD、sitemap 同源，共用一份 origin 归一化。
 */
const base = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');

const body = [
  'User-agent: *',
  'Allow: /',
  '',
  '# 交互数据由运维写入 Cloudflare D1，站内不提供数据接口',
  '# 若日后新增 Pages Functions 接口，在此 Disallow 对应路径',
  '',
  `Sitemap: ${SITE_ORIGIN}${base}sitemap-index.xml`,
  '',
].join('\n');

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
