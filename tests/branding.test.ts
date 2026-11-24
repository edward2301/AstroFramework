import { describe, expect, it } from 'vitest';
import { applyTitleSuffix } from '../src/lib/seo/branding';
import { SITE } from '../src/data/site';

describe('applyTitleSuffix', () => {
  it('无后缀标题补上「分隔符 + 品牌后缀」', () => {
    const out = applyTitleSuffix('Industrial Pressure Sensors');
    expect(out).toBe(`Industrial Pressure Sensors${SITE.titleSuffixSeparator}${SITE.titleSuffix}`);
  });

  it('已带后缀的标题不重复追加', () => {
    const titled = `Industrial Pressure Sensors${SITE.titleSuffixSeparator}${SITE.titleSuffix}`;
    expect(applyTitleSuffix(titled)).toBe(titled);
  });

  it('标题中「包含」品牌名不等于已带后缀（按结尾判断，不按包含判断）', () => {
    // "Example ${SITE.name} ..." 开头出现品牌词，结尾没有后缀，仍需追加
    // "Example" 共出现 3 次：句首 + SITE.name 内 + 追加的后缀
    const out = applyTitleSuffix(`Example ${SITE.name} Sensor Guide`);
    expect(out.endsWith(`${SITE.titleSuffixSeparator}${SITE.titleSuffix}`)).toBe(true);
    expect(out.match(new RegExp(SITE.titleSuffix, 'g'))!.length).toBe(3);
  });

  it('首尾空白被修剪，且修剪结果不进入双后缀', () => {
    const out = applyTitleSuffix('  Trimmed Title  ');
    expect(out).toBe(`Trimmed Title${SITE.titleSuffixSeparator}${SITE.titleSuffix}`);
  });
});
