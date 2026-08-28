#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet affinity gain difficulty (host side,
 * lib/state-DrMX22GL.js): every +10 affinity points the gains shrink
 * ("每多10亲密度，获取难度合理升高").
 *
 *   gain(base, points) = max(1, round(base / (1 + floor(points/10) * decay)))
 *
 * Config fields added: difficultyStep (10), difficultyDecay (0.15).
 * pet / feed / turn rewards all pass through this scale; min gain is 1.
 *
 * Usage:
 *   node patch-dsh-pet-difficulty.mjs              # patch installed package
 *   node patch-dsh-pet-difficulty.mjs --pkg <dir>
 *   node patch-dsh-pet-difficulty.mjs --revert
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
function once(src, find, replace, label) {
  const c = src.split(find).length - 1
  if (c !== 1) fail(label + ': expected 1 occurrence, found ' + c)
  return src.replace(find, replace)
}
function insertBefore(src, anchor, prefix, label) {
  const c = src.split(anchor).length - 1
  if (c !== 1) fail(label + ': expected 1 anchor occurrence, found ' + c)
  return src.replace(anchor, prefix + anchor)
}
const T = (lines) => lines.join('\n')

const CONFIG_OLD = T([
  'const defaultAffinityConfig = {',
  '\tturnReward: 1,',
  '\tpetReward: 1,',
  '\tpetCooldownMs: 1e4,',
  '\tfeedReward: 5,',
  '\tfeedCooldownMs: 3e4',
  '};',
])
const CONFIG_NEW = T([
  'const defaultAffinityConfig = {',
  '\tturnReward: 1,',
  '\tpetReward: 1,',
  '\tpetCooldownMs: 1e4,',
  '\tfeedReward: 5,',
  '\tfeedCooldownMs: 3e4,',
  '\tdifficultyStep: 10,',
  '\tdifficultyDecay: 0.15',
  '};',
])
const HELPER = T([
  'function affinityGain(base, points, config) {',
  '\tconst tier = Math.floor(points / (config.difficultyStep ?? 10));',
  '\tconst scale = 1 / (1 + tier * (config.difficultyDecay ?? 0.15));',
  '\treturn Math.max(1, Math.round(base * scale));',
  '}',
  '',
])
const PET_OLD = T([
  '\t\tnext.points = clamp(state.points + config.petReward);',
  '\t\treturn {',
  '\t\t\taffinity: next,',
  '\t\t\tdelta: config.petReward,',
])
const PET_NEW = T([
  '\t\tconst petGain = affinityGain(config.petReward, state.points, config);',
  '\t\tnext.points = clamp(state.points + petGain);',
  '\t\treturn {',
  '\t\t\taffinity: next,',
  '\t\t\tdelta: petGain,',
])
const FEED_OLD = T([
  '\t\tnext.points = clamp(state.points + config.feedReward);',
  '\t\treturn {',
  '\t\t\taffinity: next,',
  '\t\t\tdelta: config.feedReward,',
])
const FEED_NEW = T([
  '\t\tconst feedGain = affinityGain(config.feedReward, state.points, config);',
  '\t\tnext.points = clamp(state.points + feedGain);',
  '\t\treturn {',
  '\t\t\taffinity: next,',
  '\t\t\tdelta: feedGain,',
])
const TURN_OLD = T([
  '\tnext.turns += 1;',
  '\tnext.points = clamp(state.points + config.turnReward);',
  '\treturn next;',
])
const TURN_NEW = T([
  '\tnext.turns += 1;',
  '\tconst turnGain = affinityGain(config.turnReward, state.points, config);',
  '\tnext.points = clamp(state.points + turnGain);',
  '\treturn next;',
])

if (revert) {
  const dir = stateFile.slice(0, stateFile.lastIndexOf('/'))
  const base = stateFile.slice(stateFile.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  if (backups.length === 0) fail('没有找到 ' + stateFile + ' 的备份')
  renameSync(join(dir, backups[backups.length - 1]), stateFile)
  console.log('✔ 已还原 ' + stateFile + '（难度补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

if (!existsSync(stateFile)) fail('missing ' + stateFile)
let src = readFileSync(stateFile, 'utf8')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
copyFileSync(stateFile, stateFile + '.bak-' + ts)
const applied = []

if (src.includes('difficultyDecay')) {
  console.log('   跳过（已存在）: 难度配置')
} else {
  src = once(src, CONFIG_OLD, CONFIG_NEW, '难度配置')
  applied.push('难度配置 difficultyStep/Decay')
}
if (src.includes('function affinityGain')) {
  console.log('   跳过（已存在）: affinityGain 助手')
} else {
  src = insertBefore(src, 'function emptyAffinity() {', HELPER, 'affinityGain 助手')
  applied.push('affinityGain 助手')
}
if (src.includes('const petGain = affinityGain')) {
  console.log('   跳过（已存在）: pet 衰减')
} else {
  src = once(src, PET_OLD, PET_NEW, 'pet 衰减')
  applied.push('pet 奖励衰减')
}
if (src.includes('const feedGain = affinityGain')) {
  console.log('   跳过（已存在）: feed 衰减')
} else {
  src = once(src, FEED_OLD, FEED_NEW, 'feed 衰减')
  applied.push('feed 奖励衰减')
}
if (src.includes('const turnGain = affinityGain')) {
  console.log('   跳过（已存在）: turn 衰减')
} else {
  src = once(src, TURN_OLD, TURN_NEW, 'turn 衰减')
  applied.push('回合奖励衰减')
}

writeFileSync(stateFile, src, 'utf8')
console.log('✔ 难度补丁已应用（' + stateFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/state-DrMX22GL.js.bak-' + ts)
console.log('重启 DSH Web 后：好感度每多 10 点，获取难度提升（保底 +1）。')
