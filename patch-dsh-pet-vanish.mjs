#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with vanish/summon FX:
 *  - hide  : pet dissolves into light particles (光粒子消散) then hides
 *  - summon: bright light pillar first (光柱降临), then the pet fades in
 *
 * Summon detection is in-memory: hide sets window.__dshPetHidden, so the
 * pillar plays only when the pet is re-summoned (not on every page load).
 * Works on pristine and all previous patches.
 * Usage:
 *   node patch-dsh-pet-vanish.mjs              # patch installed package
 *   node patch-dsh-pet-vanish.mjs --pkg <dir>
 *   node patch-dsh-pet-vanish.mjs --revert
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
  '\t\t\tconst [careBubble, setCareBubble] = (0, react.useState)(null);',
  '\t\t\tconst [chatBubble, setChatBubble] = (0, react.useState)(null);',
  '\t\t\tconst [localBubble, setLocalBubble] = (0, react.useState)(null);',
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
  '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);',
  '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);',
]
const VANISH_STATE = T([
  '\t\t\tconst [vanishing, setVanishing] = (0, react.useState)(false);',
  '\t\t\tconst [summonFx, setSummonFx] = (0, react.useState)(false);',
])
const CLEANUP = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const VANISH_LOGIC = T([
  '',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (document.getElementById("dsh-pet-vanish-style") !== null) return;',
  '\t\t\t\tconst style = document.createElement("style");',
  '\t\t\t\tstyle.id = "dsh-pet-vanish-style";',
  '\t\t\t\tstyle.textContent = "@keyframes dshPetDissolve{0%{opacity:1;filter:brightness(1) saturate(1)}40%{opacity:.85;filter:brightness(2.2) saturate(1.4)}100%{opacity:0;filter:brightness(3) saturate(2)}}.dshPetDissolve{animation:dshPetDissolve .72s ease-in forwards}@keyframes dshPetParticle{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)}}.dshPetParticle{position:absolute;border-radius:50%;pointer-events:none;background:#dfffe9;box-shadow:0 0 8px 2px rgba(140,255,200,.9);animation:dshPetParticle .8s ease-out forwards}@keyframes dshPetPillar{0%{opacity:0;transform:translateX(-50%) scaleX(.4) scaleY(.6)}25%{opacity:.95}60%{opacity:.9;transform:translateX(-50%) scaleX(1) scaleY(1.05)}100%{opacity:0;transform:translateX(-50%) scaleX(1.25) scaleY(1.3)}}.dshPetPillar{position:absolute;left:50%;bottom:0;width:56px;height:300px;pointer-events:none;background:linear-gradient(to top,rgba(160,255,210,.95),rgba(255,255,255,.85) 35%,rgba(160,255,210,0));filter:blur(6px) brightness(1.2);border-radius:50% 50% 30% 30%;animation:dshPetPillar .95s ease-out forwards;z-index:1}@keyframes dshPetSummonIn{0%{opacity:0;transform:scale(.6) translateY(18px)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}.dshPetSummonIn{animation:dshPetSummonIn .7s ease-out}@media (prefers-reduced-motion: reduce){.dshPetDissolve,.dshPetParticle,.dshPetPillar,.dshPetSummonIn{animation:none!important;opacity:1!important}}";',
  '\t\t\t\tdocument.head.appendChild(style);',
  '\t\t\t}, []);',
  '\t\t\tconst spawnParticles = () => {',
  '\t\t\t\tconst host = floatRef.current;',
  '\t\t\t\tif (host === null) return;',
  '\t\t\t\tconst cx = host.offsetWidth / 2;',
  '\t\t\t\tconst cy = host.offsetHeight * 0.45;',
  '\t\t\t\tfor (let i = 0; i < 16; i++) {',
  '\t\t\t\t\tconst p = document.createElement("div");',
  '\t\t\t\t\tp.className = "dshPetParticle";',
  '\t\t\t\t\tconst size = 4 + Math.random() * 6;',
  '\t\t\t\t\tconst ang = Math.random() * Math.PI * 2;',
  '\t\t\t\t\tconst dist = 40 + Math.random() * 110;',
  '\t\t\t\t\tp.style.width = size + "px";',
  '\t\t\t\t\tp.style.height = size + "px";',
  '\t\t\t\t\tp.style.left = (cx + (Math.random() - 0.5) * 40) + "px";',
  '\t\t\t\t\tp.style.top = (cy + (Math.random() - 0.5) * 40) + "px";',
  '\t\t\t\t\tp.style.setProperty("--dx", Math.cos(ang) * dist + "px");',
  '\t\t\t\t\tp.style.setProperty("--dy", Math.sin(ang) * dist - 40 + "px");',
  '\t\t\t\t\tp.style.animationDelay = (Math.random() * 0.12) + "s";',
  '\t\t\t\t\thost.appendChild(p);',
  '\t\t\t\t\twindow.setTimeout(() => p.remove(), 1000);',
  '\t\t\t\t}',
  '\t\t\t};',
  '\t\t\tconst handleHide = () => {',
  '\t\t\t\tif (typeof window !== "undefined") window.__dshPetHidden = true;',
  '\t\t\t\tsetVanishing(true);',
  '\t\t\t\tspawnParticles();',
  '\t\t\t\twindow.setTimeout(() => {',
  '\t\t\t\t\tsetVanishing(false);',
  '\t\t\t\t\tprops.onHide();',
  '\t\t\t\t}, 750);',
  '\t\t\t};',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (props.visual !== void 0) return;',
  '\t\t\t\tif (typeof window !== "undefined" && window.__dshPetHidden === true) {',
  '\t\t\t\t\twindow.__dshPetHidden = false;',
  '\t\t\t\t\tsetSummonFx(true);',
  '\t\t\t\t\tif (typeof playAction === "function") playAction("waving", 1800);',
  '\t\t\t\t\tconst t = window.setTimeout(() => setSummonFx(false), 1100);',
  '\t\t\t\t\treturn () => window.clearTimeout(t);',
  '\t\t\t\t}',
  '\t\t\t}, []);',
])
const HIDE_BTN = '\t\t\t\t\t\t\t\t\t\tonClick: props.onHide,'
const HIDE_BTN_NEW = '\t\t\t\t\t\t\t\t\t\tonClick: handleHide,'
const WRAP_GLOW = '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.spriteWrap, "dshPetGlow"),'
const WRAP_GLOW_NEW = '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.spriteWrap, "dshPetGlow", vanishing && "dshPetDissolve", summonFx && "dshPetSummonIn"),'
const WRAP_PLAIN = '\t\t\t\t\t\tclassName: pet_module_css_default.spriteWrap,'
const WRAP_PLAIN_NEW = '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.spriteWrap, vanishing && "dshPetDissolve", summonFx && "dshPetSummonIn"),'
const BUBBLE_ANCHOR = '\t\t\t\t\tfeedback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {'
const PILLAR_ADD = T([
  '\t\t\t\t\tsummonFx && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tclassName: "dshPetPillar"',
  '\t\t\t\t\t}, "pillar"),',
])

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（消散/召唤特效补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

