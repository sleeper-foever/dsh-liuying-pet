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
import { Service } from '@deepseek-ai/cordis';
import { emptyProjectionRuntime, isActivityPhase, projectOfficialEvent, } from "./event-projection.js";
import { PetLedger } from "./ledger.js";
import { DEFAULT_PET_NAME, DISPLAY_INSET_MAX, DISPLAY_SIZE_MAX, DISPLAY_SIZE_MIN, PET_NAME_MAX_LENGTH, loadPetPersist, petHomeDir, savePetPersist, } from "./persist.js";
import { DEFAULT_DECORATION_ID, decorationView, loadPetRegistry, petEntryView, petPackageRoot, } from "./registry.js";
import { WHISPER_TTL_MS } from "./chatter.js";
import { mergeVoicePacks } from "./voice-pack.js";
import { defaultPetStateConfig, PetStateMachine, } from "./state.js";
import { applyGameplayEffects, drawLotteryTier, initialGameplayState, rollTouchBranch, rollWorkOutcome, settleGameplay, } from "./gameplay.js";
/** The unified gameplay currency: the shared treat (小鱼干) ledger. */
const GAMEPLAY_TREATS_CURRENCY = 'treats';
/** Settings namespace of the pet capability. Spelled here rather than imported: the browser half spells the same value. */
export const PET_SETTINGS_NAMESPACE = 'pet';
/** Hard cap on simultaneously displayed session bubbles (most recent first). */
export const MAX_SESSION_BUBBLES = 12;
/**
 * Cordis service exposing the pet RPC domain. Lazy: nothing is scanned or
 * written until an economic event or interaction arrives; event listeners
 * update only in-memory state, and persistence happens on economic changes
 * (turn rewards, feeds, config/name changes) — never on a read.
 */
