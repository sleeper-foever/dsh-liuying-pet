#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with two features:
 *  1) 好感度晋升特效：affinity rank 提升时气泡庆祝（显示新等级）+ 播放 victory
 *     + 宠物轻微放大 pulse；仅在实际升级瞬间触发（首次观察不触发）。
 *  2) 启动问候：宠物挂载时按时间段打招呼（早上好/中午好/下午好/晚上好/夜深了，开拓者）
 *     并挥手；每次页面加载只打一次。
 *
 * Compatible with pristine client.js and all previous patches.
 * Usage:
 *   node patch-dsh-pet-fx.mjs              # patch installed package
 *   node patch-dsh-pet-fx.mjs --pkg <dir>
 *   node patch-dsh-pet-fx.mjs --revert
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

const STATE_ANCHORS = [
  '\t\t\tconst [chatBubble, setChatBubble] = (0, react.useState)(null);',
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
  '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);',
  '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);',
]
const FX_ADD = T([
  '\t\t\tconst [localBubble, setLocalBubble] = (0, react.useState)(null);',
  '\t\t\tconst localTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst celebrateTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst lastRankRef = (0, react.useRef)(null);',
  '\t\t\tconst greetedRef = (0, react.useRef)(false);',
  '\t\t\tconst [celebrate, setCelebrate] = (0, react.useState)(0);',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (props.visual !== void 0) return;',
  '\t\t\t\tif (greetedRef.current) return;',
  '\t\t\t\tgreetedRef.current = true;',
  '\t\t\t\tconst h = new Date().getHours();',
  '\t\t\t\tconst greet = h < 5 ? "夜深了，开拓者…" : h < 11 ? "早上好，开拓者！" : h < 13 ? "中午好，开拓者！" : h < 18 ? "下午好，开拓者！" : "晚上好，开拓者！";',
  '\t\t\t\tsetLocalBubble(greet);',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tlocalTimerRef.current = window.setTimeout(() => setLocalBubble(null), 5000);',
  '\t\t\t\tif (typeof playAction === "function") playAction("waving", 1800);',
  '\t\t\t}, []);',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tconst rank = snapshot?.affinity?.rank;',
  '\t\t\t\tif (typeof rank !== "string") return;',
  '\t\t\t\tconst prev = lastRankRef.current;',
  '\t\t\t\tlastRankRef.current = rank;',
  '\t\t\t\tif (prev === null || rank === prev) return;',
  '\t\t\t\tsetLocalBubble("好感度提升！现在是「" + rank + "」啦！🎉");',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tlocalTimerRef.current = window.setTimeout(() => setLocalBubble(null), 5000);',
  '\t\t\t\tif (typeof playAction === "function") playAction("victory", 2200);',
  '\t\t\t\tsetCelebrate((k) => k + 1);',
  '\t\t\t\tif (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current);',
  '\t\t\t\tcelebrateTimerRef.current = window.setTimeout(() => setCelebrate(0), 1200);',
  '\t\t\t}, [snapshot?.affinity?.rank]);',
  '\t\t\t(0, react.useEffect)(() => () => {',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tif (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current);',
  '\t\t\t}, []);',
])
const BUBBLE_ANCHOR = '\t\t\t\t\tfeedback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {'
const BUBBLE_ADD = T([
  '\t\t\t\t\tlocalBubble !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tref: bubbleRef,',
  '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.bubble, pet_module_css_default.bubbleStatus),',
  '\t\t\t\t\t\tchildren: localBubble',
  '\t\t\t\t\t}, "fx"),',
])
const SPRITE_CURSOR = '\t\t\t\t\t\t\t\tcursor: dragRef.current === null ? "grab" : "grabbing"'
const SPRITE_ADD = ',\n\t\t\t\t\t\t\t\ttransform: celebrate > 0 ? "scale(1.06)" : void 0,\n\t\t\t\t\t\t\t\ttransition: "transform 0.25s ease"'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（特效/问候补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

const anchor = STATE_ANCHORS.find((a) => src.includes(a))
if (anchor === undefined) fail('cannot find a client state anchor')
if (src.includes('const [localBubble, setLocalBubble]')) {
  console.log('   跳过（已存在）: fx state + effects')
} else {
  src = insertAfter(src, anchor, FX_ADD, 'fx state + effects')
  applied.push('fx state + effects')
}
if (src.includes('localBubble !== null')) {
  console.log('   跳过（已存在）: fx bubble')
} else {
  src = once(src, BUBBLE_ANCHOR, BUBBLE_ADD + '\n' + BUBBLE_ANCHOR, 'fx bubble')
  applied.push('fx bubble')
}
if (src.includes('celebrate > 0 ? "scale(1.06)"')) {
  console.log('   跳过（已存在）: celebrate pulse')
} else {
  src = once(src, SPRITE_CURSOR, SPRITE_CURSOR + SPRITE_ADD, 'celebrate pulse')
  applied.push('celebrate pulse')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 特效/问候补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：启动时按时间段打招呼；好感度升级时气泡庆祝 + victory + 放大脉冲。')
