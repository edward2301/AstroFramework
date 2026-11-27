/**
 * 字典完整性测试。
 *
 * `Dict` 类型能保证键位一致，但保证不了「值是空串」「数组长度不同」
 * 这类运行期才暴露的问题；这里把两种语言的字典结构逐键比对。
 */
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/ui';

type Dict = Record<string, unknown>;

const paths = (node: Dict, prefix = ''): string[] =>
  Object.entries(node).flatMap(([k, v]) => {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) return paths(v as Dict, key);
    return [key];
  });

const get = (node: Dict, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, part) => (acc as Dict)?.[part], node);

const en = t('en') as unknown as Dict;
const zh = t('zh') as unknown as Dict;

describe('字典（中英）', () => {
  it('键集合完全一致', () => {
    expect(paths(zh).sort()).toEqual(paths(en).sort());
  });

  it('字符串值都不为空', () => {
    const empty: string[] = [];
    for (const key of paths(en)) {
      for (const [locale, dict] of [
        ['en', en],
        ['zh', zh],
      ] as const) {
        const v = get(dict, key);
        if (typeof v === 'string' && v.trim() === '') empty.push(locale + ':' + key);
      }
    }
    expect(empty).toEqual([]);
  });

  it('数组长度一致（步骤、要点、事实等并排文案不能错位）', () => {
    const mismatch: string[] = [];
    for (const key of paths(en)) {
      const a = get(en, key);
      const b = get(zh, key);
      if (Array.isArray(a) || Array.isArray(b)) {
        const la = Array.isArray(a) ? a.length : -1;
        const lb = Array.isArray(b) ? b.length : -1;
        if (la !== lb) mismatch.push(key + ' (' + la + ' vs ' + lb + ')');
      }
    }
    expect(mismatch).toEqual([]);
  });
});
