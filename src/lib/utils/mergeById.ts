/**
 * 按 id 合并去重：主列表在前，补充列表中 id 未出现过的追加到尾部。
 *
 * 收敛前该函数在 en/zh 两个镜像页各有一份；单路由收敛后只有这一处，
 * 供型号页合并「正向关联 + 反向关联」使用。
 */
export function mergeById<T extends { id: string }>(primary: T[], extra: T[]): T[] {
  const seen = new Set(primary.map((item) => item.id));
  return [...primary, ...extra.filter((item) => !seen.has(item.id))];
}
