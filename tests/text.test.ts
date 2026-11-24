import { describe, expect, it } from 'vitest';
import { displayWidth, toSlug } from '../src/lib/utils/text';

describe('displayWidth', () => {
  it('半角字符按 1 计', () => {
    expect(displayWidth('Pressure 0-10 MPa')).toBe(17);
  });

  it('全角字符按 2 计', () => {
    expect(displayWidth('压力变送器')).toBe(10);
  });

  it('中英混排按宽度累加，同一阈值适用两种语言', () => {
    expect(displayWidth('SX-200 压力变送器')).toBe(7 + 10);
  });

  it('全角标点按 2 计', () => {
    // "SX-200"(6) + "（表压）"(4 个全角 × 2)
    expect(displayWidth('SX-200（表压）')).toBe(6 + 8);
  });

  it('首尾空白不计入宽度', () => {
    expect(displayWidth('  SX-200  ')).toBe(6);
  });
});

describe('toSlug', () => {
  it('大小写、空格与下划线统一为连字符小写', () => {
    expect(toSlug('SX 200')).toBe('sx-200');
    expect(toSlug('sx_200')).toBe('sx-200');
  });

  it('去除非法字符与首尾连字符', () => {
    expect(toSlug('SX-200 (G1/4)')).toBe('sx-200-g14');
    expect(toSlug('-sx-200-')).toBe('sx-200');
  });

  it('连续分隔符折叠为单个连字符', () => {
    expect(toSlug('sx  _-- 200')).toBe('sx-200');
  });
});
