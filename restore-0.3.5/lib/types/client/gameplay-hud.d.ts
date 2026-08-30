/**
 * Gameplay HUD — the client half of the manifest 'gameplay' block (miku-pet
 * generalization). One component owns everything the block needs: the stat
 * bars and shop card (menu / shop pages), the touch-zone tap
 * handling, the idle director rolls, the work and sleep loops, and the
 * float-text toasts. It talks to the host through the injected verb API,
 * writes results straight back into the store (the 2 s poll stays the
 * backstop), and steers the frames2d renderer through the per-pet bus.
 * @module @linxin666/dsh-pet/client/GameplayHud
 */
import { type ReactElement } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PetDefinition } from '../registry.ts';
import type { PetGameplayVerbResult } from '../service.ts';
import type { PetStoreInstance } from './pet-store.ts';
import type { DragStream } from './drag-stream.ts';
import type { NS } from './locales.ts';
/** The gameplay verb API the plugin apply body injects (host-authoritative). */
export interface GameplayApi {
    touch: (zone?: string) => Promise<PetGameplayVerbResult>;
    setMode: (mode: 'work' | 'sleep' | null) => Promise<PetGameplayVerbResult>;
    workTick: () => Promise<PetGameplayVerbResult>;
    buy: (item: string) => Promise<PetGameplayVerbResult>;
}
/**
 * The per-pet coordination bus. The frames2d visual mount registers the
 * track override (setTrack); the HUD registers the sprite tap handler; the
 * chrome calls into whatever is registered. Optional chaining everywhere —
 * either side may be mid-remount during a hot reload.
 */
export interface GameplayBus {
    setTrack?: (track?: string) => void;
    tap?: (fx: number, fy: number) => void;
    /**
     * Card open/close request from the chrome (the hover panel's 玩法 action):
     * the HUD registers this, and calling it with no argument toggles the card
     * while a boolean pins the state (same chrome -> HUD direction as tap).
     */
    openCard?: (open?: boolean) => void;
}
/** The gameplay overlay for one frames2d pet that declares 'gameplay'. */
export declare function GameplayHud(props: {
    definition: PetDefinition;
    store: PetStoreInstance;
    api: GameplayApi;
    bus: GameplayBus;
    drag: DragStream;
    t: PropsLocale<typeof NS>['t'];
}): ReactElement | null;
//# sourceMappingURL=gameplay-hud.d.ts.map