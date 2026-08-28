#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with three pet effects:
 *  1) 好感度晋升特效：rank 提升瞬间气泡庆祝 + victory + 放大 pulse（1.06）
 *  2) 亲密度+1 小特效：points 增加（未升级）时气泡「好感度 +N ❤️」+ 小 pulse（1.03）+ 挥手
 *  3) 启动问候：按时间段打招呼（早上好/中午好/下午好/晚上好/夜深了，开拓者）+ 挥手
 *
 * 支持两种状态：原始文件（全量安装）与已打过旧版 fx 补丁的文件（原地增量升级）。
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
function insertIfMissing(src, anchor, suffix, marker, label) {
  if (src.includes(marker)) { console.log('   跳过（已存在）: ' + label); return src }
  return insertAfter(src, anchor, suffix, label)
}
const T = (lines) => lines.join('\n')

const STATE_ANCHORS = [
  '\t\t\tconst [chatBubble, setChatBubble] = (0, react.useState)(null);',
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
  '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);',
  '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);',
]
// 全量安装内容（含亲密度小特效）
const FX_ADD = T([
  '\t\t\tconst [localBubble, setLocalBubble] = (0, react.useState)(null);',
  '\t\t\tconst localTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst celebrateTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst celebrateSmallTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst lastRankRef = (0, react.useRef)(null);',
  '\t\t\tconst lastPointsRef = (0, react.useRef)(null);',
  '\t\t\tconst rankUpJustRef = (0, react.useRef)(false);',
  '\t\t\tconst greetedRef = (0, react.useRef)(false);',
  '\t\t\tconst [celebrate, setCelebrate] = (0, react.useState)(0);',
  '\t\t\tconst [celebrateSmall, setCelebrateSmall] = (0, react.useState)(0);',
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
  '\t\t\t\trankUpJustRef.current = true;',
  '\t\t\t\tsetLocalBubble("好感度提升！现在是「" + rank + "」啦！🎉");',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tlocalTimerRef.current = window.setTimeout(() => setLocalBubble(null), 5000);',
  '\t\t\t\tif (typeof playAction === "function") playAction("victory", 2200);',
  '\t\t\t\tsetCelebrate((k) => k + 1);',
  '\t\t\t\tif (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current);',
  '\t\t\t\tcelebrateTimerRef.current = window.setTimeout(() => setCelebrate(0), 1200);',
  '\t\t\t}, [snapshot?.affinity?.rank]);',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tconst pts = snapshot?.affinity?.points;',
  '\t\t\t\tif (typeof pts !== "number") return;',
  '\t\t\t\tconst prev = lastPointsRef.current;',
  '\t\t\t\tlastPointsRef.current = pts;',
  '\t\t\t\tif (prev === null || pts <= prev) return;',
  '\t\t\t\tif (rankUpJustRef.current) { rankUpJustRef.current = false; return; }',
  '\t\t\t\tconst gained = pts - prev;',
  '\t\t\t\tsetLocalBubble("好感度 +" + gained + " ❤️");',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tlocalTimerRef.current = window.setTimeout(() => setLocalBubble(null), 3000);',
  '\t\t\t\tif (typeof playAction === "function") playAction("waving", 1200);',
  '\t\t\t\tsetCelebrateSmall((k) => k + 1);',
  '\t\t\t\tif (celebrateSmallTimerRef.current !== null) window.clearTimeout(celebrateSmallTimerRef.current);',
  '\t\t\t\tcelebrateSmallTimerRef.current = window.setTimeout(() => setCelebrateSmall(0), 800);',
  '\t\t\t}, [snapshot?.affinity?.points]);',
  '\t\t\t(0, react.useEffect)(() => () => {',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tif (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current);',
  '\t\t\t\tif (celebrateSmallTimerRef.current !== null) window.clearTimeout(celebrateSmallTimerRef.current);',
  '\t\t\t}, []);',
])
// 原地升级（旧版 fx 已装时）：补亲密度小特效
const UPGRADE_STATE_ANCHOR = '\t\t\tconst [celebrate, setCelebrate] = (0, react.useState)(0);'
const UPGRADE_STATE_ADD = T([
  '\t\t\tconst celebrateSmallTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst lastPointsRef = (0, react.useRef)(null);',
  '\t\t\tconst rankUpJustRef = (0, react.useRef)(false);',
  '\t\t\tconst [celebrateSmall, setCelebrateSmall] = (0, react.useState)(0);',
])
const UPGRADE_RANK_ANCHOR = '\t\t\t\tsetLocalBubble("好感度提升！现在是「" + rank + "」啦！🎉");'
const UPGRADE_POINTS_EFFECT = T([
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tconst pts = snapshot?.affinity?.points;',
  '\t\t\t\tif (typeof pts !== "number") return;',
  '\t\t\t\tconst prev = lastPointsRef.current;',
  '\t\t\t\tlastPointsRef.current = pts;',
  '\t\t\t\tif (prev === null || pts <= prev) return;',
  '\t\t\t\tif (rankUpJustRef.current) { rankUpJustRef.current = false; return; }',
  '\t\t\t\tconst gained = pts - prev;',
  '\t\t\t\tsetLocalBubble("好感度 +" + gained + " ❤️");',
  '\t\t\t\tif (localTimerRef.current !== null) window.clearTimeout(localTimerRef.current);',
  '\t\t\t\tlocalTimerRef.current = window.setTimeout(() => setLocalBubble(null), 3000);',
  '\t\t\t\tif (typeof playAction === "function") playAction("waving", 1200);',
  '\t\t\t\tsetCelebrateSmall((k) => k + 1);',
  '\t\t\t\tif (celebrateSmallTimerRef.current !== null) window.clearTimeout(celebrateSmallTimerRef.current);',
  '\t\t\t\tcelebrateSmallTimerRef.current = window.setTimeout(() => setCelebrateSmall(0), 800);',
  '\t\t\t}, [snapshot?.affinity?.points]);',
])
const UPGRADE_RANK_END_ANCHOR = '\t\t\t}, [snapshot?.affinity?.rank]);'
const UPGRADE_CLEANUP_ANCHOR = '\t\t\t\tif (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current);'
const UPGRADE_CLEANUP_ADD = '\n\t\t\t\tif (celebrateSmallTimerRef.current !== null) window.clearTimeout(celebrateSmallTimerRef.current);'
const UPGRADE_TRANSFORM_ANCHOR = '\t\t\t\t\t\t\t\ttransform: celebrate > 0 ? "scale(1.06)" : void 0,'
const UPGRADE_TRANSFORM_ADD = '\t\t\t\t\t\t\t\ttransform: celebrate > 0 ? "scale(1.06)" : celebrateSmall > 0 ? "scale(1.03)" : void 0,'
const BUBBLE_ANCHOR = '\t\t\t\t\tfeedback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {'
const BUBBLE_ADD = T([
  '\t\t\t\t\tlocalBubble !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tref: bubbleRef,',
  '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.bubble, pet_module_css_default.bubbleStatus),',
  '\t\t\t\t\t\tchildren: localBubble',
  '\t\t\t\t\t}, "fx"),',
])
const SPRITE_CURSOR = '\t\t\t\t\t\t\t\tcursor: dragRef.current === null ? "grab" : "grabbing"'
const SPRITE_ADD = ',\n\t\t\t\t\t\t\t\ttransform: celebrate > 0 ? "scale(1.06)" : celebrateSmall > 0 ? "scale(1.03)" : void 0,\n\t\t\t\t\t\t\t\ttransition: "transform 0.25s ease"'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（fx 补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('const [localBubble, setLocalBubble]')) {
  console.log('   检测到旧版 fx 补丁，进入原地升级…')
  src = insertIfMissing(src, UPGRADE_STATE_ANCHOR, UPGRADE_STATE_ADD, 'celebrateSmallTimerRef', '亲密度小特效状态')
  src = insertIfMissing(src, UPGRADE_RANK_ANCHOR, '\n\t\t\t\trankUpJustRef.current = true;', 'rankUpJustRef.current = true', '晋升标记')
  src = insertIfMissing(src, UPGRADE_RANK_END_ANCHOR, '\n' + UPGRADE_POINTS_EFFECT, '好感度 +" + gained', '亲密度小特效 effect')
  src = insertIfMissing(src, UPGRADE_CLEANUP_ANCHOR, UPGRADE_CLEANUP_ADD, 'celebrateSmallTimerRef.current !== null) window.clearTimeout', '小特效定时器清理')
  if (src.includes('celebrate > 0 ? "scale(1.06)" : celebrateSmall > 0')) {
    console.log('   跳过（已存在）: 小特效 pulse')
  } else {
    src = once(src, UPGRADE_TRANSFORM_ANCHOR, UPGRADE_TRANSFORM_ADD, '小特效 pulse')
    applied.push('亲密度小特效 pulse')
  }
  if (!src.includes('localBubble !== null')) fail('fx bubble missing; reinstall fx patch first')
  applied.push('亲密度 +N 小特效（气泡/挥手/小脉冲）')
} else {
  const anchor = STATE_ANCHORS.find((a) => src.includes(a))
  if (anchor === undefined) fail('cannot find a client state anchor')
  src = insertAfter(src, anchor, FX_ADD, 'fx state + effects')
  applied.push('fx state + effects（晋升特效/亲密度小特效/启动问候）')
  src = once(src, BUBBLE_ANCHOR, BUBBLE_ADD + '\n' + BUBBLE_ANCHOR, 'fx bubble')
  applied.push('fx bubble')
  src = once(src, SPRITE_CURSOR, SPRITE_CURSOR + SPRITE_ADD, 'celebrate pulse')
  applied.push('celebrate pulse（1.06 / 1.03 双档）')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 特效/问候补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：启动问候 / 好感度升级大庆祝 / 亲密度 +N 小特效。')
