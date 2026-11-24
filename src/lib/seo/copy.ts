// 扩展名不可省略：本模块会被 scripts/validate-content.mjs 以 Node 类型擦除方式导入
import { displayWidth } from '../utils/text.ts';

/**
 * 标题与描述的**内容质量**判定。
 *
 * 为什么单独一个模块：与 `branding.ts` 同一约定 —— 构建期校验脚本与单测
 * 共用一份实现，规则只有一处。模板填充桩（如 `— quick` 与「简短回答。」
 * 重复五次）由机械判定拦截，不依赖人工审阅。
 *
 * 边界：只判**机械可判定**的特征，不做语法推断。
 *   · 「— quick」「— 快速解答」是明确的填充桩，命中即是缺陷；
 *   · 相邻段重复是明确的机械痕迹；
 *   · 而以破折号接小写从句结尾这种「疑似语法断裂」，中文里
 *     「误差是固定的——用具体例子说明」完全合法，用正则判必然误伤，故不判。
 */
const TITLE_STUB =
  /\s*[—–]\s*(?:quick|short answer|tl;?dr|快速解答|快速回答)\s*[。.]?$/i;

/** 标题以破折号收尾：没有哪种语言会用破折号结束一句话，必然是截断 */
const TITLE_TRAILING_DASH = /[—–]\.?\s*$/;

/** 标题以省略号收尾：同理，snippet 被裁掉的痕迹 */
const TITLE_ELLIPSIS = /[.．]{3,}\s*$/;

/**
 * 占位词。**只告警不阻断**：示例内容允许带占位标记，
 * 设成错误会让构建长期无法通过，反而逼人关掉校验；
 * 保留告警可见性即可。
 */
const PLACEHOLDER = /placeholder|lorem ipsum|\bTODO\b|\bTBD\b|\bXXX\b|待补|占位/i;

/** 是否含占位词。由调用方决定按告警处理。 */
export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text);
}

/** 标题分段符：中英文的句读与冒号都算，用于发现「问答。问答。」这类拼接 */
const TITLE_SEGMENT = /[。，、；;:：]/;

/** 描述分句符：英文句点会切开小数与缩写，配合下方宽度阈值不会误报 */
const SENTENCE = /[。．.!！?？\n]/;

/** 段/句的最小显示宽度：太短的片段（如「±0」「5%」）重复是正常写法 */
const TITLE_SEGMENT_MIN_WIDTH = 4;
const SENTENCE_MIN_WIDTH = 6;

function segments(text: string, splitter: RegExp): string[] {
  return text
    .split(splitter)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * 标题问题清单。传**不带品牌后缀**的原始 seoTitle —— 后缀是固定值，
 * 不参与内容判定，参与长度判定（那部分在 validate-content.mjs）。
 */
export function findTitleIssues(rawTitle: string): string[] {
  const title = rawTitle.trim();
  const issues: string[] = [];
  if (title === '') return issues;

  if (TITLE_STUB.test(title)) {
    issues.push('标题以填充桩结尾（— quick / — 快速解答）');
  }
  if (TITLE_TRAILING_DASH.test(title)) {
    issues.push('标题以破折号结尾，结构上必然是截断');
  }
  if (TITLE_ELLIPSIS.test(title)) {
    issues.push('标题以省略号结尾，结构上必然是截断');
  }

  const parts = segments(title, TITLE_SEGMENT);
  for (let i = 1; i < parts.length; i++) {
    const current = parts[i];
    if (displayWidth(current) < TITLE_SEGMENT_MIN_WIDTH) continue;

    if (parts[i - 1] === current) {
      issues.push(`标题里「${current}」连续重复`);
      break;
    }
    // 「快速解答问答。问答。」——后一段是前一段的尾段，等同重复
    if (parts[i - 1].endsWith(current)) {
      issues.push(`标题里「${current}」与其前一段尾部重复`);
      break;
    }
  }

  return issues;
}

/**
 * 描述问题清单。重复判定按句做全表比对，不只看相邻句 ——
 * 填充既可能连写（简短回答。简短回答。），也可能隔句复现。
 */
export function findDescriptionIssues(rawDescription: string): string[] {
  const description = rawDescription.trim();
  const issues: string[] = [];
  if (description === '') return issues;

  const seen = new Set<string>();
  for (const sentence of segments(description, SENTENCE)) {
    if (displayWidth(sentence) < SENTENCE_MIN_WIDTH) continue;
    if (seen.has(sentence)) {
      issues.push(`描述里同一句重复出现：「${sentence}」`);
      break;
    }
    seen.add(sentence);
  }

  return issues;
}
