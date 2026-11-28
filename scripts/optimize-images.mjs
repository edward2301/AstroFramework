/**
 * 图片优化：assets-src/ 的 PNG 母版 → public/images/ 的 WebP 发布件。
 *
 * 设计约束：构建不处理图片（§7.5）——本脚本是离线手动步骤，不在构建管线内；
 * 运营放母版后手动运行 `npm run images:optimize`，产物随代码入库。
 *
 * 用法：
 *   npm run images:optimize             # 增量：仅转换比产物新的母版
 *   npm run images:optimize -- --force  # 全量重转
 *
 * 不 resize：尺寸（黄金比 800×494 / 1200×742）与 ≤100KB 是运营出图责任（§7.5）。
 * 产物尺寸不变，只换格式；同名覆盖母版后重跑本脚本即可覆盖发布件。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const srcDir = path.join(root, 'assets-src', 'images');
const outDir = path.join(root, 'public', 'images');
const force = process.argv.includes('--force');

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith('.png')) files.push(full);
  }
  return files;
}

if (!fs.existsSync(srcDir)) {
  console.error('[images] 缺少 assets-src/images/，没有母版可转换');
  process.exit(1);
}

const masters = walk(srcDir);
let converted = 0;
let skipped = 0;

for (const src of masters) {
  const rel = path.relative(srcDir, src);
  const out = path.join(outDir, rel.replace(/\.png$/i, '.webp'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!force && fs.existsSync(out) && fs.statSync(src).mtimeMs <= fs.statSync(out).mtimeMs) {
    skipped += 1;
    continue;
  }
  await sharp(src).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(out);
  converted += 1;
  console.log(`[images] ${rel} -> ${path.relative(outDir, out)}`);
}

console.log(`[images] 完成：转换 ${converted}，跳过 ${skipped}，共 ${masters.length} 张母版`);
