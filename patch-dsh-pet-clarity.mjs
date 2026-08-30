#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client for CLARITY + FRAME RATE:
 *  1) 清晰度：spriteScale 吸附到 0.5 步进（整数倍像素比），消除小数缩放模糊
 *     （默认 display.size=160 / 208 ≈ 0.769 → 吸附为 1.0，原生像素、更锐利）
 *  2) 帧数：帧时长 × 0.7（约 1.4 倍速）→ 每秒播放更多帧，减少跳帧感
 *
 * 兼容原始与所有已装补丁（插帧已废弃；若 tick 仍为插帧版也能处理）。
 * Usage:
 *   node patch-dsh-pet-clarity.mjs              # patch installed package
 *   node patch-dsh-pet-clarity.mjs --pkg <dir>
 *   node patch-dsh-pet-clarity.mjs --revert
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
const T = (lines) => lines.join('\n')

const SCALE_OLD = '\t\t\tconst spriteScale = display.size / cell.height;'
const SCALE_NEW = '\t\t\tconst spriteScale = Math.max(0.5, Math.round((display.size / cell.height) * 2) / 2);'
const DUR_GE = 'st.elapsed >= (track.durations[st.index] ?? 0)'
const DUR_GE_NEW = 'st.elapsed >= ((track.durations[st.index] ?? 0) * 0.7)'
const DUR_SUB = 'st.elapsed -= track.durations[st.index] ?? 0;'
const DUR_SUB_NEW = 'st.elapsed -= (track.durations[st.index] ?? 0) * 0.7;'
const DUR_INTERP_OLD = '\t\t\t\t\tconst dur = track.durations[st.index] ?? 0;'
const DUR_INTERP_NEW = '\t\t\t\t\tconst dur = (track.durations[st.index] ?? 0) * 0.7;'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（清晰度/帧数补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('Math.round((display.size / cell.height) * 2) / 2)')) {
  console.log('   跳过（已存在）: 缩放吸附')
} else {
  src = once(src, SCALE_OLD, SCALE_NEW, '缩放吸附')
  applied.push('缩放吸附到半整数倍（清晰度）')
}

if (src.includes(DUR_INTERP_OLD)) {
  src = once(src, DUR_INTERP_OLD, DUR_INTERP_NEW, '帧时长加速（插帧版）')
  applied.push('帧时长 ×0.7（插帧版 tick）')
} else {
  if (src.includes(DUR_GE)) {
    src = src.split(DUR_GE).join(DUR_GE_NEW)
    src = once(src, DUR_SUB, DUR_SUB_NEW, '帧时长加速（减法处）')
    applied.push('帧时长 ×0.7（≈1.4 倍速）')
  } else if (src.includes(DUR_SUB)) {
    src = once(src, DUR_SUB, DUR_SUB_NEW, '帧时长加速（减法处）')
    applied.push('帧时长 ×0.7（减法处）')
  } else {
    console.log('   跳过（未找到）: 帧时长（可能已是加速版）')
  }
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 清晰度/帧数补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：宠物更清晰（整数倍像素），动画每秒帧数增加（约 1.4 倍速）。')
