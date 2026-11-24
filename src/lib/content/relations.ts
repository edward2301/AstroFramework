import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

/**
 * 关联解析。
 *
 * 正向关联（型号声明了哪些替代型号、推荐哪些案例）由型号自身的 reference 字段表达，
 * 在 models.ts 取详情时一并解析。反向关联（某型号被哪些应用推荐、被哪些案例使用）
 * 没有字段可依，只能反查 —— 集中在此，避免各页面自己写一遍过滤逻辑。
 *
 * 性能：构建期每个型号页都会查询一次反向关联。这里在加载时**一次遍历**建立
 * `Map<modelId, BacklinkIndex>` 反向索引，查询为 O(1)；
 * 若每次查询都全量 filter，复杂度是 O(页面数 × 集合大小)，集合变大后构建时间线性恶化。
 */

type BacklinkIndex = {
  applications: CollectionEntry<'applications'>[];
  cases: CollectionEntry<'cases'>[];
};

type ReverseIndex = Map<string, BacklinkIndex>;

let indexPromise: Promise<ReverseIndex> | null = null;

function loadIndex(): Promise<ReverseIndex> {
  const load = async (): Promise<ReverseIndex> => {
    const [applications, cases] = await Promise.all([
      getCollection('applications', ({ data }) => !data.draft),
      getCollection('cases', ({ data }) => !data.draft),
    ]);

    // 一次遍历登记全部反向引用，之后查询为 O(1)
    const index: ReverseIndex = new Map();
    const bucket = (modelId: string): BacklinkIndex => {
      let b = index.get(modelId);
      if (!b) {
        b = { applications: [], cases: [] };
        index.set(modelId, b);
      }
      return b;
    };

    for (const a of applications) {
      for (const r of a.data.recommended) bucket(r.id).applications.push(a);
    }
    for (const c of cases) {
      for (const r of c.data.config) bucket(r.id).cases.push(c);
    }

    return index;
  };

  // 生产构建整个进程共用一次加载；开发模式禁用缓存，避免新增内容后看不到更新
  if (!import.meta.env.PROD) return load();

  indexPromise ??= load();
  return indexPromise;
}

/** 某型号被哪些应用方向推荐、被哪些案例使用 */
export async function getModelBacklinks(modelId: string): Promise<BacklinkIndex> {
  const index = await loadIndex();

  return index.get(modelId) ?? { applications: [], cases: [] };
}
