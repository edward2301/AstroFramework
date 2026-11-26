/** 文本与标识处理。纯函数，无外部依赖。 */

/**
 * 型号编码转 URL slug。
 * A1-200 / sx 200 / SX_200 统一为 sx-200，保证路径可预测。
 */
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 按字符数截断，用于描述生成 */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1).trimEnd() + '…';
}

/** 全角字符：中日韩文字、假名、谚文、全角标点与全角字母 */
const FULL_WIDTH =
  /[\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF01-\uFF60\uFFE0-\uFFE6]|[\u{20000}-\u{3FFFF}]/u;

/**
 * 计算显示宽度：全角字符按 2 计，其余按 1 计。
 *
 * 标题与描述的「长度」本质上是搜索结果页里占多宽，而不是字符个数。
 * Google 按像素宽度截断，一个汉字约占两个西文字符的位置。用宽度而不是字数，
 * 同一套阈值就能同时适用于中英文 —— 英文标题 50–60 个字符、中文标题约 20–25 个汉字，
 * 在结果页里占的宽度是相当的（均按含品牌后缀后的宽度计）。
 *
 * 若按字符数统一校验，中文标题要么被 50–60 的下限逼成一句话，要么得为中文单开一套阈值，
 * 两套阈值一旦并存就必然漂移。
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text.trim()) {
    width += FULL_WIDTH.test(ch) ? 2 : 1;
  }
  return width;
}

/** 字符个数，用于与宽度区分（如统计型号编码长度） */
export function charLength(text: string): number {
  return [...text.trim()].length;
}
