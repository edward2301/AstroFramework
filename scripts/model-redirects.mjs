/**
 * 型号旧路径 301（构建期生成）。
 *
 * 型号页 URL 已从 /products/<品类>/<型号>/ 扁平为 /products/<型号>/。
 * 旧链接必须 301 到新地址，否则外部链接与搜索结果会落到 404。
 *
 * 规则来源是内容文件本身：读 src/content/models/*.json 的 category 字段，
 * 不维护第二份型号清单。产物写到 dist/_redirects（public/_redirects 由
 * Astro 原样复制，源文件不改）；dist 每次重建，追加是幂等的。
 */
import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, LOCALE_PREFIX } from '../src/i18n/routing.ts';

const MARKER = '# 型号旧路径 301（构建期生成，勿手工维护）';

/** 读已发布型号：{ id, category } */
function readModels(root) {
  const dir = path.join(root, 'src/content/models');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (data.draft === true) return [];
      const id = file.replace(/\.json$/, '');
      const category = typeof data.category === 'string' ? data.category : '';
      if (!category) {
        throw new Error(`[redirects] 型号 ${id} 缺少 category，无法生成旧路径 301`);
      }
      return [{ id, category }];
    });
}

/**
 * 把生成规则追加到 dist/_redirects。
 * 已存在的同源规则保持不动；同源不同目标直接抛错，避免静默覆盖手工规则。
 */
export function appendModelRedirects(distDir, root = process.cwd()) {
  const file = path.join(distDir, '_redirects');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  const current = new Map();
  for (const line of existing.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [from, to] = trimmed.split(/\s+/);
    if (from && to) current.set(from, to);
  }

  const rules = [];
  for (const model of readModels(root)) {
    const flat = `/products/${model.id}/`;
    const old = `/products/${model.category}/${model.id}/`;
    for (const locale of LOCALES) {
      const prefix = LOCALE_PREFIX[locale];
      const from = `${prefix}${old}`;
      const to = `${prefix}${flat}`;
      // 带斜杠与不带斜杠都生成：外部旧链接两种写法都有，
      // 不依赖 Pages 的 auto-trailing-slash 兜底。
      for (const source of [from, from.replace(/\/$/, '')]) {
        const known = current.get(source);
        if (known && known !== to) {
          throw new Error(`[redirects] ${source} 已存在但指向 ${known}，与生成规则 ${to} 冲突`);
        }
        if (!known) rules.push(`${source}  ${to}  301`);
      }
    }
  }

  if (rules.length === 0) return 0;

  const separator = existing.endsWith('\n') || existing === '' ? '' : '\n';
  const block = `${separator}${MARKER}\n${rules.join('\n')}\n`;
  fs.appendFileSync(file, block, 'utf8');
  return rules.length;
}
