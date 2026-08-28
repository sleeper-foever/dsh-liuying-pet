#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client to add a care/greeting phrase pack:
 * every 40–90s the pet randomly says a caring greeting in its bubble
 * (关心/问候语言包，流萤人设，称呼"开拓者").
 *
 * Works standalone; compatible with pristine and all previous patches.
 * Usage:
 *   node patch-dsh-pet-care.mjs              # patch installed package
 *   node patch-dsh-pet-care.mjs --pkg <dir>
 *   node patch-dsh-pet-care.mjs --revert
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
  '\t\t\tconst [localBubble, setLocalBubble] = (0, react.useState)(null);',
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
  '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);',
  '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);',
]
const CARE_STATE = T([
  '\t\t\tconst [careBubble, setCareBubble] = (0, react.useState)(null);',
  '\t\t\tconst careTimerRef = (0, react.useRef)(null);',
  '\t\t\tconst careNextRef = (0, react.useRef)(null);',
])
const CLEANUP = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const CARE_LOGIC = T([
  '',
  '\t\t\tconst CARE_POOL = [',
  '\t\t\t\t"开拓者，记得多喝热水哦～",',
  '\t\t\t\t"辛苦啦，休息一下眼睛吧！",',
  '\t\t\t\t"今天也要加油哦！我会一直陪着你的～",',
  '\t\t\t\t"累了吧？摸摸头～",',
  '\t\t\t\t"记得按时吃饭！",',
  '\t\t\t\t"想我了没？我可一直看着你呢～",',
  '\t\t\t\t"代码写不动了就来陪我玩一会儿吧～",',
  '\t\t\t\t"注意保暖，别着凉了！",',
  '\t\t\t\t"早点休息，熬夜对身体不好…",',
  '\t\t\t\t"你认真做事的样子真帅！",',
  '\t\t\t\t"别太勉强自己，慢慢来～",',
  '\t\t\t\t"有我在，什么困难都不怕！",',
  '\t\t\t\t"你是最棒的开拓者！",',
  '\t\t\t\t"渴了饿了都要告诉我哦～",',
  '\t\t\t\t"好久没和你说话了…想和你聊聊天～",',
  '\t\t\t\t"我在！有什么需要帮忙的吗？",',
  '\t\t\t\t"今天也要开开心心的！",',
  '\t\t\t\t"深呼吸，放轻松一点～",',
  '\t\t\t\t"我们可是最好的搭档！",',
  '\t\t\t\t"不管发生什么，我都会陪着你。",',
  '\t\t\t];',
  '\t\t\tconst scheduleCare = () => {',
  '\t\t\t\tif (careNextRef.current !== null) window.clearTimeout(careNextRef.current);',
  '\t\t\t\tcareNextRef.current = window.setTimeout(() => {',
  '\t\t\t\t\tconst text = CARE_POOL[Math.floor(Math.random() * CARE_POOL.length)];',
  '\t\t\t\t\tsetCareBubble(text);',
  '\t\t\t\t\tif (careTimerRef.current !== null) window.clearTimeout(careTimerRef.current);',
  '\t\t\t\t\tcareTimerRef.current = window.setTimeout(() => setCareBubble(null), 5000);',
  '\t\t\t\t\tif (typeof playAction === "function") playAction("waving", 1500);',
  '\t\t\t\t\tscheduleCare();',
  '\t\t\t\t}, 90000 + Math.random() * 210000);',
  '\t\t\t};',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (props.visual !== void 0) return;',
  '\t\t\t\tscheduleCare();',
  '\t\t\t\treturn () => {',
  '\t\t\t\t\tif (careNextRef.current !== null) window.clearTimeout(careNextRef.current);',
  '\t\t\t\t\tif (careTimerRef.current !== null) window.clearTimeout(careTimerRef.current);',
  '\t\t\t\t};',
  '\t\t\t}, []);',
])
const BUBBLE_ANCHOR = '\t\t\t\t\tfeedback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {'
const CARE_BUBBLE = T([
  '\t\t\t\t\tcareBubble !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tref: bubbleRef,',
  '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.bubble, pet_module_css_default.bubbleStatus),',
  '\t\t\t\t\t\tchildren: careBubble',
  '\t\t\t\t\t}, "care"),',
])

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（关心语言包补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

const anchor = STATE_ANCHORS.find((a) => src.includes(a))
if (anchor === undefined) fail('cannot find a client state anchor')
if (src.includes('const [careBubble, setCareBubble]')) {
  console.log('   跳过（已存在）: 关心语言包状态')
} else {
  src = insertAfter(src, anchor, CARE_STATE, '关心语言包状态')
  applied.push('关心语言包状态')
}
if (src.includes('const CARE_POOL = [')) {
  if (src.includes('40000 + Math.random() * 50000')) {
    src = once(src, '\t\t\t\t}, 40000 + Math.random() * 50000);', '\t\t\t\t}, 90000 + Math.random() * 210000);', '问候频率改为 90-300 秒')
    applied.push('问候频率改为 90-300 秒')
  } else {
    console.log('   跳过（已存在）: 关心语言包逻辑（已是最新频率）')
  }
} else {
  src = insertAfter(src, CLEANUP, CARE_LOGIC, '关心语言包逻辑')
  applied.push('关心/问候语言包 + 定时器')
}
if (src.includes('careBubble !== null')) {
  console.log('   跳过（已存在）: 关心气泡渲染')
} else {
  src = once(src, BUBBLE_ANCHOR, CARE_BUBBLE + '\n' + BUBBLE_ANCHOR, '关心气泡渲染')
  applied.push('关心气泡渲染')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 关心语言包补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：宠物每 40–90 秒随机说一句关心/问候的话。')