const anchor = STATE_ANCHORS.find((a) => src.includes(a))
if (anchor === undefined) fail('cannot find a client state anchor')
if (src.includes('const [vanishing, setVanishing]')) {
  console.log('   跳过（已存在）: 消散/召唤状态')
} else {
  src = insertAfter(src, anchor, VANISH_STATE, '消散/召唤状态')
  applied.push('消散/召唤状态')
}
if (src.includes('const handleHide = () =>')) {
  console.log('   跳过（已存在）: 消散/召唤逻辑')
} else {
  src = insertAfter(src, CLEANUP, VANISH_LOGIC, '消散/召唤逻辑')
  applied.push('消散/召唤逻辑（粒子+光柱+淡入）')
}
if (src.includes('onClick: handleHide,')) {
  console.log('   跳过（已存在）: 隐藏按钮')
} else {
  src = once(src, HIDE_BTN, HIDE_BTN_NEW, '隐藏按钮')
  applied.push('隐藏按钮 → handleHide')
}
if (src.includes('vanishing && "dshPetDissolve"')) {
  console.log('   跳过（已存在）: 消散类名')
} else if (src.includes(WRAP_GLOW)) {
  src = once(src, WRAP_GLOW, WRAP_GLOW_NEW, '消散/召唤类名（光效版）')
  applied.push('消散/召唤类名（光效版）')
} else {
  src = once(src, WRAP_PLAIN, WRAP_PLAIN_NEW, '消散/召唤类名')
  applied.push('消散/召唤类名')
}
if (src.includes('"pillar"')) {
  console.log('   跳过（已存在）: 光柱渲染')
} else {
  src = once(src, BUBBLE_ANCHOR, PILLAR_ADD + '\n' + BUBBLE_ANCHOR, '光柱渲染')
  applied.push('光柱渲染')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 消散/召唤特效补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：隐藏=光粒子消散，召唤=光柱降临+淡入。')
