#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client so HOVERING the pet plays the "jumping"
 * track (for 流萤 that is the 变身/transform animation) until the mouse
 * leaves — and REPLAYS from frame 0 on EVERY hover entry.
 *
 * v2 fixes a stuck-at-last-frame bug: onPointerLeave defers setHovered(false)
 * by 300ms and onPointerEnter cancels that timer, so a quick out-and-back
 * hover never flips hovered — the effect never restarted. We now bump a
 * hoverKey counter on every pointer enter, put it in the effect deps, and
 * reset the frame state at effect start, forcing a fresh replay each entry.
 *
 * Works on the pristine client.js AND on the v1-hover-patched file.
 *
 * Usage:
 *   node patch-dsh-pet-hover.mjs              # patch installed package
 *   node patch-dsh-pet-hover.mjs --pkg <dir>  # patch a different copy
 *   node patch-dsh-pet-hover.mjs --revert     # restore from latest .bak-*
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

const ANIM_ORIG = '			const animation = snapshot?.animation ?? "idle";'
const ANIM_V1 = '			const animation = hovered && tracks.jumping !== void 0 ? "jumping" : (snapshot?.animation ?? "idle");'
const STATE_LINE = '			const [hovered, setHovered] = (0, react.useState)(false);'
const STATE_ADD = '			const [hovered, setHovered] = (0, react.useState)(false);\n			const [hoverKey, setHoverKey] = (0, react.useState)(0);'
const ENTER_FIND = '				onPointerEnter: () => {\n					clearHideTimer();\n					setHovered(true);\n				},'
const ENTER_ADD = '				onPointerEnter: () => {\n					clearHideTimer();\n					setHovered(true);\n					setHoverKey((k) => k + 1);\n				},'
const EFFECT_GUARD = '				if (props.visual !== void 0) return;\n				const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;'
const EFFECT_ADD = '				if (props.visual !== void 0) return;\n				frameRef.current.track = null;\n				frameRef.current.index = 0;\n				frameRef.current.elapsed = 0;\n				const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;'
const DEPS_V1 = '				hovered,\n				props.visual\n			]);'
const DEPS_V1_ADD = '				hovered,\n				hoverKey,\n				props.visual\n			]);'
const DEPS_ORIG = '				sequences,\n				props.visual\n			]);'
const DEPS_ORIG_ADD = '				sequences,\n				hovered,\n				hoverKey,\n				props.visual\n			]);'

function applyOne(src, find, replace, label) {
  const count = src.split(find).length - 1
  if (count !== 1) fail(label + ': expected 1 occurrence, found ' + count)
  return src.replace(find, replace)
}
function applyIfPresent(src, find, replace, label) {
  const count = src.split(find).length - 1
  if (count === 0) { console.log('   跳过（已存在）: ' + label); return src }
  if (count !== 1) fail(label + ': expected 0 or 1 occurrence, found ' + count)
  return src.replace(find, replace)
}

if (revert) {
  const bak = (() => {
    const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
    const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
    const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
    return backups.length > 0 ? join(dir, backups[backups.length - 1]) : undefined
  })()
  if (bak === undefined) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(bak, clientFile)
  console.log('✔ 已还原 ' + clientFile + '（悬停补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

// 1) hover 覆盖 animation（v1 已打则跳过）
if (src.includes('tracks.jumping !== void 0')) {
  console.log('   跳过（已存在）: hover overrides animation to jumping')
} else {
  src = applyOne(src, ANIM_ORIG, ANIM_V1, 'hover overrides animation to jumping')
  applied.push('hover overrides animation to jumping')
}

// 2) hoverKey 状态
src = applyIfPresent(src, STATE_LINE, STATE_ADD, 'hoverKey state')
if (src.includes('const [hoverKey, setHoverKey]')) applied.push('hoverKey state')

// 3) pointerenter 递增 hoverKey
src = applyIfPresent(src, ENTER_FIND, ENTER_ADD, 'pointerenter bumps hoverKey')
if (src.includes('setHoverKey((k) => k + 1)')) applied.push('pointerenter bumps hoverKey')

// 4) effect 启动时重置帧状态
src = applyIfPresent(src, EFFECT_GUARD, EFFECT_ADD, 'reset frame state at effect start')
if (src.includes('frameRef.current.track = null')) applied.push('reset frame state at effect start')

// 5) deps 加 hoverKey（兼容 v1 已加 hovered / 原始未加）
if (src.includes(DEPS_V1)) {
  src = applyOne(src, DEPS_V1, DEPS_V1_ADD, 'hoverKey in deps (v1 state)')
  applied.push('hoverKey in deps')
} else if (src.includes(DEPS_ORIG)) {
  src = applyOne(src, DEPS_ORIG, DEPS_ORIG_ADD, 'hovered + hoverKey in deps (original state)')
  applied.push('hovered + hoverKey in deps')
} else {
  fail('deps array: cannot find a recognizable dependency list')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 悬停补丁 v2 已应用到 ' + clientFile)
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('修复：每次悬停进入都从第 0 帧重播 jumping；请重启 DSH Web。')
