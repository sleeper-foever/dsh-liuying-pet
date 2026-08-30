import { _ as RemarkPicker, a as AFFINITY_MAX, c as applyInteraction, d as emptyAffinity, f as rankOf, g as REMARK_LINE_MAX, h as REMARK_LINES_MAX, i as rowOf, l as applyTurnReward, m as REMARK_KINDS, n as animationForPhase, o as AFFINITY_RANKS, p as BUILTIN_REMARKS, r as defaultPetStateConfig, s as affinityViewOf, t as PetStateMachine, u as defaultAffinityConfig, v as builtinRemark, y as normalizePetRemarks } from "./state-DrMX22GL.js";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
import { Service } from "@deepseek-ai/cordis";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { isAbsolute as isAbsolute$1, join as join$1 } from "node:path/posix";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
//#region src/chatter.ts
/** While a scene persists, its copy advances on this cadence (ms). */
const STATUS_ROTATE_MS = 4e3;
/** Fixed-copy pools per status scene (first line = legacy wording). */
const STATUS_POOLS = {
	prepare: [
		"准备开始",
		"撸起袖子开工啦",
		"新一轮，出发～",
		"打起精神，开干！",
		"整理一下桌面，开始吧",
		"氧气充满，下潜开始～",
		"热身完毕，跃跃欲试",
		"开工仪式感已就位"
	],
	waiting: [
		"等待模型响应",
		"呼叫大脑中，请稍等",
		"信号发射中，等一个回音",
		"灵感正在路上～",
		"竖起耳朵等回复",
		"大脑在咕噜咕噜加载",
		"等它伸个懒腰再开口",
		"模型：来了来了",
		"等一个灵感砸中我",
		"滴——等待连线中",
		"它在组织语言，别催",
		"等它热身完毕",
		"灵感快递派送中",
		"屏住呼吸等回复"
	],
	thinking: [
		"正在思考",
		"嗯……让我想一想",
		"脑内风暴进行中",
		"思绪咕噜咕噜冒泡",
		"灵光集结中～",
		"眉头一皱，认真分析",
		"左脑右脑一起开会",
		"答案正在浮出水面",
		"盘一下，盘一下逻辑",
		"让子弹再飞一会儿",
		"别催别催，在想呢",
		"大脑转起来了",
		"让我把线索捋一捋",
		"脑内跑火车中",
		"小脑瓜高速运转",
		"让我琢磨琢磨",
		"翻翻脑子里的藏书",
		"让我嚼一嚼这个问题",
		"脑子在煮咖啡，马上好",
		"思考的鱼游来了",
		"让我康康这里面的门道",
		"正在盘逻辑链",
		"思绪整理收纳中",
		"嗯？有点意思……",
		"让思路沉淀一下",
		"脑内弹幕飞速滚动"
	],
	review: [
		"整理回复中",
		"把想法写下来",
		"组织语言中～",
		"落笔成文，请稍候",
		"字斟句酌中",
		"把答案装进信封里",
		"遣词造句打磨中",
		"把思绪码成整整齐齐的字",
		"奋笔疾书中",
		"把最好的表达挑出来",
		"文字排版美容师上线",
		"收尾润色一下下"
	],
	toolResult: [
		"处理工具结果",
		"看看带回了什么",
		"消化一下刚到的结果",
		"结果解读中～",
		"验收工具的成果",
		"把线索拼接起来",
		"战利品清点中",
		"这份结果有点东西",
		"把新情报归档",
		"结果到手，继续前进"
	],
	done: [
		"完成啦",
		"搞定收工～",
		"任务达成，耶！",
		"这一轮圆满完成",
		"顺利抵达终点",
		"收工！求摸摸奖励",
		"交差！下一位",
		"齐活，漂亮收官",
		"拿下！击掌～",
		"稳了，满分交卷",
		"搞定，去喝口水",
		"完工咯，转个圈圈",
		"这一轮，我们配合满分",
		"妥了妥了，收工收工"
	],
	failed: [
		"执行失败",
		"哎呀，中途卡住了",
		"这一步没能走完",
		"被小石头绊倒了",
		"半路翻车了，揉揉膝盖",
		"出了点岔子，缓缓再来"
	],
	toolFailed: [
		"工具执行失败",
		"工具闹脾气了，哄哄它",
		"哎呀，工具掉链子了",
		"这个工具今天不太听话",
		"工具翻车了，扶起来继续",
		"没跑通，再来一次",
		"工具：我罢工三秒钟",
		"这一步摔了一跤，没事"
	],
	maxTokens: [
		"达到输出上限",
		"话说到一半被截断了",
		"字数用完了，喘口气",
		"一口气说太满，缓缓"
	],
	interrupted: [
		"执行意外中断",
		"哎呀，被意外打断了",
		"半路踩了急刹车",
		"被迫停下，意犹未尽"
	],
	blocked: [
		"等待继续",
		"在这里等你发令",
		"暂停待命，随时出发",
		"蹲一个继续的指令"
	]
};
/** Every status scene key, in declaration order (voice-pack key allow-list). */
const STATUS_SCENES = [
	"prepare",
	"waiting",
	"thinking",
	"review",
	"toolResult",
	"done",
	"failed",
	"toolFailed",
	"maxTokens",
	"interrupted",
	"blocked"
];
/** Every tool-family key, in declaration order (voice-pack key allow-list). */
const TOOL_CATEGORIES = [
	"read",
	"write",
	"edit",
	"shell",
	"grep",
	"find",
	"ls",
	"webSearch",
	"webFetch",
	"mcp",
	"memory",
	"subagent",
	"todo",
	"browser",
	"git",
	"ask",
	"generic"
];
/** Map a raw tool name onto its copy family (working-activity style regexes). */
function toolCategory(toolName) {
	const name = toolName.toLowerCase();
	if (/mem0|recall|memory/.test(name)) return "memory";
	if (/subagent|workflow|ralph|agent|task/.test(name)) return "subagent";
	if (/web_search|websearch|search_web|exa|brave|tavily/.test(name)) return "webSearch";
	if (/fetch|browser|playwright|chrome/.test(name)) return "webFetch";
	if (/grep|search|rg/.test(name)) return "grep";
	if (/glob|find/.test(name)) return "find";
	if (/^ls$|list_dir|list/.test(name)) return "ls";
	if (/ask_user|ask/.test(name)) return "ask";
	if (/todo|plan/.test(name)) return "todo";
	if (/git/.test(name)) return "git";
	if (/mcp__|mcp/.test(name)) return "mcp";
	if (/read|open|load|describe|inspect/.test(name)) return "read";
	if (/edit|patch|replace|rename/.test(name)) return "edit";
	if (/write|create|save/.test(name)) return "write";
	if (/run_code|bash|shell|terminal|exec|command|ssh/.test(name)) return "shell";
	return "generic";
}
/**
* Per-family tool status pools. '{tool}' interpolates the compact tool name,
* '{hint}' the compact real-argument hint (both optional per line); the first
* entry of every pool is the legacy '正在使用 {tool}' wording.
*/
const TOOL_POOLS = {
	read: [
		"正在使用 {tool}",
		"翻翻 {hint}",
		"读一下 {hint}",
		"让我康康这个文件",
		"逐行品味 {hint}",
		"翻阅资料中～",
		"瞄一眼 {hint}",
		"把文件摊开看一看",
		"认真研读 {hint}"
	],
	write: [
		"正在使用 {tool}",
		"写写写，写 {hint}",
		"下笔中～",
		"码字呢，别催",
		"写下 {hint}",
		"落笔成章",
		"把想法存进 {hint}",
		"开写开写",
		"存个文件压压惊"
	],
	edit: [
		"正在使用 {tool}",
		"改改 {hint}",
		"修修补补中",
		"润色一下 {hint}",
		"改两行，就两行",
		"补一刀 {hint}",
		"动动手指改一改",
		"精雕细琢 {hint}",
		"微调一下下"
	],
	shell: [
		"正在使用 {tool}",
		"跑跑 {hint}",
		"敲几行命令试试",
		"命令行走起：{hint}",
		"使唤终端跑个腿",
		"终端全速运转中",
		"敲回车！{hint}",
		"让命令飞一会儿",
		"去终端里探个究竟"
	],
	grep: [
		"正在使用 {tool}",
		"搜搜 {hint}",
		"找找匹配：{hint}",
		"关键词走你",
		"在代码里挖一挖",
		"检索小雷达启动",
		"顺着 {hint} 追下去",
		"掘地三尺找一找",
		"过滤筛选中～"
	],
	find: [
		"正在使用 {tool}",
		"找找文件 {hint}",
		"寻宝中～",
		"文件在哪里呀",
		"找啊找啊找文件",
		"把 {hint} 揪出来",
		"查找模式中"
	],
	ls: [
		"正在使用 {tool}",
		"列个清单看看",
		"看看目录里有啥",
		"目录走起～",
		"瞟一眼文件夹",
		"数数这里有几个文件"
	],
	webSearch: [
		"正在使用 {tool}",
		"网上搜搜 {hint}",
		"网络冲浪中",
		"帮你问问互联网",
		"搜一圈 {hint}",
		"去外面的世界打听打听",
		"查找资料中～",
		"情报收集模式开启"
	],
	webFetch: [
		"正在使用 {tool}",
		"抓个页面看看",
		"拉取 {hint}",
		"扒拉一下网页",
		"取点内容回来",
		"打开 {hint} 瞅瞅"
	],
	mcp: [
		"正在使用 {tool}",
		"连一下外部服务",
		"喊个外援来",
		"接个工具用用",
		"问问插件小助手",
		"外部力量接入中"
	],
	memory: [
		"正在使用 {tool}",
		"翻翻小本本",
		"回想一下之前的事",
		"在记忆里挖一挖",
		"提取记忆碎片～",
		"我们之前的约定是……"
	],
	subagent: [
		"正在使用 {tool}",
		"派个小弟去跑腿",
		"小助手出动！",
		"交给分身去办",
		"多线作战，分身出击",
		"召唤队友支援",
		"集思广益中～"
	],
	todo: [
		"正在使用 {tool}",
		"列个待办清单",
		"写个小计划",
		"待办安排得明明白白",
		"打个勾，继续",
		"把任务排排坐"
	],
	browser: [
		"正在使用 {tool}",
		"开个浏览器看看",
		"网页操作小能手",
		"替你点点页面",
		"浏览器跑腿中"
	],
	git: [
		"正在使用 {tool}",
		"提交一下代码",
		"版本控制走起",
		"管管仓库",
		"给改动安个家"
	],
	ask: [
		"正在使用 {tool}",
		"问你个事儿",
		"请教一下下",
		"等等，我需要确认",
		"这个问题得你拍板"
	],
	generic: [
		"正在使用 {tool}",
		"召唤 {tool} 出击",
		"{tool} 工作中",
		"借助 {tool} 的力量",
		"拜托 {tool} 一下",
		"{tool}，启动！"
	]
};
/** Pools for the parallel-tools line; '{n}' interpolates the running count. */
const TOOL_REMAINING_POOL = [
	"还有 {n} 个工具运行中",
	"{n} 路并进，分身们还在忙",
	"还有 {n} 位小助手在加班",
	"{n} 条战线同时推进中",
	"另 {n} 个工具在后台跑"
];
/**
* A compact, human-readable hint of what a tool call actually touches —
* the command, the path, the pattern, the query. Best-effort parse of the
* raw arguments JSON; unknown shapes stay hintless. Capped short so the
* bubble stays compact.
*/
function toolArgHint(toolName, argumentsJson) {
	let args;
	try {
		args = JSON.parse(argumentsJson);
	} catch {
		return;
	}
	if (typeof args !== "object" || args === null || Array.isArray(args)) return void 0;
	const record = args;
	const category = toolCategory(toolName);
	const candidateKeys = (() => {
		switch (category) {
			case "shell": return [
				"command",
				"code",
				"cmd"
			];
			case "grep": return [
				"pattern",
				"query",
				"path"
			];
			case "find": return [
				"pattern",
				"path",
				"glob"
			];
			case "read":
			case "write":
			case "edit": return [
				"file_path",
				"path",
				"filePath",
				"file"
			];
			case "webSearch": return [
				"query",
				"q",
				"keyword"
			];
			case "webFetch":
			case "browser": return ["url", "uri"];
			case "subagent": return [
				"description",
				"label",
				"prompt"
			];
			case "ls": return [
				"path",
				"dir",
				"directory"
			];
			case "git": return ["command", "message"];
			default: return [
				"command",
				"query",
				"path",
				"file_path",
				"description",
				"title",
				"name"
			];
		}
	})();
	for (const key of candidateKeys) {
		const value = record[key];
		if (typeof value !== "string") continue;
		const compact = value.replace(/\s+/g, " ").trim();
		if (compact === "") continue;
		const base = compact.split("/").pop() ?? compact;
		const shown = (category === "read" || category === "write" || category === "edit") && base !== "" ? base : compact;
		return shown.length <= 28 ? shown : shown.slice(0, 25) + "...";
	}
}
/**
* Round-robin voice for status copy. Scene-keyed picks stay STABLE while the
* same scene repeats (streaming chunks re-emit the same phase many times per
* second, and rotating per chunk would make the bubble flicker), but advance
* once the scene has persisted past the rotation cadence, so a long thinking
* stretch keeps changing its wording.
*/
var StatusVoice = class {
	pools;
	rotateMs;
	counters = /* @__PURE__ */ new Map();
	lastScene = "";
	lastLine = "";
	lastLineAt = Number.NEGATIVE_INFINITY;
	constructor(pools = () => BUILTIN_VOICE_PACK, rotateMs = STATUS_ROTATE_MS) {
		this.pools = pools;
		this.rotateMs = rotateMs;
	}
	/** Draw the next line of one pool, advancing its round-robin cursor. */
	draw(poolKey, pool) {
		const index = (this.counters.get(poolKey) ?? 0) % pool.length;
		this.counters.set(poolKey, index + 1);
		return pool[index];
	}
	/** Reuse the stable line or advance when the cadence elapsed. */
	voice(scene, poolKey, pool, nowMs) {
		if (scene === this.lastScene && nowMs - this.lastLineAt < this.rotateMs) return this.lastLine;
		this.lastScene = scene;
		this.lastLine = this.draw(poolKey, pool);
		this.lastLineAt = nowMs;
		return this.lastLine;
	}
	/**
	* A scene's effective pool: the voice-pack override when it carries lines,
	* else the built-in pool. Empty overrides fall back rather than blank the
	* bubble — a scene line always renders.
	*/
	scenePool(scene) {
		const override = this.pools().status?.[scene];
		return override !== void 0 && override.length > 0 ? override : STATUS_POOLS[scene];
	}
	/** Status line for a phase scene. */
	scene(scene, nowMs) {
		return this.voice("scene:" + scene, "pool:" + scene, this.scenePool(scene), nowMs);
	}
	/** Status line for a tool call, with the real-argument hint when known. */
	tool(toolName, displayName, hint, nowMs) {
		const category = toolCategory(toolName);
		const override = this.pools().tools?.[category];
		const pool = override !== void 0 && override.length > 0 ? override : TOOL_POOLS[category];
		return this.voice("tool:" + category, "tool:" + category, pool, nowMs).replaceAll("{tool}", displayName).replaceAll("{hint}", hint ?? displayName);
	}
	/** Status line while sibling tools still run (always reflects the count). */
	toolRemaining(count, nowMs) {
		const override = this.pools().toolRemaining;
		const pool = override !== void 0 && override.length > 0 ? override : TOOL_REMAINING_POOL;
		return this.voice("toolRemaining", "toolRemaining", pool, nowMs).replaceAll("{n}", String(count));
	}
};
/** Every whisper category key, in declaration order (voice-pack key allow-list). */
const WHISPER_CATEGORIES = [
	"thinking",
	"writing",
	"reading",
	"editing",
	"running",
	"searching",
	"git",
	"delegating",
	"browsing",
	"generic"
];
/** Every whisper outcome key, in declaration order (voice-pack key allow-list). */
const WHISPER_RESULTS = [
	"pass",
	"fail",
	"done"
];
/** Murmur pacing: the cooldown between category whispers. */
const WHISPER_COOLDOWN_MS = 9e3;
/** Outcome whispers get their own shorter cooldown so a real moment still speaks. */
const WHISPER_RESULT_COOLDOWN_MS = 5e3;
/** Map a tool family onto the whisper category it belongs to. */
function whisperCategoryOf(tool) {
	switch (tool) {
		case "read":
		case "grep":
		case "find":
		case "ls": return "reading";
		case "write":
		case "edit": return "editing";
		case "shell": return "running";
		case "webSearch":
		case "webFetch":
		case "memory":
		case "mcp": return "searching";
		case "git": return "git";
		case "subagent":
		case "todo": return "delegating";
		case "browser": return "browsing";
		case "ask":
		case "generic": return "generic";
	}
}
/**
* Whether a tool invocation looks like a test run. The whisper engine never
* reads the model's prose (a discussion that merely mentions a keyword must
* not wake a mood); a test-outcome mood is wanted only when a test tool
* actually ran, so the projection marks the call at tool/call time and the
* pass mood fires from the paired tool/result.
*/
function looksLikeTestTool(name, argumentsText) {
	const tool = name.toLowerCase();
	if (/(^|[\/_.-])(test|tests|spec|vitest|jest|pytest|mocha|playwright|cypress|karma)([\/_.-]|$)/.test(tool)) return true;
	if (argumentsText === void 0) return false;
	let haystack = argumentsText.toLowerCase();
	try {
		const parsed = JSON.parse(argumentsText);
		if (typeof parsed === "object" && parsed !== null) {
			const record = parsed;
			const command = record.command;
			const code = record.code;
			const picked = typeof command === "string" && command !== "" ? command : typeof code === "string" && code !== "" ? code : void 0;
			if (picked !== void 0) haystack = picked.toLowerCase();
		}
	} catch {}
	return /\b(pnpm|npm|yarn|npx|bun|python)\s+(run\s+)?(test|tests?)\b/.test(haystack) || /\b(pytest|vitest|jest|mocha|cypress|playwright|go test|cargo test)\b/.test(haystack);
}
/** Category-level inner-whisper pools — the pet knows roughly what is going on. */
const WHISPER_CATEGORY_POOLS = {
	thinking: [
		"先在脑子里搭个框架",
		"它在心里打草稿，我垫着脚看",
		"思路在一颗一颗冒泡",
		"脑内开会中，都别抢话筒",
		"先想清楚，再动手不迟",
		"草稿纸已经画满了",
		"让我听听它下一步打算",
		"嗯，方案在成型了"
	],
	writing: [
		"落笔成文，我旁边听着",
		"句子排着队往外走",
		"把想法一句句摆整齐",
		"它在组织语言，我打打气",
		"写回复呢，不催",
		"字斟句酌，快好了"
	],
	reading: [
		"翻资料呢，我保持安静",
		"一行一行读，不跳页",
		"在纸堆里找线索",
		"眼珠子跟着字跑",
		"边读边做记号",
		"翻箱倒柜找重点"
	],
	editing: [
		"动手改起来了，手稳一点",
		"这里补一笔，那边修一修",
		"在改东西，听不到声音才怪",
		"落笔小心，别有错别字",
		"改写的节奏，我听得见",
		"刷刷地改，一行都没跑"
	],
	running: [
		"跑起来了跑起来了",
		"命令敲出去，等个回响",
		"在跑什么呢，我踮脚看",
		"输出开始冒烟了",
		"它在跑活，我不吵",
		"盯着输出，蹲一个结果",
		"这波跑完就靠它了"
	],
	searching: [
		"去外面捞点信息",
		"翻翻记忆库，等我一小会儿",
		"顺着网线找线索",
		"把老账翻出来对一对",
		"情报在路上了",
		"搜索引擎当跑腿"
	],
	git: [
		"版本在往前迈步",
		"改动排队上车",
		"提交历史在长个子",
		"分支合并，神清气爽",
		"记录都焊在时间线上"
	],
	delegating: [
		"派了活儿出去，等回话",
		"清单列好，一件件来",
		"任务拆开分了组",
		"手下的伙计在远处跑着",
		"分工完毕，各司其职"
	],
	browsing: [
		"它在看网页，我偷瞄两眼",
		"页面一张张翻过去",
		"网页里翻答案呢",
		"这网速，我先歇会儿"
	],
	generic: [
		"这波活儿，我陪着",
		"又开工了，我盯梢",
		"它忙它的，我守着",
		"不打扰，就安静待着",
		"有活儿就有我"
	]
};
/** The pet's outcome reactions — woken by structured session results only. */
const WHISPER_RESULT_POOLS = {
	pass: [
		"全绿！亮瞎我眼了",
		"测试过了，击掌～",
		"绿灯一排排，看着就舒坦",
		"稳了稳了，这波稳得很",
		"全绿，奖励自己一口小鱼干",
		"这波测试，赢得干脆"
	],
	fail: [
		"哎呀，踩到小石子了",
		"这报错我盯上它了",
		"别慌，先看它在喊什么",
		"修好它，今天才不算白干",
		"又一次踩坑，老熟人了",
		"问题不大，就是有点问题"
	],
	done: [
		"搞定，收工～",
		"又翻过一页，踏实",
		"努力没白费，开心",
		"任务清零，舒服",
		"攻下一城，转个圈",
		"收工收工，今天圆满"
	]
};
/** The built-in voice pack: the plugin's default copy. */
const BUILTIN_VOICE_PACK = {
	status: STATUS_POOLS,
	tools: TOOL_POOLS,
	toolRemaining: TOOL_REMAINING_POOL,
	whispers: {
		categories: WHISPER_CATEGORY_POOLS,
		results: WHISPER_RESULT_POOLS
	}
};
/**
* The murmur engine (碎碎念): the pet's inner voice while sessions work.
* Category awareness: the projection feeds the current situation (thinking /
* writing / the running tool family), and the engine answers with a line from
* that category's pool — so a whisper always roughly knows what is going on
* without ever quoting real content (no tool names, no paths, no model text).
* Outcome moments (test green, tool errors, turn completion) fire from the
* structured result events, never from output text, so a mood cannot mis-
* fire on a discussion that merely mentions a keyword. A cooldown keeps
* whispers occasional; all picks are round-robin so tests reproduce exact
* lines. The voice-pack provider (pet-center M4) swaps the pools at draw
* time, so a pet switch re-voices live engines in place.
*/
var WhisperEngine = class {
	pools;
	categoryCooldownMs;
	resultCooldownMs;
	categoryCursor = /* @__PURE__ */ new Map();
	resultCursor = /* @__PURE__ */ new Map();
	lastWhisperAt = Number.NEGATIVE_INFINITY;
	constructor(pools = () => BUILTIN_VOICE_PACK, categoryCooldownMs = WHISPER_COOLDOWN_MS, resultCooldownMs = WHISPER_RESULT_COOLDOWN_MS) {
		this.pools = pools;
		this.categoryCooldownMs = categoryCooldownMs;
		this.resultCooldownMs = resultCooldownMs;
	}
	/** Effective category pool (an explicit empty override mutes the category). */
	categoryPool(category) {
		const override = this.pools().whispers?.categories?.[category];
		return override === void 0 ? WHISPER_CATEGORY_POOLS[category] : override;
	}
	/** Effective outcome pool (an explicit empty override mutes the outcome). */
	resultPool(kind) {
		const override = this.pools().whispers?.results?.[kind];
		return override === void 0 ? WHISPER_RESULT_POOLS[kind] : override;
	}
	/**
	* Feed one situation while a session works. Returns the whisper to show,
	* or undefined when the moment stays quiet (cooldown, or the category
	* pool is muted).
	*/
	feed(category, nowMs) {
		if (nowMs - this.lastWhisperAt < this.categoryCooldownMs) return void 0;
		const pool = this.categoryPool(category);
		if (pool.length === 0) return void 0;
		const index = (this.categoryCursor.get(category) ?? 0) % pool.length;
		this.categoryCursor.set(category, index + 1);
		return this.speak(pool[index], nowMs);
	}
	/**
	* Feed one structured outcome (test green / tool failure / turn
	* completion). Outcomes carry their own shorter cooldown so the emotional
	* moment is heard unless another whisper just spoke.
	*/
	result(kind, nowMs) {
		if (nowMs - this.lastWhisperAt < this.resultCooldownMs) return void 0;
		const pool = this.resultPool(kind);
		if (pool.length === 0) return void 0;
		const index = (this.resultCursor.get(kind) ?? 0) % pool.length;
		this.resultCursor.set(kind, index + 1);
		return this.speak(pool[index], nowMs);
	}
	speak(line, nowMs) {
		this.lastWhisperAt = nowMs;
		return line;
	}
};
//#endregion
//#region src/event-projection.ts
/**
* Fresh projection runtime for a newly seen session. The optional voice-pack
* provider (pet-center M4, issue #677) hands both chatter engines their
* pools; engines resolve overrides at draw time, so swapping the provider's
* pack re-voices live runtimes without rebuilding them.
*/
function emptyProjectionRuntime(pools) {
	return {
		activeTools: /* @__PURE__ */ new Set(),
		testCalls: /* @__PURE__ */ new Set(),
		officialEventsSeen: false,
		stepHadFailure: false,
		voice: new StatusVoice(pools),
		whispers: new WhisperEngine(pools)
	};
}
/** Keep tool names readable inside the compact status bubble. */
function displayToolName(name) {
	const compact = name.replace(/\s+/g, " ").trim() || "工具";
	return compact.length <= 24 ? compact : compact.slice(0, 21) + "...";
}
/** Whether a legacy phase is part of the pet's supported vocabulary. */
function isActivityPhase(phase) {
	return [
		"idle",
		"waiting",
		"thinking",
		"tool",
		"review",
		"done",
		"failed"
	].includes(phase);
}
/**
* Project the durable DSH session vocabulary into the pet's visual phases.
* Unknown and log-only events do not disturb the last meaningful activity.
* @param nowMs - injected wall clock for copy rotation and whisper pacing.
*/
function projectOfficialEvent(event, runtime, nowMs = Date.now()) {
	switch (event.type) {
		case "turn/start":
			runtime.activeTools.clear();
			runtime.testCalls.clear();
			runtime.stepHadFailure = false;
			return { input: {
				phase: "waiting",
				line: runtime.voice.scene("prepare", nowMs)
			} };
		case "step/start":
			runtime.activeTools.clear();
			runtime.stepHadFailure = false;
			return { input: {
				phase: "waiting",
				line: runtime.voice.scene("waiting", nowMs)
			} };
		case "assistant/chunk": {
			const { chunk } = event.data;
			if (chunk.type === "reasoning-delta" && chunk.text.length > 0) {
				const whisper = runtime.whispers.feed("thinking", nowMs);
				return {
					input: {
						phase: "thinking",
						line: runtime.voice.scene("thinking", nowMs)
					},
					...whisper === void 0 ? {} : { whisper }
				};
			}
			if (chunk.type === "text-delta" && chunk.text.length > 0) {
				const whisper = runtime.whispers.feed("writing", nowMs);
				return {
					input: {
						phase: "review",
						line: runtime.voice.scene("review", nowMs)
					},
					...whisper === void 0 ? {} : { whisper }
				};
			}
			return;
		}
		case "assistant/message": return { input: {
			phase: "review",
			line: runtime.voice.scene("review", nowMs)
		} };
		case "tool/call": {
			const callId = String(event.data.callId);
			runtime.activeTools.add(callId);
			if (looksLikeTestTool(event.data.name, event.data.arguments)) runtime.testCalls.add(callId);
			const whisper = runtime.whispers.feed(whisperCategoryOf(toolCategory(event.data.name)), nowMs);
			return {
				input: {
					phase: "tool",
					line: runtime.voice.tool(event.data.name, displayToolName(event.data.name), toolArgHint(event.data.name, event.data.arguments), nowMs)
				},
				...whisper === void 0 ? {} : { whisper }
			};
		}
		case "tool/result": {
			const block = event.data.message.content[0];
			const callId = String(event.data.message.source.callId);
			const failed = event.data.error !== void 0 || block.isError === true;
			const wasTest = runtime.testCalls.delete(callId);
			runtime.activeTools.delete(callId);
			runtime.stepHadFailure ||= failed;
			const whisper = failed ? runtime.whispers.result("fail", nowMs) : wasTest ? runtime.whispers.result("pass", nowMs) : void 0;
			const whisperSpread = whisper === void 0 ? {} : { whisper };
			if (runtime.activeTools.size > 0) return {
				input: {
					phase: "tool",
					line: runtime.voice.toolRemaining(runtime.activeTools.size, nowMs)
				},
				...whisperSpread
			};
			return runtime.stepHadFailure ? {
				input: {
					phase: "failed",
					line: runtime.voice.scene("toolFailed", nowMs)
				},
				...whisperSpread
			} : {
				input: {
					phase: "thinking",
					line: runtime.voice.scene("toolResult", nowMs)
				},
				...whisperSpread
			};
		}
		case "turn/end":
			runtime.activeTools.clear();
			runtime.testCalls.clear();
			switch (event.data.reason.kind) {
				case "completed": {
					const whisper = runtime.whispers.result("done", nowMs);
					return {
						input: {
							phase: "done",
							line: runtime.voice.scene("done", nowMs)
						},
						completedTurn: event.data.turn,
						...whisper === void 0 ? {} : { whisper }
					};
				}
				case "error": {
					const whisper = runtime.whispers.result("fail", nowMs);
					return {
						input: {
							phase: "failed",
							line: runtime.voice.scene("failed", nowMs)
						},
						...whisper === void 0 ? {} : { whisper }
					};
				}
				case "max-tokens": return { input: {
					phase: "failed",
					line: runtime.voice.scene("maxTokens", nowMs)
				} };
				case "interrupted": return { input: {
					phase: "failed",
					line: runtime.voice.scene("interrupted", nowMs)
				} };
				case "blocked": return { input: {
					phase: "waiting",
					line: runtime.voice.scene("blocked", nowMs)
				} };
				case "aborted": return { input: { phase: "idle" } };
				default: return { input: { phase: "idle" } };
			}
		default: return;
	}
}
//#endregion
//#region src/treats.ts
const defaultTreatConfig = {
	turnsPerTreat: 30,
	timeTreatMs: 300 * 6e4,
	maxTreats: 20
};
function emptyTreatLedger() {
	return {
		treats: 0,
		lastTreatGrantAt: 0,
		turnsAtLastTreatGrant: 0
	};
}
function cap(treats, max) {
	return Math.min(max, Math.max(0, treats));
}
/**
* Settle treat grants from both sources against one ledger snapshot.
* Work output counts whole periods since the last work settlement
* (turnsDelta / turnsPerTreat) and advances only the work anchor;
* time output counts whole periods since the time anchor
* (`lastTreatGrantAt`) and advances only the time anchor. The two sources
* are independent so a continuously working user still earns time treats.
* 0 time history never backfills — the clock starts at the first settlement,
* and even a zero-gain first settlement writes the time anchor so the next
* elapsed period can accrue (anchor deadlock fix). Both sources are clamped
* by the stock cap. When the anchor is already set and nothing is due, the
* input ledger is returned unchanged (same object), so callers can skip
* persistence cheaply.
*/
function settleTreatGrants(ledger, turns, nowMs, config = defaultTreatConfig) {
	const turnDelta = Math.max(0, turns - ledger.turnsAtLastTreatGrant);
	const workGrants = Math.floor(turnDelta / config.turnsPerTreat);
	const timeAnchor = ledger.lastTreatGrantAt === 0 ? nowMs : ledger.lastTreatGrantAt;
	const timeGrants = Math.floor(Math.max(0, nowMs - timeAnchor) / config.timeTreatMs);
	const gained = workGrants + timeGrants;
	if (gained <= 0) {
		if (ledger.lastTreatGrantAt === 0) return {
			ledger: {
				...ledger,
				lastTreatGrantAt: nowMs
			},
			gained: 0
		};
		return {
			ledger,
			gained: 0
		};
	}
	return {
		ledger: {
			treats: cap(ledger.treats + gained, config.maxTreats),
			lastTreatGrantAt: timeGrants > 0 ? timeAnchor + timeGrants * config.timeTreatMs : timeAnchor,
			turnsAtLastTreatGrant: workGrants > 0 ? turns - turnDelta % config.turnsPerTreat : ledger.turnsAtLastTreatGrant
		},
		gained
	};
}
/**
* Consume one treat for a feed. Returns the outcome; a feed with no stocked
* treats is refused.
*/
function consumeTreat(ledger) {
	if (ledger.treats <= 0) return { ok: false };
	return {
		ok: true,
		ledger: {
			...ledger,
			treats: ledger.treats - 1
		}
	};
}
//#endregion
//#region src/ledger.ts
/**
* Pet affinity economy (ledger) — composes the pure affinity and treats
* modules with the cooldown/dedup bookkeeping and emits updated persistence
* snapshots, marking dirty so the owning facade decides when to flush. Read
* paths (view) no longer settle the economy; settlements happen on explicit
* economic events: completed-turn rewards (official or legacy) and feeds.
* @module @linxin666/dsh-pet/ledger
*/
/**
* Holds the current persistence snapshot and all economy bookkeeping. Every
* mutating call flags takeDirty so the facade persists exactly once per
* batch of changes; read methods (snapshot, affinityView) never write.
*/
var PetLedger = class {
	affinityConfig;
	treatConfig;
	/** Round-robin reaction picker; rebuilt when the selected pet changes. */
	picker;
	current;
	/** Completed turns already rewarded, per session (turn numbers are per-session). */
	rewardedTurns = /* @__PURE__ */ new Map();
	lastLegacyTurnRewardAt = 0;
	dirty = false;
	constructor(persist, config = {}) {
		this.affinityConfig = {
			...defaultAffinityConfig,
			...config.affinity ?? {}
		};
		this.treatConfig = {
			...defaultTreatConfig,
			...config.treats ?? {}
		};
		this.picker = new RemarkPicker(config.remarks);
		this.current = persist;
	}
	/** Affinity cooldown/rank tuning (read-only). */
	get affinity() {
		return this.affinityConfig;
	}
	/** The current persistence snapshot (trade a copy when mutating). */
	get snapshot() {
		return this.current;
	}
	/** Stock cap reported to clients. */
	get treatMax() {
		return this.treatConfig.maxTreats;
	}
	/** Consume the pending-write flag if any mutation occurred. */
	takeDirty() {
		const was = this.dirty;
		this.dirty = false;
		return was;
	}
	/**
	* Drop a session's rewarded-turn bookkeeping once that session is disposed,
	* so the per-session map does not grow without bound.
	*/
	forgetSession(sessionId) {
		this.rewardedTurns.delete(sessionId);
	}
	/** Replace the display block (clamping stays a caller concern). */
	setDisplay(display) {
		this.current = {
			...this.current,
			display
		};
		this.dirty = true;
	}
	/** Replace the selected pet id (validation stays a caller concern). */
	setPetId(petId) {
		if (this.current.petId === petId) return;
		this.current = {
			...this.current,
			petId
		};
		this.dirty = true;
	}
	/** Replace one pet's gameplay state (validation/clamping stays a caller concern). */
	setGameplay(petId, gameplay) {
		this.current = {
			...this.current,
			gameplay: {
				...this.current.gameplay,
				[petId]: gameplay
			}
		};
		this.dirty = true;
	}
	/** Replace one pet's display name (validation stays a caller concern). */
	setPetName(petId, name) {
		this.current = {
			...this.current,
			names: {
				...this.current.names,
				[petId]: name
			}
		};
		this.dirty = true;
	}
	/**
	* Swap the reaction pools to another pet's custom remarks (called on pet
	* selection). Slots the pet does not declare fall back to built-ins.
	*/
	setRemarks(remarks) {
		this.picker = new RemarkPicker(remarks);
	}
	/**
	* Settle the treat economy (work + time output since the last settlement).
	* A zero-gain first settlement still starts the time clock (anchor write),
	* which is how the time output can ever accrue. Returns true when
	* the in-memory ledger changed and should be persisted.
	*/
	settleTreats(nowMs) {
		const settlement = settleTreatGrants(this.current.treats, this.current.affinity.turns, nowMs, this.treatConfig);
		if (settlement.ledger === this.current.treats) return false;
		this.current = {
			...this.current,
			treats: settlement.ledger
		};
		this.dirty = true;
		return true;
	}
	/**
	* Grant gameplay treats into the shared stock (capped by the treat cap).
	* This is the unified gameplay currency (wallet removed): work rewards,
	* passive income and lottery prizes land here so one balance feeds the
	* shop and the feeding economy. Returns true when the snapshot changed.
	*/
	grantTreats(amount) {
		if (amount <= 0) return false;
		const capped = Math.min(this.treatConfig.maxTreats, this.current.treats.treats + amount);
		if (capped === this.current.treats.treats) return false;
		this.current = {
			...this.current,
			treats: {
				...this.current.treats,
				treats: capped
			}
		};
		this.dirty = true;
		return true;
	}
	/** Spend gameplay treats from the shared stock; refuses when unaffordable. */
	spendTreats(amount) {
		const stock = this.current.treats.treats;
		if (amount <= 0 || stock < amount) return { ok: false };
		this.current = {
			...this.current,
			treats: {
				...this.current.treats,
				treats: stock - amount
			}
		};
		this.dirty = true;
		return { ok: true };
	}
	/**
	* Award the completed-turn reward once per session+turn (idempotent) and
	* run the treat settlement that work output feeds. Returns true when the
	* snapshot changed.
	*/
	rewardTurn(sessionId, turn, nowMs) {
		if (turn <= (this.rewardedTurns.get(sessionId) ?? 0)) return false;
		this.rewardedTurns.set(sessionId, turn);
		let changed = this.applyTurnReward();
		if (this.settleTreats(nowMs)) changed = true;
		return changed;
	}
	/** Preserve turn rewards for installations that only emit legacy activity. */
	rewardLegacyTurn(nowMs) {
		if (nowMs - this.lastLegacyTurnRewardAt < 5e3) return false;
		this.lastLegacyTurnRewardAt = nowMs;
		let changed = this.applyTurnReward();
		if (this.settleTreats(nowMs)) changed = true;
		return changed;
	}
	applyTurnReward() {
		this.current = {
			...this.current,
			affinity: applyTurnReward(this.current.affinity, this.affinityConfig)
		};
		this.dirty = true;
		return true;
	}
	/**
	* Pet or feed the pet. Feeding settles first, then gates on the feed
	* cooldown before spending stock — a feed inside the cooldown must not burn
	* a treat for nothing.
	*/
	interact(kind, nowMs) {
		if (kind === "feed") this.settleTreats(nowMs);
		const before = this.current.affinity;
		const outcome = applyInteraction(before, kind, nowMs, this.affinityConfig);
		if (kind === "feed" && !outcome.accepted) {
			this.current = {
				...this.current,
				affinity: outcome.affinity
			};
			this.dirty = true;
			return {
				reaction: this.picker.pickAt("feedCooldown", before.feedRejects),
				delta: 0,
				affinity: this.affinityView(nowMs)
			};
		}
		if (kind === "feed") {
			const consume = consumeTreat(this.current.treats);
			if (!consume.ok) return {
				reaction: this.picker.pick("noTreats"),
				delta: 0,
				affinity: this.affinityView(nowMs)
			};
			this.current = {
				...this.current,
				treats: consume.ledger
			};
			this.dirty = true;
		}
		this.current = {
			...this.current,
			affinity: outcome.affinity
		};
		this.dirty = true;
		const count = kind === "pet" ? outcome.accepted ? before.pets : before.petRejects : before.feeds;
		return {
			reaction: this.picker.pickAt(outcome.accepted ? kind : "petCooldown", count),
			delta: outcome.delta,
			affinity: this.affinityView(nowMs)
		};
	}
	/** Current affinity view for the RPC snapshot. */
	affinityView(nowMs) {
		return affinityViewOf(this.current.affinity, nowMs, this.affinityConfig);
	}
};
//#endregion
//#region src/dsh-home.ts
/**
* DSH_HOME resolution shared by the plugin family's Host halves: the
* environment override wins, the platform home fallback follows. Mirrors
* what dsh-pet and dsh-liangshen each used to implement locally.
*/
/** Expand a leading ~ (or ~user) in a path, platform-style. */
function expandHome(path, home = homedir()) {
	const j = home.startsWith("/") ? join$1 : join;
	if (path === "~") return home;
	if (path.startsWith("~/") || path.startsWith("~\\")) return j(home, path.slice(2));
	return path;
}
/**
* Resolve the DSH home directory.
* @param env - process environment to read DSH_HOME from.
* @param home - platform home directory fallback (test seam).
* @returns the absolute DSH home path.
*/
function resolveDshHome(env = process.env, home = homedir()) {
	const isPosix = home.startsWith("/");
	const j = isPosix ? join$1 : join;
	const isAbs = isPosix ? isAbsolute$1 : isAbsolute;
	const raw = env.DSH_HOME;
	if (raw !== void 0 && raw.trim() !== "") {
		const expanded = expandHome(raw.trim(), home);
		return isAbs(expanded) ? expanded : j(process.cwd(), expanded);
	}
	return j(home, ".dsh");
}
/** Resolve the DSH home directory from the live environment. */
function dshHome() {
	return resolveDshHome();
}
//#endregion
//#region src/defaults.ts
/** Shared defaults used by registry selection and persisted-state migration. */
/** Pet id that legacy single-pet installs and fresh registries resolve to. */
const DEFAULT_PET_ID = "whale-girl";
/** Default pet name used only when a manifest carries no displayName. */
const DEFAULT_PET_NAME = "鲸鱼娘";
//#endregion
//#region src/persist.ts
/**
* Pet persistence — tiny JSON store for affinity + display config, written
* under $DSH_HOME (defaults to ~/.dsh) as `pet.json`. Deliberately minimal:
* one file, atomic rename write, tolerant read (corrupt file → defaults).
* @module @linxin666/dsh-pet/persist
*/
const defaultDisplayConfig = {
	visible: true,
	size: 160,
	right: 24,
	bottom: 120
};
const DISPLAY_INSET_MAX = 1e4;
/** Name constraints. */
const PET_NAME_MAX_LENGTH = 20;
function emptyPersist() {
	return {
		petId: DEFAULT_PET_ID,
		names: {},
		affinity: emptyAffinity(),
		treats: emptyTreatLedger(),
		display: { ...defaultDisplayConfig },
		gameplay: {}
	};
}
/**
* Resolve the persistence directory ($DSH_HOME or ~/.dsh). Delegates to the
* shared {@link dshHome} resolution so the plugin family keeps one DSH_HOME
* definition (env override, ~ expansion, cwd-joined relative values).
*/
function petHomeDir() {
	return dshHome();
}
/** Numeric field guard: finite numbers only, else the fallback. */
function finiteNum(value, fallback) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
/** Sanitize the per-pet names map (string keys, non-empty trimmed values). */
function loadPetNames(parsed) {
	const names = {};
	if (typeof parsed.names !== "object" || parsed.names === null) return names;
	for (const [id, value] of Object.entries(parsed.names)) {
		if (id === "" || typeof value !== "string") continue;
		const name = value.trim();
		if (name === "") continue;
		names[id] = name.slice(0, 20);
	}
	return names;
}
/** Clamp one count/score into [0, max]. */
function clamp(value, max) {
	return Math.min(max, Math.max(0, value));
}
/** Absolute numeric ceilings applied at load (manifest clamps refine these). */
const GAMEPLAY_LOAD_STAT_CAP = 1e6;
const GAMEPLAY_LOAD_CURRENCY_CAP = 9999999;
/** Sanitize the persisted per-pet gameplay map. */
function loadGameplay(parsed) {
	const result = {};
	if (typeof parsed.gameplay !== "object" || parsed.gameplay === null) return result;
	for (const [petId, raw] of Object.entries(parsed.gameplay)) {
		if (petId === "" || typeof raw !== "object" || raw === null) continue;
		const record = raw;
		const stats = {};
		if (typeof record.stats === "object" && record.stats !== null) for (const [key, value] of Object.entries(record.stats)) {
			if (key === "" || typeof value !== "number" || !Number.isFinite(value)) continue;
			stats[key] = Math.min(GAMEPLAY_LOAD_STAT_CAP, Math.max(0, value));
		}
		const currencies = {};
		if (typeof record.currencies === "object" && record.currencies !== null) for (const [key, value] of Object.entries(record.currencies)) {
			if (key === "" || typeof value !== "number" || !Number.isFinite(value)) continue;
			currencies[key] = Math.min(GAMEPLAY_LOAD_CURRENCY_CAP, Math.max(0, Math.floor(value)));
		}
		result[petId] = {
			stats,
			currencies,
			mode: record.mode === "work" || record.mode === "sleep" ? record.mode : null,
			settledAt: clamp(finiteNum(record.settledAt, 0), Number.MAX_SAFE_INTEGER)
		};
	}
	return result;
}
/** Load persisted state; missing or corrupt files fall back to defaults. */
function loadPetPersist(dir = petHomeDir()) {
	try {
		const raw = readFileSync(join(dir, "pet.json"), "utf8");
		const parsed = JSON.parse(raw);
		const base = emptyPersist();
		const rawAffinity = parsed.affinity ?? {};
		const affinity = {
			points: clamp(finiteNum(rawAffinity.points, 0), AFFINITY_MAX),
			lastPetAt: clamp(finiteNum(rawAffinity.lastPetAt, 0), Number.MAX_SAFE_INTEGER),
			lastFeedAt: clamp(finiteNum(rawAffinity.lastFeedAt, 0), Number.MAX_SAFE_INTEGER),
			pets: clamp(finiteNum(rawAffinity.pets, 0), Number.MAX_SAFE_INTEGER),
			feeds: clamp(finiteNum(rawAffinity.feeds, 0), Number.MAX_SAFE_INTEGER),
			petRejects: clamp(finiteNum(rawAffinity.petRejects, 0), Number.MAX_SAFE_INTEGER),
			feedRejects: clamp(finiteNum(rawAffinity.feedRejects, 0), Number.MAX_SAFE_INTEGER),
			turns: clamp(finiteNum(rawAffinity.turns, 0), Number.MAX_SAFE_INTEGER)
		};
		const rawTreats = parsed.treats ?? {};
		const treats = {
			treats: clamp(finiteNum(rawTreats.treats, 0), defaultTreatConfig.maxTreats),
			lastTreatGrantAt: clamp(finiteNum(rawTreats.lastTreatGrantAt, 0), Number.MAX_SAFE_INTEGER),
			turnsAtLastTreatGrant: clamp(finiteNum(rawTreats.turnsAtLastTreatGrant, 0), Number.MAX_SAFE_INTEGER)
		};
		const rawDisplay = parsed.display ?? {};
		const display = {
			visible: typeof rawDisplay.visible === "boolean" ? rawDisplay.visible : base.display.visible,
			size: Math.round(Math.min(512, Math.max(32, finiteNum(rawDisplay.size, base.display.size)))),
			right: Math.round(clamp(finiteNum(rawDisplay.right, base.display.right), DISPLAY_INSET_MAX)),
			bottom: Math.round(clamp(finiteNum(rawDisplay.bottom, base.display.bottom), DISPLAY_INSET_MAX))
		};
		const petId = typeof parsed.petId === "string" && parsed.petId.trim() !== "" ? parsed.petId.trim() : base.petId;
		const names = loadPetNames(parsed);
		if (typeof parsed.name === "string" && parsed.name.trim() !== "" && names[petId] === void 0) names[petId] = parsed.name.trim().slice(0, 20);
		return {
			petId,
			names,
			affinity,
			treats,
			display,
			gameplay: loadGameplay(parsed)
		};
	} catch {
		return emptyPersist();
	}
}
/** Atomically persist state (write temp + rename). */
function savePetPersist(data, dir = petHomeDir()) {
	mkdirSync(dir, { recursive: true });
	const target = join(dir, "pet.json");
	const tmp = `${target}.tmp`;
	writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
	renameSync(tmp, target);
}
/** Hover-panel action buttons a pack can show or hide (canonical order). */
const PANEL_ACTIONS = [
	"feed",
	"rename",
	"hide"
];
/** Panel label slots (unset slots keep the client's i18n dictionary copy). */
const PANEL_LABEL_KEYS = [
	"feed",
	"rename",
	"hide",
	"confirm"
];
/** Panel stat slots ({rank}/{n}/{points} interpolate the live values). */
const PANEL_STAT_KEYS = [
	"rank",
	"treats",
	"points"
];
/** Any '{token}' placeholder (no nesting, no newlines). */
const PLACEHOLDER_PATTERN = /{[^{}]*}/g;
/** Allowed placeholder tokens per pool kind (absent kind = none allowed). */
const PLACEHOLDER_WHITELIST = {
	tools: ["{tool}", "{hint}"],
	toolRemaining: ["{n}"],
	stat: [
		"{rank}",
		"{n}",
		"{points}"
	]
};
function isRecord$3(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Trim, length-cap and placeholder-check one copy line; undefined to drop. */
function normalizeLine(raw, kind, onWarning) {
	const trimmed = raw.trim();
	if (trimmed === "") return void 0;
	let capped = trimmed.length > 160 ? trimmed.slice(0, 160) : trimmed;
	const dangling = capped.lastIndexOf("{");
	if (dangling !== -1 && capped.indexOf("}", dangling) === -1) {
		onWarning("line cut at an unterminated placeholder; tail dropped: " + capped.slice(0, 40) + "...");
		capped = capped.slice(0, dangling);
	}
	if (capped === "") return void 0;
	const allowed = PLACEHOLDER_WHITELIST[kind];
	const tokens = capped.match(PLACEHOLDER_PATTERN) ?? [];
	for (const token of tokens) {
		if (allowed?.includes(token) === true) continue;
		const preview = capped.length > 40 ? capped.slice(0, 40) + "..." : capped;
		onWarning("line dropped (unsupported placeholder " + token + "): " + preview);
		return;
	}
	return capped;
}
/**
* Normalize one pool slot. Accepts a single line or an array; non-string
* entries warn and drop, empty lines drop silently, lines over the length
* cap truncate, illegal placeholders drop the line, and pools over the line
* cap keep their first lines. An explicit empty pool normalizes to [] (the
* whisper channels read that as mute) while an absent slot normalizes to
* undefined (the slot keeps the built-in pool).
*/
function normalizePool(raw, kind, onWarning = () => {}) {
	if (raw === void 0) return void 0;
	const entries = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : void 0;
	if (entries === void 0) {
		onWarning("pool must be a string or an array of strings");
		return;
	}
	if (entries.length > 64) onWarning("pool has more than 64 lines; extra lines are ignored");
	const pool = [];
	for (const entry of entries.slice(0, 64)) {
		if (typeof entry !== "string") {
			onWarning("non-string pool entry dropped");
			continue;
		}
		const line = normalizeLine(entry, kind, onWarning);
		if (line !== void 0) pool.push(line);
	}
	return pool;
}
/** Normalize whisper category pools; a key replaces that category's built-in pool (an explicit empty pool mutes it). */
function normalizeWhisperCategories(raw, onWarning = () => {}) {
	if (raw === void 0) return void 0;
	if (!isRecord$3(raw)) {
		onWarning("whispers.categories must be an object");
		return;
	}
	const pools = {};
	for (const key of Object.keys(raw)) {
		if (!WHISPER_CATEGORIES.includes(key)) {
			onWarning("unknown whisper category " + key + " ignored");
			continue;
		}
		const pool = normalizePool(raw[key], "whisperCategory", onWarning);
		if (pool !== void 0) pools[key] = pool;
	}
	return Object.keys(pools).length > 0 ? pools : void 0;
}
/** Normalize whisper outcome pools; a key replaces that outcome's built-in pool (an explicit empty pool mutes it). */
function normalizeWhisperResults(raw, onWarning = () => {}) {
	if (raw === void 0) return void 0;
	if (!isRecord$3(raw)) {
		onWarning("whispers.results must be an object");
		return;
	}
	const pools = {};
	for (const key of Object.keys(raw)) {
		if (!WHISPER_RESULTS.includes(key)) {
			onWarning("unknown whisper result " + key + " ignored");
			continue;
		}
		const pool = normalizePool(raw[key], "whisperResult", onWarning);
		if (pool !== void 0) pools[key] = pool;
	}
	return Object.keys(pools).length > 0 ? pools : void 0;
}
/** Normalize the panel block (labels / stats / actions; warn-and-drop). */
function normalizePanel(raw, onWarning = () => {}) {
	if (!isRecord$3(raw)) {
		onWarning("panel must be an object");
		return;
	}
	const panel = {};
	const labelsRaw = raw.labels;
	if (labelsRaw !== void 0) if (!isRecord$3(labelsRaw)) onWarning("panel.labels must be an object");
	else {
		const labels = {};
		for (const key of PANEL_LABEL_KEYS) {
			const value = labelsRaw[key];
			if (value === void 0) continue;
			if (typeof value !== "string") {
				onWarning("panel.labels." + key + " must be a string");
				continue;
			}
			const line = normalizeLine(value, "label", onWarning);
			if (line !== void 0) labels[key] = line.slice(0, 40);
		}
		if (Object.keys(labels).length > 0) panel.labels = labels;
	}
	const statsRaw = raw.stats;
	if (statsRaw !== void 0) if (!isRecord$3(statsRaw)) onWarning("panel.stats must be an object");
	else {
		const stats = {};
		for (const key of PANEL_STAT_KEYS) {
			const value = statsRaw[key];
			if (value === void 0) continue;
			if (typeof value !== "string") {
				onWarning("panel.stats." + key + " must be a string");
				continue;
			}
			const line = normalizeLine(value, "stat", onWarning);
			if (line !== void 0) stats[key] = line.slice(0, 80);
		}
		if (Object.keys(stats).length > 0) panel.stats = stats;
	}
	const actionsRaw = raw.actions;
	if (actionsRaw !== void 0) if (!Array.isArray(actionsRaw)) onWarning("panel.actions must be an array");
	else {
		const seen = /* @__PURE__ */ new Set();
		for (const entry of actionsRaw) {
			if (typeof entry !== "string" || !PANEL_ACTIONS.includes(entry)) {
				onWarning("unknown panel action dropped: " + String(entry));
				continue;
			}
			seen.add(entry);
		}
		panel.actions = PANEL_ACTIONS.filter((action) => seen.has(action));
	}
	if (panel.labels === void 0 && panel.stats === void 0 && panel.actions === void 0) return void 0;
	return panel;
}
/** Voice-pack top-level fields ('$schema' mirrors the schema twin; drift-locked in tests). */
const VOICE_PACK_KEYS = /* @__PURE__ */ new Set([
	"$schema",
	"voicePackVersion",
	"status",
	"tools",
	"toolRemaining",
	"whispers",
	"panel"
]);
/** Allowed whisper-section fields (drift-locked in tests). */
const WHISPER_KEYS = /* @__PURE__ */ new Set(["categories", "results"]);
/**
* Normalize one raw voice.json document into a VoicePack, or undefined when
* the file cannot serve as a pack at all (non-object root — structure is
* fail-closed per file). Every slot issue is a warning, never a throw.
*/
function normalizeVoicePack(raw, onWarning = () => {}) {
	if (raw === void 0) return void 0;
	if (!isRecord$3(raw)) {
		onWarning("voice.json must be a JSON object; the file is ignored");
		return;
	}
	for (const key of Object.keys(raw)) if (!VOICE_PACK_KEYS.has(key)) onWarning("unknown top-level field " + key + " ignored");
	const version = raw.voicePackVersion;
	if (version !== void 0 && (typeof version !== "number" || version !== 1)) onWarning("voicePackVersion " + String(version) + " is not supported; reading as v1 best-effort");
	const overrides = {};
	const statusRaw = raw.status;
	if (statusRaw !== void 0) if (!isRecord$3(statusRaw)) onWarning("status must be an object");
	else for (const key of Object.keys(statusRaw)) {
		if (!STATUS_SCENES.includes(key)) {
			onWarning("unknown status scene " + key + " ignored");
			continue;
		}
		const pool = normalizePool(statusRaw[key], "status", onWarning);
		if (pool !== void 0 && pool.length > 0) overrides.status = {
			...overrides.status,
			[key]: pool
		};
	}
	const toolsRaw = raw.tools;
	if (toolsRaw !== void 0) if (!isRecord$3(toolsRaw)) onWarning("tools must be an object");
	else for (const key of Object.keys(toolsRaw)) {
		if (!TOOL_CATEGORIES.includes(key)) {
			onWarning("unknown tool family " + key + " ignored");
			continue;
		}
		const pool = normalizePool(toolsRaw[key], "tools", onWarning);
		if (pool !== void 0 && pool.length > 0) overrides.tools = {
			...overrides.tools,
			[key]: pool
		};
	}
	const remainingRaw = raw.toolRemaining;
	if (remainingRaw !== void 0) {
		const pool = normalizePool(remainingRaw, "toolRemaining", onWarning);
		if (pool !== void 0 && pool.length > 0) overrides.toolRemaining = pool;
	}
	const whispersRaw = raw.whispers;
	if (whispersRaw !== void 0) if (!isRecord$3(whispersRaw)) onWarning("whispers must be an object");
	else {
		for (const key of Object.keys(whispersRaw)) if (key === "generic" || key === "rules") onWarning("whispers." + key + " is no longer supported and was ignored");
		else if (!WHISPER_KEYS.has(key)) onWarning("unknown whispers field " + key + " ignored");
		const categories = normalizeWhisperCategories(whispersRaw.categories, onWarning);
		const results = normalizeWhisperResults(whispersRaw.results, onWarning);
		if (categories !== void 0 || results !== void 0) overrides.whispers = {
			...categories === void 0 ? {} : { categories },
			...results === void 0 ? {} : { results }
		};
	}
	const panel = raw.panel === void 0 ? void 0 : normalizePanel(raw.panel, onWarning);
	if (overrides.status === void 0 && overrides.tools === void 0 && overrides.toolRemaining === void 0 && overrides.whispers === void 0 && panel === void 0) return;
	return {
		overrides,
		...panel === void 0 ? {} : { panel }
	};
}
/**
* Merge voice-pack layers into one pack; later layers win per slot. The
* built-in pools are NOT a layer here — the chatter engines fall back to
* them per key at draw time. Merge order for a selected pet:
* mergeVoicePacks(registry.globalVoice, entry.voice).
*/
function mergeVoicePacks(...layers) {
	const overrides = {};
	const labels = {};
	const stats = {};
	let actions;
	let panelSeen = false;
	let any = false;
	for (const layer of layers) {
		if (layer === void 0) continue;
		any = true;
		if (layer.overrides.status !== void 0) overrides.status = {
			...overrides.status,
			...layer.overrides.status
		};
		if (layer.overrides.tools !== void 0) overrides.tools = {
			...overrides.tools,
			...layer.overrides.tools
		};
		if (layer.overrides.toolRemaining !== void 0) overrides.toolRemaining = layer.overrides.toolRemaining;
		if (layer.overrides.whispers !== void 0) overrides.whispers = {
			...overrides.whispers,
			...layer.overrides.whispers
		};
		if (layer.panel !== void 0) {
			panelSeen = true;
			if (layer.panel.labels !== void 0) Object.assign(labels, layer.panel.labels);
			if (layer.panel.stats !== void 0) Object.assign(stats, layer.panel.stats);
			if (layer.panel.actions !== void 0) actions = layer.panel.actions;
		}
	}
	if (!any) return void 0;
	const panel = {
		...Object.keys(labels).length > 0 ? { labels } : {},
		...Object.keys(stats).length > 0 ? { stats } : {},
		...actions === void 0 ? {} : { actions }
	};
	const panelEmpty = panel.labels === void 0 && panel.stats === void 0 && panel.actions === void 0;
	return {
		overrides,
		...panelSeen && !panelEmpty ? { panel } : {}
	};
}
//#endregion
//#region src/gameplay.ts
const KEBAB = /^[a-z0-9][a-z0-9-]*$/;
const MAX_STATS = 16;
const MAX_ZONES = 8;
const MAX_BRANCHES = 8;
const MAX_ACTS = 16;
const MAX_SHOP_ITEMS = 32;
const MAX_LOTTERY_TIERS = 16;
const MAX_PHRASES = 64;
const PHRASE_MAX_LENGTH = 120;
const STAT_VALUE_MAX = 1e6;
const CURRENCY_MAX = 9999999;
const KNOWN_GAMEPLAY = /* @__PURE__ */ new Set([
	"idleDirector",
	"stats",
	"hitBox",
	"touch",
	"work",
	"sleep",
	"passiveIncome",
	"shop",
	"dragState",
	"dragEndState"
]);
const KNOWN_STAT = /* @__PURE__ */ new Set([
	"max",
	"initial",
	"decayPerMinute",
	"workingDecayPerMinute",
	"idleDecayPerMinute"
]);
const KNOWN_ZONE = /* @__PURE__ */ new Set([
	"name",
	"y0",
	"y1",
	"branches"
]);
const KNOWN_TOUCH = /* @__PURE__ */ new Set(["zones", "clickBoost"]);
const KNOWN_BRANCH = /* @__PURE__ */ new Set([
	"probability",
	"effects",
	"state",
	"stateMs",
	"phrases"
]);
const KNOWN_EFFECT = /* @__PURE__ */ new Set([
	"stat",
	"currency",
	"amount"
]);
const KNOWN_WORK = /* @__PURE__ */ new Set([
	"state",
	"successState",
	"failState",
	"tickMs",
	"resultMs",
	"successProbability",
	"success",
	"fail"
]);
const KNOWN_SLEEP = /* @__PURE__ */ new Set([
	"state",
	"wakeState",
	"restore"
]);
const KNOWN_SHOP_ITEM = /* @__PURE__ */ new Set([
	"id",
	"label",
	"image",
	"price",
	"currency",
	"effects",
	"lottery"
]);
const KNOWN_LOTTERY = /* @__PURE__ */ new Set([
	"effects",
	"currency",
	"tiers"
]);
const KNOWN_IDLE_DIRECTOR = /* @__PURE__ */ new Set([
	"intervalMs",
	"maxMiss",
	"idleWeight",
	"acts"
]);
const KNOWN_ACT = /* @__PURE__ */ new Set([
	"track",
	"weight",
	"phrases"
]);
function isRecord$2(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys$2(source, known) {
	return Object.keys(source).filter((key) => !known.has(key));
}
function validName(name, max = 32) {
	return typeof name === "string" && name.length <= max && KEBAB.test(name);
}
function intIn(value, min, max) {
	return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function numIn(value, min, max) {
	return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function parseEffects(raw, field, stats, hooks) {
	if (raw === void 0) return void 0;
	if (!Array.isArray(raw) || raw.length === 0) {
		hooks.error(field + " must be a non-empty array of effects");
		return;
	}
	const effects = [];
	for (const entry of raw) {
		if (!isRecord$2(entry)) {
			hooks.error(field + ": every effect must be an object");
			continue;
		}
		const extra = unknownKeys$2(entry, KNOWN_EFFECT);
		if (extra.length > 0) hooks.error(field + ": unknown effect field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
		const hasStat = typeof entry.stat === "string";
		const hasCurrency = typeof entry.currency === "string";
		if (hasStat === hasCurrency) {
			hooks.error(field + ": an effect needs exactly one of stat or currency");
			continue;
		}
		if (!intIn(entry.amount, -1e6, STAT_VALUE_MAX) || entry.amount === 0) {
			hooks.error(field + ": effect amount must be a non-zero integer within ±1000000");
			continue;
		}
		if (hasStat && stats[entry.stat] === void 0) {
			hooks.error(field + ": effect references undeclared stat " + JSON.stringify(entry.stat));
			continue;
		}
		if (hasCurrency && !validName(entry.currency, 24)) {
			hooks.error(field + ": effect currency must be a kebab id");
			continue;
		}
		effects.push({
			...hasStat ? { stat: entry.stat } : {},
			...hasCurrency ? { currency: entry.currency } : {},
			amount: entry.amount
		});
	}
	return effects.length === 0 ? void 0 : effects;
}
function parsePhrases(raw, field, hooks) {
	if (raw === void 0) return void 0;
	if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PHRASES || raw.some((line) => typeof line !== "string" || line.trim() === "" || line.length > PHRASE_MAX_LENGTH)) {
		hooks.error(field + " must be 1..64 non-empty lines of at most 120 chars");
		return;
	}
	return raw;
}
function parseStateRef(raw, field, hooks) {
	if (raw === void 0) return void 0;
	if (typeof raw !== "string" || !hooks.stateNames.has(raw)) {
		hooks.error(field + " must name a declared frames2d track");
		return;
	}
	return raw;
}
/**
* Validate the manifest 'gameplay' block (fail-closed). Only frames2d pets
* may declare gameplay today: every state reference checks against the
* declared track names.
*/
function parseGameplayManifest(raw, hooks) {
	const error = (message) => hooks.error(message);
	if (!isRecord$2(raw)) {
		error("gameplay must be an object");
		return;
	}
	const extra = unknownKeys$2(raw, KNOWN_GAMEPLAY);
	if (extra.length > 0) error("gameplay: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	let failed = false;
	const fail = (message) => {
		failed = true;
		error(message);
	};
	const stats = {};
	if (raw.stats !== void 0) if (!isRecord$2(raw.stats)) fail("gameplay.stats must be an object keyed by stat id");
	else {
		const entries = Object.entries(raw.stats);
		if (entries.length > MAX_STATS) fail("gameplay.stats declares too many stats (max 16)");
		for (const [name, value] of entries) {
			if (!validName(name, 24)) {
				fail("gameplay.stats: invalid stat id " + JSON.stringify(name));
				continue;
			}
			if (!isRecord$2(value)) {
				fail("gameplay.stats." + name + " must be an object");
				continue;
			}
			const statExtra = unknownKeys$2(value, KNOWN_STAT);
			if (statExtra.length > 0) fail("gameplay.stats." + name + ": unknown field(s) " + statExtra.map((k) => JSON.stringify(k)).join(", "));
			if (!intIn(value.max, 1, STAT_VALUE_MAX)) {
				fail("gameplay.stats." + name + ".max must be an integer in [1, 1000000]");
				continue;
			}
			const def = { max: value.max };
			if (value.initial !== void 0) if (!numIn(value.initial, 0, value.max)) fail("gameplay.stats." + name + ".initial must be within [0, max]");
			else def.initial = value.initial;
			for (const key of [
				"decayPerMinute",
				"workingDecayPerMinute",
				"idleDecayPerMinute"
			]) if (value[key] !== void 0) if (!numIn(value[key], 0, 1e3)) fail("gameplay.stats." + name + "." + key + " must be a number in [0, 1000]");
			else def[key] = value[key];
			stats[name] = def;
		}
	}
	const block = {};
	if (Object.keys(stats).length > 0) block.stats = stats;
	if (raw.idleDirector !== void 0) if (!isRecord$2(raw.idleDirector) || !Array.isArray(raw.idleDirector.acts)) fail("gameplay.idleDirector must be an object with an acts array");
	else {
		const d = raw.idleDirector;
		const dExtra = unknownKeys$2(d, KNOWN_IDLE_DIRECTOR);
		if (dExtra.length > 0) fail("gameplay.idleDirector: unknown field(s) " + dExtra.map((k) => JSON.stringify(k)).join(", "));
		if (d.intervalMs !== void 0 && !intIn(d.intervalMs, 1e3, 6e4)) fail("gameplay.idleDirector.intervalMs must be an integer in [1000, 60000]");
		if (d.maxMiss !== void 0 && !intIn(d.maxMiss, 0, 10)) fail("gameplay.idleDirector.maxMiss must be an integer in [0, 10]");
		if (d.idleWeight !== void 0 && !intIn(d.idleWeight, 0, 1e4)) fail("gameplay.idleDirector.idleWeight must be an integer in [0, 10000]");
		if (d.acts.length === 0 || d.acts.length > MAX_ACTS) fail("gameplay.idleDirector.acts must declare 1..16 acts");
		const acts = [];
		for (const act of d.acts) {
			if (!isRecord$2(act) || !intIn(act.weight, 1, 1e4)) {
				fail("gameplay.idleDirector.acts entries need a weight integer in [1, 10000]");
				continue;
			}
			const aExtra = unknownKeys$2(act, KNOWN_ACT);
			if (aExtra.length > 0) fail("gameplay.idleDirector.acts: unknown field(s) " + aExtra.map((k) => JSON.stringify(k)).join(", "));
			const track = parseStateRef(act.track, "gameplay.idleDirector.acts.track", hooks);
			if (track === void 0) continue;
			const entry = {
				track,
				weight: act.weight
			};
			const phrases = parsePhrases(act.phrases, "gameplay.idleDirector.acts.phrases", hooks);
			if (phrases !== void 0) entry.phrases = phrases;
			acts.push(entry);
		}
		if (acts.length > 0) block.idleDirector = {
			intervalMs: intIn(d.intervalMs, 1e3, 6e4) ? d.intervalMs : 5e3,
			maxMiss: intIn(d.maxMiss, 0, 10) ? d.maxMiss : 2,
			idleWeight: intIn(d.idleWeight, 0, 1e4) ? d.idleWeight : 0,
			acts
		};
	}
	if (raw.hitBox !== void 0) {
		const b = raw.hitBox;
		if (!isRecord$2(b) || !numIn(b.x0, 0, 1) || !numIn(b.x1, 0, 1) || !numIn(b.y0, 0, 1) || !numIn(b.y1, 0, 1) || !(b.x0 < b.x1) || !(b.y0 < b.y1)) fail("gameplay.hitBox must be { x0, y0, x1, y1 } fractions with x0 < x1 and y0 < y1");
		else block.hitBox = {
			x0: b.x0,
			y0: b.y0,
			x1: b.x1,
			y1: b.y1
		};
	}
	if (raw.touch !== void 0) if (!isRecord$2(raw.touch) || !Array.isArray(raw.touch.zones)) fail("gameplay.touch must be an object with a zones array");
	else {
		const tExtra = unknownKeys$2(raw.touch, KNOWN_TOUCH);
		if (tExtra.length > 0) fail("gameplay.touch: unknown field(s) " + tExtra.map((k) => JSON.stringify(k)).join(", "));
		let clickBoost;
		if (raw.touch.clickBoost !== void 0) {
			const cb = raw.touch.clickBoost;
			if (!isRecord$2(cb) || typeof cb.stat !== "string" || stats[cb.stat] === void 0 || !intIn(cb.min, 0, 1e3) || !intIn(cb.max, 0, 1e3) || cb.min > cb.max) fail("gameplay.touch.clickBoost must be { stat (declared), min, max } integers with 0 <= min <= max <= 1000");
			else clickBoost = {
				stat: cb.stat,
				min: cb.min,
				max: cb.max
			};
		}
		const zones = [];
		if (raw.touch.zones.length === 0 || raw.touch.zones.length > MAX_ZONES) fail("gameplay.touch.zones must declare 1..8 zones");
		for (const zoneRaw of raw.touch.zones) {
			if (!isRecord$2(zoneRaw) || !validName(zoneRaw.name) || !numIn(zoneRaw.y0, 0, 1) || !numIn(zoneRaw.y1, 0, 1) || !(zoneRaw.y0 < zoneRaw.y1)) {
				fail("gameplay.touch.zones entries need a kebab name and 0 <= y0 < y1 <= 1");
				continue;
			}
			const zExtra = unknownKeys$2(zoneRaw, KNOWN_ZONE);
			if (zExtra.length > 0) fail("gameplay.touch." + zoneRaw.name + ": unknown field(s) " + zExtra.map((k) => JSON.stringify(k)).join(", "));
			if (!Array.isArray(zoneRaw.branches) || zoneRaw.branches.length === 0 || zoneRaw.branches.length > MAX_BRANCHES) {
				fail("gameplay.touch." + zoneRaw.name + ".branches must declare 1..8 branches");
				continue;
			}
			let probabilitySum = 0;
			const branches = [];
			for (const branchRaw of zoneRaw.branches) {
				if (!isRecord$2(branchRaw) || !numIn(branchRaw.probability, 0, 1) || branchRaw.probability === 0) {
					fail("gameplay.touch." + zoneRaw.name + ".branches entries need a probability in (0, 1]");
					continue;
				}
				const bExtra = unknownKeys$2(branchRaw, KNOWN_BRANCH);
				if (bExtra.length > 0) fail("gameplay.touch." + zoneRaw.name + ": unknown branch field(s) " + bExtra.map((k) => JSON.stringify(k)).join(", "));
				probabilitySum += branchRaw.probability;
				const branch = { probability: branchRaw.probability };
				const effects = parseEffects(branchRaw.effects, "gameplay.touch." + zoneRaw.name + ".effects", stats, hooks);
				if (effects !== void 0) branch.effects = effects;
				const state = parseStateRef(branchRaw.state, "gameplay.touch." + zoneRaw.name + ".state", hooks);
				if (state !== void 0) branch.state = state;
				if (branchRaw.stateMs !== void 0) if (!intIn(branchRaw.stateMs, 200, 1e4)) fail("gameplay.touch." + zoneRaw.name + ".stateMs must be an integer in [200, 10000]");
				else branch.stateMs = branchRaw.stateMs;
				const phrases = parsePhrases(branchRaw.phrases, "gameplay.touch." + zoneRaw.name + ".phrases", hooks);
				if (phrases !== void 0) branch.phrases = phrases;
				branches.push(branch);
			}
			if (probabilitySum > 1.000000001) fail("gameplay.touch." + zoneRaw.name + ": branch probabilities must sum to at most 1");
			if (branches.length > 0) zones.push({
				name: zoneRaw.name,
				y0: zoneRaw.y0,
				y1: zoneRaw.y1,
				branches
			});
		}
		if (zones.length > 0 || clickBoost !== void 0) block.touch = {
			zones,
			...clickBoost === void 0 ? {} : { clickBoost }
		};
	}
	if (raw.work !== void 0) {
		const w = raw.work;
		if (!isRecord$2(w)) fail("gameplay.work must be an object");
		else {
			const wExtra = unknownKeys$2(w, KNOWN_WORK);
			if (wExtra.length > 0) fail("gameplay.work: unknown field(s) " + wExtra.map((k) => JSON.stringify(k)).join(", "));
			const state = parseStateRef(w.state, "gameplay.work.state", hooks);
			const successState = parseStateRef(w.successState, "gameplay.work.successState", hooks);
			const failState = parseStateRef(w.failState, "gameplay.work.failState", hooks);
			if (!intIn(w.tickMs, 1e3, 6e4)) fail("gameplay.work.tickMs must be an integer in [1000, 60000]");
			if (!numIn(w.successProbability, 0, 1)) fail("gameplay.work.successProbability must be a number in [0, 1]");
			if (state !== void 0 && successState !== void 0 && failState !== void 0 && intIn(w.tickMs, 1e3, 6e4) && numIn(w.successProbability, 0, 1)) {
				const work = {
					state,
					successState,
					failState,
					tickMs: w.tickMs,
					successProbability: w.successProbability
				};
				if (w.resultMs !== void 0) if (!isRecord$2(w.resultMs) || !intIn(w.resultMs.success, 200, 1e4) || !intIn(w.resultMs.fail, 200, 1e4)) fail("gameplay.work.resultMs must be { success, fail } integers in [200, 10000]");
				else work.resultMs = {
					success: w.resultMs.success,
					fail: w.resultMs.fail
				};
				for (const key of ["success", "fail"]) if (w[key] !== void 0) if (!isRecord$2(w[key])) fail("gameplay.work." + key + " must be an object { effects }");
				else {
					const effects = parseEffects(w[key].effects, "gameplay.work." + key + ".effects", stats, hooks);
					if (effects !== void 0) work[key] = { effects };
				}
				block.work = work;
			}
		}
	}
	if (raw.sleep !== void 0) {
		const s = raw.sleep;
		if (!isRecord$2(s) || !isRecord$2(s.restore)) fail("gameplay.sleep must be an object with a restore block");
		else {
			const sExtra = unknownKeys$2(s, KNOWN_SLEEP);
			if (sExtra.length > 0) fail("gameplay.sleep: unknown field(s) " + sExtra.map((k) => JSON.stringify(k)).join(", "));
			const state = parseStateRef(s.state, "gameplay.sleep.state", hooks);
			const wakeState = parseStateRef(s.wakeState, "gameplay.sleep.wakeState", hooks);
			const restoreStat = typeof s.restore.stat === "string" && stats[s.restore.stat] !== void 0 ? s.restore.stat : void 0;
			if (restoreStat === void 0) fail("gameplay.sleep.restore.stat must reference a declared stat");
			if (!intIn(s.restore.amount, 1, 1e3)) fail("gameplay.sleep.restore.amount must be an integer in [1, 1000]");
			if (!intIn(s.restore.intervalMs, 1e3, 6e5)) fail("gameplay.sleep.restore.intervalMs must be an integer in [1000, 600000]");
			if (state !== void 0 && restoreStat !== void 0 && intIn(s.restore.amount, 1, 1e3) && intIn(s.restore.intervalMs, 1e3, 6e5)) block.sleep = {
				state,
				...wakeState === void 0 ? {} : { wakeState },
				restore: {
					stat: restoreStat,
					amount: s.restore.amount,
					intervalMs: s.restore.intervalMs
				}
			};
		}
	}
	if (raw.passiveIncome !== void 0) {
		const p = raw.passiveIncome;
		if (!isRecord$2(p) || !validName(p.currency, 24) || !intIn(p.amount, 1, 1e4) || !intIn(p.intervalMs, 1e3, 864e5)) fail("gameplay.passiveIncome must be { currency (kebab), amount 1..10000, intervalMs 1000..86400000 }");
		else block.passiveIncome = {
			currency: p.currency,
			amount: p.amount,
			intervalMs: p.intervalMs
		};
	}
	if (raw.shop !== void 0) {
		const s = raw.shop;
		if (!isRecord$2(s) || !Array.isArray(s.items) || s.items.length === 0 || s.items.length > MAX_SHOP_ITEMS) fail("gameplay.shop must be an object with 1..32 items");
		else {
			const shopState = parseStateRef(s.state, "gameplay.shop.state", hooks);
			const items = [];
			const seen = /* @__PURE__ */ new Set();
			for (const itemRaw of s.items) {
				if (!isRecord$2(itemRaw) || !validName(itemRaw.id, 24)) {
					fail("gameplay.shop.items entries need a kebab id");
					continue;
				}
				if (seen.has(itemRaw.id)) {
					fail("gameplay.shop: duplicate item id " + JSON.stringify(itemRaw.id));
					continue;
				}
				seen.add(itemRaw.id);
				const iExtra = unknownKeys$2(itemRaw, KNOWN_SHOP_ITEM);
				if (iExtra.length > 0) fail("gameplay.shop." + itemRaw.id + ": unknown field(s) " + iExtra.map((k) => JSON.stringify(k)).join(", "));
				if (typeof itemRaw.label !== "string" || itemRaw.label.trim() === "" || itemRaw.label.length > 80) {
					fail("gameplay.shop." + itemRaw.id + ".label must be a non-empty string of at most 80 chars");
					continue;
				}
				if (!intIn(itemRaw.price, 1, 1e6)) {
					fail("gameplay.shop." + itemRaw.id + ".price must be an integer in [1, 1000000]");
					continue;
				}
				if (!validName(itemRaw.currency, 24)) {
					fail("gameplay.shop." + itemRaw.id + ".currency must be a kebab id");
					continue;
				}
				const item = {
					id: itemRaw.id,
					label: itemRaw.label.trim(),
					price: itemRaw.price,
					currency: itemRaw.currency
				};
				if (itemRaw.image !== void 0) if (typeof itemRaw.image !== "string" || itemRaw.image.includes("..") || itemRaw.image.includes("\\") || itemRaw.image.startsWith("/")) fail("gameplay.shop." + itemRaw.id + ".image must be a safe manifest-relative frame path");
				else item.image = itemRaw.image;
				const effects = parseEffects(itemRaw.effects, "gameplay.shop." + itemRaw.id + ".effects", stats, hooks);
				if (effects !== void 0) item.effects = effects;
				if (itemRaw.lottery !== void 0) {
					const l = itemRaw.lottery;
					if (!isRecord$2(l) || !Array.isArray(l.tiers) || l.tiers.length === 0 || l.tiers.length > MAX_LOTTERY_TIERS) fail("gameplay.shop." + itemRaw.id + ".lottery needs 1..16 tiers");
					else {
						const lExtra = unknownKeys$2(l, KNOWN_LOTTERY);
						if (lExtra.length > 0) fail("gameplay.shop." + itemRaw.id + ".lottery: unknown field(s) " + lExtra.map((k) => JSON.stringify(k)).join(", "));
						if (l.currency !== void 0 && !validName(l.currency, 24)) fail("gameplay.shop." + itemRaw.id + ".lottery.currency must be a kebab id");
						let tierSum = 0;
						const tiers = [];
						for (const tierRaw of l.tiers) {
							if (!isRecord$2(tierRaw) || !numIn(tierRaw.probability, 0, 1) || tierRaw.probability === 0 || !intIn(tierRaw.prize, 0, 1e9)) {
								fail("gameplay.shop." + itemRaw.id + ".lottery.tiers entries need probability (0,1] and prize 0..1e9");
								continue;
							}
							tierSum += tierRaw.probability;
							const tier = {
								probability: tierRaw.probability,
								prize: tierRaw.prize
							};
							if (tierRaw.currency !== void 0) if (!validName(tierRaw.currency, 24)) fail("gameplay.shop." + itemRaw.id + ".lottery tier currency must be a kebab id");
							else tier.currency = tierRaw.currency;
							tiers.push(tier);
						}
						if (tierSum > 1.000000001) fail("gameplay.shop." + itemRaw.id + ".lottery tier probabilities must sum to at most 1");
						if (tiers.length > 0) {
							const lotteryEffects = parseEffects(l.effects, "gameplay.shop." + itemRaw.id + ".lottery.effects", stats, hooks);
							item.lottery = {
								tiers,
								...lotteryEffects === void 0 ? {} : { effects: lotteryEffects },
								...validName(l.currency, 24) ? { currency: l.currency } : {}
							};
						}
					}
				}
				if (item.effects === void 0 && item.lottery === void 0) {
					fail("gameplay.shop." + itemRaw.id + " needs effects or a lottery");
					continue;
				}
				items.push(item);
			}
			if (items.length > 0) block.shop = {
				...shopState === void 0 ? {} : { state: shopState },
				items
			};
		}
	}
	if (raw.dragState !== void 0) {
		const state = parseStateRef(raw.dragState, "gameplay.dragState", hooks);
		if (state !== void 0) block.dragState = state;
	}
	if (raw.dragEndState !== void 0) {
		const state = parseStateRef(raw.dragEndState, "gameplay.dragEndState", hooks);
		if (state !== void 0) block.dragEndState = state;
	}
	return failed ? void 0 : block;
}
/** Fresh state for one pet: stats at their initial (default max), no currency. */
function initialGameplayState(manifest, now) {
	const stats = {};
	for (const [name, def] of Object.entries(manifest.stats ?? {})) stats[name] = def.initial ?? def.max;
	return {
		stats,
		currencies: {},
		mode: null,
		settledAt: now
	};
}
/** Clamp one stat value into [0, max]; currencies into [0, CURRENCY_MAX]. */
function clampGameplay(state, manifest) {
	for (const [name, def] of Object.entries(manifest.stats ?? {})) {
		const value = state.stats[name];
		if (value === void 0) state.stats[name] = def.initial ?? def.max;
		else state.stats[name] = Math.min(def.max, Math.max(0, value));
	}
	for (const [name, value] of Object.entries(state.currencies)) state.currencies[name] = Math.min(CURRENCY_MAX, Math.max(0, Math.floor(value)));
}
/**
* Lazy settle: apply stat decay, passive income and sleep restore for the
* elapsed wall time since the last settle. Mirrors the treats.ts discipline
* (no host timers; read paths settle). Returns whether anything changed.
*/
function settleGameplay(state, manifest, now, options) {
	const elapsedMs = now - state.settledAt;
	if (elapsedMs <= 0) return false;
	const minutes = elapsedMs / 6e4;
	let changed = false;
	for (const [name, def] of Object.entries(manifest.stats ?? {})) {
		const current = state.stats[name];
		if (current === void 0 || current <= 0) continue;
		let rate = def.decayPerMinute ?? 0;
		if (state.mode === "work" && def.workingDecayPerMinute !== void 0) rate = def.workingDecayPerMinute;
		if (!options.sessionActive) rate += def.idleDecayPerMinute ?? 0;
		if (rate <= 0) continue;
		const next = Math.max(0, current - rate * minutes);
		if (next !== current) {
			state.stats[name] = next;
			changed = true;
		}
	}
	if (manifest.passiveIncome !== void 0) {
		const ticks = Math.floor(elapsedMs / manifest.passiveIncome.intervalMs);
		if (ticks > 0) {
			const currency = manifest.passiveIncome.currency;
			state.currencies[currency] = (state.currencies[currency] ?? 0) + ticks * manifest.passiveIncome.amount;
			changed = true;
		}
	}
	if (state.mode === "sleep" && manifest.sleep !== void 0) {
		const ticks = Math.floor(elapsedMs / manifest.sleep.restore.intervalMs);
		if (ticks > 0) {
			const stat = manifest.sleep.restore.stat;
			state.stats[stat] = (state.stats[stat] ?? 0) + ticks * manifest.sleep.restore.amount;
			changed = true;
		}
	}
	state.settledAt = now;
	clampGameplay(state, manifest);
	return changed;
}
/** Apply one effect vector (touch/work/shop), clamped. */
function applyGameplayEffects(state, manifest, effects) {
	for (const effect of effects) if (effect.stat !== void 0) state.stats[effect.stat] = (state.stats[effect.stat] ?? 0) + effect.amount;
	else if (effect.currency !== void 0) state.currencies[effect.currency] = (state.currencies[effect.currency] ?? 0) + effect.amount;
	clampGameplay(state, manifest);
}
/** Roll one touch zone branch; undefined when the roll lands in no-op mass. */
function rollTouchBranch(zone, rng) {
	const roll = rng();
	let acc = 0;
	for (const branch of zone.branches) {
		acc += branch.probability;
		if (roll < acc) return branch;
	}
}
/** Roll one work tick outcome. */
function rollWorkOutcome(work, rng) {
	return rng() < work.successProbability ? "success" : "fail";
}
/** Draw one lottery prize tier; uncovered mass falls through to the last tier. */
function drawLotteryTier(lottery, rng) {
	const roll = rng();
	let acc = 0;
	for (const tier of lottery.tiers) {
		acc += tier.probability;
		if (roll < acc) return tier;
	}
	return lottery.tiers[lottery.tiers.length - 1];
}
/** Renderer kinds the pet center knows how to dispatch (M1 §2). */
const PET_RENDERER_KINDS = [
	"sprite2d",
	"live2d",
	"frames2d"
];
/** The seven ActivityPhase semantics (pet-center owned; M1 §1). */
const PET_ACTIVITY_PHASES = [
	"idle",
	"waiting",
	"thinking",
	"tool",
	"review",
	"done",
	"failed"
];
const PET_ID_PATTERN$2 = /^[a-z0-9][a-z0-9-]*$/;
const PATH_SEGMENT_PATTERN$2 = /^[A-Za-z0-9._-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
/**
* Field allow-lists mirroring contracts/pet-manifest-v2.schema.json. Exported
* so the drift test can lock the schema file and this validator together;
* the CLI reuses parsePetManifest instead of these.
*/
const KNOWN_TOP_LEVEL = /* @__PURE__ */ new Set([
	"$schema",
	"petManifestVersion",
	"id",
	"displayName",
	"description",
	"version",
	"author",
	"license",
	"homepage",
	"renderer",
	"sprite2d",
	"live2d",
	"frames2d",
	"sequences",
	"remarks",
	"gameplay"
]);
/** sprite2d block field allow-list (drift-locked to the schema file). */
const KNOWN_SPRITE2D = /* @__PURE__ */ new Set([
	"spritesheetPath",
	"cell",
	"columns",
	"atlasRows",
	"frames",
	"tracks"
]);
/** live2d block field allow-list (drift-locked to the schema file). */
const KNOWN_LIVE2D = /* @__PURE__ */ new Set([
	"model",
	"scale",
	"translate",
	"motions",
	"expressions",
	"hitAreas",
	"lipSync"
]);
/** frames2d block field allow-list (drift-locked to the schema file). */
const KNOWN_FRAMES2D = /* @__PURE__ */ new Set([
	"dir",
	"defaultFrameMs",
	"tracks",
	"phases"
]);
/** frames2d track field allow-list (drift-locked to the schema file). */
const KNOWN_FRAMES2D_TRACK = /* @__PURE__ */ new Set([
	"frames",
	"frameMs",
	"loop",
	"fallback"
]);
var Diagnostics$1 = class {
	list = [];
	source;
	constructor(source) {
		this.source = source;
	}
	error(message) {
		this.list.push({
			level: "error",
			message: this.source + ": " + message
		});
	}
	warn(message) {
		this.list.push({
			level: "warning",
			message: this.source + ": " + message
		});
	}
	get hasErrors() {
		return this.list.some((d) => d.level === "error");
	}
};
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys$1(source, known) {
	return Object.keys(source).filter((key) => !known.has(key));
}
/**
* Validate a manifest-relative asset path: no absolute paths, no backslashes,
* no traversal, plain safe segments only. Returns the normalized path.
*/
function safeManifestPath(raw) {
	if (typeof raw !== "string" || raw.trim() === "") return void 0;
	const value = raw.trim();
	if (isAbsolute(value) || value.includes("\\") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return void 0;
	const segments = value.split("/").filter((segment) => segment !== "");
	if (segments.length === 0) return void 0;
	if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN$2.test(segment))) return void 0;
	return segments.join("/");
}
function parseStringBlock(record, key, diag, required) {
	const value = record[key];
	if (value === void 0) {
		if (required) diag.error("missing required field " + JSON.stringify(key));
		return;
	}
	if (typeof value !== "string" || value.trim() === "") {
		diag.error("field " + JSON.stringify(key) + " must be a non-empty string");
		return;
	}
	return value.trim();
}
/** Validate the phase-keyed string map shape shared by motions/expressions. */
function parsePhaseStringMap(raw, field, diag) {
	if (raw === void 0) return void 0;
	if (!isRecord$1(raw)) {
		diag.error("field " + JSON.stringify(field) + " must be an object keyed by activity phase");
		return;
	}
	const result = {};
	for (const [phase, value] of Object.entries(raw)) {
		if (!PET_ACTIVITY_PHASES.includes(phase)) {
			diag.error(field + ": unknown activity phase " + JSON.stringify(phase));
			continue;
		}
		if (typeof value !== "string" || value.trim() === "") {
			diag.error(field + "." + phase + " must be a non-empty string");
			continue;
		}
		result[phase] = value.trim();
	}
	return result;
}
/** Structural gate for sequences: content stays warn-and-drop (registry's job). */
function parseSequences(raw, diag) {
	if (raw === void 0) return void 0;
	if (!isRecord$1(raw)) {
		diag.warn("sequences must be an object keyed by activity phase; ignoring");
		return;
	}
	const sequences = {};
	for (const [phase, value] of Object.entries(raw)) {
		if (!PET_ACTIVITY_PHASES.includes(phase)) {
			diag.warn("sequences: unknown activity phase " + JSON.stringify(phase) + "; entry dropped");
			continue;
		}
		if (!Array.isArray(value) || value.length < 5 || value.some((item) => typeof item !== "string")) {
			diag.warn("sequences." + phase + " must be an array of at least 5 animation names; entry dropped");
			continue;
		}
		sequences[phase] = value;
	}
	return Object.keys(sequences).length === 0 ? void 0 : sequences;
}
function parseSprite2dBlock(raw, diag) {
	if (!isRecord$1(raw)) {
		diag.error("renderer sprite2d requires a \"sprite2d\" block object");
		return;
	}
	const extra = unknownKeys$1(raw, KNOWN_SPRITE2D);
	if (extra.length > 0) diag.error("sprite2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	const spritesheetPath = safeManifestPath(raw.spritesheetPath);
	if (spritesheetPath === void 0) diag.error("sprite2d.spritesheetPath must be a safe manifest-relative path");
	const block = { spritesheetPath: spritesheetPath ?? "" };
	if (raw.cell !== void 0) if (!isRecord$1(raw.cell)) diag.error("sprite2d.cell must be an object { width?, height? }");
	else block.cell = raw.cell;
	if (raw.columns !== void 0) if (typeof raw.columns !== "number" || !Number.isInteger(raw.columns) || raw.columns < 1) diag.error("sprite2d.columns must be a positive integer");
	else block.columns = raw.columns;
	if (raw.atlasRows !== void 0) if (typeof raw.atlasRows !== "number" || !Number.isInteger(raw.atlasRows) || raw.atlasRows < 1) diag.error("sprite2d.atlasRows must be a positive integer");
	else block.atlasRows = raw.atlasRows;
	if (raw.frames !== void 0) if (!Array.isArray(raw.frames) || raw.frames.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < 0)) diag.error("sprite2d.frames must be an array of non-negative integers");
	else block.frames = raw.frames;
	if (raw.tracks !== void 0) if (!isRecord$1(raw.tracks)) diag.error("sprite2d.tracks must be an object keyed by animation");
	else block.tracks = raw.tracks;
	return diag.hasErrors ? void 0 : block;
}
function parseLive2dBlock(raw, diag) {
	if (!isRecord$1(raw)) {
		diag.error("renderer live2d requires a \"live2d\" block object");
		return;
	}
	const extra = unknownKeys$1(raw, KNOWN_LIVE2D);
	if (extra.length > 0) diag.error("live2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	const model = safeManifestPath(raw.model);
	if (model === void 0) diag.error("live2d.model must be a safe manifest-relative path to a .model3.json");
	else if (!model.endsWith(".model3.json")) diag.error("live2d.model must point at a .model3.json file");
	const motions = parsePhaseStringMap(raw.motions, "live2d.motions", diag);
	if (raw.motions === void 0) diag.error("live2d.motions is required (at least an \"idle\" group)");
	else if (motions !== void 0 && motions.idle === void 0) diag.error("live2d.motions.idle is required (unmapped phases fall back to it)");
	const block = {
		model: model ?? "",
		motions: motions ?? { idle: "" }
	};
	if (raw.scale !== void 0) if (typeof raw.scale !== "number" || !Number.isFinite(raw.scale) || raw.scale <= 0 || raw.scale > 10) diag.error("live2d.scale must be a number in (0, 10]");
	else block.scale = raw.scale;
	if (raw.translate !== void 0) if (!isRecord$1(raw.translate) || raw.translate.x !== void 0 && typeof raw.translate.x !== "number" || raw.translate.y !== void 0 && typeof raw.translate.y !== "number") diag.error("live2d.translate must be an object { x?: number, y?: number }");
	else block.translate = raw.translate;
	const expressions = parsePhaseStringMap(raw.expressions, "live2d.expressions", diag);
	if (expressions !== void 0) block.expressions = expressions;
	if (raw.hitAreas !== void 0) if (!Array.isArray(raw.hitAreas) || raw.hitAreas.some((v) => typeof v !== "string" || v.trim() === "")) diag.error("live2d.hitAreas must be an array of non-empty strings");
	else block.hitAreas = raw.hitAreas;
	if (raw.lipSync !== void 0) if (typeof raw.lipSync !== "boolean") diag.error("live2d.lipSync must be a boolean");
	else block.lipSync = raw.lipSync;
	return diag.hasErrors ? void 0 : block;
}
const FRAMES2D_TRACK_NAME = /^[a-z0-9][a-z0-9-]*$/;
const FRAMES2D_MAX_TRACKS = 64;
const FRAMES2D_MAX_FRAMES = 64;
const FRAMES2D_MIN_FRAME_MS = 16;
const FRAMES2D_MAX_FRAME_MS = 5e3;
const FRAMES2D_IMAGE_EXTENSIONS$1 = /* @__PURE__ */ new Set([
	".webp",
	".png",
	".gif",
	".jpg",
	".jpeg"
]);
/** Validate one frames2d track name (kebab id, at most 32 chars). */
function validTrackName(name) {
	return name.length <= 32 && FRAMES2D_TRACK_NAME.test(name);
}
/** A frames2d frame entry is a single image file name inside the track directory. */
function safeFrameName(raw) {
	if (typeof raw !== "string" || raw.trim() === "") return void 0;
	const value = raw.trim();
	if (value.includes("/") || value.includes("\\") || !PATH_SEGMENT_PATTERN$2.test(value)) return void 0;
	const dot = value.lastIndexOf(".");
	if (dot <= 0) return void 0;
	if (!FRAMES2D_IMAGE_EXTENSIONS$1.has(value.slice(dot).toLowerCase())) return void 0;
	return value;
}
function parseFrames2dTrack(raw, field, diag) {
	if (!isRecord$1(raw)) {
		diag.error(field + " must be an object");
		return;
	}
	const extra = unknownKeys$1(raw, KNOWN_FRAMES2D_TRACK);
	if (extra.length > 0) diag.error(field + ": unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	const track = {};
	if (raw.frames !== void 0) if (!Array.isArray(raw.frames) || raw.frames.length === 0) diag.error(field + ".frames must be a non-empty array of frame file names");
	else if (raw.frames.length > FRAMES2D_MAX_FRAMES) diag.error(field + ".frames declares too many frames (" + raw.frames.length + ", max 64)");
	else {
		const frames = [];
		for (const entry of raw.frames) {
			const safe = safeFrameName(entry);
			if (safe === void 0) diag.error(field + ".frames entry " + JSON.stringify(String(entry)) + " is not a safe image file name");
			else frames.push(safe);
		}
		if (frames.length === raw.frames.length) track.frames = frames;
	}
	if (raw.frameMs !== void 0) if (!Array.isArray(raw.frameMs) || raw.frameMs.length === 0 || raw.frameMs.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < FRAMES2D_MIN_FRAME_MS || v > FRAMES2D_MAX_FRAME_MS)) diag.error(field + ".frameMs must be a non-empty array of integer ms in [16, 5000]");
	else if (track.frames === void 0) diag.error(field + ".frameMs requires a valid explicit frames list (directory tracks use filename-encoded ms or defaultFrameMs)");
	else if (raw.frameMs.length !== track.frames.length) diag.error(field + ".frameMs must have the same length as frames");
	else track.frameMs = raw.frameMs;
	if (raw.loop !== void 0) if (typeof raw.loop !== "boolean") diag.error(field + ".loop must be a boolean");
	else track.loop = raw.loop;
	if (raw.fallback !== void 0) if (typeof raw.fallback !== "string" || !validTrackName(raw.fallback)) diag.error(field + ".fallback must be a track name");
	else track.fallback = raw.fallback;
	return diag.hasErrors ? void 0 : track;
}
function parseFrames2dBlock(raw, diag) {
	if (!isRecord$1(raw)) {
		diag.error("renderer frames2d requires a \"frames2d\" block object");
		return;
	}
	const extra = unknownKeys$1(raw, KNOWN_FRAMES2D);
	if (extra.length > 0) diag.error("frames2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	const block = {
		tracks: {},
		phases: { idle: "" }
	};
	if (raw.dir !== void 0) {
		const dir = safeManifestPath(raw.dir);
		if (dir === void 0) diag.error("frames2d.dir must be a safe manifest-relative directory");
		else block.dir = dir;
	}
	if (raw.defaultFrameMs !== void 0) if (typeof raw.defaultFrameMs !== "number" || !Number.isInteger(raw.defaultFrameMs) || raw.defaultFrameMs < FRAMES2D_MIN_FRAME_MS || raw.defaultFrameMs > FRAMES2D_MAX_FRAME_MS) diag.error("frames2d.defaultFrameMs must be an integer in [16, 5000]");
	else block.defaultFrameMs = raw.defaultFrameMs;
	const tracks = {};
	if (!isRecord$1(raw.tracks)) diag.error("frames2d.tracks is required and must be an object keyed by track name");
	else {
		const entries = Object.entries(raw.tracks);
		if (entries.length === 0) diag.error("frames2d.tracks must declare at least one track");
		if (entries.length > FRAMES2D_MAX_TRACKS) diag.error("frames2d.tracks declares too many tracks (" + entries.length + ", max 64)");
		for (const [name, value] of entries) {
			if (!validTrackName(name)) {
				diag.error("frames2d.tracks: invalid track name " + JSON.stringify(name) + " (lowercase kebab, at most 32 chars)");
				continue;
			}
			const track = parseFrames2dTrack(value, "frames2d.tracks." + name, diag);
			if (track !== void 0) tracks[name] = track;
		}
	}
	block.tracks = tracks;
	const phases = parsePhaseStringMap(raw.phases, "frames2d.phases", diag);
	if (raw.phases === void 0) diag.error("frames2d.phases is required (at least an \"idle\" mapping)");
	else if (phases !== void 0 && phases.idle === void 0) diag.error("frames2d.phases.idle is required (unmapped phases fall back to it)");
	const phasesValid = phases !== void 0 && phases.idle !== void 0;
	if (phasesValid) block.phases = phases;
	if (phasesValid) {
		for (const [phase, target] of Object.entries(block.phases)) if (target !== void 0 && tracks[target] === void 0) diag.error("frames2d.phases." + phase + " references unknown track " + JSON.stringify(target));
	}
	for (const [name, track] of Object.entries(tracks)) if (track.fallback !== void 0 && tracks[track.fallback] === void 0) diag.error("frames2d.tracks." + name + ".fallback references unknown track " + JSON.stringify(track.fallback));
	return diag.hasErrors ? void 0 : block;
}
/** v1 compat read: map the legacy flat manifest onto the v2 sprite2d shape. */
function compatV1(source, diag) {
	const id = parseStringBlock(source, "id", diag, true);
	if (id !== void 0 && !PET_ID_PATTERN$2.test(id)) diag.error("id " + JSON.stringify(id) + " is not a lowercase kebab id");
	const displayName = typeof source.displayName === "string" && source.displayName.trim() !== "" ? source.displayName.trim() : id;
	const spritesheetPath = safeManifestPath(source.spritesheetPath === void 0 ? "spritesheet.webp" : source.spritesheetPath);
	if (spritesheetPath === void 0) diag.error("spritesheetPath " + JSON.stringify(String(source.spritesheetPath)) + " is not a safe relative path");
	if (source.license === void 0) diag.warn("v1 compat read: no license field; run scripts/dsh-pet-migrate-v2 to migrate this pet");
	const sprite2d = { spritesheetPath: spritesheetPath ?? "spritesheet.webp" };
	if (isRecord$1(source.cell)) sprite2d.cell = source.cell;
	if (typeof source.columns === "number") sprite2d.columns = source.columns;
	if (Array.isArray(source.frames)) sprite2d.frames = source.frames;
	if (isRecord$1(source.tracks)) sprite2d.tracks = source.tracks;
	if (source.spriteVersionNumber === 2) sprite2d.atlasRows = 11;
	const manifest = {
		petManifestVersion: 2,
		id: id ?? "",
		displayName: displayName ?? "",
		renderer: "sprite2d",
		sprite2d
	};
	if (typeof source.description === "string" && source.description.trim() !== "") manifest.description = source.description.trim();
	if (typeof source.license === "string" && source.license.trim() !== "") manifest.license = source.license.trim();
	const sequences = parseSequences(source.sequences, diag);
	if (sequences !== void 0) manifest.sequences = sequences;
	if (source.remarks !== void 0) manifest.remarks = source.remarks;
	return diag.hasErrors ? void 0 : manifest;
}
/** Strict v2 validation (fail-closed on structure). */
function parseV2(source, diag) {
	const extra = unknownKeys$1(source, KNOWN_TOP_LEVEL);
	if (extra.length > 0) diag.error("unknown top-level field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
	if (source.petManifestVersion !== 2) diag.error("petManifestVersion must be 2 (got " + JSON.stringify(source.petManifestVersion) + ")");
	const id = parseStringBlock(source, "id", diag, true);
	if (id !== void 0 && (!PET_ID_PATTERN$2.test(id) || id.length > 64)) diag.error("id " + JSON.stringify(id) + " must be a lowercase kebab id of at most 64 chars");
	const displayName = parseStringBlock(source, "displayName", diag, true);
	const license = parseStringBlock(source, "license", diag, true);
	const rendererRaw = source.renderer === void 0 ? "sprite2d" : source.renderer;
	if (!PET_RENDERER_KINDS.includes(rendererRaw)) diag.error("unknown renderer " + JSON.stringify(rendererRaw) + "; expected one of " + PET_RENDERER_KINDS.join(", "));
	const renderer = rendererRaw;
	const manifest = {
		petManifestVersion: 2,
		id: id ?? "",
		displayName: displayName ?? "",
		renderer
	};
	if (license !== void 0) manifest.license = license;
	if (source.description !== void 0) if (typeof source.description !== "string" || source.description.length > 500) diag.error("description must be a string of at most 500 chars");
	else manifest.description = source.description;
	if (source.version !== void 0) if (typeof source.version !== "string" || !SEMVER_PATTERN.test(source.version)) diag.error("version must be a semver string (x.y.z)");
	else manifest.version = source.version;
	if (source.author !== void 0) if (typeof source.author !== "string" || source.author.length > 128) diag.error("author must be a string of at most 128 chars");
	else manifest.author = source.author;
	if (source.homepage !== void 0) if (typeof source.homepage !== "string") diag.error("homepage must be a string URL");
	else manifest.homepage = source.homepage;
	if (renderer === "sprite2d") {
		const block = parseSprite2dBlock(source.sprite2d, diag);
		if (block !== void 0) manifest.sprite2d = block;
		if (source.live2d !== void 0) diag.error("renderer sprite2d must not declare a live2d block");
		if (source.frames2d !== void 0) diag.error("renderer sprite2d must not declare a frames2d block");
	} else if (renderer === "live2d") {
		const block = parseLive2dBlock(source.live2d, diag);
		if (block !== void 0) manifest.live2d = block;
		if (source.sprite2d !== void 0) diag.error("renderer live2d must not declare a sprite2d block");
		if (source.frames2d !== void 0) diag.error("renderer live2d must not declare a frames2d block");
	} else if (renderer === "frames2d") {
		const block = parseFrames2dBlock(source.frames2d, diag);
		if (block !== void 0) manifest.frames2d = block;
		if (source.sprite2d !== void 0) diag.error("renderer frames2d must not declare a sprite2d block");
		if (source.live2d !== void 0) diag.error("renderer frames2d must not declare a live2d block");
	}
	if (source.gameplay !== void 0) if (renderer !== "frames2d") diag.error("gameplay currently requires renderer frames2d (its state references name frames2d tracks)");
	else {
		const gameplay = parseGameplayManifest(source.gameplay, {
			stateNames: new Set(Object.keys(manifest.frames2d?.tracks ?? {})),
			error: (message) => diag.error("gameplay: " + message)
		});
		if (gameplay !== void 0) manifest.gameplay = gameplay;
	}
	const sequences = parseSequences(source.sequences, diag);
	if (sequences !== void 0) manifest.sequences = sequences;
	if (source.remarks !== void 0 && !isRecord$1(source.remarks)) diag.error("remarks must be an object of remark pools");
	else if (source.remarks !== void 0) manifest.remarks = source.remarks;
	return diag.hasErrors ? void 0 : manifest;
}
/**
* Parse one pet manifest: v1 (no petManifestVersion) is compat-read as a
* sprite2d pet with a migration hint; v2 is validated fail-closed. The parse
* never throws — every failure comes back as structured diagnostics.
* @param raw - the parsed pet.json value.
* @param sourceLabel - human-readable origin for diagnostics (dir or file).
*/
function parsePetManifest(raw, sourceLabel) {
	const diag = new Diagnostics$1(sourceLabel);
	if (!isRecord$1(raw)) {
		diag.error("manifest is not an object");
		return {
			ok: false,
			diagnostics: diag.list
		};
	}
	if (raw.petManifestVersion === void 0) {
		const manifest = compatV1(raw, diag);
		if (manifest === void 0) return {
			ok: false,
			diagnostics: diag.list
		};
		diag.warn("v1 compat read: manifest treated as renderer \"sprite2d\"; run scripts/dsh-pet-migrate-v2 to migrate");
		return {
			ok: true,
			manifest,
			migrated: "v1-compat",
			diagnostics: diag.list
		};
	}
	const manifest = parseV2(raw, diag);
	if (manifest === void 0) return {
		ok: false,
		diagnostics: diag.list
	};
	return {
		ok: true,
		manifest,
		migrated: void 0,
		diagnostics: diag.list
	};
}
const DECORATION_ENTRY_EXTENSIONS = [".webp", ".png"];
/** Field allow-list (drift-locked to the schema twin in tests). */
const KNOWN_DECORATION_TOP_LEVEL = /* @__PURE__ */ new Set([
	"$schema",
	"decorationManifestVersion",
	"id",
	"displayName",
	"license",
	"entry",
	"cell",
	"columns",
	"frameMs",
	"durations",
	"loop",
	"phases"
]);
const PET_ID_PATTERN$1 = /^[a-z0-9][a-z0-9-]*$/;
const PATH_SEGMENT_PATTERN$1 = /^[A-Za-z0-9._-]+$/;
var Diagnostics = class {
	list = [];
	source;
	constructor(source) {
		this.source = source;
	}
	error(message) {
		this.list.push({
			level: "error",
			message: this.source + ": " + message
		});
	}
	warn(message) {
		this.list.push({
			level: "warning",
			message: this.source + ": " + message
		});
	}
	get hasErrors() {
		return this.list.some((d) => d.level === "error");
	}
};
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys(source, known) {
	return Object.keys(source).filter((key) => !known.has(key));
}
/** Positive integer in [min, max], else undefined. */
function finiteInt$1(value, min, max) {
	return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : void 0;
}
/**
* Validate a descriptor-relative entry path: no absolute paths, no
* backslashes, no traversal, plain safe segments only, and an exact
* lowercase PNG/WebP extension (the adopted entry discipline — SVG/CSS are
* not accepted). The extension match is case-sensitive on purpose: the
* asset route serves the declared path verbatim, so a case-mismatched
* suffix (frames.PNG vs frames.png) would pass a lenient check but 403 on
* case-sensitive filesystems.
* Returns the normalized path or undefined.
*/
function safeDecorationEntry(raw) {
	if (typeof raw !== "string" || raw.trim() === "") return void 0;
	const value = raw.trim();
	if (value.length > 256) return void 0;
	if (isAbsolute(value) || value.includes("\\") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return void 0;
	const segments = value.split("/").filter((segment) => segment !== "");
	if (segments.length === 0) return void 0;
	if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN$1.test(segment))) return void 0;
	const last = segments[segments.length - 1];
	const dot = last.lastIndexOf(".");
	if (dot <= 0 || !DECORATION_ENTRY_EXTENSIONS.includes(last.slice(dot))) return void 0;
	return segments.join("/");
}
/** Normalize one phase binding value; undefined (warning) on bad content. */
function normalizeSegment(raw, columns, diag) {
	if (raw === "hide") return "hide";
	if (!isRecord(raw)) {
		diag.warn("phase binding must be \"hide\" or { from, to }; binding dropped");
		return;
	}
	const from = finiteInt$1(raw.from, 0, columns - 1);
	const to = finiteInt$1(raw.to, 0, columns - 1);
	if (from === void 0 || to === void 0 || from > to) {
		diag.warn("phase frame segment out of range; binding dropped");
		return;
	}
	return {
		from,
		to
	};
}
/**
* Parse and validate one decoration.json document. Fail-closed over the
* structure (types, key sets, paths, ranges); phase-binding content issues
* drop that binding only (warn-and-drop, the registry never-throw rule).
*/
function parseDecorationManifest(raw, source = "decoration.json") {
	const diag = new Diagnostics(source);
	if (!isRecord(raw)) {
		diag.error("descriptor must be a JSON object");
		return {
			ok: false,
			diagnostics: diag.list
		};
	}
	for (const key of unknownKeys(raw, KNOWN_DECORATION_TOP_LEVEL)) diag.error("unknown top-level field " + JSON.stringify(key));
	if (raw.decorationManifestVersion !== 1) diag.error("decorationManifestVersion must be 1");
	const id = typeof raw.id === "string" ? raw.id.trim() : "";
	if (!PET_ID_PATTERN$1.test(id)) diag.error("id must be a lowercase kebab id");
	if (id.length > 64) diag.error("id must be at most 64 characters");
	const license = typeof raw.license === "string" ? raw.license.trim() : "";
	if (license === "") diag.error("license is required (asset provenance)");
	if (license.length > 128) diag.error("license must be at most 128 characters");
	const entry = safeDecorationEntry(raw.entry);
	if (entry === void 0) diag.error("entry must be a safe relative PNG/WebP path");
	const rawCell = isRecord(raw.cell) ? raw.cell : {};
	for (const key of Object.keys(rawCell)) if (key !== "width" && key !== "height") diag.warn("unknown cell field " + JSON.stringify(key) + " ignored");
	const cellWidth = finiteInt$1(rawCell.width, 1, 256);
	const cellHeight = finiteInt$1(rawCell.height, 1, 256);
	if (cellWidth === void 0 || cellHeight === void 0) diag.error("cell width/height must be integers in [1, 256]");
	const columns = finiteInt$1(raw.columns, 1, 16);
	if (columns === void 0) diag.error("columns must be an integer in [1, 16]");
	if (diag.hasErrors || id === "" || entry === void 0 || columns === void 0) return {
		ok: false,
		diagnostics: diag.list
	};
	const displayName = typeof raw.displayName === "string" && raw.displayName.trim() !== "" ? raw.displayName.trim().slice(0, 64) : id;
	let loop;
	if (raw.loop === void 0 || typeof raw.loop === "boolean") loop = raw.loop ?? true;
	else {
		diag.warn("loop must be a boolean; defaulting to true");
		loop = true;
	}
	const rawDurations = raw.durations;
	let durations;
	if (Array.isArray(rawDurations)) {
		const usable = rawDurations.filter((v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 2e3);
		if (usable.length !== columns) {
			diag.warn("durations length must equal columns; using the constant frameMs instead");
			durations = [];
		} else durations = usable;
	} else if (rawDurations !== void 0) {
		diag.warn("durations must be an array; using the constant frameMs instead");
		durations = [];
	} else durations = [];
	if (durations.length === 0) {
		const frameMs = finiteInt$1(raw.frameMs, 1, 2e3) ?? 120;
		durations = Array.from({ length: columns }, () => frameMs);
	}
	const phases = {};
	const rawPhases = raw.phases;
	if (isRecord(rawPhases)) for (const [key, value] of Object.entries(rawPhases)) {
		if (!PET_ACTIVITY_PHASES.includes(key)) {
			diag.warn("unknown phase " + JSON.stringify(key) + "; binding ignored");
			continue;
		}
		const segment = normalizeSegment(value, columns, diag);
		if (segment !== void 0) phases[key] = segment;
	}
	else if (rawPhases !== void 0) diag.warn("phases must be an object; all phases hide");
	if (!Object.values(phases).some((segment) => segment !== "hide")) diag.warn("no phase shows the ornament; the decoration stays hidden");
	return {
		ok: true,
		manifest: {
			decorationManifestVersion: 1,
			id,
			displayName,
			license,
			entry,
			cell: {
				width: cellWidth,
				height: cellHeight
			},
			columns,
			durations,
			loop,
			phases
		},
		diagnostics: diag.list
	};
}
//#endregion
//#region src/image-dimensions.ts
/**
* Minimal PNG/WebP dimension reader — header-only, no decoding, no
* dependencies. Used by the decoration registry to verify a strip's actual
* pixel geometry matches its descriptor (single-row sprite strip; the client
* renders by frame-column offsets, so a mismatched strip silently shows the
* wrong frames). Parsing is best-effort: an unrecognized or truncated header
* returns undefined (the caller decides whether to warn).
*
* PNG: signature (8) + IHDR chunk — length (4) + 'IHDR' (4) + width (4) +
* height (4), both big-endian uint32 at fixed offsets 16/20.
* WebP: RIFF header (12) + chunk — 'VP8X' extended (width-1/height-1 as
* little-endian uint24 at 24/27), 'VP8L' lossless (packed 14-bit dims at
* 21), or 'VP8 ' lossy (frame header, low 14 bits of the uint16 at 26/28).
* @module @linxin666/dsh-pet/image-dimensions
*/
const PNG_SIGNATURE = Buffer.from([
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
]);
/** Read the pixel size of a PNG buffer, or undefined when unrecognized. */
function pngDimensions(buf) {
	if (buf.length < 24) return void 0;
	if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return void 0;
	if (buf.toString("ascii", 12, 16) !== "IHDR") return void 0;
	return {
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20)
	};
}
/** Read the pixel size of a WebP buffer, or undefined when unrecognized. */
function webpDimensions(buf) {
	if (buf.length < 21) return void 0;
	if (buf.toString("ascii", 0, 4) !== "RIFF") return void 0;
	if (buf.toString("ascii", 8, 12) !== "WEBP") return void 0;
	const fourcc = buf.toString("ascii", 12, 16);
	if (fourcc === "VP8X") {
		if (buf.length < 30) return void 0;
		return {
			width: 1 + buf.readUIntLE(24, 3),
			height: 1 + buf.readUIntLE(27, 3)
		};
	}
	if (fourcc === "VP8L") {
		if (buf.length < 25) return void 0;
		const bits = buf.readUInt32LE(21);
		return {
			width: 1 + (bits & 16383),
			height: 1 + (bits >>> 14 & 16383)
		};
	}
	if (fourcc === "VP8 ") {
		if (buf.length < 30) return void 0;
		return {
			width: buf.readUInt16LE(26) & 16383,
			height: buf.readUInt16LE(28) & 16383
		};
	}
}
/**
* Read image pixel dimensions from a PNG or WebP buffer. Returns undefined
* for formats this reader does not recognize (never throws). Callers treat
* undefined as "cannot verify", not as an error.
*/
function imageDimensions(buf) {
	if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF") return webpDimensions(buf);
	return pngDimensions(buf);
}
//#endregion
//#region src/contracts/status-decoration.ts
/** Contract version decorations declare against (independent of manifests). */
const PET_DECORATION_API_VERSION = "x-org.linxin666.pet-center/status-decoration-v1";
//#endregion
//#region src/model3.ts
/**
* Live2D .model3.json reference closure — the set of files a model declares
* (pet-center M2, issue #623). The host asset route only ever serves a pet's
* declared manifest, its declared primary assets, and this closure; the CLI
* validator reuses the same extractor so an install-time check proves the
* serving set is complete.
*
* Cubism file family: Moc (.moc3), Textures (images), Physics (.physics3.json),
* Pose (.pose3.json), DisplayInfo (.cdi3.json), Expressions[].File
* (.exp3.json), Motions.<group>[].File (.motion3.json), UserData
* (.userdata3.json). Every reference must be a safe manifest-relative path
* (safeManifestPath); unsafe entries make the model unloadable.
*
* Erasable-syntax-only: scripts/ import this under node strip-only mode.
* @module @linxin666/dsh-pet/model3
*/
/** Collect the safe relative paths one model3.json references. */
function collectModel3References(model3) {
	const errors = [];
	if (typeof model3 !== "object" || model3 === null) return {
		references: [],
		errors: ["model3.json is not an object"]
	};
	const fileReferences = model3.FileReferences;
	if (typeof fileReferences !== "object" || fileReferences === null) return {
		references: [],
		errors: ["model3.json has no FileReferences"]
	};
	const refs = fileReferences;
	const collected = /* @__PURE__ */ new Set();
	const push = (raw, field) => {
		const safe = safeManifestPath(raw);
		if (safe === void 0) {
			errors.push(field + " is not a safe relative path: " + JSON.stringify(String(raw)));
			return;
		}
		collected.add(safe);
	};
	if (refs.Moc !== void 0) push(refs.Moc, "FileReferences.Moc");
	if (Array.isArray(refs.Textures)) refs.Textures.forEach((texture, index) => push(texture, "FileReferences.Textures[" + index + "]"));
	for (const scalar of [
		"Physics",
		"Pose",
		"DisplayInfo",
		"UserData"
	]) if (refs[scalar] !== void 0) push(refs[scalar], "FileReferences." + scalar);
	if (Array.isArray(refs.Expressions)) refs.Expressions.forEach((expression, index) => {
		const file = typeof expression === "object" && expression !== null ? expression.File : void 0;
		if (file !== void 0) push(file, "FileReferences.Expressions[" + index + "].File");
	});
	if (typeof refs.Motions === "object" && refs.Motions !== null) for (const [group, motions] of Object.entries(refs.Motions)) {
		if (!Array.isArray(motions)) {
			errors.push("FileReferences.Motions." + group + " is not an array");
			continue;
		}
		motions.forEach((motion, index) => {
			const file = typeof motion === "object" && motion !== null ? motion.File : void 0;
			if (file !== void 0) push(file, "FileReferences.Motions." + group + "[" + index + "].File");
		});
	}
	return {
		references: [...collected].sort(),
		errors
	};
}
//#endregion
//#region src/registry.ts
/**
* Pet registry — the multi-pet contract. One pet is a directory holding a
* 'pet.json' manifest plus an atlas image; nothing else is required, and no
* host or client code changes when a pet is added. The registry scans four
* sources, later sources overriding earlier ones on an id collision:
*
*   1. the package's own 'assets' subdirectories (built-in pets);
*   2. '${CODEX_HOME:-~/.codex}/pets' subdirectories (hatch-pet custom pets,
*      legacy source kept readable);
*   3. '$DSH_HOME/pets' subdirectories (the pet-center user directory);
*   4. 'PetConfig.pets' manifests composed by the embedding application
*      (highest precedence).
*
* Manifests are parsed through manifest-v2 (pet-center M2, issue #623): v1
* manifests are compat-read as sprite2d, v2 manifests validate fail-closed,
* and structured diagnostics ride alongside the legacy warnings. Live2d
* entries (pet-center M3) list like any other pet: the entry carries the
* validated live2d block plus the model's reference closure (the servable
* set the asset route allows), and a model3.json that is unreadable or
* declares unsafe references rejects the entry with an error diagnostic.
*
* The manifest follows the Codex/hatch-pet contract (8 columns x 9 rows of
* 192x208 cells, the 9-state row order below). Legacy whale-girl manifests
* that only carry 'frames' keep working: geometry, per-row frame counts and
* per-track rhythm all fall back to the hatch-pet contract defaults, and the
* whale-girl manifest overrides its own durations.
* @module @linxin666/dsh-pet/registry
*/
/** Fixed row order of the 9-state animation contract. */
const PET_ROW_ORDER = [
	"idle",
	"running-right",
	"running-left",
	"waving",
	"jumping",
	"failed",
	"waiting",
	"running",
	"review"
];
/** Atlas cell size in px (Codex/hatch-pet contract). */
const DEFAULT_PET_CELL = {
	width: 192,
	height: 208
};
/** Columns per row (max frames per track). */
const DEFAULT_PET_COLUMNS = 8;
/** Rows in the atlas (fixed by the animation contract). */
const DEFAULT_PET_ROW_COUNT = 9;
/**
* Per-row used-column counts from the hatch-pet contract table. Manifests
* that carry no 'frames' field (the Codex custom-pet shape) resolve here.
*/
const DEFAULT_FRAME_COUNTS = [
	6,
	8,
	8,
	4,
	5,
	8,
	6,
	6,
	6
];
/** Absolute package root, resolved from a module URL (lib/ or src/). */
function petPackageRoot(importMetaUrl) {
	return fileURLToPath(new URL("../", importMetaUrl));
}
/** Resolve the hatch-pet custom pets directory (CODEX_HOME or ~/.codex). */
function codexPetsDir(env = process.env, home = homedir()) {
	const raw = env.CODEX_HOME !== void 0 && env.CODEX_HOME.trim() !== "" ? env.CODEX_HOME.trim() : join(home, ".codex");
	return join(raw === "~" ? home : raw.startsWith("~/") || raw.startsWith("~\\") ? join(home, raw.slice(2)) : raw, "pets");
}
/** Finite non-negative integer guard, else the fallback. */
function finiteInt(value, fallback, max) {
	return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max ? value : fallback;
}
/** Build the browser URL of one pet asset. */
function assetUrl(prefix, id, file) {
	const path = file.split("/").filter((segment) => segment !== "").join("/");
	return prefix + "/" + encodeURIComponent(id) + "/" + path;
}
/**
* Default per-track rhythm — the shared slow baseline every sprite2d pet
* plays unless its manifest overrides a track (user request: all pets were
* too fast at the legacy hatch-pet contract pace).
*/
const DEFAULT_TRACK_PATTERNS = {
	idle: {
		durations: [
			500,
			500,
			600,
			500,
			500,
			600
		],
		loop: true
	},
	"running-right": {
		durations: [
			300,
			300,
			300,
			300,
			300,
			300,
			300,
			400
		],
		loop: true
	},
	"running-left": {
		durations: [
			300,
			300,
			300,
			300,
			300,
			300,
			300,
			400
		],
		loop: true
	},
	waving: {
		durations: [
			450,
			450,
			450,
			450
		],
		loop: true
	},
	jumping: {
		durations: [
			400,
			400,
			400,
			450,
			450
		],
		loop: false,
		fallback: "idle"
	},
	failed: {
		durations: [
			550,
			550,
			550,
			600,
			650,
			700,
			550,
			550
		],
		loop: false,
		fallback: "idle"
	},
	waiting: {
		durations: [
			550,
			550,
			600,
			550,
			550,
			600
		],
		loop: true
	},
	running: {
		durations: [
			330,
			330,
			330,
			330,
			330,
			400
		],
		loop: true
	},
	review: {
		durations: [
			650,
			650,
			650,
			650,
			650,
			650
		],
		loop: true
	}
};
/** Stable id charset: keeps asset URLs plain and filesystem-safe. */
const PET_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/** Safe path-segment charset for atlas files. */
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const PET_NAME_MAX_LENGTH$1 = 80;
const PET_PHASES = [
	"idle",
	"waiting",
	"thinking",
	"tool",
	"review",
	"done",
	"failed"
];
/** Validate optional scene sequences without rejecting an otherwise usable pet. */
function normalizeSequences(raw, id, warn) {
	if (raw === void 0) return void 0;
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		warn("manifest " + id + ": sequences must be an object keyed by activity phase");
		return;
	}
	const sequences = {};
	for (const [phase, value] of Object.entries(raw)) {
		if (!PET_PHASES.includes(phase)) {
			warn("manifest " + id + ": unknown sequence phase " + JSON.stringify(phase));
			continue;
		}
		if (!Array.isArray(value) || value.length < 5) {
			warn("manifest " + id + ": sequence " + phase + " must contain at least 5 animations");
			continue;
		}
		const unknownIndex = value.findIndex((animation) => typeof animation !== "string" || !PET_ROW_ORDER.includes(animation));
		if (unknownIndex !== -1) {
			const unknown = value[unknownIndex];
			warn("manifest " + id + ": sequence " + phase + " contains unknown animation " + JSON.stringify(unknown));
			continue;
		}
		sequences[phase] = value;
	}
	return Object.keys(sequences).length === 0 ? void 0 : sequences;
}
/**
* Build the fully resolved animation tracks from the contract defaults plus
* optional per-track overrides. Shared by the sprite2d resolver and the
* live2d entry builder (which fills the sprite fields with contract
* defaults so the flat PetDefinition shape holds for every renderer).
*/
function buildTracks(rows, columns, trackOverrides, warn) {
	const tracks = {};
	for (const [row, animation] of PET_ROW_ORDER.entries()) {
		const pattern = DEFAULT_TRACK_PATTERNS[animation];
		const override = trackOverrides[animation];
		const durations = Array.isArray(override?.durations) && override.durations.length > 0 ? override.durations.filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0) : pattern.durations;
		if (durations.length === 0) {
			warn("track " + animation + " carries no usable durations");
			return;
		}
		const frameCount = Math.max(1, Math.min(rows[row], columns));
		const sized = durations.length >= frameCount ? durations.slice(0, frameCount) : Array.from({ length: frameCount }, (_, index) => durations[index % durations.length]);
		tracks[animation] = {
			frames: Array.from({ length: frameCount }, (_, index) => index),
			durations: sized,
			loop: typeof override?.loop === "boolean" ? override.loop : pattern.loop,
			...override?.fallback === void 0 ? pattern.fallback === void 0 ? {} : { fallback: pattern.fallback } : PET_ROW_ORDER.includes(override.fallback) ? { fallback: override.fallback } : pattern.fallback === void 0 ? {} : { fallback: pattern.fallback }
		};
	}
	return tracks;
}
/**
* Normalize one parsed manifest into a renderable pet entry, or undefined
* (with a warning recorded) when the manifest violates the contract.
*/
function resolvePetManifest(raw, dir, options = {}) {
	const { assetPrefix = "/pet", warnings = [] } = options;
	const warn = (message) => {
		warnings.push(message);
	};
	if (typeof raw !== "object" || raw === null) {
		warn("manifest is not an object");
		return;
	}
	const source = raw;
	const id = typeof source.id === "string" ? source.id.trim() : "";
	if (!PET_ID_PATTERN.test(id)) {
		warn("manifest id " + JSON.stringify(String(source.id)) + " is not a lowercase kebab id");
		return;
	}
	const displayName = typeof source.displayName === "string" && source.displayName.trim() !== "" ? source.displayName.trim().slice(0, PET_NAME_MAX_LENGTH$1) : id;
	const description = typeof source.description === "string" ? source.description.trim() : "";
	const spritesheet = typeof source.spritesheetPath === "string" && source.spritesheetPath.trim() !== "" ? source.spritesheetPath.trim() : "spritesheet.webp";
	const spritesheetPath = spritesheet.split("/").filter((segment) => segment !== "");
	if (spritesheetPath.length === 0 || isAbsolute(spritesheet) || spritesheet.includes("\\") || spritesheetPath.some((segment) => segment === ".." || !PATH_SEGMENT_PATTERN.test(segment))) {
		warn("manifest spritesheetPath " + JSON.stringify(spritesheet) + " is not a safe relative path");
		return;
	}
	const rawCell = typeof source.cell === "object" && source.cell !== null ? source.cell : {};
	const cell = {
		width: finiteInt(rawCell.width, DEFAULT_PET_CELL.width, 2048),
		height: finiteInt(rawCell.height, DEFAULT_PET_CELL.height, 2048)
	};
	const columns = finiteInt(source.columns, 8, 32);
	const atlasRowCount = source.spriteVersionNumber === 2 ? 11 : 9;
	const rows = DEFAULT_FRAME_COUNTS.map((fallback, index) => {
		return finiteInt(Array.isArray(source.frames) ? source.frames[index] : void 0, fallback, columns);
	});
	const remarks = normalizePetRemarks(source.remarks, (message) => warn("manifest " + id + ": " + message));
	const sequences = normalizeSequences(source.sequences, id, warn);
	const tracks = buildTracks(rows, columns, typeof source.tracks === "object" && source.tracks !== null ? source.tracks : {}, (message) => warn("manifest " + id + ": " + message));
	if (tracks === void 0) return void 0;
	const sheet = spritesheetPath.join("/");
	return {
		id,
		displayName,
		description,
		renderer: "sprite2d",
		cell,
		columns,
		rows,
		atlasRows: atlasRowCount,
		tracks,
		...sequences === void 0 ? {} : { sequences },
		atlasUrl: assetUrl(assetPrefix, id, spritesheet),
		manifestUrl: assetUrl(assetPrefix, id, "pet.json"),
		dir,
		spritesheetPath: sheet,
		servable: [sheet],
		...remarks === void 0 ? {} : { remarks }
	};
}
/**
* Adapt a validated v2 manifest's sprite2d block onto the legacy flat shape
* the established resolver consumes (pet-center M2 P2). The legacy resolver
* only expresses 9-row (default) and 11-row (spriteVersionNumber 2) atlases,
* so other atlasRows values are rejected here with a diagnostic.
*/
function flattenV2Sprite2d(manifest) {
	const block = manifest.sprite2d;
	if (block === void 0) return void 0;
	const legacy = {
		id: manifest.id,
		displayName: manifest.displayName,
		spritesheetPath: block.spritesheetPath
	};
	if (manifest.description !== void 0) legacy.description = manifest.description;
	if (block.cell !== void 0) legacy.cell = block.cell;
	if (block.columns !== void 0) legacy.columns = block.columns;
	if (block.frames !== void 0) legacy.frames = block.frames;
	if (block.tracks !== void 0) legacy.tracks = block.tracks;
	if (block.atlasRows !== void 0) {
		if (block.atlasRows === 11) legacy.spriteVersionNumber = 2;
		else if (block.atlasRows !== 9) return void 0;
	}
	if (manifest.sequences !== void 0) legacy.sequences = manifest.sequences;
	if (manifest.remarks !== void 0) legacy.remarks = manifest.remarks;
	return legacy;
}
/**
* Resolve a validated live2d manifest into a renderable entry (pet-center
* M3). The model3.json is read at scan time: its reference closure becomes
* the entry's servable set (the asset route's allow-list), and a model that
* is unreadable or declares unsafe references rejects the entry fail-closed
* with an error diagnostic. Closure files missing on disk warn but keep the
* entry listed — the client renderer's diagnostic card reports the broken
* render, matching the registry's never-throw philosophy (install-time
* strictness belongs to the CLI validator). The sprite fields carry contract
* defaults: the chrome sizes live2d pets off 'display.size', not the atlas.
*/
function resolveLive2dEntry(manifest, dir, options) {
	const assetPrefix = options.assetPrefix ?? "/pet";
	const record = (level, message) => {
		options.diagnostics?.push({
			level,
			source: dir,
			message
		});
		options.warnings?.push(message);
	};
	const block = manifest.live2d;
	if (block === void 0) {
		record("error", "pet " + manifest.id + ": renderer live2d requires a live2d block");
		return;
	}
	const modelFile = join(dir, block.model);
	let model3;
	try {
		if (guardedScannedJsonStat(modelFile, options, "live2d model " + block.model, 33554432) === void 0) {
			statSync(modelFile);
			return;
		}
		model3 = JSON.parse(readFileSync(modelFile, "utf8"));
	} catch (error) {
		record("error", "pet " + manifest.id + ": live2d model " + block.model + " is not readable: " + (error instanceof Error ? error.message : String(error)));
		return;
	}
	const { references, errors } = collectModel3References(model3);
	if (errors.length > 0) {
		for (const message of errors) record("error", "pet " + manifest.id + ": live2d model " + block.model + ": " + message);
		return;
	}
	for (const reference of references) if (!existsSync(join(dir, reference))) record("warning", "pet " + manifest.id + ": live2d closure file missing: " + reference);
	const tracks = buildTracks(DEFAULT_FRAME_COUNTS, 8, {}, (message) => record("warning", "pet " + manifest.id + ": " + message));
	if (tracks === void 0) return void 0;
	const remarks = normalizePetRemarks(manifest.remarks, (message) => record("warning", "pet " + manifest.id + ": " + message));
	const modelUrl = assetUrl(assetPrefix, manifest.id, block.model);
	const live2d = {
		modelUrl,
		modelPath: block.model,
		...block.scale === void 0 ? {} : { scale: block.scale },
		...block.translate === void 0 ? {} : { translate: block.translate },
		motions: block.motions,
		...block.expressions === void 0 ? {} : { expressions: block.expressions },
		...block.hitAreas === void 0 ? {} : { hitAreas: block.hitAreas }
	};
	return {
		id: manifest.id,
		displayName: manifest.displayName,
		description: manifest.description ?? "",
		renderer: "live2d",
		live2d,
		cell: { ...DEFAULT_PET_CELL },
		columns: 8,
		rows: [...DEFAULT_FRAME_COUNTS],
		atlasRows: 9,
		tracks,
		atlasUrl: modelUrl,
		manifestUrl: assetUrl(assetPrefix, manifest.id, "pet.json"),
		dir,
		spritesheetPath: block.model,
		servable: [block.model, ...references],
		...remarks === void 0 ? {} : { remarks }
	};
}
/** Filename-encoded frame duration tail ('<base>_<index>_<ms>.webp'). */
const FRAMES2D_FILENAME_MS = /_(\d+)\.[^.]+$/;
/** Trailing frame index, allowing an optional '_<ms>' duration tail after it. */
const FRAMES2D_FRAME_INDEX = /(\d+)(?:_\d+)?\.[^.]+$/;
/** Default per-frame duration when neither frameMs nor the filename encodes one. */
const FRAMES2D_DEFAULT_FRAME_MS = 200;
/** Image extensions a frames2d track directory may list. */
const FRAMES2D_IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
	".webp",
	".png",
	".gif",
	".jpg",
	".jpeg"
]);
/**
* Resolve a validated frames2d manifest into a renderable entry. Track frame
* lists come from the manifest's explicit list or from listing
* '<dir>/<track>/' in filename order; durations resolve frameMs[i] >
* filename-encoded '_<ms>' tail > defaultFrameMs. Missing frames warn and
* skip (the live2d closure discipline); a track left with zero frames is
* dropped, and if the idle-mapped track ends up empty the entry is rejected
* fail-closed. The sprite fields carry contract defaults: the chrome sizes
* frames2d pets off 'display.size', not the atlas.
*/
function resolveFrames2dEntry(manifest, dir, options) {
	const assetPrefix = options.assetPrefix ?? "/pet";
	const record = (level, message) => {
		options.diagnostics?.push({
			level,
			source: dir,
			message
		});
		options.warnings?.push(message);
	};
	const block = manifest.frames2d;
	if (block === void 0) {
		record("error", "pet " + manifest.id + ": renderer frames2d requires a frames2d block");
		return;
	}
	const root = block.dir ?? ".";
	const defaultMs = block.defaultFrameMs ?? FRAMES2D_DEFAULT_FRAME_MS;
	const idleTrack = block.phases.idle;
	const tracks = {};
	const servable = [];
	const firstFrameRel = {};
	for (const [name, track] of Object.entries(block.tracks)) {
		const trackDir = root === "." ? name : root + "/" + name;
		let relFrames = [];
		if (track.frames !== void 0) for (const frame of track.frames) {
			const rel = trackDir + "/" + frame;
			if (!existsSync(join(dir, rel))) {
				record("warning", "pet " + manifest.id + ": frames2d frame missing: " + rel);
				continue;
			}
			relFrames.push(rel);
		}
		else {
			let files = [];
			try {
				files = readdirSync(join(dir, trackDir)).filter((file) => {
					if (file.startsWith(".")) return false;
					const dot = file.lastIndexOf(".");
					return dot > 0 && FRAMES2D_IMAGE_EXTENSIONS.has(file.slice(dot).toLowerCase());
				});
			} catch {
				files = [];
			}
			files.sort((a, b) => {
				const ia = FRAMES2D_FRAME_INDEX.exec(a)?.[1];
				const ib = FRAMES2D_FRAME_INDEX.exec(b)?.[1];
				if (ia !== void 0 && ib !== void 0 && ia !== ib) return Number(ia) - Number(ib);
				return a < b ? -1 : a > b ? 1 : 0;
			});
			relFrames = files.map((file) => trackDir + "/" + file);
		}
		if (relFrames.length === 0) {
			record("warning", "pet " + manifest.id + ": frames2d track " + JSON.stringify(name) + " has no frames on disk; dropped");
			continue;
		}
		const durations = relFrames.map((rel, index) => {
			if (track.frameMs !== void 0) return track.frameMs[index] ?? defaultMs;
			const match = FRAMES2D_FILENAME_MS.exec(rel);
			if (match !== null) {
				const ms = Number(match[1]);
				if (Number.isInteger(ms) && ms >= 16 && ms <= 5e3) return ms;
			}
			return defaultMs;
		});
		const loop = track.loop ?? true;
		tracks[name] = {
			frames: relFrames.map((rel) => assetUrl(assetPrefix, manifest.id, rel)),
			durations,
			loop,
			...loop ? {} : { fallback: track.fallback ?? idleTrack }
		};
		firstFrameRel[name] = relFrames[0];
		servable.push(...relFrames);
	}
	if (tracks[idleTrack] === void 0) {
		record("error", "pet " + manifest.id + ": frames2d idle track " + JSON.stringify(idleTrack) + " has no frames on disk");
		return;
	}
	const phases = { ...block.phases };
	for (const [phase, target] of Object.entries(phases)) if (target !== void 0 && tracks[target] === void 0) {
		record("warning", "pet " + manifest.id + ": frames2d phase " + phase + " maps to dropped track " + JSON.stringify(target) + "; using idle");
		phases[phase] = idleTrack;
	}
	const remarks = normalizePetRemarks(manifest.remarks, (message) => record("warning", "pet " + manifest.id + ": " + message));
	let gameplay;
	if (manifest.gameplay !== void 0) {
		gameplay = manifest.gameplay;
		if (gameplay.shop !== void 0) {
			const items = [];
			for (const item of gameplay.shop.items) {
				if (item.image === void 0) {
					items.push(item);
					continue;
				}
				if (!existsSync(join(dir, item.image))) {
					record("warning", "pet " + manifest.id + ": gameplay shop item " + item.id + " image missing: " + item.image);
					const { image, ...rest } = item;
					items.push(rest);
					continue;
				}
				servable.push(item.image);
				items.push({
					...item,
					image: assetUrl(assetPrefix, manifest.id, item.image)
				});
			}
			gameplay = {
				...gameplay,
				shop: {
					...gameplay.shop,
					items
				}
			};
		}
	}
	const flatTracks = buildTracks(DEFAULT_FRAME_COUNTS, 8, {}, (message) => record("warning", "pet " + manifest.id + ": " + message));
	if (flatTracks === void 0) return void 0;
	const firstAbs = join(dir, firstFrameRel[idleTrack]);
	const dims = existsSync(firstAbs) ? readImageDimensions(firstAbs) : void 0;
	const cell = dims !== void 0 && dims.width >= 1 && dims.height >= 1 ? dims : { ...DEFAULT_PET_CELL };
	return {
		id: manifest.id,
		displayName: manifest.displayName,
		description: manifest.description ?? "",
		renderer: "frames2d",
		frames2d: {
			tracks,
			phases
		},
		...gameplay === void 0 ? {} : { gameplay },
		cell,
		columns: 8,
		rows: [...DEFAULT_FRAME_COUNTS],
		atlasRows: 9,
		tracks: flatTracks,
		atlasUrl: tracks[idleTrack].frames[0],
		manifestUrl: assetUrl(assetPrefix, manifest.id, "pet.json"),
		dir,
		spritesheetPath: firstFrameRel[idleTrack],
		servable,
		...remarks === void 0 ? {} : { remarks }
	};
}
/** Scan one directory of pet folders; entries come back in name order. */
function scanPetDir(dir, options) {
	if (!existsSync(dir)) return [];
	let names = [];
	try {
		names = readdirSync(dir).filter((name) => !name.startsWith("."));
	} catch {
		return [];
	}
	names.sort();
	const entries = [];
	for (const name of names) {
		const manifestFile = join(dir, name, "pet.json");
		if (!existsSync(manifestFile)) continue;
		const parsed = readPetJson(manifestFile, options);
		if (parsed === void 0) continue;
		const entryDir = join(dir, name);
		const verdict = parsePetManifest(parsed, entryDir);
		for (const diagnostic of verdict.diagnostics) {
			options.diagnostics?.push({
				level: diagnostic.level,
				source: entryDir,
				message: diagnostic.message
			});
			options.warnings?.push(diagnostic.message);
		}
		if (!verdict.ok) continue;
		let entry;
		if (verdict.manifest.renderer === "live2d") entry = resolveLive2dEntry(verdict.manifest, entryDir, options);
		else if (verdict.manifest.renderer === "frames2d") entry = resolveFrames2dEntry(verdict.manifest, entryDir, options);
		else {
			const legacy = flattenV2Sprite2d(verdict.manifest);
			if (legacy === void 0) {
				const note = "pet " + verdict.manifest.id + ": sprite2d.atlasRows only supports 9 or 11 under the v1 compat resolver";
				options.diagnostics?.push({
					level: "error",
					source: entryDir,
					message: note
				});
				options.warnings?.push(note);
				continue;
			}
			entry = resolvePetManifest(legacy, entryDir, options);
		}
		if (entry === void 0) continue;
		const voice = loadVoicePackFile(join(entryDir, "voice.json"), options);
		entries.push({
			...entry,
			...voice === void 0 ? {} : { voice }
		});
	}
	return entries;
}
/**
* Read and parse one pet.json manifest; undefined (warning recorded) on
* failure. The descriptor stat guard applies first: a pathological file —
* huge, or a FIFO/device — is skipped with a warning instead of stalling
* or OOM-ing the host at scan time (same discipline as voice/decoration).
*/
function readPetJson(file, options) {
	if (guardedScannedJsonStat(file, options, "pet manifest") === void 0) return void 0;
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		options.warnings?.push("skipping " + file + ": " + (error instanceof Error ? error.message : String(error)));
		return;
	}
}
/**
* Scan-time read ceiling for user-authored JSON descriptors (voice.json,
* .voice.json, decoration.json): the registry reads these synchronously at
* plugin startup, and a pathological file — multi-GB, or a FIFO/device
* symlink — must not hang or exhaust the host before the warn-and-drop
* discipline can apply (review-spd follow-up, pet-center M4/M5).
*/
const PET_SCAN_JSON_CAP = 64 * 1024;
/**
* Stat one scanned JSON descriptor with a regular-file + size guard, so a
* pathological user file is skipped with a warning instead of stalling or
* OOM-ing the host at startup. Returns the Stats, or undefined when the
* caller must skip the file (a warning was recorded). 'cap' defaults to
* the descriptor ceiling (PET_SCAN_JSON_CAP); model descriptors pass the
* larger live2d ceiling.
*/
function guardedScannedJsonStat(file, options, what, cap = PET_SCAN_JSON_CAP) {
	let st;
	try {
		st = statSync(file);
	} catch {
		return;
	}
	const warn = (message) => {
		options.warnings?.push(file + ": " + message);
		options.diagnostics?.push({
			level: "warning",
			source: file,
			message: file + ": " + message
		});
	};
	if (!st.isFile()) {
		warn(what + " is not a regular file; ignored");
		return;
	}
	if (st.size > cap) {
		warn(what + " exceeds the " + cap + "-byte scan ceiling; ignored");
		return;
	}
	return st;
}
/**
* Load and normalize one optional voice.json (pet-center M4). A missing
* file is silent; a broken file warns and drops. The pack is pure content,
* so every issue stays a warning — a bad voice.json never rejects a pet.
*/
function loadVoicePackFile(file, options) {
	if (!existsSync(file)) return void 0;
	if (guardedScannedJsonStat(file, options, "voice pack") === void 0) return void 0;
	const warn = (message) => {
		options.warnings?.push(file + ": " + message);
		options.diagnostics?.push({
			level: "warning",
			source: file,
			message: file + ": " + message
		});
	};
	let raw;
	try {
		raw = JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		warn("voice pack is not valid JSON; ignored: " + (error instanceof Error ? error.message : String(error)));
		return;
	}
	return normalizeVoicePack(raw, warn);
}
/** Decoration asset URL prefix (served by the decoration route, M5). */
const DECORATION_ASSET_PREFIX = "/api/pet/decoration";
/** Read the pixel dimensions of a decoration strip (PNG/WebP), if decodable. */
function readImageDimensions(file) {
	let header;
	try {
		const fd = openSync(file, "r");
		try {
			header = Buffer.alloc(64);
			const read = readSync(fd, header, 0, header.length, 0);
			if (read < 0) return void 0;
			header = header.subarray(0, read);
		} finally {
			closeSync(fd);
		}
	} catch {
		return;
	}
	return imageDimensions(header);
}
/**
* Scan one directory of decoration folders ('decoration.json' + strip).
* Later scans override earlier ones on id collision; a bad descriptor warns
* and skips — the never-throw philosophy holds for decorations too (M5).
*/
function scanDecorationDir(dir, options) {
	if (!existsSync(dir)) return [];
	let names = [];
	try {
		names = readdirSync(dir).filter((name) => !name.startsWith("."));
	} catch {
		return [];
	}
	names.sort();
	const entries = [];
	for (const name of names) {
		const entryDir = join(dir, name);
		const manifestFile = join(entryDir, "decoration.json");
		if (!existsSync(manifestFile)) continue;
		if (guardedScannedJsonStat(manifestFile, options, "decoration descriptor") === void 0) continue;
		let raw;
		try {
			raw = JSON.parse(readFileSync(manifestFile, "utf8"));
		} catch (error) {
			const message = "skipping " + manifestFile + ": " + (error instanceof Error ? error.message : String(error));
			options.warnings?.push(message);
			options.diagnostics?.push({
				level: "error",
				source: entryDir,
				message
			});
			continue;
		}
		const verdict = parseDecorationManifest(raw, manifestFile);
		for (const diagnostic of verdict.diagnostics) {
			options.diagnostics?.push({
				level: diagnostic.level,
				source: entryDir,
				message: diagnostic.message
			});
			options.warnings?.push(diagnostic.message);
		}
		if (!verdict.ok) continue;
		const manifest = verdict.manifest;
		if (!existsSync(join(entryDir, manifest.entry))) {
			const message = "decoration " + manifest.id + ": strip file missing: " + manifest.entry;
			options.warnings?.push(message);
			options.diagnostics?.push({
				level: "warning",
				source: entryDir,
				message
			});
		} else {
			const actual = readImageDimensions(join(entryDir, manifest.entry));
			if (actual !== void 0) {
				const expectedWidth = manifest.cell.width * manifest.columns;
				if (actual.width !== expectedWidth || actual.height !== manifest.cell.height) {
					const message = "decoration " + manifest.id + ": strip " + actual.width + "x" + actual.height + " does not match cell " + manifest.cell.width + "x" + manifest.cell.height + " x " + manifest.columns + " columns (expected " + expectedWidth + "x" + manifest.cell.height + "); frames will render wrong";
					options.warnings?.push(message);
					options.diagnostics?.push({
						level: "warning",
						source: entryDir,
						message
					});
				}
			}
		}
		entries.push({
			apiVersion: PET_DECORATION_API_VERSION,
			id: manifest.id,
			dir: entryDir,
			entryPath: manifest.entry,
			servable: ["decoration.json", manifest.entry],
			license: manifest.license,
			assetBase: "/api/pet/decoration/" + encodeURIComponent(manifest.id),
			entryUrl: "/api/pet/decoration/" + encodeURIComponent(manifest.id) + "/" + manifest.entry,
			cell: manifest.cell,
			columns: manifest.columns,
			durations: manifest.durations,
			loop: manifest.loop,
			phases: manifest.phases
		});
	}
	return entries;
}
/**
* Load the pet registry: built-in 'assets/*' first, then the hatch-pet
* custom pets directory, then composed 'extra' manifests (each later source
* overrides an earlier one on id collision). The registry never throws on a
* bad manifest: it skips it and records a warning.
*/
function loadPetRegistry(options) {
	const { packageRoot, assetPrefix = "/pet" } = options;
	const warnings = [];
	const diagnostics = [];
	const byId = /* @__PURE__ */ new Map();
	const builtinIds = /* @__PURE__ */ new Set();
	for (const entry of scanPetDir(join(packageRoot, "assets"), {
		assetPrefix,
		warnings,
		diagnostics
	})) {
		if (byId.has(entry.id)) {
			warnings.push("duplicate built-in pet id " + entry.id + "; the first one wins");
			continue;
		}
		byId.set(entry.id, entry);
		builtinIds.add(entry.id);
	}
	const petsDir = options.petsDir ?? codexPetsDir();
	if (petsDir !== "") for (const entry of scanPetDir(petsDir, {
		assetPrefix,
		warnings,
		diagnostics
	})) {
		if (byId.has(entry.id)) warnings.push("custom pet " + entry.id + " overrides the built-in one");
		byId.set(entry.id, entry);
	}
	const dshPetsDir = options.dshPetsDir ?? join(dshHome(), "pets");
	let globalVoice;
	if (dshPetsDir !== "") {
		for (const entry of scanPetDir(dshPetsDir, {
			assetPrefix,
			warnings,
			diagnostics
		})) {
			if (byId.has(entry.id)) warnings.push("user pet " + entry.id + " overrides an earlier registration");
			byId.set(entry.id, entry);
		}
		globalVoice = loadVoicePackFile(join(dshPetsDir, ".voice.json"), {
			warnings,
			diagnostics
		});
	}
	for (const manifest of options.extra ?? []) {
		const raw = manifest.spritesheetPath;
		const dir = raw === void 0 || isAbsolute(raw) ? join(packageRoot, "assets", "extra") : dirname(resolve(packageRoot, raw));
		const entry = resolvePetManifest(raw === void 0 || isAbsolute(raw) ? manifest : {
			...manifest,
			spritesheetPath: basename(raw)
		}, dir, {
			assetPrefix,
			warnings
		});
		if (entry === void 0) continue;
		if (byId.has(entry.id)) warnings.push("composed pet " + entry.id + " overrides an earlier registration");
		byId.set(entry.id, entry);
	}
	const decorationById = /* @__PURE__ */ new Map();
	for (const entry of scanDecorationDir(join(packageRoot, "assets", "decorations"), {
		warnings,
		diagnostics
	})) decorationById.set(entry.id, entry);
	if (dshPetsDir !== "") for (const entry of scanDecorationDir(join(dshPetsDir, "decorations"), {
		warnings,
		diagnostics
	})) {
		if (decorationById.has(entry.id)) warnings.push("user decoration " + entry.id + " overrides the built-in one");
		decorationById.set(entry.id, entry);
	}
	const entries = [...byId.values()];
	const decorations = [...decorationById.values()];
	return {
		entries,
		warnings,
		diagnostics,
		byId: (id) => byId.get(id),
		defaultEntry: () => entries.find((entry) => entry.id === "whale-girl" && builtinIds.has(entry.id)) ?? entries.find((entry) => builtinIds.has(entry.id)) ?? entries[0],
		...globalVoice === void 0 ? {} : { globalVoice },
		decorations,
		decorationById: (id) => decorationById.get(id)
	};
}
/** The built-in default decoration id (M5): the first reference ornament. */
const DEFAULT_DECORATION_ID = "whale";
/** Strip host-only fields, leaving the browser-visible decoration view. */
function decorationView(entry) {
	return {
		apiVersion: PET_DECORATION_API_VERSION,
		id: entry.id,
		assetBase: entry.assetBase,
		entryUrl: entry.entryUrl,
		cell: entry.cell,
		columns: entry.columns,
		durations: entry.durations,
		loop: entry.loop,
		phases: entry.phases
	};
}
/**
* Strip host-only fields, leaving the client-visible definition. When the
* registry carries a global voice pack, its panel chrome layers under the
* entry's own pack (per-slot merge, pet > global), mirroring the voice-pool
* layering (pet-center M4, issue #677).
*/
function petEntryView(entry, globalVoice) {
	const panel = globalVoice === void 0 ? entry.voice?.panel : mergeVoicePacks(globalVoice, entry.voice)?.panel;
	return {
		id: entry.id,
		displayName: entry.displayName,
		description: entry.description,
		renderer: entry.renderer,
		...entry.live2d === void 0 ? {} : { live2d: entry.live2d },
		...entry.frames2d === void 0 ? {} : { frames2d: entry.frames2d },
		...entry.gameplay === void 0 ? {} : { gameplay: entry.gameplay },
		cell: entry.cell,
		columns: entry.columns,
		rows: entry.rows,
		atlasRows: entry.atlasRows,
		tracks: entry.tracks,
		...entry.sequences === void 0 ? {} : { sequences: entry.sequences },
		atlasUrl: entry.atlasUrl,
		manifestUrl: entry.manifestUrl,
		...panel === void 0 ? {} : { panel }
	};
}
//#endregion
//#region src/service.ts
/**
* Pet host service — the `pet.*` RPC domain. A composition facade: it wires
* the pure event projection (`event-projection`) onto the state machine,
* delegates the affinity economy to the ledger (`ledger`), and routes
* persistence through `persist`. The API gateway maps these methods onto
* `pet.state` / `pet.pets` / `pet.interact` / `pet.setVisible` /
* `pet.setConfig` / `pet.setName` / `pet.setPet` for browser consumers.
*
* Concurrent sessions each keep their own machine: the sprite animation
* follows the most recent meaningful event (the display session) while the
* state view carries one bubble per active session.
* @module @linxin666/dsh-pet/service
*/
/** The unified gameplay currency: the shared treat (小鱼干) ledger. */
const GAMEPLAY_TREATS_CURRENCY = "treats";
/** Hard cap on simultaneously displayed session bubbles (most recent first). */
const MAX_SESSION_BUBBLES = 12;
/**
* Cordis service exposing the pet RPC domain. Lazy: nothing is scanned or
* written until an economic event or interaction arrives; event listeners
* update only in-memory state, and persistence happens on economic changes
* (turn rewards, feeds, config/name changes) — never on a read.
*/
var PetService = class extends Service {
	static inject = [];
	machine;
	stateConfig;
	ledger;
	registry;
	persistDir;
	enabled;
	/** Status-decoration master switch (M5, #567); mirrored from settings. */
	decorationEnabled;
	disposeActivity;
	/** Session whose most recent meaningful event currently drives the global pet. */
	displaySession;
	/**
	* Effective voice-pack overrides for the currently selected pet (M4,
	* #677). Cached per pet id; the registry is an immutable snapshot, so the
	* global pack and each entry's pack cannot change behind the cache.
	*/
	voiceCache;
	/**
	* Per-session activity, most recent last (Map insertion order). Bounded by
	* MAX_SESSION_BUBBLES so a burst of sessions cannot grow it without bound;
	* disposed sessions are removed by the 'session/disposed' listener.
	*/
	sessionActivity = /* @__PURE__ */ new Map();
	/**
	* Sessions whose reward source is the official event stream. This metadata
	* outlives transient visual resets so a derived legacy `done` cannot reward
	* the same turn again after the pet is disabled and re-enabled.
	*/
	officialEventSessions = /* @__PURE__ */ new WeakSet();
	constructor(ctx, config = {}) {
		super(ctx, "pet");
		this.persistDir = config.persistDir ?? petHomeDir();
		this.registry = config.registry ?? loadPetRegistry({
			packageRoot: petPackageRoot(import.meta.url),
			...config.pets === void 0 ? {} : { extra: config.pets }
		});
		if (this.registry.entries.length === 0) throw new Error("[dsh-pet] no valid pet manifests found; nothing to render");
		let persist = loadPetPersist(this.persistDir);
		if (this.registry.byId(persist.petId) === void 0) persist = {
			...persist,
			petId: this.registry.defaultEntry().id
		};
		const selected = this.registry.byId(persist.petId) ?? this.registry.defaultEntry();
		const ledgerConfig = {
			affinity: config.affinity,
			treats: config.treats,
			remarks: selected.remarks
		};
		this.ledger = new PetLedger(persist, ledgerConfig);
		this.stateConfig = {
			...defaultPetStateConfig,
			...config.state ?? {}
		};
		this.machine = new PetStateMachine(this.stateConfig);
		this.enabled = config.enabled ?? true;
		this.decorationEnabled = config.decorationEnabled ?? true;
		this.syncActivity();
	}
	/**
	* The draw-time voice-pool provider handed to every projection runtime.
	* It re-resolves when the selected pet changes, so live engines re-voice
	* on the next draw without being rebuilt (M4, #677).
	*/
	voicePools() {
		return () => {
			const entry = this.activeEntry();
			if (this.voiceCache !== void 0 && this.voiceCache.petId === entry.id) return this.voiceCache.overrides;
			const overrides = mergeVoicePacks(this.registry.globalVoice, entry.voice)?.overrides ?? {};
			this.voiceCache = {
				petId: entry.id,
				overrides
			};
			return overrides;
		};
	}
	/** Whether the pet service consumes session activity while enabled. */
	isEnabled() {
		return this.enabled;
	}
	/** RPC: current pet state snapshot. */
	async state(currentSessionId) {
		return this.view(currentSessionId);
	}
	/** Current persisted display config (read-only view). */
	display() {
		return { ...this.ledger.snapshot.display };
	}
	/** RPC: the registry entries the browser half renders and selects from. */
	async pets() {
		return this.registry.entries.map((entry) => petEntryView(entry, this.registry.globalVoice));
	}
	/** The loaded registry (the asset routes serve its entries). */
	registrySnapshot() {
		return this.registry;
	}
	/** RPC: structured registry diagnostics (pet-center M2, issue #623). */
	async diagnostics() {
		return { diagnostics: this.registry.diagnostics };
	}
	/**
	* The active status decoration view (M5, #567): the default 'whale' entry
	* (user directories override built-ins by id), gated by the master switch.
	*/
	activeDecoration() {
		if (!this.decorationEnabled) return void 0;
		const entry = this.registry.decorationById?.(DEFAULT_DECORATION_ID);
		return entry === void 0 ? void 0 : decorationView(entry);
	}
	/** The selected pet's registry entry. */
	activeEntry() {
		return this.registry.byId(this.selectedPetId()) ?? this.registry.defaultEntry();
	}
	/** Currently selected pet id (persisted). */
	selectedPetId() {
		return this.ledger.snapshot.petId;
	}
	/** The display name of one pet (user rename or manifest displayName). */
	petName(petId = this.selectedPetId()) {
		const stored = this.ledger.snapshot.names[petId];
		if (stored !== void 0 && stored.trim() !== "") return stored;
		return this.registry.byId(petId)?.displayName ?? "鲸鱼娘";
	}
	/** RPC: switch the selected pet (persisted, settings document mirrored). */
	async setPetId(petId) {
		const entry = this.registry.byId(petId);
		if (entry === void 0) return {
			ok: false,
			error: "unknown-pet"
		};
		this.ledger.setPetId(entry.id);
		this.ledger.setRemarks(entry.remarks);
		this.flush();
		this.syncSettingsFromPet();
		return {
			ok: true,
			petId: entry.id
		};
	}
	/** Start or stop the session-activity listeners that drive the pet. */
	setEnabled(enabled) {
		this.enabled = enabled;
		this.syncActivity();
		if (!enabled) this.resetActivity();
	}
	syncActivity() {
		if (this.disposeActivity !== void 0) {
			this.disposeActivity();
			this.disposeActivity = void 0;
		}
		if (!this.enabled) return;
		this.disposeActivity = (() => {
			const disposers = [this.ctx.on("session/event", (session, event) => {
				const runtime = this.activityOf(session).runtime;
				if (event.type === "activity/status") {
					const payload = event.data ?? {};
					if (typeof payload.phase !== "string" || !isActivityPhase(payload.phase)) return;
					this.applyActivity(session, {
						phase: payload.phase,
						...typeof payload.line === "string" ? { line: payload.line } : {},
						...typeof payload.phrase === "string" ? { phrase: payload.phrase } : {}
					});
					if (payload.phase === "done" && !runtime.officialEventsSeen) this.rewardLegacyTurn();
					return;
				}
				const transition = projectOfficialEvent(event, runtime);
				if (transition === void 0) return;
				runtime.officialEventsSeen = true;
				this.officialEventSessions.add(session);
				this.applyActivity(session, transition.input, transition.whisper);
				if (transition.completedTurn !== void 0) this.rewardTurn(String(session.id), transition.completedTurn);
			}), this.ctx.on("session/disposed", (session) => {
				this.ledger.forgetSession(String(session.id));
				this.officialEventSessions.delete(session);
				this.sessionActivity.delete(session);
				if (session !== this.displaySession) return;
				this.displaySession = void 0;
				const remaining = [...this.sessionActivity.entries()].at(-1);
				if (remaining !== void 0) {
					const [nextSession, activity] = remaining;
					this.displaySession = nextSession;
					if (activity.lastInput !== void 0) this.machine.onActivityStatus(activity.lastInput);
					this.machine.onSessionActive();
				} else this.machine.onSessionDisposed();
			})];
			return () => {
				for (const dispose of disposers) dispose();
			};
		})();
	}
	/** Drop transient activity because terminal events missed while disabled cannot be replayed safely. */
	resetActivity() {
		this.displaySession = void 0;
		this.sessionActivity.clear();
		this.machine.onSessionDisposed();
	}
	/** Return the per-session activity record, creating it on first sight. */
	activityOf(session) {
		let activity = this.sessionActivity.get(session);
		if (activity === void 0) {
			const runtime = emptyProjectionRuntime(this.voicePools());
			runtime.officialEventsSeen = this.officialEventSessions.has(session);
			activity = {
				runtime,
				machine: new PetStateMachine(this.stateConfig)
			};
			this.sessionActivity.set(session, activity);
		}
		return activity;
	}
	/**
	* Commit one activity: the session's own machine renders its bubble, and
	* the session becomes the host-global display session (most recent
	* meaningful event wins the sprite animation).
	*/
	applyActivity(session, input, whisper) {
		const activity = this.activityOf(session);
		activity.lastInput = input;
		if (whisper !== void 0) activity.whisper = {
			text: whisper,
			at: Date.now()
		};
		activity.machine.onActivityStatus(input);
		activity.machine.onSessionActive();
		this.sessionActivity.delete(session);
		this.sessionActivity.set(session, activity);
		while (this.sessionActivity.size > 12) {
			const oldest = this.sessionActivity.keys().next().value;
			if (oldest === void 0) break;
			this.sessionActivity.delete(oldest);
		}
		this.displaySession = session;
		this.machine.onActivityStatus(input);
		this.machine.onSessionActive();
	}
	/** RPC: pet or feed the pet. */
	async interact(kind) {
		const nowMs = Date.now();
		const result = this.ledger.interact(kind, nowMs);
		if (this.ledger.takeDirty()) this.flush();
		return result;
	}
	/** The active pet's gameplay block, if it declares one. */
	gameplayDef() {
		return this.activeEntry().gameplay;
	}
	/** The persisted (or fresh) gameplay state of the selected pet. */
	gameplayState(def, now) {
		const petId = this.selectedPetId();
		const stored = this.ledger.snapshot.gameplay[petId];
		return {
			petId,
			state: stored === void 0 ? initialGameplayState(def, now) : {
				stats: { ...stored.stats },
				currencies: { ...stored.currencies },
				mode: stored.mode,
				settledAt: stored.settledAt
			}
		};
	}
	/** Display view of one gameplay state (rounded stats; treats ride the shared treat ledger). */
	gameplayViewOf(state) {
		const stats = {};
		for (const [name, value] of Object.entries(state.stats)) stats[name] = Math.round(value);
		return {
			stats,
			mode: state.mode
		};
	}
	/**
	* Move gameplay 'treats' currency (the unified post-wallet currency) from
	* the engine's settle work area into the shared treat ledger, capped by
	* the stock cap. The engine keeps its generic currency record for settle
	* math; this drain is the only bridge to the wallet-free economy.
	*/
	drainGameplayTreats(state) {
		const pending = Math.floor(state.currencies[GAMEPLAY_TREATS_CURRENCY] ?? 0);
		delete state.currencies[GAMEPLAY_TREATS_CURRENCY];
		if (pending > 0) this.ledger.grantTreats(pending);
	}
	/** Persist the mutated gameplay state of one verb call. */
	commitGameplay(petId, state) {
		this.ledger.setGameplay(petId, state);
		if (this.ledger.takeDirty()) this.flush();
	}
	/**
	* RPC: a touch on the pet. 'zone' names a touch zone (roll a branch);
	* omitted means a plain click while a touch animation holds (clickBoost).
	*/
	async gameplayTouch(zone) {
		const def = this.gameplayDef();
		if (def === void 0) return {
			ok: false,
			error: "no-gameplay"
		};
		const now = Date.now();
		const { petId, state } = this.gameplayState(def, now);
		settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
		if (zone === void 0) {
			const boost = def.touch?.clickBoost;
			if (boost === void 0) return {
				ok: false,
				error: "no-touch"
			};
			const amount = boost.min + Math.floor(Math.random() * (boost.max - boost.min + 1));
			if (amount > 0) applyGameplayEffects(state, def, [{
				stat: boost.stat,
				amount
			}]);
			this.drainGameplayTreats(state);
			this.commitGameplay(petId, state);
			return {
				ok: true,
				hit: false,
				view: this.gameplayViewOf(state)
			};
		}
		const target = def.touch?.zones.find((entry) => entry.name === zone);
		if (target === void 0) return {
			ok: false,
			error: "unknown-zone"
		};
		const branch = rollTouchBranch(target, Math.random);
		if (branch === void 0) {
			this.drainGameplayTreats(state);
			this.commitGameplay(petId, state);
			return {
				ok: true,
				hit: false,
				view: this.gameplayViewOf(state)
			};
		}
		if (branch.effects !== void 0) applyGameplayEffects(state, def, branch.effects);
		const phrase = branch.phrases !== void 0 && branch.phrases.length > 0 ? branch.phrases[Math.floor(Math.random() * branch.phrases.length)] : void 0;
		this.drainGameplayTreats(state);
		this.commitGameplay(petId, state);
		return {
			ok: true,
			hit: true,
			...branch.state === void 0 ? {} : { state: branch.state },
			...branch.stateMs === void 0 ? {} : { stateMs: branch.stateMs },
			...phrase === void 0 ? {} : { phrase },
			view: this.gameplayViewOf(state)
		};
	}
	/** RPC: enter or leave a gameplay mode ('work' | 'sleep' | null). */
	async gameplaySetMode(mode) {
		const def = this.gameplayDef();
		if (def === void 0) return {
			ok: false,
			error: "no-gameplay"
		};
		if (mode === "work" && def.work === void 0) return {
			ok: false,
			error: "no-work"
		};
		if (mode === "sleep" && def.sleep === void 0) return {
			ok: false,
			error: "no-sleep"
		};
		const now = Date.now();
		const { petId, state } = this.gameplayState(def, now);
		settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
		state.mode = mode;
		this.drainGameplayTreats(state);
		this.commitGameplay(petId, state);
		return {
			ok: true,
			view: this.gameplayViewOf(state)
		};
	}
	/** RPC: one work-round adjudication (only while the work mode holds). */
	async gameplayWorkTick() {
		const def = this.gameplayDef();
		if (def?.work === void 0) return {
			ok: false,
			error: "no-work"
		};
		const now = Date.now();
		const { petId, state } = this.gameplayState(def, now);
		if (state.mode !== "work") return {
			ok: false,
			error: "not-working"
		};
		settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
		const outcome = rollWorkOutcome(def.work, Math.random);
		const effects = outcome === "success" ? def.work.success?.effects : def.work.fail?.effects;
		if (effects !== void 0) applyGameplayEffects(state, def, effects);
		this.drainGameplayTreats(state);
		this.commitGameplay(petId, state);
		return {
			ok: true,
			outcome,
			view: this.gameplayViewOf(state)
		};
	}
	/** RPC: buy one shop item (effects, currency swap, or a lottery draw). */
	async gameplayBuy(itemId) {
		const def = this.gameplayDef();
		if (def === void 0) return {
			ok: false,
			error: "no-gameplay"
		};
		const item = def.shop?.items.find((entry) => entry.id === itemId);
		if (item === void 0) return {
			ok: false,
			error: "unknown-item"
		};
		const now = Date.now();
		const { petId, state } = this.gameplayState(def, now);
		settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
		const treats = item.currency === GAMEPLAY_TREATS_CURRENCY;
		const balance = treats ? this.ledger.snapshot.treats.treats : state.currencies[item.currency] ?? 0;
		if (balance < item.price) return {
			ok: false,
			error: "insufficient-funds",
			view: this.gameplayViewOf(state)
		};
		if (treats) this.ledger.spendTreats(item.price);
		else state.currencies[item.currency] = balance - item.price;
		if (item.effects !== void 0) applyGameplayEffects(state, def, item.effects);
		let prize;
		if (item.lottery !== void 0) {
			if (item.lottery.effects !== void 0) applyGameplayEffects(state, def, item.lottery.effects);
			const tier = drawLotteryTier(item.lottery, Math.random);
			const prizeCurrency = tier.currency ?? item.lottery.currency ?? item.currency;
			if (prizeCurrency === GAMEPLAY_TREATS_CURRENCY) this.ledger.grantTreats(tier.prize);
			else state.currencies[prizeCurrency] = (state.currencies[prizeCurrency] ?? 0) + tier.prize;
			prize = {
				amount: tier.prize,
				currency: prizeCurrency
			};
		}
		this.drainGameplayTreats(state);
		this.commitGameplay(petId, state);
		return {
			ok: true,
			...prize === void 0 ? {} : { prize },
			view: this.gameplayViewOf(state)
		};
	}
	/** RPC: show or hide the pet. */
	async setVisible(visible) {
		this.ledger.setDisplay({
			...this.ledger.snapshot.display,
			visible
		});
		this.flush();
		this.syncSettingsFromPet();
		return {
			ok: true,
			display: this.ledger.snapshot.display
		};
	}
	/** RPC: update display config (size / position). Values are clamped to whole pixels. */
	async setConfig(patch) {
		const next = {
			...this.ledger.snapshot.display,
			...patch
		};
		next.size = Math.round(Math.min(512, Math.max(32, next.size)));
		next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.right)));
		next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.bottom)));
		this.ledger.setDisplay(next);
		this.flush();
		this.syncSettingsFromPet();
		return {
			ok: true,
			display: this.ledger.snapshot.display
		};
	}
	/** RPC: rename the selected pet (trimmed, 1–20 chars, per-pet storage). */
	async setName(name) {
		const trimmed = name.trim();
		if (trimmed === "") return {
			ok: false,
			error: "name-empty"
		};
		if (trimmed.length > 20) return {
			ok: false,
			error: "name-too-long"
		};
		this.ledger.setPetName(this.selectedPetId(), trimmed);
		this.flush();
		return {
			ok: true,
			name: trimmed
		};
	}
	/**
	* Apply a committed settings section to the persisted selection and display
	* config. Called by the settings surface on every change; values are
	* clamped exactly like the setConfig RPC so both write paths converge.
	* @param section - the resolved settings section.
	*/
	applySettingsSection(section) {
		this.decorationEnabled = section.decorationEnabled ?? true;
		const selected = typeof section.petId === "string" ? this.registry.byId(section.petId) : void 0;
		if (selected !== void 0) {
			this.ledger.setPetId(selected.id);
			this.ledger.setRemarks(selected.remarks);
		} else if (section.petId !== void 0) this.syncSettingsFromPet();
		const next = { ...this.ledger.snapshot.display };
		next.visible = section.visible && (section.enabled ?? true);
		next.size = Math.round(Math.min(512, Math.max(32, section.size)));
		next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.right)));
		next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.bottom)));
		this.ledger.setDisplay(next);
		this.flush();
	}
	/** Mirror the persisted display config into the settings document (best-effort). */
	syncSettingsFromPet() {
		const settings = this.ctx.get("settings", false);
		if (settings === void 0) return;
		const snapshot = this.ledger.snapshot;
		settings.update("pet", {
			visible: snapshot.display.visible,
			size: snapshot.display.size,
			right: snapshot.display.right,
			bottom: snapshot.display.bottom,
			petId: snapshot.petId
		}).catch(() => {});
	}
	/** Award the turn reward once per completed turn (idempotent per session + turn). */
	rewardTurn(sessionId, turn) {
		if (this.ledger.rewardTurn(sessionId, turn, Date.now())) this.flush();
	}
	/** Preserve turn rewards for installations that only emit legacy activity. */
	rewardLegacyTurn() {
		if (this.ledger.rewardLegacyTurn(Date.now())) this.flush();
	}
	view(currentSessionId) {
		const snapshot = this.machine.render();
		const entry = this.activeEntry();
		const sessions = [];
		for (const [session, activity] of [...this.sessionActivity.entries()].reverse()) {
			if (sessions.length >= 12) break;
			if (session.header?.origin === "subagent") continue;
			const perSession = activity.machine.render();
			if (perSession.bubble === void 0) continue;
			const whisper = activity.whisper;
			const freshWhisper = whisper !== void 0 && Date.now() - whisper.at < 8e3 ? whisper.text : void 0;
			sessions.push({
				sessionId: String(session.id),
				animation: perSession.animation,
				bubble: perSession.bubble,
				phase: perSession.phase,
				...freshWhisper === void 0 ? {} : { whisper: freshWhisper }
			});
		}
		if (currentSessionId !== void 0) {
			const index = sessions.findIndex((session) => session.sessionId === currentSessionId);
			if (index > 0) sessions.unshift(sessions.splice(index, 1)[0]);
		}
		const decoration = this.activeDecoration();
		const gameplayDef = this.gameplayDef();
		let gameplay;
		if (gameplayDef !== void 0) {
			const { state } = this.gameplayState(gameplayDef, Date.now());
			settleGameplay(state, gameplayDef, Date.now(), { sessionActive: snapshot.sessionActive });
			gameplay = this.gameplayViewOf(state);
		}
		return {
			animation: snapshot.animation,
			...snapshot.bubble === void 0 ? {} : { bubble: snapshot.bubble },
			phase: snapshot.phase,
			sessionActive: snapshot.sessionActive,
			sessions,
			...decoration === void 0 ? {} : { decoration },
			affinity: this.ledger.affinityView(Date.now()),
			display: { ...this.ledger.snapshot.display },
			pet: {
				id: entry.id,
				displayName: entry.displayName,
				description: entry.description
			},
			name: this.petName(),
			treats: {
				stocked: this.ledger.snapshot.treats.treats,
				max: this.ledger.treatMax
			},
			...gameplay === void 0 ? {} : { gameplay }
		};
	}
	flush() {
		try {
			savePetPersist(this.ledger.snapshot, this.persistDir);
		} catch {}
	}
};
//#endregion
//#region src/loopback.ts
/** IPv4 127/8 predicate (four decimal octets, first == 127). */
function isIPv4Loopback(v4) {
	const parts = v4.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Whether a socket remote address names the loopback range (127/8, ::1, IPv4-mapped). */
function isLoopbackAddress(address) {
	if (address === void 0) return false;
	const normalized = address.toLowerCase();
	if (normalized === "::1") return true;
	if (normalized.startsWith("::ffff:")) return isIPv4Loopback(normalized.slice(7));
	return isIPv4Loopback(normalized);
}
/** Whether a normalized URL hostname names the loopback authority (localhost, [::1], 127/8). */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	return isIPv4Loopback(hostname);
}
/**
* Request-level trust fence: a loopback socket address AND a loopback Host
* header, plus browser same-origin markers. The socket address is
* authoritative; X-Forwarded-For is never trusted.
*/
function isLoopbackRequest(request) {
	if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL("http://" + host);
	} catch {
		return false;
	}
	if (!isLoopbackHostname(hostUrl.hostname)) return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
