import { describe, expect, it } from 'vitest';
import { SEO_LIMITS, SITE } from '../src/data/site';
import { absoluteUrl, buildMeta, SITE_ORIGIN } from '../src/lib/seo/meta';
import { displayWidth } from '../src/lib/utils/text';

const suffix = `${SITE.titleSuffixSeparator}${SITE.titleSuffix}`;
// displayWidth 会 trim：单独量后缀得到 9（前导空格被去掉），
// 但拼到标题后面时那个空格计入宽度，实际贡献是 10。
const suffixWidth = displayWidth(`A${suffix}`) - displayWidth('A');
/** 生成「加后缀后显示宽度恰好为 width」的纯 ASCII 标题本体 */
const label = (width: number) => 'A'.repeat(width - suffixWidth);
const description = (width: number) => 'D'.repeat(width);

describe('buildMeta', () => {
  it('补品牌后缀并修剪首尾空白', () => {
    const out = buildMeta(`  ${label(SEO_LIMITS.titleMin)}  `, `  ${description(SEO_LIMITS.descriptionMin)}  `);
    expect(out.title).toBe(`${label(SEO_LIMITS.titleMin)}${suffix}`);
    expect(out.description).toBe(description(SEO_LIMITS.descriptionMin));
  });

  it('标题已带后缀时不重复追加', () => {
    const titled = `${label(SEO_LIMITS.titleMin)}${suffix}`;
    expect(buildMeta(titled, description(SEO_LIMITS.descriptionMin)).title).toBe(titled);
  });

  it('宽度按显示宽度算：中文全角计 2', () => {
    // 后缀宽度 10，20 个汉字 = 40 + 10 = 50；19 个 = 38 + 10 = 48，低于下限
    expect(() => buildMeta('压'.repeat(20), description(SEO_LIMITS.descriptionMin))).not.toThrow();
    expect(() => buildMeta('压'.repeat(19), description(SEO_LIMITS.descriptionMin))).toThrow(/标题宽度 48/);
  });

  it('标题过短或过长都抛错，并带上页面标识', () => {
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMin - 1), description(SEO_LIMITS.descriptionMin), 'products/a1/')
    ).toThrow(/products\/a1\/.*标题宽度/);
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMax + 1), description(SEO_LIMITS.descriptionMin))
    ).toThrow(/标题宽度/);
  });

  it('描述过短或过长都抛错', () => {
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMin), description(SEO_LIMITS.descriptionMin - 1))
    ).toThrow(/描述宽度/);
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMin), description(SEO_LIMITS.descriptionMax + 1))
    ).toThrow(/描述宽度/);
  });

  it('上下边界值刚好通过', () => {
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMin), description(SEO_LIMITS.descriptionMin))
    ).not.toThrow();
    expect(() =>
      buildMeta(label(SEO_LIMITS.titleMax), description(SEO_LIMITS.descriptionMax))
    ).not.toThrow();
  });
});

describe('absoluteUrl', () => {
  it('生成带尾斜杠的绝对地址', () => {
    expect(absoluteUrl('/products/a1/')).toBe(`${SITE_ORIGIN}/products/a1/`);
  });

  it('去掉前导斜杠，避免拼出双斜杠', () => {
    expect(absoluteUrl('products/a1/')).toBe(`${SITE_ORIGIN}/products/a1/`);
  });
});
