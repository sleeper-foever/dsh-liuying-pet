#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with FRAME INTERPOLATION (插帧):
 * 精灵表帧率低（如待机 500ms/帧 = 2fps），跳帧感明显。本补丁加一个
 * 第二精灵层，在每帧的持续时间内做 cross-fade（当前帧淡出、下一帧淡入），
 * 把离散跳变变成连续过渡，观感大幅顺滑。
 *
 * 只作用于非 sequence 分支（常见 idle/walk/…）；sequence 分支保持原样。
 * Works on pristine and all previous patches.
 * Usage:
 *   node patch-dsh-pet-interp.mjs              # patch installed package
 *   node patch-dsh-pet-interp.mjs --pkg <dir>
 *   node patch-dsh-pet-interp.mjs --revert
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

const SPRITE_REF = '\t\t\tconst spriteRef = (0, react.useRef)(null);'
const INTERP_REF_ADD = '\n\t\t\tconst interpRef = (0, react.useRef)(null);'
const CHILDREN_START = T([
  '\t\t\t\t\t\tchildren: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: spriteRef,',
])
const CHILDREN_START_NEW = T([
  '\t\t\t\t\t\tchildren: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: spriteRef,',
])
const CHILDREN_END = T([
  '\t\t\t\t\t\t\tchildren: props.visual',
  '\t\t\t\t\t\t})',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const CHILDREN_END_NEW = T([
  '\t\t\t\t\t\t\tchildren: props.visual',
  '\t\t\t\t\t\t}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: interpRef,',
  '\t\t\t\t\t\t\tclassName: pet_module_css_default.sprite,',
  '\t\t\t\t\t\t\t"aria-hidden": "true",',
  '\t\t\t\t\t\t\tstyle: {',
  '\t\t\t\t\t\t\t\tposition: "absolute",',
  '\t\t\t\t\t\t\t\tleft: 0,',
  '\t\t\t\t\t\t\t\ttop: 0,',
  '\t\t\t\t\t\t\t\twidth: spriteWidth,',
  '\t\t\t\t\t\t\t\theight: spriteHeight,',
  '\t\t\t\t\t\t\t\t...props.visual === void 0 ? {',
  '\t\t\t\t\t\t\t\t\tbackgroundImage: imageReady ? "url(" + definition.atlasUrl + ")" : void 0,',
  '\t\t\t\t\t\t\t\t\tbackgroundSize: cell.width * columns * spriteScale + "px " + cell.height * (definition.atlasRows ?? rows.length) * spriteScale + "px",',
  '\t\t\t\t\t\t\t\t\tbackgroundRepeat: "no-repeat",',
  '\t\t\t\t\t\t\t\t\tbackgroundPosition: "0 0",',
  '\t\t\t\t\t\t\t\t\topacity: 0,',
  '\t\t\t\t\t\t\t\t\tpointerEvents: "none"',
  '\t\t\t\t\t\t\t\t} : {}',
  '\t\t\t\t\t\t\t}',
  '\t\t\t\t\t\t})]',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const TICK_OLD = T([
  '\t\t\t\t\tconst st = frameRef.current;',
  '\t\t\t\t\tif (st.track !== animation) {',
  '\t\t\t\t\t\tst.track = animation;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tst.elapsed += delta;',
  '\t\t\t\t\tconst maxIndex = track.frames.length - 1;',
  '\t\t\t\t\twhile (st.elapsed >= (track.durations[st.index] ?? 0) && st.index < maxIndex) {',
  '\t\t\t\t\t\tst.elapsed -= track.durations[st.index] ?? 0;',
  '\t\t\t\t\t\tst.index += 1;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tif (st.elapsed >= (track.durations[st.index] ?? 0)) if (track.loop) {',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t} else st.index = maxIndex;',
  '\t\t\t\t\tconst col = track.frames[st.index];',
  '\t\t\t\t\tconst pos = framePosition(cell, row, col, scaleRef.current);',
  '\t\t\t\t\tconst posStr = pos.x + "px " + pos.y + "px";',
  '\t\t\t\t\tif (posStr !== lastPosStr) {',
  '\t\t\t\t\t\tlastPosStr = posStr;',
  '\t\t\t\t\t\tif (spriteRef.current !== null) spriteRef.current.style.backgroundPosition = posStr;',
  '\t\t\t\t\t}',
])
const TICK_NEW = T([
  '\t\t\t\t\tconst st = frameRef.current;',
  '\t\t\t\t\tif (st.track !== animation) {',
  '\t\t\t\t\t\tst.track = animation;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t\tst.progress = 0;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tst.elapsed += delta;',
  '\t\t\t\t\tconst maxIndex = track.frames.length - 1;',
  '\t\t\t\t\tconst dur = track.durations[st.index] ?? 0;',
  '\t\t\t\t\tif (st.index < maxIndex) {',
  '\t\t\t\t\t\tif (dur > 0) {',
  '\t\t\t\t\t\t\tst.progress = Math.min(1, st.elapsed / dur);',
  '\t\t\t\t\t\t\tif (st.progress >= 1) {',
  '\t\t\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t\t\t\tst.index += 1;',
  '\t\t\t\t\t\t\t\tst.progress = 0;',
  '\t\t\t\t\t\t\t}',
  '\t\t\t\t\t\t}',
  '\t\t\t\t\t} else if (track.loop) {',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t\tst.progress = 0;',
  '\t\t\t\t\t} else {',
  '\t\t\t\t\t\tst.progress = 1;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tconst colA = track.frames[st.index];',
  '\t\t\t\t\tconst colB = track.frames[Math.min(st.index + 1, maxIndex)];',
  '\t\t\t\t\tconst posA = framePosition(cell, row, colA, scaleRef.current);',
  '\t\t\t\t\tconst posB = framePosition(cell, row, colB, scaleRef.current);',
  '\t\t\t\t\tconst posStrA = posA.x + "px " + posA.y + "px";',
  '\t\t\t\t\tconst posStrB = posB.x + "px " + posB.y + "px";',
  '\t\t\t\t\tif (posStrA !== lastPosStr) {',
  '\t\t\t\t\t\tlastPosStr = posStrA;',
  '\t\t\t\t\t\tif (spriteRef.current !== null) spriteRef.current.style.backgroundPosition = posStrA;',
  '\t\t\t\t\t}',
  '\t\t\t\t\tif (spriteRef.current !== null) spriteRef.current.style.opacity = String(1 - st.progress);',
  '\t\t\t\t\tif (interpRef.current !== null) {',
  '\t\t\t\t\t\tinterpRef.current.style.backgroundPosition = posStrB;',
  '\t\t\t\t\t\tinterpRef.current.style.opacity = String(st.progress);',
  '\t\t\t\t\t}',
])

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（插帧补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('const interpRef = (0, react.useRef)(null);')) {
  console.log('   跳过（已存在）: interpRef')
} else {
  src = insertAfter(src, SPRITE_REF, INTERP_REF_ADD, 'interpRef')
  applied.push('interpRef')
}
if (src.includes('children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {') && src.includes('ref: interpRef,')) {
  console.log('   跳过（已存在）: 插帧第二层')
} else {
  src = once(src, CHILDREN_START, CHILDREN_START_NEW, '插帧第二层(起)')
  src = once(src, CHILDREN_END, CHILDREN_END_NEW, '插帧第二层(尾)')
  applied.push('插帧第二层（cross-fade 层）')
}
if (src.includes('st.progress = 0;')) {
  console.log('   跳过（已存在）: 插帧 tick')
} else {
  src = once(src, TICK_OLD, TICK_NEW, '插帧 tick')
  applied.push('插帧 tick（双帧淡化）')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 插帧补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：帧间自动 cross-fade 插帧，动画更顺滑。')
