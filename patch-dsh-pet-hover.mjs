#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet client so HOVERING the pet plays the "jumping"
 * track (for 流萤 that is the 变身/transform animation) until the mouse
 * leaves — then the normal state animation resumes.
 *
 * Changes in lib/client.js (PetSprite):
 *  1. animation = hovered && tracks.jumping ? "jumping" : snapshot.animation
 *  2. add "hovered" to the animation effect dependency array
 *
 * Usage:
 *   node patch-dsh-pet-hover.mjs              # patch installed package
 *   node patch-dsh-pet-hover.mjs --pkg <dir>  # patch a different copy
 *   node patch-dsh-pet-hover.mjs --revert     # restore from latest .bak-*
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

const REPLACEMENTS = [
  {
    label: 'hover overrides animation to jumping',
    find: '			const phase = snapshot?.phase ?? "idle";\n			const animation = snapshot?.animation ?? "idle";',
    replace: '			const phase = snapshot?.phase ?? "idle";\n			const animation = hovered && tracks.jumping !== void 0 ? "jumping" : (snapshot?.animation ?? "idle");',
  },
  {
    label: 'hovered in animation effect deps',
    find: '				rows,\n				tracks,\n				sequences,\n				props.visual\n			]);',
    replace: '				rows,\n				tracks,\n				sequences,\n				hovered,\n				props.visual\n			]);',
  },
]

function apply(file, replacements) {
  if (!existsSync(file)) fail('missing ' + file)
  let src = readFileSync(file, 'utf8')
  const applied = []
  for (const rep of replacements) {
    const count = src.split(rep.find).length - 1
    if (count !== 1) fail(rep.label + ': expected 1 occurrence, found ' + count + ' in ' + file)
    src = src.replace(rep.find, rep.replace)
    applied.push(rep.label)
  }
  writeFileSync(file, src, 'utf8')
  return applied
}

function latestBackup(file) {
  const dir = file.slice(0, file.lastIndexOf('/'))
  const base = file.slice(file.lastIndexOf('/') + 1)
  const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
  return backups.length > 0 ? join(dir, backups[backups.length - 1]) : undefined
}

if (revert) {
  const bak = latestBackup(clientFile)
  if (bak === undefined) fail('没有找到 ' + clientFile + ' 的备份')
  renameSync(bak, clientFile)
  console.log('✔ 已还原 ' + clientFile + '（悬停补丁已回滚，请重启 DSH Web）')
  process.exit(0)
}

const ts = new Date().toISOString().replace(/[:.]/g, '-')
if (existsSync(clientFile)) copyFileSync(clientFile, clientFile + '.bak-' + ts)
const applied = apply(clientFile, REPLACEMENTS)
console.log('✔ 悬停补丁已应用到 ' + clientFile)
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/client.js.bak-' + ts)
console.log('效果：鼠标移到宠物上播放 jumping（流萤=变身），移开后恢复。请重启 DSH Web。')
