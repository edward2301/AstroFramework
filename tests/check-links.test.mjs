import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkLinks } from '../scripts/check-links.mjs';

/**
 * checkLinks 是纯文件系统函数：给定一个 dist 目录，返回 { errors, warnings }。
 * 用临时目录构造产物形态（目录式 + 404.html 约定），覆盖：
 *   · 站内链接存在性
 *   · 语言版本配对（动态读取 LOCALE_PREFIX，非默认语言页缺对应默认语言页要报错）
 *   · 404.html 与 /zh/404/ 的配对约定，以及构建守卫复制出的 <前缀>/404.html 归一化
 */

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-'));
afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function writeFile(distDir, rel, html) {
  const full = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}

describe('checkLinks', () => {
  it('产物完整时通过，不报错误', () => {
    const dist = path.join(tmpRoot, 'ok');
    writeFile(dist, 'index.html', '<a href="/about/"><a href="/zh/">');
    writeFile(dist, 'about/index.html', '<a href="/">');
    writeFile(dist, 'zh/index.html', '<a href="/zh/about/">');
    writeFile(dist, 'zh/about/index.html', '<a href="/zh/">');
    writeFile(dist, '404.html', '<html></html>');
    writeFile(dist, 'zh/404/index.html', '<html></html>');

    const { errors, warnings } = checkLinks(dist);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('站内链接指向不存在的路径时报错', () => {
    const dist = path.join(tmpRoot, 'broken-href');
    writeFile(dist, 'index.html', '<a href="/missing/">');
    writeFile(dist, 'zh/index.html', '');

    const { errors } = checkLinks(dist);
    expect(errors.some((e) => e.msg.includes('/missing/'))).toBe(true);
  });

  it('缺少语言版本时配对检查报错，且不写死语言前缀', () => {
    const dist = path.join(tmpRoot, 'parity');
    writeFile(dist, 'only-en/index.html', '');
    writeFile(dist, 'index.html', '');
    writeFile(dist, 'zh/index.html', '');
    writeFile(dist, '404.html', '');
    writeFile(dist, 'zh/404/index.html', '');

    const { errors } = checkLinks(dist);
    const parity = errors.filter((e) => e.msg.includes('缺少语言版本'));
    // 只报现有一侧：/only-en/ 缺 /zh/only-en/（zh 侧页面不存在，无从报起）
    expect(parity.length).toBe(1);
    expect(parity[0].msg).toContain('/only-en/');
    expect(parity[0].msg).toContain('/zh/only-en/');
  });

  it('404.html 与 /zh/404/ 视为同一页面的两个语言版本', () => {
    const dist = path.join(tmpRoot, 'notfound');
    writeFile(dist, 'index.html', '');
    writeFile(dist, 'zh/index.html', '');
    writeFile(dist, '404.html', '');
    // 缺 zh/404 → 应报配对错误而非静默放过
    const missing = checkLinks(dist).errors;
    expect(missing.some((e) => e.msg.includes('/zh/404/'))).toBe(true);

    writeFile(dist, 'zh/404/index.html', '');
    expect(checkLinks(dist).errors).toEqual([]);
  });

  it('404 页页脚语言切换的自链 /404/ 不算断链（根级 404.html 特例）', () => {
    const dist = path.join(tmpRoot, 'notfound-selflink');
    writeFile(dist, 'index.html', '');
    writeFile(dist, 'zh/index.html', '');
    // 404 页页脚渲染当前页两种语言的地址：/404/ 与 /zh/404/
    writeFile(dist, '404.html', '<a href="/404/"><a href="/zh/404/">');
    writeFile(dist, 'zh/404/index.html', '');

    expect(checkLinks(dist).errors).toEqual([]);
  });

  it('PENDING_ROUTES 登记的待建页面降级为警告', async () => {
    const dist = path.join(tmpRoot, 'pending');
    writeFile(dist, 'index.html', '<a href="/applications/new-entry/">');
    writeFile(dist, 'zh/index.html', '');
    writeFile(dist, '404.html', '');
    writeFile(dist, 'zh/404/index.html', '');

    const mod = await import('../scripts/check-links.mjs');
    mod.PENDING_ROUTES.add('/applications/new-entry/');
    const { errors, warnings } = checkLinks(dist);
    mod.PENDING_ROUTES.delete('/applications/new-entry/');

    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.msg.includes('/applications/new-entry/'))).toBe(true);
  });
});
