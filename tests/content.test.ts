/**
 * 内容契约测试。
 *
 * validate-content.mjs 在构建时跑，但坏内容应在 `npm test` 阶段就被拦住；
 * 这里只断言「跨文件的一致性」，不重复校验脚本已覆盖的 SEO 宽度规则。
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CONTENT = path.join(process.cwd(), 'src', 'content');
const PUBLIC = path.join(process.cwd(), 'public');

const readJsonDir = (name: string) =>
  fs.existsSync(path.join(CONTENT, name))
    ? fs
        .readdirSync(path.join(CONTENT, name))
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(CONTENT, name, f), 'utf8')) }))
    : [];

const models = readJsonDir('models');
const categories = readJsonDir('categories');
const applications = readJsonDir('applications');
const cases = readJsonDir('cases');
const downloads = readJsonDir('downloads');

/* 引用用的是条目 id（文件名），不是 code（A1） */
const modelIds = new Set(models.map((m) => m.file.replace(/\.json$/, '')));

describe('型号', () => {
  it('每个型号恰好 5 项关键参数', () => {
    for (const m of models) expect(m.data.keyParams, m.file).toHaveLength(5);
  });

  it('每个型号的图片在 public/ 下存在', () => {
    const missing = models.filter((m) => m.data.image && !fs.existsSync(path.join(PUBLIC, m.data.image)));
    expect(missing.map((m) => m.file)).toEqual([]);
  });

  it('型号引用的品类都存在', () => {
    const ids = new Set(categories.map((c) => c.file.replace('.json', '')));
    const bad = models.filter((m) => !ids.has(m.data.category));
    expect(bad.map((m) => m.file)).toEqual([]);
  });

  it('停产型号给出了替代路径或明确标注', () => {
    const discontinued = models.filter((m) => m.data.status === 'discontinued');
    for (const m of discontinued) {
      expect(Array.isArray(m.data.replacement), m.file).toBe(true);
    }
  });
});

describe('品类', () => {
  it('对比列 5~7 项（表格与卡片的共同数据源）', () => {
    for (const c of categories) {
      const cols = c.data.comparisonParams ?? c.data.locales?.en?.comparisonParams ?? [];
      expect(cols.length, c.file).toBeGreaterThanOrEqual(5);
      expect(cols.length, c.file).toBeLessThanOrEqual(7);
    }
  });

  it('品类封面在 public/ 下存在', () => {
    const missing = categories.filter((c) => c.data.image && !fs.existsSync(path.join(PUBLIC, c.data.image)));
    expect(missing.map((c) => c.file)).toEqual([]);
  });
});

describe('关联完整性', () => {
  it('应用方向推荐 2~5 个真实型号', () => {
    for (const a of applications) {
      expect(a.data.recommended.length, a.file).toBeGreaterThanOrEqual(2);
      expect(a.data.recommended.length, a.file).toBeLessThanOrEqual(5);
      for (const id of a.data.recommended) expect(modelIds.has(id), a.file + ' → ' + id).toBe(true);
    }
  });

  it('案例配置清单至少 1 个真实型号', () => {
    for (const c of cases) {
      expect(c.data.config.length, c.file).toBeGreaterThanOrEqual(1);
      for (const id of c.data.config) expect(modelIds.has(id), c.file + ' → ' + id).toBe(true);
    }
  });

  it('资料文件在 public/ 下存在', () => {
    const missing = downloads.filter((d) => d.data.file && !fs.existsSync(path.join(PUBLIC, d.data.file)));
    expect(missing.map((d) => d.file)).toEqual([]);
  });
});

describe('双语内容成对', () => {
  it('指南与问答的英文/中文文件一一对应', () => {
    for (const name of ['guides', 'faqs']) {
      const dir = path.join(CONTENT, name);
      if (!fs.existsSync(dir)) continue;
      const en = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      const zhDir = path.join(dir, 'zh');
      const zh = fs.existsSync(zhDir) ? fs.readdirSync(zhDir).filter((f) => f.endsWith('.md')) : [];
      expect(en.sort(), name).toEqual(zh.sort());
    }
  });
});
