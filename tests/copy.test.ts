import { describe, expect, it } from 'vitest';
import { findDescriptionIssues, findTitleIssues, hasPlaceholder } from '../src/lib/seo/copy';

/*
 * 正例全部取自本仓真实出现过的填充形态（修正前的原文），
 * 反例取自合法文案，用来锁死「不误伤」这条边界。
 */

describe('findTitleIssues', () => {
  it('抓出英文填充桩', () => {
    expect(findTitleIssues('Is IP65 enough for outdoor installation? — quick')).not.toHaveLength(0);
  });

  it('抓出中文填充桩，以及紧随其后的尾段重复', () => {
    const issues = findTitleIssues('户外安装用 IP65 够吗？ — 快速解答问答。问答。');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(' / ')).toContain('问答');
  });

  it('抓出中文填充桩的另一种写法', () => {
    expect(findTitleIssues('工程连接要拧多紧？ — 快速解答问答。问答。')).not.toHaveLength(0);
  });

  it('抓出以破折号结尾的截断标题', () => {
    expect(findTitleIssues('How tight should the process connection be? —')).not.toHaveLength(0);
  });

  it('抓出以省略号结尾的截断标题', () => {
    expect(findTitleIssues('The output jumps at random. Where do I start?...')).not.toHaveLength(0);
  });

  it('占位标题不算结构性缺陷，只由 hasPlaceholder 报出', () => {
    // 占位词是「内容未填充」而非「标题结构坏了」，按告警处理，不阻断构建
    expect(findTitleIssues('Model A1 — placeholder item for layout testing')).toHaveLength(0);
    expect(hasPlaceholder('Model A1 — placeholder item for layout testing')).toBe(true);
  });

  it('不误伤带冒号的正常标题', () => {
    expect(findTitleIssues('Zero drift after a few months: first checks')).toHaveLength(0);
  });

  it('不误伤中英混排、含全角括号与问号的正常标题', () => {
    expect(findTitleIssues('±0.5% FS 是什么意思？满量程误差怎么算（附算例）')).toHaveLength(0);
  });

  it('不误伤句中标点造成的分段', () => {
    expect(findTitleIssues('输出偶尔跳变，应该先查哪里？接地与走线顺序')).toHaveLength(0);
  });
});

describe('findDescriptionIssues', () => {
  it('抓出中文重复填充句', () => {
    expect(
      findDescriptionIssues('户外安装用 IP65 够吗？见说明。见说明。见说明。见说明。')
    ).not.toHaveLength(0);
  });

  it('抓出英文重复填充句', () => {
    expect(
      findDescriptionIssues('The reading drifts at zero. See notes. See notes. See notes.')
    ).not.toHaveLength(0);
  });

  it('抓出隔句重复，而不只是相邻重复', () => {
    expect(findDescriptionIssues('简短回答。装完复核零点。简短回答。')).not.toHaveLength(0);
  });

  it('占位词只由 hasPlaceholder 报出，不混进结构性问题', () => {
    expect(findDescriptionIssues('Replace this copy before launch. placeholder')).toHaveLength(0);
    expect(hasPlaceholder('Replace this copy before launch. placeholder')).toBe(true);
  });

  it('不误伤合法的中文破折号写法', () => {
    expect(
      findDescriptionIssues('FS 指满量程，误差是固定的——用具体例子说明，以及它与读数百分比的区别。')
    ).toHaveLength(0);
  });

  it('不误伤英文小数与缩写造成的分句', () => {
    expect(
      findDescriptionIssues(
        'FS means full scale, so a ±0.5% FS error is a fixed share of the range, not of the reading. A worked example shows when that difference matters.'
      )
    ).toHaveLength(0);
  });

  it('不误伤正常的两句描述', () => {
    expect(
      findDescriptionIssues(
        '从正常运行值出发，而不是系统极限值。选高一档量程，让工作点落在满量程 40%–70% 之间。'
      )
    ).toHaveLength(0);
  });
});
