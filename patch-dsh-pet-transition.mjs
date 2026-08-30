#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client for SMOOTH ACTION TRANSITIONS (衔接):
 * 切换动画/动作的瞬间（如 idle→walk），旧姿势在新动作上方淡出 180ms，
 * 掩盖姿势跳变，衔接顺滑。只发生在换动作瞬间，不做每帧 crossfade。
 * 兼容：单层形态（插帧已回滚）与数组形态（插帧残留）。
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
const TRANS_REF_ADD = '\n\t\t\tconst transRef = (0, react.useRef)(null);'
const START_SINGLE = T([
  '\t\t\t\t\t\tchildren: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: spriteRef,',
])
const START_SINGLE_NEW = T([
  '\t\t\t\t\t\tchildren: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: spriteRef,',
])
const END_SINGLE = T([
  '\t\t\t\t\t\t\tchildren: props.visual',
  '\t\t\t\t\t\t})',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const END_SINGLE_NEW = T([
  '\t\t\t\t\t\t\tchildren: props.visual',
  '\t\t\t\t\t\t}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: transRef,',
  '\t\t\t\t\t\t\tclassName: pet_module_css_default.sprite,',
  '\t\t\t\t\t\t\t"aria-hidden": "true",',
  '\t\t\t\t\t\t\tstyle: {',
  '\t\t\t\t\t\t\t\tposition: "absolute",',
  '\t\t\t\t\t\t\t\tleft: 0,',
  '\t\t\t\t\t\t\t\ttop: 0,',
  '\t\t\t\t\t\t\t\tzIndex: 0,',
  '\t\t\t\t\t\t\t\twidth: spriteWidth,',
  '\t\t\t\t\t\t\t\theight: spriteHeight,',
  '\t\t\t\t\t\t\t\t...props.visual === void 0 ? {',
  '\t\t\t\t\t\t\t\t\tbackgroundImage: imageReady ? "url(" + definition.atlasUrl + ")" : void 0,',
  '\t\t\t\t\t\t\t\t\tbackgroundSize: cell.width * columns * spriteScale + "px " + cell.height * (definition.atlasRows ?? rows.length) * spriteScale + "px",',
  '\t\t\t\t\t\t\t\t\tbackgroundRepeat: "no-repeat",',
  '\t\t\t\t\t\t\t\t\tbackgroundPosition: "0 0",',
  '\t\t\t\t\t\t\t\t\topacity: 0,',
  '\t\t\t\t\t\t\t\t\ttransition: "opacity 0.18s ease",',
  '\t\t\t\t\t\t\t\t\tpointerEvents: "none"',
  '\t\t\t\t\t\t\t\t} : {}',
  '\t\t\t\t\t\t\t}',
  '\t\t\t\t\t\t})]',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const START_ARR = T([
  '\t\t\t\t\t\tchildren: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\t\tref: spriteRef,',
])
const END_ARR = T([
  '\t\t\t\t\t\t\tchildren: props.visual',
  '\t\t\t\t\t\t})',
  '\t\t\t\t\t\t]),',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const END_ARR_NEW = END_SINGLE_NEW.slice(0, -3).concat([
  '\t\t\t\t\t}),',
  '\t\t\t\t\t}),',
  '\t\t\t\t\tprops.hud,',
])
const TICK_RESET = T([
  '\t\t\t\t\tif (st.track !== animation) {',
  '\t\t\t\t\t\tst.track = animation;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t}',
])
const TICK_RESET_NEW = T([
  '\t\t\t\t\tif (st.track !== animation) {',
  '\t\t\t\t\t\tif (spriteRef.current !== null && transRef.current !== null && lastPosStr !== "0px 0px") {',
  '\t\t\t\t\t\t\ttransRef.current.style.backgroundPosition = lastPosStr;',
  '\t\t\t\t\t\t\ttransRef.current.style.opacity = "1";',
  '\t\t\t\t\t\t\twindow.setTimeout(() => { if (transRef.current !== null) transRef.current.style.opacity = "0"; }, 190);',
  '\t\t\t\t\t\t}',
  '\t\t\t\t\t\tst.track = animation;',
  '\t\t\t\t\t\tst.index = 0;',
  '\t\t\t\t\t\tst.elapsed = 0;',
  '\t\t\t\t\t}',
])
const CLEANUP = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const LAYER_STYLE = T([
  '',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (document.getElementById("dsh-pet-transition-style") !== null) return;',
  '\t\t\t\tconst style = document.createElement("style");',
  '\t\t\t\tstyle.id = "dsh-pet-transition-style";',
  '\t\t\t\tstyle.textContent = ".kz2Bea_sprite{position:relative;z-index:1}";',
  '\t\t\t\tdocument.head.appendChild(style);',
  '\t\t\t}, []);',
])

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（动作衔接补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('const transRef = (0, react.useRef)(null);')) {
  console.log('   跳过（已存在）: transRef')
} else {
  src = insertAfter(src, SPRITE_REF, TRANS_REF_ADD, 'transRef')
  applied.push('transRef')
}
if (src.includes('ref: transRef,')) {
  console.log('   跳过（已存在）: 过渡层')
} else if (src.includes(START_ARR)) {
  src = once(src, END_ARR, END_ARR_NEW, '过渡层(数组形态)')
  applied.push('过渡层（数组形态）')
} else {
  src = once(src, START_SINGLE, START_SINGLE_NEW, '过渡层(起)')
  src = once(src, END_SINGLE, END_SINGLE_NEW, '过渡层(尾)')
  applied.push('过渡层（旧姿势淡出层）')
}
if (src.includes('transRef.current.style.backgroundPosition')) {
  console.log('   跳过（已存在）: 切换过渡逻辑')
} else {
  src = once(src, TICK_RESET, TICK_RESET_NEW, '切换过渡逻辑')
  applied.push('动作切换淡出过渡')
}
if (src.includes('dsh-pet-transition-style')) {
  console.log('   跳过（已存在）: 层级样式')
} else {
  src = insertAfter(src, CLEANUP, LAYER_STYLE, '层级样式')
  applied.push('主精灵层级样式（z-index:1）')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 动作衔接补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：切换动作时旧姿势淡出 180ms 过渡，衔接顺滑。')
