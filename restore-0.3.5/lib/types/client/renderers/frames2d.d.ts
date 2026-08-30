/**
 * frames2d renderer — plays the free-form named frame-sequence tracks of a
 * frames2d pet (manifest v2 'frames2d' block). The pet center picks the
 * track from the ActivityPhase stream (phase -> track map, idle fallback);
 * the gameplay driver may force a track through the handle's setState
 * override (drag/work/sleep/shop...), and a finished non-loop track settles
 * into its fallback, releasing the override when the fallback matches the
 * phase-mapped track. Rendering never throws: a broken track list degrades
 * to the first decodable frame, and the 1.2 s stall watchdog re-kicks the
 * playback chain after timer throttling.
 * @module @linxin666/dsh-pet/client/renderers/frames2d
 */
import { type PetRenderer, type PetRendererHandle } from '../../contracts/renderer.ts';
import type { ActivityPhase } from '../../state.ts';
/** One track as served inside the pet definition (browser URLs). */
export interface Frames2dTrackConfig {
    frames: string[];
    durations: number[];
    loop: boolean;
    fallback?: string;
}
/** The frames2d block as served inside the pet definition. */
export interface PetFrames2dConfig {
    tracks: Record<string, Frames2dTrackConfig>;
    phases: Partial<Record<ActivityPhase, string>> & {
        idle: string;
    };
}
export interface Frames2dRendererHandle extends PetRendererHandle {
    /** Force a track id (gameplay override); undefined returns to phase mapping. */
    setState(track: string | undefined): void;
    /** The track currently playing (diagnostics and tests). */
    currentTrack(): string;
}
export declare const frames2dRenderer: PetRenderer<PetFrames2dConfig>;
//# sourceMappingURL=frames2d.d.ts.map