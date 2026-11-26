import { defineConfig } from 'vitest/config';

/**
 * Vitest 5 的默认 forks 池在 Node 24.14.1 下会让测试文件与 runner 各持一份
 * vitest 模块状态，describe 在收集阶段报 "Cannot read properties of undefined
 * (reading 'config')"。vmForks 在独立 VM 上下文里共享同一份 runner 状态，
 * 测试全部通过；不要随手改回默认池。
 */
export default defineConfig({
  test: {
    pool: 'vmForks',
  },
});
