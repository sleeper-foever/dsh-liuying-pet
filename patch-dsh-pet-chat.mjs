#!/usr/bin/env node
/**
 * Patch @linxin666/dsh-pet to give the pet LLM chat:
 *  - host (lib/index.js): POST /api/pet/chat  →  DeepSeek chat completions
 *    (key from env DEEPSEEK_API_KEY or $DSH_HOME/.credentials.yaml;
 *     baseURL/model/system overridable via DEEPSEEK_BASE_URL /
 *     DSH_PET_CHAT_MODEL / DSH_PET_CHAT_SYSTEM)
 *  - client (lib/client.js): a "和我说…" input in the hover panel;
 *    reply shows in the pet bubble (+ waving animation when available)
 *
 * Usage:
 *   node patch-dsh-pet-chat.mjs              # patch installed package
 *   node patch-dsh-pet-chat.mjs --pkg <dir>
 *   node patch-dsh-pet-chat.mjs --revert
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

// ── HOST ──────────────────────────────────────────────────────────────────
const HOST_HELPER = T([
  'async function chatWithPet(message) {',
  '\tconst homeDir = petHomeDir();',
  '\tconst key = process.env.DEEPSEEK_API_KEY ?? readCredentialKey(join(homeDir, ".credentials.yaml"));',
  '\tif (key === void 0 || key === "") return { ok: false, error: "no-api-key" };',
  '\tconst baseURL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";',
  '\tconst chatURL = new URL("chat/completions", baseURL + "/");',
  '\tconst model = process.env.DSH_PET_CHAT_MODEL ?? "deepseek-chat";',
  '\tconst system = process.env.DSH_PET_CHAT_SYSTEM ?? "你是 DSH 桌面宠物流萤：能变身成机甲萨姆的可爱少女。回答要简短（100 字以内）、口语化、带点俏皮，偶尔用颜文字。";',
  '\tconst response = await fetch(chatURL, {',
  '\t\tmethod: "POST",',
  '\t\theaders: { "content-type": "application/json", authorization: "Bearer " + key },',
  '\t\tbody: JSON.stringify({',
  '\t\t\tmodel,',
  '\t\t\tmessages: [',
  '\t\t\t\t{ role: "system", content: system },',
  '\t\t\t\t{ role: "user", content: message }',
  '\t\t\t],',
  '\t\t\tmax_tokens: 200,',
  '\t\t\ttemperature: 0.9',
  '\t\t}),',
  '\t\tsignal: AbortSignal.timeout(30000)',
  '\t});',
  '\tif (!response.ok) return { ok: false, error: "llm-http-" + response.status };',
  '\tconst data = await response.json();',
  '\tconst reply = data?.choices?.[0]?.message?.content;',
  '\tif (typeof reply !== "string" || reply.trim() === "") return { ok: false, error: "empty-reply" };',
  '\treturn { ok: true, reply: reply.trim().slice(0, 300) };',
  '}',
  'function readCredentialKey(file) {',
  '\ttry {',
  '\t\tconst match = readFileSync(file, "utf8").match(/^\\s*DEEPSEEK_API_KEY:\\s*"?([^"\\s#]+)/m);',
  '\t\treturn match === null ? void 0 : match[1];',
  '\t} catch {',
  '\t\treturn void 0;',
  '\t}',
  '}',
])
const HOST_ROUTE = T([
  '',
  '\t\tpostRoute(ctx, "/api/pet/chat", (body) => {',
  '\t\t\tconst message = typeof body.message === "string" ? body.message.trim() : "";',
  '\t\t\tif (message === "") return Promise.reject(/* @__PURE__ */ new Error("empty-message"));',
  '\t\t\tif (message.length > 500) return Promise.reject(/* @__PURE__ */ new Error("message-too-long"));',
  '\t\t\treturn chatWithPet(message);',
  '\t\t}),',
])
const HOST_SET_PET = T([
  '\t\tpostRoute(ctx, "/api/pet/set-pet", (body) => {',
  '\t\t\tconst petId = body.petId;',
  '\t\t\tif (typeof petId !== "string") return Promise.reject(/* @__PURE__ */ new Error("invalid-pet"));',
  '\t\t\treturn service.setPetId(petId);',
  '\t\t}),',
])

