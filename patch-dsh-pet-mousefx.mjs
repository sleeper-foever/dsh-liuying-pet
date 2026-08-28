#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client with mouse light FX (page-level):
 *  - 鼠标光子环绕跟随：光标周围 6 颗萤光粒子公转（仅鼠标移动时亮起）
 *  - 拖动拖尾：拖拽宠物时路径上留下淡出光点
 *  - 点击水波：点击宠物时一道光波圆环荡开
 *
 * Global IIFE runs once at bundle load; PetSprite calls window.__dshFx.
 * Works on pristine and all previous patches.
 * Usage:
 *   node patch-dsh-pet-mousefx.mjs              # patch installed package
 *   node patch-dsh-pet-mousefx.mjs --pkg <dir>
 *   node patch-dsh-pet-mousefx.mjs --revert
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

const BUNDLE_HEAD = '\t\tlet react_jsx_runtime = require("react/jsx-runtime");'
const MOUSE_IIFE = T([
  '\t\t(function () {',
  '\t\t\tif (typeof window === "undefined" || window.__dshMouseFx === true) return;',
  '\t\t\twindow.__dshMouseFx = true;',
  '\t\t\tconst fxStyle = document.createElement("style");',
  '\t\t\tfxStyle.id = "dsh-mouse-fx-style";',
  '\t\t\tfxStyle.textContent = "@keyframes dshPhotonPulse{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:.45;transform:scale(.65)}}@keyframes dshMouseOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes dshTrailFade{0%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) translateY(-16px) scale(.25)}}@keyframes dshRippleRing{0%{opacity:.8;transform:translate(-50%,-50%) scale(.25)}100%{opacity:0;transform:translate(-50%,-50%) scale(3)}}";',
  '\t\t\tdocument.head.appendChild(fxStyle);',
  '\t\t\tconst wrap = document.createElement("div");',
  '\t\t\twrap.id = "dsh-mouse-fx";',
  '\t\t\twrap.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483640;opacity:0;transition:opacity .25s";',
  '\t\t\tconst ring = document.createElement("div");',
  '\t\t\tring.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;animation:dshMouseOrbit 3.2s linear infinite";',
  '\t\t\tfor (let i = 0; i < 6; i++) {',
  '\t\t\t\tconst p = document.createElement("span");',
  '\t\t\t\tconst a = (i / 6) * Math.PI * 2;',
  '\t\t\t\tp.style.cssText = "position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#b8ffdd;box-shadow:0 0 10px 3px rgba(130,255,205,.85);animation:dshPhotonPulse 1.8s ease-in-out " + (i * 0.25) + "s infinite";',
  '\t\t\t\tp.style.transform = "rotate(" + (a * 180 / Math.PI) + "deg) translateX(20px)";',
  '\t\t\t\tring.appendChild(p);',
  '\t\t\t}',
  '\t\t\twrap.appendChild(ring);',
  '\t\t\tdocument.body.appendChild(wrap);',
  '\t\t\tlet hideTimer = 0;',
  '\t\t\tconst show = () => { wrap.style.opacity = "1"; if (hideTimer !== 0) window.clearTimeout(hideTimer); hideTimer = window.setTimeout(() => { wrap.style.opacity = "0"; }, 1600); };',
  '\t\t\twindow.addEventListener("mousemove", (e) => { wrap.style.left = e.clientX + "px"; wrap.style.top = e.clientY + "px"; show(); }, { passive: true });',
  '\t\t\tlet lastTrail = 0;',
  '\t\t\tconst spawnTrail = (x, y) => {',
  '\t\t\t\tconst now = performance.now();',
  '\t\t\t\tif (now - lastTrail < 45) return;',
  '\t\t\t\tlastTrail = now;',
  '\t\t\t\tconst dot = document.createElement("span");',
  '\t\t\t\tdot.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;width:7px;height:7px;border-radius:50%;background:#b8ffdd;box-shadow:0 0 10px 3px rgba(130,255,205,.8);pointer-events:none;z-index:2147483640;animation:dshTrailFade .7s ease-out forwards";',
  '\t\t\t\tdocument.body.appendChild(dot);',
  '\t\t\t\twindow.setTimeout(() => dot.remove(), 800);',
  '\t\t\t};',
  '\t\t\tconst spawnRipple = (x, y) => {',
  '\t\t\t\tconst r = document.createElement("span");',
  '\t\t\t\tr.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;width:34px;height:34px;border:2px solid rgba(150,255,210,.85);border-radius:50%;box-shadow:0 0 14px 3px rgba(130,255,205,.5), inset 0 0 10px rgba(130,255,205,.4);pointer-events:none;z-index:2147483640;animation:dshRippleRing .6s ease-out forwards";',
  '\t\t\t\tdocument.body.appendChild(r);',
  '\t\t\t\twindow.setTimeout(() => r.remove(), 700);',
  '\t\t\t};',
  '\t\t\twindow.__dshFx = { spawnTrail, spawnRipple };',
  '\t\t})();',
])
const DRAG_SET = T([
  '\t\t\t\tsetDragPos({',
  '\t\t\t\t\tright,',
  '\t\t\t\t\tbottom',
  '\t\t\t\t});',
])
const DRAG_SET_ADD = T([
  '\t\t\t\tsetDragPos({',
  '\t\t\t\t\tright,',
  '\t\t\t\t\tbottom',
  '\t\t\t\t});',
  '\t\t\t\tif (window.__dshFx !== void 0) window.__dshFx.spawnTrail(e.clientX, e.clientY);',
])
const ON_PET = '\t\t\t\t\t\t\t\tprops.onPet();'
const ON_PET_ADD = '\n\t\t\t\t\t\t\t\tif (window.__dshFx !== void 0) window.__dshFx.spawnRipple(e.clientX, e.clientY);'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（鼠标光效补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('window.__dshFx = {')) {
  console.log('   跳过（已存在）: 鼠标光效全局模块')
} else {
  src = insertAfter(src, BUNDLE_HEAD, MOUSE_IIFE, '鼠标光效全局模块')
  applied.push('鼠标光子环绕 + 拖尾/水波函数')
}
if (src.includes('spawnTrail(e.clientX, e.clientY)')) {
  console.log('   跳过（已存在）: 拖尾挂钩')
} else {
  src = once(src, DRAG_SET, DRAG_SET_ADD, '拖尾挂钩')
  applied.push('拖动拖尾挂钩')
}
if (src.includes('spawnRipple(e.clientX, e.clientY)')) {
  console.log('   跳过（已存在）: 水波挂钩')
} else {
  src = once(src, ON_PET, ON_PET + ON_PET_ADD, '水波挂钩')
  applied.push('点击水波挂钩')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 鼠标光效补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：鼠标光子环绕跟随、拖动拖尾光效、点击水波荡开。')
