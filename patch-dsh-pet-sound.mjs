#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with CLICK SOUND EFFECTS:
 *  - 点击宠物：轻快"啵"声（正弦波快速升调 + 快速衰减，Web Audio 现场合成）
 *  - 双击：更高一声；右键：更低一声
 *  - 首次点击时创建 AudioContext（浏览器要求用户手势后才能出声）
 *
 * Usage:
 *   node patch-dsh-pet-sound.mjs              # patch installed package
 *   node patch-dsh-pet-sound.mjs --pkg <dir>
 *   node patch-dsh-pet-sound.mjs --revert
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

const BUNDLE_HEAD = '\t\tlet react_jsx_runtime = require("react/jsx-runtime");'
const SFX_IIFE = T([
  '\t\t(function () {',
  '\t\t\tif (typeof window === "undefined" || window.__dshSfx !== void 0) return;',
  '\t\t\tlet audioCtx = null;',
  '\t\t\tconst ensureAudio = () => {',
  '\t\t\t\tif (audioCtx === null) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }',
  '\t\t\t\tif (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});',
  '\t\t\t\treturn audioCtx;',
  '\t\t\t};',
  '\t\t\tconst pop = (freq, dur, vol) => {',
  '\t\t\t\tconst c = ensureAudio();',
  '\t\t\t\tif (c === null) return;',
  '\t\t\t\tconst t = c.currentTime;',
  '\t\t\t\tconst o = c.createOscillator();',
  '\t\t\t\tconst g = c.createGain();',
  '\t\t\t\to.type = "sine";',
  '\t\t\t\to.frequency.setValueAtTime(freq, t);',
  '\t\t\t\to.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.08);',
  '\t\t\t\tg.gain.setValueAtTime(vol, t);',
  '\t\t\t\tg.gain.exponentialRampToValueAtTime(0.001, t + dur);',
  '\t\t\t\to.connect(g);',
  '\t\t\t\tg.connect(c.destination);',
  '\t\t\t\to.start(t);',
  '\t\t\t\to.stop(t + dur + 0.02);',
  '\t\t\t};',
  '\t\t\twindow.__dshSfx = {',
  '\t\t\t\tclick: () => pop(700, 0.12, 0.15),',
  '\t\t\t\tdbl: () => pop(950, 0.14, 0.16),',
  '\t\t\t\talt: () => pop(520, 0.16, 0.14)',
  '\t\t\t};',
  '\t\t})();',
])
const ON_PET = '\t\t\t\t\t\t\t\tprops.onPet();'
const ON_PET_ADD = '\n\t\t\t\t\t\t\t\tif (window.__dshSfx !== void 0) window.__dshSfx.click();'
const DBL_OLD = '\t\t\t\t\t\t\tonDoubleClick: () => playAction("dancing", 2000),'
const DBL_NEW = '\t\t\t\t\t\t\tonDoubleClick: () => { if (window.__dshSfx !== void 0) window.__dshSfx.dbl(); playAction("dancing", 2000); },'
const CTX_OLD = '\t\t\t\t\t\t\tonContextMenu: (e) => { e.preventDefault(); playAction("victory", 2000); },'
const CTX_NEW = '\t\t\t\t\t\t\tonContextMenu: (e) => { e.preventDefault(); if (window.__dshSfx !== void 0) window.__dshSfx.alt(); playAction("victory", 2000); },'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（点击音效补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('window.__dshSfx = {')) {
  console.log('   跳过（已存在）: 音效模块')
} else {
  src = insertAfter(src, BUNDLE_HEAD, SFX_IIFE, '音效模块')
  applied.push('Web Audio 音效模块（啵声合成）')
}
if (src.includes('window.__dshSfx.click()')) {
  console.log('   跳过（已存在）: 点击音效')
} else {
  src = once(src, ON_PET, ON_PET + ON_PET_ADD, '点击音效')
  applied.push('点击音效')
}
if (src.includes(DBL_NEW)) {
  console.log('   跳过（已存在）: 双击音效')
} else if (src.includes(DBL_OLD)) {
  src = once(src, DBL_OLD, DBL_NEW, '双击音效')
  applied.push('双击音效')
}
if (src.includes(CTX_NEW)) {
  console.log('   跳过（已存在）: 右键音效')
} else if (src.includes(CTX_OLD)) {
  src = once(src, CTX_OLD, CTX_NEW, '右键音效')
  applied.push('右键音效')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 点击音效补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：点击宠物播放"啵"声，双击更高音、右键更低音。')
