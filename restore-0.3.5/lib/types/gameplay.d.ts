/**
 * Pet gameplay — the optional manifest 'gameplay' block and its host engine.
 * The block layers an opt-in mini-game over any frames2d pet: decaying stat
 * bars, currencies, a weighted idle director, touch zones, a work loop, a
 * sleep loop, passive income and a shop (issue: miku-pet generalization).
 *
 * Discipline split matches manifest-v2: STRUCTURE is fail-closed (types,
 * ranges, references into stats/tracks); the host engine is pure — every
 * verb takes an explicit clock and rng so tests stay deterministic. Decay,
 * passive income and sleep restore are lazy-settled on read (the treats.ts
 * discipline): the host runs no timers for gameplay.
 * @module @linxin666/dsh-pet/gameplay
 */
/** One gameplay effect: add amount to a declared stat or a currency. */
export interface PetGameplayEffect {
    stat?: string;
    currency?: string;
    amount: number;
}
/** One roll branch inside a touch zone; uncovered roll mass is a no-op. */
export interface PetGameplayTouchBranch {
    probability: number;
    effects?: PetGameplayEffect[];
    /** Track played on hit (held for stateMs, then the renderer settles). */
    state?: string;
    stateMs?: number;
    /** Bubble phrase pool; one is picked on hit. */
    phrases?: string[];
}
export interface PetGameplayTouchZone {
    name: string;
    /** Vertical slice of the hit box (fractions, y0 < y1). */
    y0: number;
    y1: number;
    branches: PetGameplayTouchBranch[];
}
export interface PetGameplayStatDef {
    max: number;
    initial?: number;
    decayPerMinute?: number;
    /** Decay rate while the work mode is active (defaults to decayPerMinute). */
    workingDecayPerMinute?: number;
    /** Extra decay rate while no session is active. */
    idleDecayPerMinute?: number;
}
export interface PetGameplayShopItem {
    id: string;
    label: string;
    /** Optional frame path (manifest-relative) shown as the item icon. */
    image?: string;
    price: number;
    currency: string;
    effects?: PetGameplayEffect[];
    lottery?: {
        effects?: PetGameplayEffect[];
        /** Default currency the prize is paid in (tiers may override). */
        currency?: string;
        tiers: {
            probability: number;
            prize: number;
            currency?: string;
        }[];
    };
}
/** The validated manifest 'gameplay' block. */
export interface PetGameplayManifest {
    idleDirector?: {
        intervalMs: number;
        maxMiss: number;
        idleWeight: number;
        acts: {
            track: string;
            weight: number;
            phrases?: string[];
        }[];
    };
    stats?: Record<string, PetGameplayStatDef>;
    /** Click hit box inside the sprite box (fractions). */
    hitBox?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    touch?: {
        zones: PetGameplayTouchZone[];
        /** Plain-click effect while a touch animation holds (miku: mood +0..3). */
        clickBoost?: {
            stat: string;
            min: number;
            max: number;
        };
    };
    work?: {
        state: string;
        successState: string;
        failState: string;
        tickMs: number;
        /** Hold time of the result track before the next round. */
        resultMs?: {
            success: number;
            fail: number;
        };
        successProbability: number;
        success?: {
            effects: PetGameplayEffect[];
        };
        fail?: {
            effects: PetGameplayEffect[];
        };
    };
    sleep?: {
        state: string;
        wakeState?: string;
        restore: {
            stat: string;
            amount: number;
            intervalMs: number;
        };
    };
    passiveIncome?: {
        currency: string;
        amount: number;
        intervalMs: number;
    };
    shop?: {
        state?: string;
        items: PetGameplayShopItem[];
    };
    /** Track played while the chrome reports dragging (default 'drag'). */
    dragState?: string;
    /** Track played once when a drag ends (miku: standup), before settling. */
    dragEndState?: string;
}
export interface GameplayParseHooks {
    /** State names the renderer can play (frames2d track ids). */
    stateNames: ReadonlySet<string>;
    error: (message: string) => void;
}
/**
 * Validate the manifest 'gameplay' block (fail-closed). Only frames2d pets
 * may declare gameplay today: every state reference checks against the
 * declared track names.
 */
export declare function parseGameplayManifest(raw: unknown, hooks: GameplayParseHooks): PetGameplayManifest | undefined;
/** Persisted per-pet gameplay state (pet.json 'gameplay' map values). */
export interface PetGameplayState {
    stats: Record<string, number>;
    currencies: Record<string, number>;
    mode: 'work' | 'sleep' | null;
    /** Epoch ms of the last lazy settle. */
    settledAt: number;
}
/** Fresh state for one pet: stats at their initial (default max), no currency. */
export declare function initialGameplayState(manifest: PetGameplayManifest, now: number): PetGameplayState;
/** Clamp one stat value into [0, max]; currencies into [0, CURRENCY_MAX]. */
export declare function clampGameplay(state: PetGameplayState, manifest: PetGameplayManifest): void;
/**
 * Lazy settle: apply stat decay, passive income and sleep restore for the
 * elapsed wall time since the last settle. Mirrors the treats.ts discipline
 * (no host timers; read paths settle). Returns whether anything changed.
 */
export declare function settleGameplay(state: PetGameplayState, manifest: PetGameplayManifest, now: number, options: {
    sessionActive: boolean;
}): boolean;
/** Apply one effect vector (touch/work/shop), clamped. */
export declare function applyGameplayEffects(state: PetGameplayState, manifest: PetGameplayManifest, effects: readonly PetGameplayEffect[]): void;
/** Roll one touch zone branch; undefined when the roll lands in no-op mass. */
export declare function rollTouchBranch(zone: PetGameplayTouchZone, rng: () => number): PetGameplayTouchBranch | undefined;
/** Roll one work tick outcome. */
export declare function rollWorkOutcome(work: NonNullable<PetGameplayManifest['work']>, rng: () => number): 'success' | 'fail';
/** Draw one lottery prize tier; uncovered mass falls through to the last tier. */
export declare function drawLotteryTier(lottery: NonNullable<PetGameplayShopItem['lottery']>, rng: () => number): {
    probability: number;
    prize: number;
    currency?: string;
};
/** The zone one normalized hit-box point lands in, if any. */
export declare function touchZoneAt(touch: {
    zones: PetGameplayTouchZone[];
}, yFraction: number): PetGameplayTouchZone | undefined;
//# sourceMappingURL=gameplay.d.ts.map