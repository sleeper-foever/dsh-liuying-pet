#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet (installed plugin) so the sprite2d renderer plays
 * extended atlas rows beyond the fixed 9-row contract (rows 9, 10, ...).
 *
 *  - registry (lib/index.js):
 *      * resolvePetManifest reads ALL rows from the manifest 'frames' array
 *      * buildTracks builds tracks for manifest-declared animations beyond
 *        idle..review, mapping them to rows 9, 10, ... in declaration order
 *      * entry view carries a 'trackRows' animation->row map
 *      * normalizeSequences accepts extra track names declared in the manifest
 *  - client (lib/client.js):
 *      * rowOfTrack falls back to definition.trackRows for extra tracks
 *
 * Usage:
 *   node patch-dsh-pet.mjs                 # patch installed package
 *   node patch-dsh-pet.mjs --pkg <dir>     # patch a different copy
 *   node patch-dsh-pet.mjs --revert        # restore from the latest .bak-*
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const pkgArgIdx = args.indexOf('--pkg')
const pkgArg = pkgArgIdx >= 0 && args[pkgArgIdx + 1] !== undefined ? args[pkgArgIdx + 1] : undefined
const revert = args.includes('--revert')
const pkg = resolve(pkgArg ?? join(homedir(), '.dsh/profiles/web/node_modules/@linxin666/dsh-pet'))
const indexFile = join(pkg, 'lib/index.js')
const clientFile = join(pkg, 'lib/client.js')

function fail(msg) { console.error('✗ ' + msg); process.exit(1) }

const REPLACEMENTS_INDEX = [
  {
    label: 'normalizeSequences signature',
    find: 'function normalizeSequences(raw, id, warn) {',
    replace: 'function normalizeSequences(raw, id, warn, knownTracks = PET_ROW_ORDER) {',
  },
  {
    label: 'normalizeSequences unknown-animation check',
    find: '		const unknownIndex = value.findIndex((animation) => typeof animation !== "string" || !PET_ROW_ORDER.includes(animation));',
    replace: '		const unknownIndex = value.findIndex((animation) => typeof animation !== "string" || !knownTracks.includes(animation));',
  },
  {
    label: 'normalizeSequences call site (pass manifest track names)',
    find: '	const sequences = normalizeSequences(source.sequences, id, warn);',
    replace: '	const sequences = normalizeSequences(source.sequences, id, warn, Object.keys(typeof source.tracks === "object" && source.tracks !== null ? source.tracks : {}));',
  },
  {
    label: 'rows resolution + atlasRowCount',
    find: [
      '	const columns = finiteInt(source.columns, 8, 32);',
      '	const atlasRowCount = source.spriteVersionNumber === 2 ? 11 : 9;',
      '	const rows = DEFAULT_FRAME_COUNTS.map((fallback, index) => {',
      '		return finiteInt(Array.isArray(source.frames) ? source.frames[index] : void 0, fallback, columns);',
      '	});',
    ].join('\n'),
    replace: [
      '	const columns = finiteInt(source.columns, 8, 32);',
      '	const rows = Array.isArray(source.frames) && source.frames.length > 0',
      '		? source.frames.map((value) => finiteInt(value, 0, columns))',
      '		: DEFAULT_FRAME_COUNTS.slice();',
      '	const atlasRowCount = Math.max(9, rows.length);',
    ].join('\n'),
  },
  {
    label: 'buildTracks extended rows',
    find: [
      '		};',
      '	}',
      '	return tracks;',
      '}',
    ].join('\n'),
    replace: [
      '		}',
      '	}',
      '	// Extended rows beyond the 9-row contract: manifest-declared tracks',
      '	// map to rows 9, 10, ... in declaration order.',
      '	const baseCount = PET_ROW_ORDER.length;',
      '	let extraRow = baseCount;',
      '	for (const animation of Object.keys(trackOverrides)) {',
      '		if (PET_ROW_ORDER.includes(animation)) continue;',
      '		if (extraRow >= rows.length) {',
      '			warn("track " + animation + " has no atlas row (rows=" + rows.length + ")");',
      '			continue;',
      '		}',
      '		const frameCount = Math.max(1, Math.min(rows[extraRow], columns));',
      '		const override = trackOverrides[animation];',
      '		const rawDurations = Array.isArray(override?.durations) ? override.durations.filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0) : [];',
      '		const durations = rawDurations.length > 0 ? rawDurations : Array.from({ length: frameCount }, () => 400);',
      '		const sized = durations.length >= frameCount ? durations.slice(0, frameCount) : Array.from({ length: frameCount }, (_, index) => durations[index % durations.length]);',
      '		tracks[animation] = {',
      '			frames: Array.from({ length: frameCount }, (_, index) => index),',
      '			durations: sized,',
      '			loop: typeof override?.loop === "boolean" ? override.loop : true,',
      '			...(typeof override?.fallback === "string" ? { fallback: override.fallback } : {})',
      '		};',
      '		extraRow += 1;',
      '	}',
      '	return tracks;',
      '}',
    ].join('\n'),
  },
  {
    label: 'resolvePetManifest: build trackRows before return',
    find: '	if (tracks === void 0) return void 0;\n	const sheet = spritesheetPath.join("/");',
    replace: [
      '	if (tracks === void 0) return void 0;',
      '	const trackRows = {};',
      '	PET_ROW_ORDER.forEach((animation, row) => { trackRows[animation] = row; });',
      '	let extraRow = PET_ROW_ORDER.length;',
      '	for (const animation of Object.keys(tracks)) {',
      '		if (trackRows[animation] === void 0) trackRows[animation] = extraRow++;',
      '	}',
      '	const sheet = spritesheetPath.join("/");',
    ].join('\n'),
  },
  {
    label: 'resolvePetManifest return carries trackRows',
    find: '		rows,\n		atlasRows: atlasRowCount,\n		tracks,\n		...sequences === void 0 ? {} : { sequences },',
    replace: '		rows,\n		atlasRows: atlasRowCount,\n		tracks,\n		trackRows,\n		...sequences === void 0 ? {} : { sequences },',
  },
  {
    label: 'petEntryView carries trackRows',
    find: '		tracks: entry.tracks,\n		...entry.sequences === void 0 ? {} : { sequences: entry.sequences },',
    replace: '		tracks: entry.tracks,\n		trackRows: entry.trackRows,\n		...entry.sequences === void 0 ? {} : { sequences: entry.sequences },',
  },
]

