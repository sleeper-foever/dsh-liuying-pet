#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client to add interaction-triggered animations:
 *   click        -> waving   (单击：挥手)
 *   double click -> dancing  (双击：跳舞，需 11 行补丁)
 *   right click  -> victory  (右键：胜利，需 11 行补丁)
 *   drag release -> waving   (拖拽松手：挥手)
 *   wheel        -> showcase (滚轮：按 1.5s/个 循环展示全部动作)
 *
 * Compatible with pristine client.js and with the 11-row / hover patches.
 * Usage:
 *   node patch-dsh-pet-interact.mjs              # patch installed package
 *   node patch-dsh-pet-interact.mjs --pkg <dir>
 *   node patch-dsh-pet-interact.mjs --revert
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

// ── 各锚点 ────────────────────────────────────────────────────────────────
const ANIM_LINE = '\t\t\tconst animation = hovered && tracks.jumping !== void 0 ? "jumping" : (snapshot?.animation ?? "idle");'
const HOVERKEY_LINE = '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);'
const HOVERED_LINE = '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);'
const CLEANUP_EFFECT = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const POINTER_UP_BLOCK = T([
  '\t\t\tconst onPointerUp = () => {',
  '\t\t\t\tif (dragRef.current === null) return;',
  '\t\t\t\tdragRef.current = null;',
  '\t\t\t\tif (draggedRef.current) props.onDraggingChange?.(false);',
  '\t\t\t\tif (dragPos !== null) props.onDragEnd(dragPos.right, dragPos.bottom);',
  '\t\t\t};',
])
const SPRITE_PTR_PROPS = T([
  '\t\t\t\t\t\t\tonPointerDown,',
  '\t\t\t\t\t\t\tonPointerMove,',
  '\t\t\t\t\t\t\tonPointerUp,',
])
const ON_PET = '\t\t\t\t\t\t\tprops.onPet();\n\t\t\t\t\t\t\t},'
const ON_PET_REPLACE = '\t\t\t\t\t\t\tprops.onPet();\n\t\t\t\t\t\t\t\tplayAction("waving", 1800);\n\t\t\t\t\t\t\t},'
const DEPS_V2 = T(['\t\t\t\thoverKey,', '\t\t\t\tprops.visual', '\t\t\t]);'])
const DEPS_ORIG = T(['\t\t\t\tsequences,', '\t\t\t\tprops.visual', '\t\t\t]);'])
const DEPS_V1 = T(['\t\t\t\thovered,', '\t\t\t\tprops.visual', '\t\t\t]);'])