export class PetService extends Service {
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
    sessionActivity = new Map();
    /**
     * Sessions whose reward source is the official event stream. This metadata
     * outlives transient visual resets so a derived legacy `done` cannot reward
     * the same turn again after the pet is disabled and re-enabled.
     */
    officialEventSessions = new WeakSet();
    constructor(ctx, config = {}) {
        super(ctx, 'pet');
        this.persistDir = config.persistDir ?? petHomeDir();
        this.registry = config.registry
            ?? loadPetRegistry({
                packageRoot: petPackageRoot(import.meta.url),
                ...(config.pets === undefined ? {} : { extra: config.pets }),
            });
        if (this.registry.entries.length === 0) {
            throw new Error('[dsh-pet] no valid pet manifests found; nothing to render');
        }
        let persist = loadPetPersist(this.persistDir);
        if (this.registry.byId(persist.petId) === undefined) {
            // The selected pet no longer exists (removed or a fresh install with a
            // copied pet.json): fall back to the registry default.
            persist = { ...persist, petId: this.registry.defaultEntry().id };
        }
        const selected = this.registry.byId(persist.petId) ?? this.registry.defaultEntry();
        const ledgerConfig = {
            affinity: config.affinity,
            treats: config.treats,
            remarks: selected.remarks,
        };
        this.ledger = new PetLedger(persist, ledgerConfig);
        this.stateConfig = { ...defaultPetStateConfig, ...(config.state ?? {}) };
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
            if (this.voiceCache !== undefined && this.voiceCache.petId === entry.id) {
                return this.voiceCache.overrides;
            }
            const overrides = mergeVoicePacks(this.registry.globalVoice, entry.voice)?.overrides ?? {};
            this.voiceCache = { petId: entry.id, overrides };
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
        return this.registry.entries.map(entry => petEntryView(entry, this.registry.globalVoice));
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
        if (!this.decorationEnabled)
            return undefined;
        const entry = this.registry.decorationById?.(DEFAULT_DECORATION_ID);
        return entry === undefined ? undefined : decorationView(entry);
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
        if (stored !== undefined && stored.trim() !== '')
            return stored;
        return this.registry.byId(petId)?.displayName ?? DEFAULT_PET_NAME;
    }
    /** RPC: switch the selected pet (persisted, settings document mirrored). */
    async setPetId(petId) {
        const entry = this.registry.byId(petId);
        if (entry === undefined)
            return { ok: false, error: 'unknown-pet' };
        this.ledger.setPetId(entry.id);
        this.ledger.setRemarks(entry.remarks);
        this.flush();
        this.syncSettingsFromPet();
        return { ok: true, petId: entry.id };
    }
    /** Start or stop the session-activity listeners that drive the pet. */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.syncActivity();
        if (!enabled)
            this.resetActivity();
    }
    syncActivity() {
        if (this.disposeActivity !== undefined) {
            this.disposeActivity();
            this.disposeActivity = undefined;
        }
        if (!this.enabled)
            return;
        this.disposeActivity = (() => {
            const disposers = [
                this.ctx.on('session/event', (session, event) => {
                    const runtime = this.activityOf(session).runtime;
                    // `activity/status` is an optional compatibility input. It is not
                    // declared as a durable event type by this package because current
                    // Harness installations publish the official session vocabulary.
                    if (event.type === 'activity/status') {
                        const payload = (event.data ?? {});
                        if (typeof payload.phase !== 'string' || !isActivityPhase(payload.phase))
                            return;
                        this.applyActivity(session, {
                            phase: payload.phase,
                            ...(typeof payload.line === 'string' ? { line: payload.line } : {}),
                            ...(typeof payload.phrase === 'string' ? { phrase: payload.phrase } : {}),
                        });
                        // On a legacy-only stream the compatibility event owns turn
                        // rewards. Once any official activity is observed, turn/end owns
                        // them and a derived legacy `done` cannot double-count.
                        if (payload.phase === 'done' && !runtime.officialEventsSeen) {
                            this.rewardLegacyTurn();
                        }
                        return;
                    }
                    const transition = projectOfficialEvent(event, runtime);
                    if (transition === undefined)
                        return;
                    runtime.officialEventsSeen = true;
                    this.officialEventSessions.add(session);
                    this.applyActivity(session, transition.input, transition.whisper);
                    if (transition.completedTurn !== undefined) {
                        this.rewardTurn(String(session.id), transition.completedTurn);
                    }
                }),
                this.ctx.on('session/disposed', (session) => {
                    this.ledger.forgetSession(String(session.id));
                    this.officialEventSessions.delete(session);
                    this.sessionActivity.delete(session);
                    if (session !== this.displaySession)
                        return;
                    // The display session is gone: fall back to the most recent
                    // remaining session's last input, or settle to idle when none.
                    this.displaySession = undefined;
                    const remaining = [...this.sessionActivity.entries()].at(-1);
                    if (remaining !== undefined) {
                        const [nextSession, activity] = remaining;
                        this.displaySession = nextSession;
                        if (activity.lastInput !== undefined)
                            this.machine.onActivityStatus(activity.lastInput);
                        this.machine.onSessionActive();
                    }
                    else {
                        this.machine.onSessionDisposed();
                    }
                }),
            ];
            return () => { for (const dispose of disposers)
                dispose(); };
        })();
    }
    /** Drop transient activity because terminal events missed while disabled cannot be replayed safely. */
    resetActivity() {
        this.displaySession = undefined;
        this.sessionActivity.clear();
        this.machine.onSessionDisposed();
    }
    /** Return the per-session activity record, creating it on first sight. */
    activityOf(session) {
        let activity = this.sessionActivity.get(session);
        if (activity === undefined) {
            const runtime = emptyProjectionRuntime(this.voicePools());
            runtime.officialEventsSeen = this.officialEventSessions.has(session);
            activity = {
                runtime,
                machine: new PetStateMachine(this.stateConfig),
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
        if (whisper !== undefined)
            activity.whisper = { text: whisper, at: Date.now() };
        activity.machine.onActivityStatus(input);
        activity.machine.onSessionActive();
        // Move to the tail so map order reads most-recent-last, then trim the
        // oldest session states beyond the bubble cap. The display session is
        // reassigned below, so trimming its stale predecessor is safe.
        this.sessionActivity.delete(session);
        this.sessionActivity.set(session, activity);
        while (this.sessionActivity.size > MAX_SESSION_BUBBLES) {
            const oldest = this.sessionActivity.keys().next().value;
            if (oldest === undefined)
                break;
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
        if (this.ledger.takeDirty())
            this.flush();
        return result;
    }
    /* ---------------------------------------------------------------- *
     * Gameplay verbs (miku-pet generalization). The manifest block lives
     * on the registry entry; dynamic state persists per pet id. Verbs
     * settle and persist; the state view projects without writing.
     * ---------------------------------------------------------------- */
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
            state: stored === undefined
                ? initialGameplayState(def, now)
                : { stats: { ...stored.stats }, currencies: { ...stored.currencies }, mode: stored.mode, settledAt: stored.settledAt },
        };
    }
    /** Display view of one gameplay state (rounded stats; treats ride the shared treat ledger). */
    gameplayViewOf(state) {
        const stats = {};
        for (const [name, value] of Object.entries(state.stats))
            stats[name] = Math.round(value);
        return { stats, mode: state.mode };
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
        if (pending > 0)
            this.ledger.grantTreats(pending);
    }
    /** Persist the mutated gameplay state of one verb call. */
    commitGameplay(petId, state) {
        this.ledger.setGameplay(petId, state);
        if (this.ledger.takeDirty())
            this.flush();
    }
    /**
     * RPC: a touch on the pet. 'zone' names a touch zone (roll a branch);
     * omitted means a plain click while a touch animation holds (clickBoost).
     */
    async gameplayTouch(zone) {
        const def = this.gameplayDef();
        if (def === undefined)
            return { ok: false, error: 'no-gameplay' };
        const now = Date.now();
        const { petId, state } = this.gameplayState(def, now);
        settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
        if (zone === undefined) {
            const boost = def.touch?.clickBoost;
            if (boost === undefined)
                return { ok: false, error: 'no-touch' };
            const amount = boost.min + Math.floor(Math.random() * (boost.max - boost.min + 1));
            if (amount > 0)
                applyGameplayEffects(state, def, [{ stat: boost.stat, amount }]);
            this.drainGameplayTreats(state);
            this.commitGameplay(petId, state);
            return { ok: true, hit: false, view: this.gameplayViewOf(state) };
        }
        const target = def.touch?.zones.find(entry => entry.name === zone);
        if (target === undefined)
            return { ok: false, error: 'unknown-zone' };
        const branch = rollTouchBranch(target, Math.random);
        if (branch === undefined) {
            this.drainGameplayTreats(state);
            this.commitGameplay(petId, state);
            return { ok: true, hit: false, view: this.gameplayViewOf(state) };
        }
        if (branch.effects !== undefined)
            applyGameplayEffects(state, def, branch.effects);
        const phrase = branch.phrases !== undefined && branch.phrases.length > 0
            ? branch.phrases[Math.floor(Math.random() * branch.phrases.length)]
            : undefined;
        this.drainGameplayTreats(state);
        this.commitGameplay(petId, state);
        return {
            ok: true,
            hit: true,
            ...(branch.state === undefined ? {} : { state: branch.state }),
            ...(branch.stateMs === undefined ? {} : { stateMs: branch.stateMs }),
            ...(phrase === undefined ? {} : { phrase }),
            view: this.gameplayViewOf(state),
        };
    }
    /** RPC: enter or leave a gameplay mode ('work' | 'sleep' | null). */
    async gameplaySetMode(mode) {
        const def = this.gameplayDef();
        if (def === undefined)
            return { ok: false, error: 'no-gameplay' };
        if (mode === 'work' && def.work === undefined)
            return { ok: false, error: 'no-work' };
        if (mode === 'sleep' && def.sleep === undefined)
            return { ok: false, error: 'no-sleep' };
        const now = Date.now();
        const { petId, state } = this.gameplayState(def, now);
        settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
        state.mode = mode;
        this.drainGameplayTreats(state);
        this.commitGameplay(petId, state);
        return { ok: true, view: this.gameplayViewOf(state) };
    }
    /** RPC: one work-round adjudication (only while the work mode holds). */
    async gameplayWorkTick() {
        const def = this.gameplayDef();
        if (def?.work === undefined)
            return { ok: false, error: 'no-work' };
        const now = Date.now();
        const { petId, state } = this.gameplayState(def, now);
        if (state.mode !== 'work')
            return { ok: false, error: 'not-working' };
        settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
        const outcome = rollWorkOutcome(def.work, Math.random);
        const effects = outcome === 'success' ? def.work.success?.effects : def.work.fail?.effects;
        if (effects !== undefined)
            applyGameplayEffects(state, def, effects);
        this.drainGameplayTreats(state);
        this.commitGameplay(petId, state);
        return { ok: true, outcome, view: this.gameplayViewOf(state) };
    }
    /** RPC: buy one shop item (effects, currency swap, or a lottery draw). */
    async gameplayBuy(itemId) {
        const def = this.gameplayDef();
        if (def === undefined)
            return { ok: false, error: 'no-gameplay' };
        const item = def.shop?.items.find(entry => entry.id === itemId);
        if (item === undefined)
            return { ok: false, error: 'unknown-item' };
        const now = Date.now();
        const { petId, state } = this.gameplayState(def, now);
        settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
        // The unified currency is the shared treat ledger (wallet removed): shop
        // prices and prizes ride the same balance the panel shows and feeding
        // consumes, capped by the stock cap.
        const treats = item.currency === GAMEPLAY_TREATS_CURRENCY;
        const balance = treats ? this.ledger.snapshot.treats.treats : (state.currencies[item.currency] ?? 0);
        if (balance < item.price) {
            return { ok: false, error: 'insufficient-funds', view: this.gameplayViewOf(state) };
        }
        if (treats)
            this.ledger.spendTreats(item.price);
        else
            state.currencies[item.currency] = balance - item.price;
        if (item.effects !== undefined)
            applyGameplayEffects(state, def, item.effects);
        let prize;
        if (item.lottery !== undefined) {
            if (item.lottery.effects !== undefined)
                applyGameplayEffects(state, def, item.lottery.effects);
            const tier = drawLotteryTier(item.lottery, Math.random);
            const prizeCurrency = tier.currency ?? item.lottery.currency ?? item.currency;
            if (prizeCurrency === GAMEPLAY_TREATS_CURRENCY)
                this.ledger.grantTreats(tier.prize);
            else
                state.currencies[prizeCurrency] = (state.currencies[prizeCurrency] ?? 0) + tier.prize;
            prize = { amount: tier.prize, currency: prizeCurrency };
        }
        this.drainGameplayTreats(state);
        this.commitGameplay(petId, state);
        return { ok: true, ...(prize === undefined ? {} : { prize }), view: this.gameplayViewOf(state) };
    }
    /** RPC: show or hide the pet. */
    async setVisible(visible) {
        this.ledger.setDisplay({ ...this.ledger.snapshot.display, visible });
        this.flush();
        this.syncSettingsFromPet();
        return { ok: true, display: this.ledger.snapshot.display };
    }
    /** RPC: update display config (size / position). Values are clamped to whole pixels. */
    async setConfig(patch) {
        const next = { ...this.ledger.snapshot.display, ...patch };
        next.size = Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, next.size)));
        next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.right)));
        next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.bottom)));
        this.ledger.setDisplay(next);
        this.flush();
        this.syncSettingsFromPet();
        return { ok: true, display: this.ledger.snapshot.display };
    }
    /** RPC: rename the selected pet (trimmed, 1–20 chars, per-pet storage). */
    async setName(name) {
        const trimmed = name.trim();
        if (trimmed === '')
            return { ok: false, error: 'name-empty' };
        if (trimmed.length > PET_NAME_MAX_LENGTH)
            return { ok: false, error: 'name-too-long' };
        this.ledger.setPetName(this.selectedPetId(), trimmed);
        this.flush();
        return { ok: true, name: trimmed };
    }
    /**
     * Apply a committed settings section to the persisted selection and display
     * config. Called by the settings surface on every change; values are
     * clamped exactly like the setConfig RPC so both write paths converge.
     * @param section - the resolved settings section.
     */
    applySettingsSection(section) {
        this.decorationEnabled = section.decorationEnabled ?? true;
        const selected = typeof section.petId === 'string' ? this.registry.byId(section.petId) : undefined;
        if (selected !== undefined) {
            this.ledger.setPetId(selected.id);
            this.ledger.setRemarks(selected.remarks);
        }
        else if (section.petId !== undefined) {
            // The stored selection names a pet the registry no longer has: keep the
            // current selection and repair the settings document.
            this.syncSettingsFromPet();
        }
        const next = { ...this.ledger.snapshot.display };
        next.visible = section.visible && (section.enabled ?? true);
        next.size = Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, section.size)));
        next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.right)));
        next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.bottom)));
        this.ledger.setDisplay(next);
        this.flush();
    }
    /** Mirror the persisted display config into the settings document (best-effort). */
    syncSettingsFromPet() {
        const settings = this.ctx.get('settings', false);
        if (settings === undefined)
            return;
        const snapshot = this.ledger.snapshot;
        void settings.update(PET_SETTINGS_NAMESPACE, {
            visible: snapshot.display.visible,
            size: snapshot.display.size,
            right: snapshot.display.right,
            bottom: snapshot.display.bottom,
            petId: snapshot.petId,
        }).catch(() => {
            // A settings write failure must not break the pet's own persistence.
        });
    }
    /** Award the turn reward once per completed turn (idempotent per session + turn). */
    rewardTurn(sessionId, turn) {
        if (this.ledger.rewardTurn(sessionId, turn, Date.now()))
            this.flush();
    }
    /** Preserve turn rewards for installations that only emit legacy activity. */
    rewardLegacyTurn() {
        if (this.ledger.rewardLegacyTurn(Date.now()))
            this.flush();
    }
    view(currentSessionId) {
        const snapshot = this.machine.render();
        const entry = this.activeEntry();
        // One bubble per concurrently active TOP-LEVEL session. The GUI's current
        // session leads the stack when reported (the browser half passes its
        // session list's 'current'); everything else keeps the most recent
        // meaningful event order. Subagent children render no bubble of their own
        // (their activity already shows through the spawning conversation's
        // bubble/display, and the bubble buttons navigate to GUI sessions, which
        // subagents are not). Sessions whose own machine has settled (no bubble
        // copy) drop out, so a finished turn does not leave a stale bubble behind.
        const sessions = [];
        for (const [session, activity] of [...this.sessionActivity.entries()].reverse()) {
            if (sessions.length >= MAX_SESSION_BUBBLES)
                break;
            if (session.header?.origin === 'subagent')
                continue;
            const perSession = activity.machine.render();
            if (perSession.bubble === undefined)
                continue;
            // Each session's whisper rides its own bubble while fresh; an expired
            // whisper simply stops appearing (the client's 2 s poll drops it).
            const whisper = activity.whisper;
            const freshWhisper = whisper !== undefined && Date.now() - whisper.at < WHISPER_TTL_MS
                ? whisper.text
                : undefined;
            sessions.push({
                sessionId: String(session.id),
                animation: perSession.animation,
                bubble: perSession.bubble,
                phase: perSession.phase,
                ...(freshWhisper === undefined ? {} : { whisper: freshWhisper }),
            });
        }
        // The browser half reports the session the user is currently on; that
        // session's bubble leads the stack (its whisper then speaks on the
        // collapsed single bubble). An unreported or absent session keeps the
        // legacy most-recent-first order.
        if (currentSessionId !== undefined) {
            const index = sessions.findIndex(session => session.sessionId === currentSessionId);
            if (index > 0)
                sessions.unshift(sessions.splice(index, 1)[0]);
        }
        const decoration = this.activeDecoration();
        // Gameplay view: a read-only projection. The settle runs on a copy, so
        // polling never writes pet.json (verbs settle and persist).
        const gameplayDef = this.gameplayDef();
        let gameplay;
        if (gameplayDef !== undefined) {
            const { state } = this.gameplayState(gameplayDef, Date.now());
            settleGameplay(state, gameplayDef, Date.now(), { sessionActive: snapshot.sessionActive });
            gameplay = this.gameplayViewOf(state);
        }
        // Read-only: the ledger settles on economic events only, never on a read,
        // so polling the state cannot trigger pet.json writes.
        return {
            animation: snapshot.animation,
            ...(snapshot.bubble === undefined ? {} : { bubble: snapshot.bubble }),
            phase: snapshot.phase,
            sessionActive: snapshot.sessionActive,
            sessions,
            ...(decoration === undefined ? {} : { decoration }),
            affinity: this.ledger.affinityView(Date.now()),
            display: { ...this.ledger.snapshot.display },
            pet: {
                id: entry.id,
                displayName: entry.displayName,
                description: entry.description,
            },
            name: this.petName(),
            treats: {
                stocked: this.ledger.snapshot.treats.treats,
                max: this.ledger.treatMax,
            },
            ...(gameplay === undefined ? {} : { gameplay }),
        };
    }
    flush() {
        try {
            savePetPersist(this.ledger.snapshot, this.persistDir);
        }
        catch {
            // Persistence is best-effort; the in-memory ledger keeps working.
        }
    }
}
