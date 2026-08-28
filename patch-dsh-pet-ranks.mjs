#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet affinity ranks (host side, lib/state-DrMX22GL.js):
 *  every 10 affinity points = one rank up, ladder:
 *    幼鲸(0) → 伙伴(10) → 挚友(20) → 深海羁绊(30) → 海师(40) → 海尊(50) →
 *    海宗(60) → 海王(70) → 海帝(80) → 海圣(90) → 海神(100)
 * (points above 100 stay 海神; AFFINITY_MAX unchanged)
 *
 * Usage:
 *   node patch-dsh-pet-ranks.mjs              # patch installed package
 *   node patch-dsh-pet-ranks.mjs --pkg <dir>
 *   node patch-dsh-pet-ranks.mjs --revert
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const pkgArgIdx = args.indexOf('--pkg')
const pkgArg = pkgArgIdx >= 0 && args[pkgArgIdx + 1] !== undefined ? args[pkgArgIdx + 1] : undefined
const revert = args.includes('--revert')
const pkg = resolve(pkgArg ?? join(homedir(), '.dsh/profiles/web/node_modules/@linxin666/dsh-pet'))
const stateFile = join(pkg, 'lib/state-DrMX22GL.js')

function fail(msg) { console.error('✗ ' + msg); process.exit(1) }

const OLD_COMMENT = '/** Affinity ranks by points; the pet visibly grows with its rank.\n*  The original four tiers (0/25/50/80) are unchanged; higher tiers reach\n*  into the extended cap so the ladder stays meaningful for veteran\n*  companions. Marker glyphs are plain ASCII (the repo bans all emoji\n*  characters); they read as a growing star trail alongside the rank name. */'
const NEW_COMMENT = '/** Affinity ranks by points; the pet visibly grows with its rank.\n*  Ten points per rank: 幼鲸 → 伙伴 → 挚友 → 深海羁绊 → 海师 → 海尊 →\n*  海宗 → 海王 → 海帝 → 海圣 → 海神（0/10/20/…/100）。\n*  Marker glyphs are plain ASCII star trails. */'

const NEW_ARRAY = [
  'const AFFINITY_RANKS = [',
  '\t{',
  '\t\tmin: 0,',
  '\t\tname: "幼鲸",',
  '\t\temoji: "*"',
  '\t},',
  '\t{',
  '\t\tmin: 10,',
  '\t\tname: "伙伴",',
  '\t\temoji: "**"',
  '\t},',
  '\t{',
  '\t\tmin: 20,',
  '\t\tname: "挚友",',
  '\t\temoji: "***"',
  '\t},',
  '\t{',
  '\t\tmin: 30,',
  '\t\tname: "深海羁绊",',
  '\t\temoji: "****"',
  '\t},',
  '\t{',
  '\t\tmin: 40,',
  '\t\tname: "海师",',
  '\t\temoji: "*****"',
  '\t},',
  '\t{',
  '\t\tmin: 50,',
  '\t\tname: "海尊",',
  '\t\temoji: "******"',
  '\t},',
  '\t{',
  '\t\tmin: 60,',
  '\t\tname: "海宗",',
  '\t\temoji: "*******"',
  '\t},',
  '\t{',
  '\t\tmin: 70,',
  '\t\tname: "海王",',
  '\t\temoji: "********"',
  '\t},',
  '\t{',
  '\t\tmin: 80,',
  '\t\tname: "海帝",',
  '\t\temoji: "*********"',
  '\t},',
  '\t{',
  '\t\tmin: 90,',
  '\t\tname: "海圣",',
  '\t\temoji: "**********"',
  '\t},',
  '\t{',
  '\t\tmin: 100,',
  '\t\tname: "海神",',
  '\t\temoji: "***********"',
  '\t}',
  '];',
].join('\n')

if (revert) {
  const dir = stateFile.slice(0, stateFile.lastIndexOf('/'))
  const base = stateFile.slice(stateFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + stateFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), stateFile)
  console.log('✔ 已还原 ' + stateFile + '（等级补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(stateFile)) fail('missing ' + stateFile)
let src = readFileSync(stateFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(stateFile, stateFile + '.bak-' + ts)
const applied = []

if (src.includes('name: "海神"')) {
  console.log('   跳过（已存在）: 海神等级')
} else {
  const re = /const AFFINITY_RANKS = \[[\s\S]*?\n\];/
  const m = src.match(re)
  if (m === null) fail('cannot find AFFINITY_RANKS array')
  src = src.replace(re, NEW_ARRAY)
  applied.push('AFFINITY_RANKS → 11 级（每 10 点一级）')
}
if (src.includes('Ten points per rank')) {
  console.log('   跳过（已存在）: 注释更新')
} else {
  src = src.split(OLD_COMMENT).join(NEW_COMMENT)
  applied.push('注释更新')
}

writeFileSync(stateFile, src, 'utf8')
console.log('✔ 等级补丁已应用（' + stateFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/state-DrMX22GL.js.bak-' + ts)
console.log('重启 DSH Web 后：好感度每 +10 升一级（幼鲸→…→海神）。')
