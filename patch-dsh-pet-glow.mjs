#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client to give the pet a breathing glow
 * (光效): a soft drop-shadow halo around the character silhouette,
 * pulsing like a firefly. Pure CSS (works on any sprite2d pet).
 *
 * Changes in lib/client.js (PetSprite):
 *  1. inject one <style id="dsh-pet-glow-style"> with @keyframes dshPetGlow
 *  2. add class "dshPetGlow" to the spriteWrap element (drop-shadow on the
 *     wrapper, since .sprite has contain:paint which would clip the glow)
 *
 * Usage:
 *   node patch-dsh-pet-glow.mjs              # patch installed package
 *   node patch-dsh-pet-glow.mjs --pkg <dir>
 *   node patch-dsh-pet-glow.mjs --revert
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
const GLOW_EFFECT = T([
  '',
  '\t\t\t(0, react.useEffect)(() => {',
  '\t\t\t\tif (document.getElementById("dsh-pet-glow-style") !== null) return;',
  '\t\t\t\tconst style = document.createElement("style");',
  '\t\t\t\tstyle.id = "dsh-pet-glow-style";',
  '\t\t\t\tstyle.textContent = "@keyframes dshPetGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(120,255,200,.5))}50%{filter:drop-shadow(0 0 18px rgba(120,255,200,.9))}}.dshPetGlow{animation:dshPetGlow 2.6s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.dshPetGlow{animation:none;filter:drop-shadow(0 0 8px rgba(120,255,200,.6))}}";',
  '\t\t\t\tdocument.head.appendChild(style);',
  '\t\t\t}, []);',
])
const WRAP_CLASS = '\t\t\t\t\t\tclassName: pet_module_css_default.spriteWrap,'
const WRAP_CLASS_NEW = '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.spriteWrap, "dshPetGlow"),'

if (revert) {
  const dir = clientFile.slice(0, clientFile.lastIndexOf('/'))
  const base = clientFile.slice(clientFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), clientFile)
  console.log('✔ 已还原 ' + clientFile + '（光效补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(clientFile)) fail('missing ' + clientFile)
let src = readFileSync(clientFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = []

if (src.includes('dsh-pet-glow-style')) {
  console.log('   跳过（已存在）: 光效样式注入')
} else {
  src = insertAfter(src, CLEANUP, GLOW_EFFECT, '光效样式注入 effect')
  applied.push('光效样式注入（@keyframes dshPetGlow）')
}
if (src.includes('"dshPetGlow"')) {
  console.log('   跳过（已存在）: 光效类名')
} else {
  src = once(src, WRAP_CLASS, WRAP_CLASS_NEW, '光效类名')
  applied.push('spriteWrap 加 dshPetGlow 类')
}

writeFileSync(clientFile, src, 'utf8')
console.log('✔ 光效补丁已应用（' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('重启 DSH Web 后：宠物带萤火呼吸光晕（可改脚本里的颜色/强度）。')