//#endregion
//#region src/access.ts
/**
* Whether this request may enter any /api/pet or /pet asset route.
* @param ctx - host context; may expose remoteWebUiPairing.
* @param request - the incoming HTTP request.
* @returns true for loopback, or a live paired-device cookie.
*/
function isPetAllowed(ctx, request) {
	if (isLoopbackRequest(request)) return true;
	const bag = ctx;
	const fromGet = typeof bag.get === "function" ? bag.get("remoteWebUiPairing", false) : void 0;
	return (isPairingAccess(fromGet) ? fromGet : bag.remoteWebUiPairing)?.isPairedDevice(request) === true;
}
function isPairingAccess(value) {
	return value !== void 0 && value !== null && typeof value.isPairedDevice === "function";
}
//#endregion
//#region src/http.ts
/** Default body cap for readJsonBody: 64 KiB. */
const DEFAULT_JSON_BODY_MAX_BYTES = 64 * 1024;
/** Family-default JSON response headers; callers may append or override. */
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"referrer-policy": "no-referrer"
};
/**
* Lenient bounded body reader: parse a request body as JSON, or null on an
* empty body, invalid JSON, or a body past maxBytes (default 64 KiB).
* Overflow destroys the request instead of draining the remainder (no drain
* call, matching the current repo-wide behavior); callers must not keep
* reading the request afterwards. With objectOnly, non-JSON-object payloads
* also yield null.
*/
async function readJsonBody(req, opts = {}) {
	const maxBytes = opts.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES;
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > maxBytes) {
			req.destroy();
			return null;
		}
		chunks.push(buffer);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return null;
	try {
		const parsed = JSON.parse(text);
		if (opts.objectOnly && !isJsonObject(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
/** Whether a value is a JSON object: typeof object, not null, not an array. */
function isJsonObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Write one JSON response. Default headers are the family defaults
* (content-type and referrer-policy); caller headers are appended or
* override them.
*/
function writeJson(res, status, body, headers = {}) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		...JSON_HEADERS,
		...headers
	});
	res.end(payload);
}
//#endregion
//#region src/routes.ts
/**
* Pet HTTP routes — the browser half talks to the host through plain
* same-origin JSON endpoints ('/api/pet/*') and loads pet assets from
* '/pet/<id>/*'. The '/plugins/' endpoint only serves client bundles and RPC
* domains are platform-registered, so the pet serves its own API and media —
* the same pattern as dsh-remote-web-ui's '/api/pair' family. The asset route
* is one prefix registration serving every registry entry (manifest, atlas,
* optional previews), so adding a pet never touches route wiring. Both the
* JSON API, the asset prefix, and the Live2D runtime prefix are loopback-only
* by default; a live paired-device cookie is an extra allow path when
* remote-web-ui is loaded.
* @module @linxin666/dsh-pet/routes
*/
/** Browser-facing base path of the pet API. */
const PET_API_PREFIX = "/api/pet";
/** Browser-facing base path of the pet asset routes ('/pet/<id>/...'). */
const PET_ASSET_PREFIX = "/pet";
const MANIFEST_FILE = "pet.json";
const PREVIEW_DIR = "previews";
const PREVIEW_PATTERN = /^[A-Za-z0-9._-]+$/;
/**
* Per-class size ceilings for served pet assets, in bytes (pet-center M2 P3,
* issue #623). Constants are tested directly; makePetRoutes accepts an
* override so tests can exercise the 413 path with tiny caps.
*/
const PET_ASSET_CAPS = {
	/** pet.json manifest. */
	manifest: 64 * 1024,
	/** Atlas, preview and Live2D texture imagery. */
	image: 20 * 1024 * 1024,
	/** Live2D model closure files (.moc3, motion/physics/expression JSON; M3). */
	model: 32 * 1024 * 1024
};
/** Imagery extensions classify into the image cap; everything else served from a closure is model-class. */
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
	".webp",
	".png",
	".gif",
	".jpg",
	".jpeg"
]);
/** Lowercased file extension ('' when none). */
function extensionOf(file) {
	const dot = file.lastIndexOf(".");
	return dot < 0 ? "" : file.slice(dot).toLowerCase();
}
/**
* realpath containment: resolve both sides and require the candidate to stay
* inside the base directory. A pet directory (or an atlas/preview inside it)
* that is a symlink escaping its root is rejected, never followed.
*/
function containedRealpath(base, candidate) {
	try {
		const realBase = realpathSync(base);
		const realCandidate = realpathSync(candidate);
		return realCandidate === realBase || realCandidate.startsWith(realBase + sep) ? realCandidate : void 0;
	} catch {
		return;
	}
}
const MIME_BY_EXT = {
	".webp": "image/webp",
	".png": "image/png",
	".gif": "image/gif",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".json": "application/json"
};
/** Content type by file extension (safe fallback: octet-stream). */
function mimeFor(file) {
	const dot = file.lastIndexOf(".");
	if (dot < 0) return "application/octet-stream";
	return MIME_BY_EXT[file.slice(dot).toLowerCase()] ?? "application/octet-stream";
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
	if (req.method === method) return true;
	writeJson(res, 405, {
		ok: false,
		error: "method-not-allowed"
	});
	return false;
}
/** Shared route fence: loopback always passes; a live paired-device cookie is an extra allow path. */
function guard(ctx, req, res) {
	if (isPetAllowed(ctx, req)) return true;
	writeJson(res, 403, {
		ok: false,
		error: "forbidden: loopback-only"
	});
	return false;
}
/** Wrap one async service call as a GET JSON route (request passed through for query params). */
function getRoute(ctx, path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!guard(ctx, req, res)) return;
			if (!requireMethod(req, res, "GET")) return;
			run(req).then((value) => writeJson(res, 200, value), (error) => {
				writeJson(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** Wrap one async service call as a POST JSON route (body passed through). */
function postRoute(ctx, path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!guard(ctx, req, res)) return Promise.resolve();
			if (!requireMethod(req, res, "POST")) return Promise.resolve();
			return readJsonBody(req, { maxBytes: 64 * 1024 }).then((parsed) => {
				const payload = parsed ?? {};
				return run(typeof payload === "object" && payload !== null ? payload : {}).then((value) => writeJson(res, 200, value), (error) => {
					writeJson(res, 400, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				});
			}, (error) => {
				writeJson(res, 400, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** Legacy URL aliases: each entry's directory basename (e.g. 'whale'). */
function dirAliases(registry) {
	const aliases = /* @__PURE__ */ new Map();
	for (const entry of registry.entries) {
		const alias = entry.dir.split(/[\\/]/).pop() ?? "";
		if (alias !== "" && !aliases.has(alias)) aliases.set(alias, entry);
	}
	return aliases;
}
/**
* The one asset handler behind the '/pet' prefix. Resolves the pet by id (or
* legacy directory alias), then serves exactly the files a manifest declares:
* pet.json, the entry's servable set (the sprite2d atlas, or the live2d
* model3.json plus its reference closure — pet-center M3), and optional
* 'previews/<name>' media. The servable match is an exact string comparison
* against scan-time normalized paths, so crafted '..' or '.' segments never
* match; containedRealpath stays as the second layer. Composed pets without
* a manifest file get a synthesized pet.json.
*/
function assetHandler(ctx, registry, caps) {
	const aliases = dirAliases(registry);
	return ((req, res) => {
		if (!guard(ctx, req, res)) return;
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405);
			res.end();
			return;
		}
		let pathname;
		try {
			pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const segments = pathname.split("/").filter((segment) => segment !== "");
		if (segments[0] !== "pet" || segments[1] === void 0) {
			res.writeHead(404);
			res.end();
			return;
		}
		let id;
		try {
			id = decodeURIComponent(segments[1]);
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const entry = registry.byId(id) ?? aliases.get(id);
		if (entry === void 0) {
			res.writeHead(404);
			res.end();
			return;
		}
		const rest = [];
		for (const segment of segments.slice(2)) {
			let decoded;
			try {
				decoded = decodeURIComponent(segment);
			} catch {
				res.writeHead(400);
				res.end();
				return;
			}
			rest.push(decoded);
		}
		const rel = rest.join("/");
		let file;
		let synthesized = false;
		if (rest.length === 1 && rest[0] === MANIFEST_FILE) {
			const manifestFile = join(entry.dir, MANIFEST_FILE);
			file = existsSync(manifestFile) ? manifestFile : void 0;
			if (file === void 0) synthesized = true;
		} else if (rest.length > 0 && entry.servable.includes(rel)) file = join(entry.dir, rel);
		else if (rest.length === 2 && rest[0] === PREVIEW_DIR && PREVIEW_PATTERN.test(rest[1])) {
			const preview = join(entry.dir, PREVIEW_DIR, rest[1]);
			file = existsSync(preview) ? preview : void 0;
		}
		if (synthesized) {
			const body = Buffer.from(JSON.stringify(petEntryView(entry, registry.globalVoice), null, 2), "utf8");
			res.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
				"content-length": String(body.byteLength),
				"cache-control": "no-cache"
			});
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
			return;
		}
		if (file === void 0) {
			res.writeHead(404);
			res.end();
			return;
		}
		const resolved = containedRealpath(entry.dir, file);
		if (resolved === void 0) {
			res.writeHead(403);
			res.end();
			return;
		}
		const cap = rest.length === 1 && rest[0] === MANIFEST_FILE ? caps.manifest : IMAGE_EXTENSIONS.has(extensionOf(rel)) ? caps.image : caps.model;
		try {
			if (statSync(resolved).size > cap) {
				res.writeHead(413);
				res.end();
				return;
			}
		} catch {
			res.writeHead(404);
			res.end();
			return;
		}
		return readFile(resolved).then((body) => {
			res.writeHead(200, {
				"content-type": mimeFor(resolved),
				"content-length": String(body.byteLength),
				"cache-control": "no-cache"
			});
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
		}, () => {
			res.writeHead(404);
			res.end();
		});
	});
}
/** Browser-facing base path of the plugin runtime files (pet-center M3). */
const PET_RUNTIME_PREFIX = "/api/pet/runtime";
/**
* The runtime files the route may serve, by exact name (no slashes, no
* user-controlled path segments, so traversal is structurally impossible):
* the user-supplied Cubism Core from the pet runtime directory (the plugin
* never bundles or downloads it — issue #623 M1 §0) and the plugin-shipped
* MIT vendor bundle from the package lib directory.
*/
const RUNTIME_FILES = {
	"live2dcubismcore.min.js": { root: "runtimeDir" },
	"live2d-vendor.js": { root: "vendorDir" },
	"live2d-vendor.js.map": { root: "vendorDir" }
};
/**
* The runtime handler behind '/api/pet/runtime/<name>'. A missing file
* answers 404 with a JSON marker the client renderer turns into install
* guidance (the Cubism Core is user-supplied, so its absence is a normal
* state, not an error).
*/
function runtimeHandler(ctx, roots) {
	return ((req, res) => {
		if (!guard(ctx, req, res)) return;
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405);
			res.end();
			return;
		}
		let pathname;
		try {
			pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const rest = pathname.slice(16).replace(/^\/+/, "");
		let name;
		try {
			name = decodeURIComponent(rest);
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const spec = RUNTIME_FILES[name];
		if (spec === void 0) {
			res.writeHead(404);
			res.end();
			return;
		}
		const base = spec.root === "runtimeDir" ? roots.runtimeDir : roots.vendorDir;
		const file = join(base, name);
		if (!existsSync(file)) {
			writeJson(res, 404, {
				ok: false,
				error: "runtime-file-missing",
				file: name
			});
			return;
		}
		const resolved = containedRealpath(base, file);
		if (resolved === void 0) {
			res.writeHead(403);
			res.end();
			return;
		}
		try {
			if (statSync(resolved).size > 16777216) {
				res.writeHead(413);
				res.end();
				return;
			}
		} catch {
			res.writeHead(404);
			res.end();
			return;
		}
		return readFile(resolved).then((body) => {
			res.writeHead(200, {
				"content-type": name.endsWith(".map") ? "application/json" : "application/javascript; charset=utf-8",
				"content-length": String(body.byteLength),
				"cache-control": "no-cache"
			});
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
		}, () => {
			res.writeHead(404);
			res.end();
		});
	});
}
/**
* The decoration asset handler behind '/api/pet/decoration/<id>/<file>'
* (pet-center M5, #567). Serves exactly the files a decoration descriptor
* declares — decoration.json and the PNG/WebP strip — by exact allow-list
* match, with realpath containment and the same size ceilings as pet
* assets. Crafted '..' or '.' segments never match the normalized closure.
*/
function decorationHandler(ctx, registry, caps) {
	return (req, res) => {
		if (!guard(ctx, req, res)) return;
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405);
			res.end();
			return;
		}
		let pathname;
		try {
			pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const segments = pathname.split("/").filter((segment) => segment !== "");
		const prefixSegments = DECORATION_ASSET_PREFIX.split("/").filter((segment) => segment !== "");
		if (segments.length < prefixSegments.length + 2) {
			res.writeHead(404);
			res.end();
			return;
		}
		for (let i = 0; i < prefixSegments.length; i += 1) if (segments[i] !== prefixSegments[i]) {
			res.writeHead(404);
			res.end();
			return;
		}
		let id;
		try {
			id = decodeURIComponent(segments[prefixSegments.length]);
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const entry = registry.decorationById?.(id);
		if (entry === void 0) {
			res.writeHead(404);
			res.end();
			return;
		}
		const rest = [];
		for (const segment of segments.slice(prefixSegments.length + 1)) {
			let decoded;
			try {
				decoded = decodeURIComponent(segment);
			} catch {
				res.writeHead(400);
				res.end();
				return;
			}
			rest.push(decoded);
		}
		const rel = rest.join("/");
		if (!entry.servable.includes(rel)) {
			res.writeHead(404);
			res.end();
			return;
		}
		const file = join(entry.dir, rel);
		const resolved = containedRealpath(entry.dir, file);
		if (resolved === void 0) {
			res.writeHead(403);
			res.end();
			return;
		}
		const cap = rel === "decoration.json" ? caps.manifest : caps.image;
		let stat;
		try {
			stat = statSync(resolved);
			if (stat.size > cap) {
				res.writeHead(413);
				res.end();
				return;
			}
		} catch {
			res.writeHead(404);
			res.end();
			return;
		}
		const etag = "\"" + stat.size.toString(16) + "-" + Math.round(stat.mtimeMs).toString(16) + "\"";
		if (req.headers["if-none-match"] === etag) {
			res.writeHead(304, {
				etag,
				"cache-control": "no-cache"
			});
			res.end();
			return;
		}
		readFile(resolved).then((body) => {
			res.writeHead(200, {
				"content-type": mimeFor(resolved),
				"content-length": String(body.byteLength),
				"cache-control": "no-cache",
				etag
			});
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
		}, () => {
			res.writeHead(404);
			res.end();
		});
	};
}
/** Build the full route family (API + assets + runtime) for one service. */
function makePetRoutes(deps) {
	const { service, ctx } = deps;
	const apiRoutes = [
		getRoute(ctx, "/api/pet/state", (req) => {
			const current = new URL(req.url ?? "/", "http://pet.local").searchParams.get("current");
			return service.state(current === null || current === "" ? void 0 : current);
		}),
		getRoute(ctx, "/api/pet/pets", () => service.pets()),
		getRoute(ctx, "/api/pet/diagnostics", () => service.diagnostics()),
		postRoute(ctx, "/api/pet/interact", (body) => {
			const kind = body.kind;
			if (kind !== "pet" && kind !== "feed") return Promise.reject(/* @__PURE__ */ new Error("invalid-kind"));
			return service.interact(kind);
		}),
		postRoute(ctx, "/api/pet/set-visible", (body) => {
			const visible = body.visible;
			if (typeof visible !== "boolean") return Promise.reject(/* @__PURE__ */ new Error("invalid-visible"));
			return service.setVisible(visible);
		}),
		postRoute(ctx, "/api/pet/set-config", (body) => service.setConfig({
			...typeof body.size === "number" ? { size: body.size } : {},
			...typeof body.right === "number" ? { right: body.right } : {},
			...typeof body.bottom === "number" ? { bottom: body.bottom } : {},
			...typeof body.visible === "boolean" ? { visible: body.visible } : {}
		})),
		postRoute(ctx, "/api/pet/set-name", (body) => {
			const name = body.name;
			if (typeof name !== "string") return Promise.reject(/* @__PURE__ */ new Error("invalid-name"));
			return service.setName(name);
		}),
		postRoute(ctx, "/api/pet/set-pet", (body) => {
			const petId = body.petId;
			if (typeof petId !== "string") return Promise.reject(/* @__PURE__ */ new Error("invalid-pet"));
			return service.setPetId(petId);
		}),
		postRoute(ctx, "/api/pet/gameplay/touch", (body) => {
			const zone = body.zone;
			if (zone !== void 0 && typeof zone !== "string") return Promise.reject(/* @__PURE__ */ new Error("invalid-zone"));
			return service.gameplayTouch(zone);
		}),
		postRoute(ctx, "/api/pet/gameplay/mode", (body) => {
			const mode = body.mode;
			if (mode !== null && mode !== "work" && mode !== "sleep") return Promise.reject(/* @__PURE__ */ new Error("invalid-mode"));
			return service.gameplaySetMode(mode);
		}),
		postRoute(ctx, "/api/pet/gameplay/work-tick", () => service.gameplayWorkTick()),
		postRoute(ctx, "/api/pet/gameplay/buy", (body) => {
			const item = body.item;
			if (typeof item !== "string") return Promise.reject(/* @__PURE__ */ new Error("invalid-item"));
			return service.gameplayBuy(item);
		})
	];
	const assetRoute = {
		kind: "prefix",
		path: PET_ASSET_PREFIX,
		handler: assetHandler(ctx, service.registrySnapshot(), deps.assetCaps ?? PET_ASSET_CAPS)
	};
	const runtimeRoute = {
		kind: "prefix",
		path: PET_RUNTIME_PREFIX,
		handler: runtimeHandler(ctx, {
			runtimeDir: deps.runtimeDir ?? join(dshHome(), "pets", ".runtime"),
			vendorDir: deps.vendorDir ?? join(petPackageRoot(import.meta.url), "lib")
		})
	};
	const decorationRoute = {
		kind: "prefix",
		path: DECORATION_ASSET_PREFIX,
		handler: decorationHandler(ctx, service.registrySnapshot(), deps.assetCaps ?? PET_ASSET_CAPS)
	};
	return [
		...apiRoutes,
		assetRoute,
		runtimeRoute,
		decorationRoute
	];
}
//#endregion
//#region src/mount-once.ts
/**
* Host single-instance guard shared by the plugin family. The family bundle
* (dsh-web-all / dsh-skins) namespaces every child row id (web-ui-*), so
* the loader accepts a standalone install of the same package side by side;
* without this guard the second instance would still re-register the same
* webserver routes, tools, settings namespaces, and system-prompt sections
* and fail the boot. mountOnce makes the second host apply a no-op for the
* lifetime of the first instance (the browser half is already deduped by
* package name in the client module host).
*
* The registry rides a global symbol so two module instances of the same
* package (npm copy vs repository link) still share one verdict. cordis
* `ctx.effect` runs its callback immediately and treats the callback's
* return value as the fiber disposer, so the unmarker is returned, not run.
*/
const MOUNTED = Symbol.for("dsh-web.mounted-plugins");
function mountedSet() {
	const registry = globalThis;
	return registry[MOUNTED] ??= /* @__PURE__ */ new Set();
}
/**
* Wrap a cordis plugin apply so the package runs at most once per process.
* The first mount registers normally and unmarks when its fiber disposes;
* any later mount of the same package name is a no-op.
* @param packageName - npm package identity shared by every install source.
* @param fn - the original plugin apply.
* @returns an apply of the same shape.
*/
function mountOnce(packageName, fn) {
	return ((...args) => {
		const mounted = mountedSet();
		if (mounted.has(packageName)) return;
		mounted.add(packageName);
		args[0]?.effect?.(() => () => {
			mounted.delete(packageName);
		});
		return fn(...args);
	});
}
//#endregion
//#region src/index.ts
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
const name = "pet";
/** Services required before the pet can mount its surfaces. */
const inject = ["webServer"];
/**
* Settings section schema: pet selection and display fields the web settings
* surface edits. petId is a plain string on purpose: the service clamps the
* resolved value against the registry, so a stored selection that points at
* a removed pet cannot invalidate the section (a strict union would refuse
* the whole registration). The settings card renders the actual registry
* choices itself from '/api/pet/pets'.
*/
function makePetSettingsSchema(fallbackPetId) {
	return z.object({
		visible: z.boolean().default(true),
		size: z.number().step(1).min(32).max(512).default(160),
		right: z.number().step(1).min(0).max(DISPLAY_INSET_MAX).default(24),
		bottom: z.number().step(1).min(0).max(DISPLAY_INSET_MAX).default(20),
		petId: z.string().default(fallbackPetId),
		enabled: z.boolean().default(true),
		decorationEnabled: z.boolean().default(true)
	});
}
/** Register the pet service and its API + asset routes on the context. */
const apply = mountOnce("@linxin666/dsh-pet", applyImpl);
function applyImpl(ctx, config = {}) {
	const registry = config.registry ?? loadPetRegistry({
		packageRoot: petPackageRoot(import.meta.url),
		...config.pets === void 0 ? {} : { extra: config.pets }
	});
	const service = new PetService(ctx, {
		...config,
		registry
	});
	let current = () => base;
	const base = {
		visible: service.display().visible,
		size: service.display().size,
		right: service.display().right,
		bottom: service.display().bottom,
		petId: service.selectedPetId(),
		enabled: config.enabled ?? true,
		decorationEnabled: config.decorationEnabled ?? true
	};
	const routes = makePetRoutes({
		service,
		ctx
	});
	let disposeRoutes;
	const syncRoutes = () => {
		const enabled = current().enabled ?? true;
		if (disposeRoutes === void 0 && enabled) disposeRoutes = ctx.effect(() => {
			const disposers = routes.map((route) => ctx.webServer.register(route));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "pet: routes");
		else if (disposeRoutes !== void 0 && !enabled) {
			disposeRoutes();
			disposeRoutes = void 0;
		}
	};
	installSettingsSection(ctx, settingsNamespace("pet"), makePetSettingsSchema(service.selectedPetId()), base, {
		setSource: (source) => {
			current = source;
		},
		onChange: () => {
			const section = current();
			service.applySettingsSection(section);
			service.setEnabled(section.enabled ?? true);
			syncRoutes();
		}
	});
	syncRoutes();
}
//#endregion
export { AFFINITY_MAX, AFFINITY_RANKS, BUILTIN_REMARKS, DEFAULT_FRAME_COUNTS, DEFAULT_PET_CELL, DEFAULT_PET_COLUMNS, DEFAULT_PET_ID, DEFAULT_PET_NAME, DEFAULT_PET_ROW_COUNT, DEFAULT_TRACK_PATTERNS, MAX_SESSION_BUBBLES, PET_API_PREFIX, PET_ASSET_PREFIX, PET_NAME_MAX_LENGTH, PET_ROW_ORDER, PetService, PetStateMachine, REMARK_KINDS, REMARK_LINES_MAX, REMARK_LINE_MAX, RemarkPicker, animationForPhase, apply, applyInteraction, applyTurnReward, builtinRemark, codexPetsDir, consumeTreat, defaultDisplayConfig, defaultTreatConfig, emptyAffinity, emptyPersist, emptyTreatLedger, inject, loadPetPersist, loadPetRegistry, makePetRoutes, makePetSettingsSchema, name, normalizePetRemarks, petEntryView, petHomeDir, petPackageRoot, rankOf, resolvePetManifest, rowOf, savePetPersist, settleTreatGrants };
