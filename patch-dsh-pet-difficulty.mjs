#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet affinity gain difficulty (host side,
 * lib/state-DrMX22GL.js):
 *  - 难度按好感度每 +10 递增：gain = max(0.1, round(base / (1 + tier*decay) × 10) / 10)
 *  - 保底 +0.1（不是 +1），收益保留小数精确累加
 *  - 加分不取整（内部存浮点），只有显示取整（affinityViewOf points 四舍五入）
 *
 * 脚本是"归一化"式的：无论当前是旧版（0.1 保底 + 加分取整）还是上版
 * （+1 整数收益），重跑都会收敛到本设计。
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

const TARGET_FORMULA = '\treturn Math.max(0.1, Math.round(base * scale * 10) / 10);'

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
  '\tfeedReward: 3,',
  '\tfeedCooldownMs: 3e4,',
  '\tdifficultyStep: 10,',
  '\tdifficultyDecay: 0.15',
  '};',
])
const HELPER = T([
  'function affinityGain(base, points, config) {',
  '\tconst tier = Math.floor(points / (config.difficultyStep ?? 10));',
  '\tconst scale = 1 / (1 + tier * (config.difficultyDecay ?? 0.15));',
  TARGET_FORMULA,
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

// 1) 难度配置（feedReward 5→3 已在更早版本；缺失则全量插入）
if (src.includes('difficultyDecay')) {
  if (src.includes('feedReward: 5,')) {
    src = once(src, '\tfeedReward: 5,', '\tfeedReward: 3,', '喂食奖励降为 3')
    applied.push('喂食奖励降为 3')
  } else {
    console.log('   跳过（已存在）: 难度配置')
  }
} else {
  src = once(src, CONFIG_OLD, CONFIG_NEW, '难度配置')
  applied.push('难度配置 difficultyStep/Decay')
}

// 2) affinityGain 助手：归一化到 0.1 保底公式
if (src.includes('function affinityGain')) {
  if (src.includes(TARGET_FORMULA)) {
    console.log('   跳过（已存在）: 0.1 保底公式')
  } else if (src.includes('\treturn Math.max(1, Math.round(base * scale));')) {
    src = once(src, '\treturn Math.max(1, Math.round(base * scale));', TARGET_FORMULA, '公式还原为 0.1 保底')
    applied.push('公式还原为 0.1 保底')
  } else {
    fail('affinityGain 公式无法识别')
  }
} else {
  src = insertBefore(src, 'function emptyAffinity() {', HELPER, 'affinityGain 助手')
  applied.push('affinityGain 助手（0.1 保底）')
}

// 3) pet/feed/turn：归一化到"加分不取整"（内部保留小数）
const GAIN_POINTS = [
  ['clamp(state.points + petGain)', 'clamp(Math.round(state.points + petGain))', '\t\tnext.points = clamp(state.points + petGain);', '\t\tnext.points = clamp(Math.round(state.points + petGain));', 'pet 加分保留小数'],
  ['clamp(state.points + feedGain)', 'clamp(Math.round(state.points + feedGain))', '\t\tnext.points = clamp(state.points + feedGain);', '\t\tnext.points = clamp(Math.round(state.points + feedGain));', 'feed 加分保留小数'],
  ['clamp(state.points + turnGain)', 'clamp(Math.round(state.points + turnGain))', '\tnext.points = clamp(state.points + turnGain);', '\tnext.points = clamp(Math.round(state.points + turnGain));', '回合加分保留小数'],
]
for (const [target, oldMark, targetLine, oldLine, label] of GAIN_POINTS) {
  if (src.includes('const petGain = affinityGain') || src.includes('const feedGain = affinityGain') || src.includes('const turnGain = affinityGain')) {
    if (src.includes(target)) {
      console.log('   跳过（已存在）: ' + label)
    } else if (src.includes(oldMark)) {
      src = once(src, oldLine, targetLine, label)
      applied.push(label)
    } else {
      console.log('   跳过（未找到）: ' + label)
    }
  } else {
    // 全新安装路径
    if (label.startsWith('pet')) { src = once(src, PET_OLD, PET_NEW, 'pet 衰减'); applied.push('pet 奖励衰减（小数）') }
    else if (label.startsWith('feed')) { src = once(src, FEED_OLD, FEED_NEW, 'feed 衰减'); applied.push('feed 奖励衰减（小数）') }
    else { src = once(src, TURN_OLD, TURN_NEW, 'turn 衰减'); applied.push('回合奖励衰减（小数）') }
  }
}

// 4) 显示取整（affinityViewOf）
if (src.includes('points: Math.round(state.points)')) {
  console.log('   跳过（已存在）: 显示取整')
} else if (src.includes('\t\tpoints: state.points,')) {
  src = once(src, '\t\tpoints: state.points,', '\t\tpoints: Math.round(state.points),', '显示取整')
  applied.push('亲密度显示取整')
} else {
  console.log('   跳过（未找到）: 显示取整锚点')
}

writeFileSync(stateFile, src, 'utf8')
console.log('✔ 难度补丁已应用（' + stateFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/state-DrMX22GL.js.bak-' + ts)
console.log('重启 DSH Web 后：好感度每多 10 点难度递增，收益保底 +0.1，显示为整数。')
