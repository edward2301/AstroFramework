/**
 * 全站布局体检（本地硬门，不入 CI）。
 *
 * 对 dist 全部页面（含 /404/ 与 /zh/404/，不排除任何页面）自动测量：
 *  1. 空带：页头（或 site-header）下边线 → 首块可见内容 top，阈值 72px
 *     —— 多层边距叠加（页头内边距 + .section 上边距 + 首块自带 padding）
 *     形成的空带在 404 / 无页头页上最容易漏，靠数字抓，不靠眼睛。
 *  2. 横向溢出：scrollWidth > clientWidth（clientWidth 口径排除滚动条假象）。
 *  3. 按钮审查：全部 .btn 文案非空、高度达标（sm≥40 / 默认≥44 / lg≥48）、
 *     主按钮为信号蓝实底；桌面按设计隐藏的元素（如型号页询价条，
 *     offsetParent === null）不计异常。
 *
 * 用法：npm run build 之后
 *   node scripts/check-layout.mjs [viewportWidth]     // 默认 1600；移动端跑 390
 * 退出码：发现异常 = 1，全绿 = 0。
 *
 * 运行前提：本机装有 Microsoft Edge（可用环境变量 EDGE_PATH 覆盖路径）。
 * 脚本自行拉起 astro preview(:4323) 与 Edge CDP(:9223)，已运行则复用，结束自动清理。
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VIEWPORT = Number(process.argv[2] ?? 1600);
const PREVIEW_PORT = 4323;
const CDP_PORT = 9223;
const BASE = `http://localhost:${PREVIEW_PORT}`;
const CDP = `http://127.0.0.1:${CDP_PORT}`;
const GAP_LIMIT = 72;
const IS_WIN = process.platform === 'win32';

if (!existsSync('dist')) {
  console.error('[check-layout] 没有 dist/ —— 先跑 npm run build 再体检。');
  process.exit(2);
}

/** 收集 dist 全部页面 URL：目录式 index.html + 根/前缀级 404.html */
function collectUrls() {
  const urls = new Set();
  const walk = (dir, base = '') => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      const rel = base ? `${base}/${f}` : f;
      if (statSync(p).isDirectory()) walk(p, rel);
      else if (f === 'index.html') urls.add('/' + rel.replace(/index\.html$/, ''));
    }
  };
  walk('dist');
  if (existsSync('dist/404.html')) urls.add('/404/');
  if (existsSync('dist/zh/404.html')) urls.add('/zh/404/');
  return [...urls];
}

async function waitFor(url, label, ms = 30000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return;
    } catch { /* 未就绪，继续等 */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`[check-layout] ${label} 未在 ${ms}ms 内就绪`);
}

function killTree(pid) {
  if (IS_WIN) spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else process.kill(-pid, 'SIGKILL');
}

const spawned = [];
async function ensureServer(command, args, probe, label, useShell = false) {
  try {
    await fetch(probe);
    return null; // 已在运行，复用
  } catch { /* 需要拉起 */ }
  // Edge 必须关 shell（路径带空格会被拼接转义弄坏）；npx 在 Windows 是 .cmd，必须开 shell
  const child = spawn(command, args, { stdio: 'ignore', shell: useShell, detached: IS_WIN });
  spawned.push(child);
  await waitFor(probe, label);
  return child;
}

const edgePath =
  process.env.EDGE_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!existsSync(edgePath)) {
  console.error(`[check-layout] 找不到 Edge：${edgePath}。请安装 Edge 或设 EDGE_PATH。`);
  process.exit(2);
}