// ── 新增内容 ───────────────────────────────────────────────────────────────
const STATE_ADD = T([
  '',
  '\t\t\tconst overrideRef = (0, react.useRef)(null);',
  '\t\t\tconst interactTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
])
const HELPERS_ADD = T([
  '',
  '\t\t\tconst playAction = (track, ms) => {',
  '\t\t\t\tif (tracks[track] === void 0) return;',
  '\t\t\t\tif (interactTimerRef.current !== null) window.clearTimeout(interactTimerRef.current);',
  '\t\t\t\toverrideRef.current = { track };',
  '\t\t\t\tsetInteractKey((k) => k + 1);',
  '\t\t\t\tinteractTimerRef.current = window.setTimeout(() => {',
  '\t\t\t\t\tif (overrideRef.current !== null && overrideRef.current.track === track) {',
  '\t\t\t\t\t\toverrideRef.current = null;',
  '\t\t\t\t\t\tsetInteractKey((k) => k + 1);',
  '\t\t\t\t\t}',
  '\t\t\t\t}, ms);',
  '\t\t\t};',
  '\t\t\tconst scheduleShowcase = () => {',
  '\t\t\t\tinteractTimerRef.current = window.setTimeout(() => {',
  '\t\t\t\t\tconst cur = overrideRef.current;',
  '\t\t\t\t\tif (cur === null || cur.showcase !== true) return;',
  '\t\t\t\t\tcur.index += 1;',
  '\t\t\t\t\tif (cur.index >= cur.names.length) {',
  '\t\t\t\t\t\toverrideRef.current = null;',
  '\t\t\t\t\t\tsetInteractKey((k) => k + 1);',
  '\t\t\t\t\t\treturn;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tsetInteractKey((k) => k + 1);',
  '\t\t\t\t\tscheduleShowcase();',
  '\t\t\t\t}, 1500);',
  '\t\t\t};',
  '\t\t\tconst playShowcase = () => {',
  '\t\t\t\tconst names = Object.keys(tracks);',
  '\t\t\t\tif (names.length === 0) return;',
  '\t\t\t\tif (interactTimerRef.current !== null) window.clearTimeout(interactTimerRef.current);',
  '\t\t\t\toverrideRef.current = { showcase: true, index: 0, names };',
  '\t\t\t\tsetInteractKey((k) => k + 1);',
  '\t\t\t\tscheduleShowcase();',
  '\t\t\t};',
  '\t\t\t(0, react.useEffect)(() => () => {',
  '\t\t\t\tif (interactTimerRef.current !== null) window.clearTimeout(interactTimerRef.current);',
  '\t\t\t}, []);',
])
const POINTER_UP_ADD = T([
  '\t\t\t\tif (draggedRef.current) playAction("waving", 1600);',
  '\t\t\t};',
])
const SPRITE_PTR_ADD = T([
  '',
  '\t\t\t\t\t\t\tonDoubleClick: () => playAction("dancing", 2000),',
  '\t\t\t\t\t\t\tonContextMenu: (e) => { e.preventDefault(); playAction("victory", 2000); },',
  '\t\t\t\t\t\t\tonWheel: () => playShowcase(),',
])
const ON_PET_ADD_REMOVED = ''
const ANIM_ADD = T([
  '\t\t\tconst overrideAnim = overrideRef.current === null ? null : overrideRef.current.showcase === true ? overrideRef.current.names[overrideRef.current.index] : overrideRef.current.track;',
  '\t\t\tconst animation = hovered && tracks.jumping !== void 0 ? "jumping" : overrideAnim !== null && tracks[overrideAnim] !== void 0 ? overrideAnim : (snapshot?.animation ?? "idle");',
])
const DEPS_V2_ADD = T(['\t\t\t\thoverKey,', '\t\t\t\tinteractKey,', '\t\t\t\tprops.visual', '\t\t\t]);'])
const DEPS_ORIG_ADD = T(['\t\t\t\tsequences,', '\t\t\t\thovered,', '\t\t\t\tinteractKey,', '\t\t\t\tprops.visual', '\t\t\t]);'])
const DEPS_V1_ADD = T(['\t\t\t\thovered,', '\t\t\t\tinteractKey,', '\t\t\t\tprops.visual', '\t\t\t]);'])

// ── 执行 ──────────────────────────────────────────────────────────────────
if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（交互补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

// 1) 状态与 refs（兼容 v2 已含 hoverKey / v1 只有 hovered）
if (src.includes(HOVERKEY_LINE)) {
  src = insertAfter(src, HOVERKEY_LINE, STATE_ADD, 'state/refs after hoverKey')
} else {
  src = insertAfter(src, HOVERED_LINE, STATE_ADD, 'state/refs after hovered')
}
applied.push('override/interact state + refs')

// 2) 交互辅助函数
src = insertAfter(src, CLEANUP_EFFECT, HELPERS_ADD, 'interaction helpers')
applied.push('interaction helpers (playAction/showcase)')

// 3) 拖拽松手 -> waving
src = once(src, POINTER_UP_BLOCK, POINTER_UP_BLOCK.replace(/(\t\t\t};)$/, POINTER_UP_ADD), 'drag release -> waving')

// 4) sprite 元素加 onDoubleClick / onContextMenu / onWheel
src = insertAfter(src, SPRITE_PTR_PROPS, SPRITE_PTR_ADD, 'sprite interaction props')

// 5) 单击追加 waving
src = once(src, ON_PET, ON_PET_REPLACE, 'click -> waving')

// 6) 动画取值加 override（兼容已打 hover 补丁 / 原始文件两种动画行）
if (src.includes(ANIM_LINE)) {
  src = once(src, ANIM_LINE, ANIM_ADD, 'animation override')
} else {
  const ANIM_ORIG = '\t\t\tconst animation = snapshot?.animation ?? "idle";'
  src = once(src, ANIM_ORIG, ANIM_ADD, 'animation override (original line)')
}

// 7) deps 加 interactKey
if (src.includes(DEPS_V2)) {
  src = once(src, DEPS_V2, DEPS_V2_ADD, 'interactKey in deps (v2)')
} else if (src.includes(DEPS_V1)) {
  src = once(src, DEPS_V1, DEPS_V1_ADD, 'interactKey in deps (v1)')
} else if (src.includes(DEPS_ORIG)) {
  src = once(src, DEPS_ORIG, DEPS_ORIG_ADD, 'interactKey in deps (original)')
} else {
  fail('deps array: cannot find a recognizable dependency list')
}
applied.push('interactKey in deps')

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 交互补丁已应用到 ' + clientFile)
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('效果：单击挥手 / 双击跳舞 / 右键胜利 / 拖拽松手挥手 / 滚轮循环展示全部动作。请重启 DSH Web。')
