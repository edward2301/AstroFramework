// 扩展名不可省略：本模块会被 scripts/validate-content.mjs 以 Node 类型擦除方式导入
import { SITE } from '../../data/site.ts';

/**
 * 品牌后缀拼接的单点实现。
 *
 * 运行时（meta.ts 的 buildMeta）与构建期校验（scripts/validate-content.mjs）
 * 共用同一份实现，避免产物与校验因两份手写副本而各执一词。
 *
 * 按结尾判断后缀，不能按包含判断：
 * 标题里出现品牌名（如 "Example Industrial ..."）不等于已经带了后缀。
 */
export function applyTitleSuffix(title: string): string {
  const trimmed = title.trim();
  return trimmed.endsWith(SITE.titleSuffix)
    ? trimmed
    : `${trimmed}${SITE.titleSuffixSeparator}${SITE.titleSuffix}`;
}
