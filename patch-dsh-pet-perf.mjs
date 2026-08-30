#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client for SMOOTHER animation (perf approach):
 *  - 精灵图 image-rendering: pixelated —— 最近邻采样，避免每帧双线性重采样
 *  - framePosition 取整 —— 消除小数坐标造成的子像素抖动/重采样
 *  - 鼠标光子跟随改用 transform: translate3d —— 不再每次 mousemove 触发布局
 *  - 鼠标光效容器加 will-change（独立合成层）
 *
 * 不改变动画逻辑、不做插帧（插帧 cross-fade 已废弃）。
 * Works on pristine and all previous patches.
 * Usage:
 *   node patch-dsh-pet-perf.mjs              # patch installed package
 *   node patch-dsh-pet-perf.mjs --pkg <dir>
 *   node patch-dsh-pet-perf.mjs --revert
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const pkgArgIdx = args.indexOf('--pkg')
const pkgArg = pkgArgIdx >= 0 && args[pkgArgIdx + 1] !== undefined ? args[pkgArgIdx + 1] : undefined
const revert = args.includes('--revert')
const pkg = resolve(pkgArg ?? join(homedir(), '.dsh/profiles/web/node_modules/@linxin666/dsh-pet'))
const clientFile = join(pkg, 'lib/client.js')

function fail(msg) { console.error('✗ ' + msg); process.exit(1) }
function once(src, find, replace, label) {
  const c = src.split(find).length - 1
  if (c !== 1) fail(label + ': expected 1 occurrence, found ' + c)
  return src.replace(find, replace)
}
function insertAfter(src, anchor, suffix, label) {
  const c = src.split(anchor).length - 1
  if (c !== 1) fail(label + ': expected 1 anchor occurrence, found ' + c)
  return src.replace(anchor, anchor + suffix)
}
const T = (lines) => lines.join('\n')

const CLEANUP = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const PERF_EFFECT = T([
  '',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (document.getElementById("dsh-pet-perf-style") !== null) return;',
  '\t\t\t\tconst style = document.createElement("style");',
  '\t\t\t\tstyle.id = "dsh-pet-perf-style";',
  '\t\t\t\tstyle.textContent = ".kz2Bea_sprite{image-rendering:pixelated!important;backface-visibility:hidden}#dsh-mouse-fx{will-change:transform}@media (prefers-reduced-motion: reduce){.kz2Bea_sprite{image-rendering:auto}}";',
  '\t\t\t\tdocument.head.appendChild(style);',
  '\t\t\t}, []);',
])
const POS_OLD = T([
  '\t\tfunction framePosition(cell, row, col, scale = 1) {',
  '\t\t\treturn {',
  '\t\t\t\tx: -col * cell.width * scale,',
  '\t\t\t\ty: -row * cell.height * scale',
  '\t\t\t};',
  '\t\t}',
])
const POS_NEW = T([
  '\t\tfunction framePosition(cell, row, col, scale = 1) {',
  '\t\t\treturn {',
  '\t\t\t\tx: Math.round(-col * cell.width * scale),',
  '\t\t\t\ty: Math.round(-row * cell.height * scale)',
  '\t\t\t};',
  '\t\t}',
])
const MOVE_OLD = '\t\t\twindow.addEventListener("mousemove", (e) => { wrap.style.left = e.clientX + "px"; wrap.style.top = e.clientY + "px"; show(); }, { passive: true });'
const MOVE_NEW = '\t\t\twindow.addEventListener("mousemove", (e) => { wrap.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)"; show(); }, { passive: true });'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（性能优化补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('dsh-pet-perf-style')) {
  console.log('   跳过（已存在）: 性能样式')
} else {
  src = insertAfter(src, CLEANUP, PERF_EFFECT, '性能样式')
  applied.push('性能样式（pixelated + will-change）')
}
if (src.includes('Math.round(-col * cell.width * scale)')) {
  console.log('   跳过（已存在）: 坐标取整')
} else {
  src = once(src, POS_OLD, POS_NEW, '坐标取整')
  applied.push('framePosition 取整')
}
if (src.includes(MOVE_OLD)) {
  src = once(src, MOVE_OLD, MOVE_NEW, '鼠标跟随 transform')
  applied.push('鼠标跟随 transform')
} else if (src.includes('translate3d(" + e.clientX + "px,')) {
  console.log('   跳过（已存在）: 鼠标跟随 transform')
} else {
  console.log('   跳过（未找到）: 鼠标跟随（未装鼠标光效补丁）')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 性能优化补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：像素级采样 + 整数坐标 + 无布局抖动，动画更平滑。')