// ── CLIENT ────────────────────────────────────────────────────────────────
const CLIENT_HOOK_ANCHORS = [
  '\t\t\tconst [interactKey, setInteractKey] = (0, react.useState)(0);',
  '\t\t\tconst [hoverKey, setHoverKey] = (0, react.useState)(0);',
  '\t\t\tconst [hovered, setHovered] = (0, react.useState)(false);',
]
const CLIENT_STATE_ADD = T([
  '\t\t\tconst [chatText, setChatText] = (0, react.useState)("");',
  '\t\t\tconst [chatBubble, setChatBubble] = (0, react.useState)(null);',
  '\t\t\tconst chatTimerRef = (0, react.useRef)(null);',
])
const CLIENT_CLEANUP = '\t\t\t(0, react.useEffect)(() => () => clearHideTimer(), []);'
const CLIENT_SEND_ADD = T([
  '',
  '\t\t\tconst sendChat = async () => {',
  '\t\t\t\tconst text = chatText.trim();',
  '\t\t\t\tif (text === "") return;',
  '\t\t\t\tsetChatText("");',
  '\t\t\t\tsetChatBubble("…");',
  '\t\t\t\tif (chatTimerRef.current !== null) window.clearTimeout(chatTimerRef.current);',
  '\t\t\t\ttry {',
  '\t\t\t\t\tconst response = await fetch("/api/pet/chat", {',
  '\t\t\t\t\t\tmethod: "POST",',
  '\t\t\t\t\t\theaders: { "content-type": "application/json" },',
  '\t\t\t\t\t\tbody: JSON.stringify({ message: text })',
  '\t\t\t\t\t});',
  '\t\t\t\t\tconst data = await response.json();',
  '\t\t\t\t\tconst reply = data !== null && typeof data === "object" && data.ok === true && typeof data.reply === "string" ? data.reply : "（这次没听清，再问我一次？）";',
  '\t\t\t\t\tsetChatBubble(reply);',
  '\t\t\t\t\tif (typeof playAction === "function") playAction("waving", 1800);',
  '\t\t\t\t} catch {',
  '\t\t\t\t\tsetChatBubble("（网络开小差了…）");',
  '\t\t\t\t}',
  '\t\t\t\tchatTimerRef.current = window.setTimeout(() => setChatBubble(null), 6000);',
  '\t\t\t};',
  '\t\t\t(0, react.useEffect)(() => () => {',
  '\t\t\t\tif (chatTimerRef.current !== null) window.clearTimeout(chatTimerRef.current);',
  '\t\t\t}, []);',
])
const CLIENT_ACTIONS_ANCHOR = T([
  '\t\t\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {',
  '\t\t\t\t\t\t\t\tclassName: pet_module_css_default.actions,',
])
const CLIENT_CHAT_ROW = T([
  '\t\t\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {',
  '\t\t\t\t\t\t\t\tclassName: pet_module_css_default.renameRow,',
  '\t\t\t\t\t\t\t\tchildren: [',
  '\t\t\t\t\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {',
  '\t\t\t\t\t\t\t\t\t\tclassName: pet_module_css_default.nameInput,',
  '\t\t\t\t\t\t\t\t\t\tvalue: chatText,',
  '\t\t\t\t\t\t\t\t\t\tplaceholder: "和我说…",',
  '\t\t\t\t\t\t\t\t\t\tonChange: (e) => setChatText(e.target.value),',
  '\t\t\t\t\t\t\t\t\t\tonKeyDown: (e) => { if (e.key === "Enter") sendChat(); }',
  '\t\t\t\t\t\t\t\t\t}),',
  '\t\t\t\t\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {',
  '\t\t\t\t\t\t\t\t\t\ttype: "button",',
  '\t\t\t\t\t\t\t\t\t\tclassName: pet_module_css_default.action,',
  '\t\t\t\t\t\t\t\t\t\tonClick: sendChat,',
  '\t\t\t\t\t\t\t\t\t\tchildren: "说"',
  '\t\t\t\t\t\t\t\t\t})',
  '\t\t\t\t\t\t\t\t]',
  '\t\t\t\t\t\t\t}),',
])
const CLIENT_BUBBLE_ANCHOR = '\t\t\t\t\tfeedback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {'
const CLIENT_BUBBLE_ADD = T([
  '',
  '\t\t\t\t\tchatBubble !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {',
  '\t\t\t\t\t\tref: bubbleRef,',
  '\t\t\t\t\t\tclassName: clsx(pet_module_css_default.bubble, pet_module_css_default.bubbleStatus),',
  '\t\t\t\t\t\tchildren: chatBubble',
  '\t\t\t\t\t}, "chat"),',
])

