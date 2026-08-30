#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client for SMOOTHER animation:
 *
 * 根因：光效补丁的"呼吸光晕"用 @keyframes 每帧重算 filter: drop-shadow
 * （对 1536x2288 大图集做每帧模糊），这是卡顿主因。
 *
 * 优化：
 *  1) 光晕改为「静态模糊光层 + opacity 呼吸」——blur 只算一次，
 *     opacity 动画走合成器（GPU 友好，不再每帧重算 filter）
 *  2) .dshPetGlow 的 filter 动画被禁用（仅静态）——除非正在消散/召唤
 *  3) sprite / spriteWrap / 鼠标光子加 will-change + 独立图层，减少重绘
 *
 * Works on pristine and all previous patches (incl. glow / vanish).
 * Usage:
 *   node patch-dsh-pet-smooth.mjs              # patch installed package
 *   node patch-dsh-pet-smooth.mjs --pkg <dir>
 *   node patch-dsh-pet-smooth.mjs --revert
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
const SMOOTH_EFFECT = T([
  '',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (document.getElementById("dsh-pet-smooth-style") !== null) return;',
  '\t\t\t\tconst style = document.createElement("style");',
  '\t\t\t\tstyle.id = "dsh-pet-smooth-style";',
  '\t\t\t\tstyle.textContent = "@keyframes dshPetGlowPulse{0%,100%{opacity:.45}50%{opacity:1}}.dshPetGlowLayer{position:absolute;left:50%;top:50%;width:130%;height:140%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(140,255,210,.38),rgba(140,255,210,0) 68%);filter:blur(8px);pointer-events:none;z-index:0;animation:dshPetGlowPulse 2.6s ease-in-out infinite}.kz2Bea_spriteWrap{position:relative;z-index:1;will-change:transform;transform:translateZ(0)}.kz2Bea_sprite{will-change:transform;transform:translateZ(0)}.dshPetGlow:not(.dshPetDissolve):not(.dshPetSummonIn){filter:none!important;animation:none!important}#dsh-mouse-fx div{will-change:transform}@media (prefers-reduced-motion: reduce){.dshPetGlowLayer{animation:none;opacity:.6}}";',
  '\t\t\t\tdocument.head.appendChild(style);',
  '\t\t\t}, []);',
])
const WRAP_ANCHOR = T([
  '\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.spriteWrap, "dshPetGlow", vanishing && "dshPetDissolve", summonFx && "dshPetSummonIn"),',
])
const GLOW_LAYER = T([
  '\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tclassName: "dshPetGlowLayer",',
  '\t\t\t\t\t\t"aria-hidden": "true"',
  '\t\t\t\t\t}),',
])
const WRAP_ANCHOR_PLAIN = T([
  '\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tclassName: pet_module_css_default.spriteWrap,',
])
const GLOW_LAYER_PLAIN = T([
  '\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tclassName: "dshPetGlowLayer",',
  '\t\t\t\t\t\t"aria-hidden": "true"',
  '\t\t\t\t\t}),',
])

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（流畅优化补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('dsh-pet-smooth-style')) {
  console.log('   跳过（已存在）: 流畅优化样式')
} else {
  src = insertAfter(src, CLEANUP, SMOOTH_EFFECT, '流畅优化样式')
  applied.push('流畅优化样式（静态光层 + will-change）')
}
if (src.includes('dshPetGlowLayer')) {
  console.log('   跳过（已存在）: 光层元素')
} else if (src.includes(WRAP_ANCHOR)) {
  src = once(src, WRAP_ANCHOR, GLOW_LAYER + WRAP_ANCHOR, '光层元素（光效版）')
  applied.push('呼吸光层元素（替代 filter 动画）')
} else if (src.includes(WRAP_ANCHOR_PLAIN)) {
  src = once(src, WRAP_ANCHOR_PLAIN, GLOW_LAYER_PLAIN + WRAP_ANCHOR_PLAIN, '光层元素（原始版）')
  applied.push('呼吸光层元素')
} else {
  fail('cannot find spriteWrap anchor')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 流畅优化补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：光晕不再每帧重算 filter，动画更流畅。')