let exitCode = 0;
let edgeProc = null;
const tmp = mkdtempSync(join(tmpdir(), 'check-layout-'));
try {
  await ensureServer(
    'npx', ['astro', 'preview', '--port', String(PREVIEW_PORT)],
    `${BASE}/`, 'astro preview', true
  );
  edgeProc = await ensureServer(
    edgePath,
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
     `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(tmp, 'edge')}`, 'about:blank'],
    `${CDP}/json/version`, 'Edge CDP'
  );

  const targets = await (await fetch(`${CDP}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT,
    height: VIEWPORT < 800 ? 844 : 1000,
    deviceScaleFactor: VIEWPORT < 800 ? 2 : 1,
    mobile: VIEWPORT < 800,
  });

  const flagged = [];
  for (const url of collectUrls()) {
    await send('Page.navigate', { url: BASE + url });
    await sleep(420);
    const { result } = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const cw = document.documentElement.clientWidth;
        const overflow = document.documentElement.scrollWidth > cw;
        // 空带：有 .page-header 用页头下边线做基准；404（无页头）用 site-header 下边线 + .code。
        // 首页 hero 无页头且大顶距是设计（112–124px 呼吸位），无 page-header 也无 .code 的页面跳过间距检查
        const ph = document.querySelector('.page-header');
        const site = document.querySelector('.site-header');
        const sec = ph ? ph.nextElementSibling : document.querySelector('main section');
        const container = sec ? sec.querySelector('.container') : null;
        const first = container
          ? [...container.children].find((c) => c.getBoundingClientRect().height > 0)
          : null;
        const code = document.querySelector('.code'); // 404 数字锚点
        const baseLine = ph
          ? ph.getBoundingClientRect().bottom
          : code ? site.getBoundingClientRect().bottom : null;
        const anchor = first ?? code;
        const gap =
          baseLine !== null && anchor ? Math.round(anchor.getBoundingClientRect().top - baseLine) : null;
        const btnProblems = [];
        for (const b of document.querySelectorAll('a.btn, button.btn')) {
          const r = b.getBoundingClientRect();
          const cs = getComputedStyle(b);
          const cls = [...b.classList].filter((c) => c.startsWith('btn--')).join(',');
          if (r.width === 0 || r.height === 0 || cs.display === 'none') continue; // 按设计隐藏
          const text = b.textContent.trim();
          if (!text) btnProblems.push('空文案');
          const min = cls.includes('btn--sm') ? 40 : cls.includes('btn--lg') ? 48 : 44;
          if (Math.round(r.height) < min) btnProblems.push(\`高度\${Math.round(r.height)}<\${min}:\${text}\`);
          // 首页透明页眉的主按钮刻意降权为描边（滚动后才恢复实底），不查配色
          if (cls.includes('btn--primary') && !b.closest('.site-header--overlay')) {
            const rgb = cs.backgroundColor.match(/\\d+/g)?.slice(0, 3).join(',');
            if (rgb === '0,0,0' || rgb === '255,255,255') btnProblems.push('主按钮无蓝底:' + text);
          }
        }
        return JSON.stringify({ cw, overflow, gap, btnProblems, hasPageHeader: !!ph });
      })()`,
    });
    const s = JSON.parse(result.value);
    const band = s.gap !== null && s.gap > GAP_LIMIT;
    if (s.overflow || band || s.btnProblems.length) {
      flagged.push({ url, ...s, band });
      console.log(
        `!! ${url} | ${s.overflow ? `溢出(${s.cw}) ` : ''}${band ? `空带${s.gap}px ` : ''}${s.btnProblems.join('; ')}`
      );
    }
  }
  console.log(`\n[check-layout] ${VIEWPORT}px | 页面 ${collectUrls().length} | 异常 ${flagged.length}`);
  if (flagged.length) {
    for (const f of flagged) console.log(`FLAG ${f.url} gap=${f.gap} btn=${JSON.stringify(f.btnProblems)}`);
    exitCode = 1;
  }
  ws.close();
} finally {
  for (const p of spawned) killTree(p.pid);
  // Edge 进程退出有延迟，等它释放 user-data-dir 的文件锁再清理；删不掉也不影响结论
  await new Promise((r) => setTimeout(r, 1000));
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch { /* 锁未释放时容忍残留（系统临时目录） */ }
}
process.exit(exitCode);