// ── RUN ───────────────────────────────────────────────────────────────────
if (revert) {
  for (const file of [indexFile, clientFile]) {
    const dir = file.slice(0, file.lastIndexOf('/'))
    const base = file.slice(file.lastIndexOf('/') + 1)
    const backups = readdirSync(dir).filter((n) => n.startsWith(base + '.bak-')).sort()
    if (backups.length === 0) { console.log('没有找到 ' + file + ' 的备份，跳过'); continue }
    renameSync(join(dir, backups[backups.length - 1]), file)
    console.log('✔ 已还原 ' + file)
  }
  console.log('聊天补丁已回滚，请重启 DSH Web。')
  process.exit(0)
}

const ts = new Date().toISOString().replace(/[:.]/g, '-')
const applied = []

// ── host ──
if (!existsSync(indexFile)) fail('missing ' + indexFile)
let host = readFileSync(indexFile, 'utf8')
copyFileSync(indexFile, indexFile + '.bak-' + ts)
if (host.includes('async function chatWithPet')) {
  console.log('   跳过（已存在）: host chatWithPet')
} else {
  host = once(host, 'function makePetRoutes(deps) {', HOST_HELPER + '\nfunction makePetRoutes(deps) {', 'host chatWithPet helper')
  applied.push('host chatWithPet helper')
}
if (host.includes('/api/pet/chat')) {
  console.log('   跳过（已存在）: host chat route')
} else {
  host = once(host, HOST_SET_PET, HOST_SET_PET + HOST_ROUTE, 'host chat route')
  applied.push('host /api/pet/chat route')
}
writeFileSync(indexFile, host, 'utf8')

// ── client ──
if (!existsSync(clientFile)) fail('missing ' + clientFile)
let client = readFileSync(clientFile, 'utf8')
copyFileSync(clientFile, clientFile + '.bak-' + ts)
const anchor = CLIENT_HOOK_ANCHORS.find((a) => client.includes(a))
if (anchor === undefined) fail('cannot find a client state anchor')
if (client.includes('const [chatText, setChatText]')) {
  console.log('   跳过（已存在）: client chat state')
} else {
  client = insertAfter(client, anchor, CLIENT_STATE_ADD, 'client chat state')
  applied.push('client chat state')
}
if (client.includes('const sendChat = async')) {
  console.log('   跳过（已存在）: client sendChat')
} else {
  client = insertAfter(client, CLIENT_CLEANUP, CLIENT_SEND_ADD, 'client sendChat')
  applied.push('client sendChat + cleanup')
}
if (client.includes('"和我说…"')) {
  console.log('   跳过（已存在）: client chat row')
} else {
  client = once(client, CLIENT_ACTIONS_ANCHOR, CLIENT_CHAT_ROW + '\n' + CLIENT_ACTIONS_ANCHOR, 'client chat row')
  applied.push('client chat input row')
}
if (client.includes('chatBubble !== null')) {
  console.log('   跳过（已存在）: client chat bubble')
} else {
  client = once(client, CLIENT_BUBBLE_ANCHOR, CLIENT_BUBBLE_ADD + '\n' + CLIENT_BUBBLE_ANCHOR, 'client chat bubble')
  applied.push('client chat bubble')
}
writeFileSync(clientFile, client, 'utf8')

console.log('✔ 聊天补丁已应用（' + indexFile + ' / ' + clientFile + '）')
for (const a of applied) console.log('   · ' + a)
console.log('备份: *.bak-' + ts)
console.log('重启 DSH Web 后：悬停宠物 → 面板出现「和我说…」输入框，回车即可与大模型对话。')