const REPLACEMENTS_CLIENT = [
  {
    label: 'rowOfTrack fallback to trackRows',
    find: '		function rowOfTrack(animation) {\n			return rowOf(animation);\n		}',
    replace: '		function rowOfTrack(animation, trackRows) {\n			return rowOf(animation) ?? trackRows?.[animation];\n		}',
  },
  {
    label: 'rowOfTrack lead call site',
    find: '				const row = rowOfTrack(leadAnimation);',
    replace: '				const row = rowOfTrack(leadAnimation, definition.trackRows);',
  },
  {
    label: 'rowOfTrack sequence call site',
    find: '						const currentRow = rowOfTrack(current.animation);',
    replace: '						const currentRow = rowOfTrack(current.animation, definition.trackRows);',
  },
]

function apply(file, replacements) {
  if (!existsSync(file)) fail('missing ' + file)
  let src = readFileSync(file, 'utf8')
  const applied = []
  for (const rep of replacements) {
    const count = src.split(rep.find).length - 1
    if (count !== 1) {
      fail(rep.label + ': expected 1 occurrence, found ' + count + ' in ' + file)
    }
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
  for (const file of [indexFile, clientFile]) {
    const bak = latestBackup(file)
    if (bak === undefined) { console.log('没有找到 ' + file + ' 的备份，跳过'); continue }
    renameSync(bak, file)
    console.log('✔ 已还原 ' + file)
  }
  console.log('补丁已回滚。请重启 DSH Web。')
  process.exit(0)
}

const ts = new Date().toISOString().replace(/[:.]/g, '-')
for (const file of [indexFile, clientFile]) {
  if (existsSync(file)) copyFileSync(file, file + '.bak-' + ts)
}

const applied = []
applied.push(...apply(indexFile, REPLACEMENTS_INDEX))
applied.push(...apply(clientFile, REPLACEMENTS_CLIENT))

console.log('✔ 补丁已应用到 ' + pkg)
for (const a of applied) console.log('   · ' + a)
console.log('备份: lib/index.js.bak-' + ts + ' / lib/client.js.bak-' + ts)
console.log('请重启 DSH Web，然后在流萤清单（frames 11 行 + dancing/victory 轨）生效。')
