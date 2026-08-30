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
import { PET_RENDERER_API_VERSION } from "../../contracts/renderer.js";
/** Stall watchdog period: a looping track stuck longer re-kicks its chain. */
const WATCHDOG_MS = 1200;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Fail-closed client-side validation of the served frames2d block. */
function validateFrames2dConfig(config) {
    if (!isRecord(config) || !isRecord(config.tracks) || !isRecord(config.phases)) {
        throw new Error('frames2d config requires tracks and phases objects');
    }
    const tracks = {};
    for (const [name, raw] of Object.entries(config.tracks)) {
        if (!isRecord(raw) || !Array.isArray(raw.frames) || raw.frames.length === 0
            || raw.frames.some(f => typeof f !== 'string' || f === '')
            || !Array.isArray(raw.durations) || raw.durations.length !== raw.frames.length
            || raw.durations.some(d => typeof d !== 'number' || !(d > 0))) {
            throw new Error('frames2d track ' + JSON.stringify(name) + ' needs same-length frames/durations');
        }
        tracks[name] = {
            frames: raw.frames,
            durations: raw.durations,
            loop: raw.loop !== false,
            ...(typeof raw.fallback === 'string' ? { fallback: raw.fallback } : {}),
        };
    }
    const phases = config.phases;
    if (typeof phases.idle !== 'string' || tracks[phases.idle] === undefined) {
        throw new Error('frames2d phases.idle must name an existing track');
    }
    return { tracks, phases: phases };
}
export const frames2dRenderer = {
    id: 'frames2d',
    apiVersion: PET_RENDERER_API_VERSION,
    validateConfig: validateFrames2dConfig,
    mount(ctx, config) {
        const reducedMotion = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const img = document.createElement('img');
        img.dataset.dshPetFrames2d = ctx.petId;
        img.alt = '';
        img.draggable = false;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        ctx.container.appendChild(img);
        // Warm the browser cache for every frame up front (same-origin, small
        // webp files); playback itself swaps img.src without React state.
        for (const track of Object.values(config.tracks)) {
            for (const url of track.frames) {
                const pre = new Image();
                pre.src = url;
            }
        }
        let disposed = false;
        let timer;
        let watchdog;
        let track = config.phases.idle;
        let frameIndex = 0;
        let lastAdvance = Date.now();
        let override;
        const trackForPhase = (phase) => {
            const mapped = config.phases[phase];
            return mapped !== undefined && config.tracks[mapped] !== undefined ? mapped : config.phases.idle;
        };
        const show = (trackId, index) => {
            const def = config.tracks[trackId];
            const url = def?.frames[index];
            if (url !== undefined && img.getAttribute('src') !== url)
                img.src = url;
        };
        const schedule = (ms) => {
            if (disposed)
                return;
            timer = setTimeout(tick, ms);
        };
        function tick() {
            if (disposed)
                return;
            const def = config.tracks[track];
            if (def === undefined || def.frames.length === 0)
                return;
            lastAdvance = Date.now();
            const next = frameIndex + 1;
            if (next < def.frames.length) {
                frameIndex = next;
                show(track, frameIndex);
                schedule(def.durations[frameIndex] ?? 200);
                return;
            }
            if (def.loop) {
                frameIndex = 0;
                show(track, frameIndex);
                schedule(def.durations[frameIndex] ?? 200);
                return;
            }
            // Non-loop completion: settle into the fallback; when the fallback is
            // what the phase map would play anyway, release the gameplay override.
            const target = def.fallback !== undefined && config.tracks[def.fallback] !== undefined
                ? def.fallback
                : config.phases.idle;
            if (target === trackForPhase(ctx.phase.get()))
                override = undefined;
            play(target);
        }
        function play(trackId) {
            if (disposed)
                return;
            if (config.tracks[trackId] === undefined)
                trackId = config.phases.idle;
            if (timer !== undefined)
                clearTimeout(timer);
            track = trackId;
            frameIndex = 0;
            lastAdvance = Date.now();
            show(track, frameIndex);
            if (reducedMotion)
                return;
            const def = config.tracks[track];
            schedule(def.durations[0] ?? 200);
        }
        const unsubscribe = ctx.phase.subscribe((phase) => {
            if (override !== undefined)
                return;
            const target = trackForPhase(phase);
            if (target !== track)
                play(target);
        });
        // Watchdog: a throttled-away timer (background tab) leaves the chain
        // dead; re-kick when a looping track has not advanced on schedule.
        if (!reducedMotion) {
            watchdog = setInterval(() => {
                if (disposed)
                    return;
                const def = config.tracks[track];
                if (def === undefined || !def.loop)
                    return;
                const expected = (def.durations[frameIndex] ?? 200) + WATCHDOG_MS;
                if (Date.now() - lastAdvance > expected)
                    tick();
            }, WATCHDOG_MS);
        }
        play(track);
        let disposedOnce = false;
        const dispose = () => {
            if (disposedOnce)
                return;
            disposedOnce = true;
            disposed = true;
            unsubscribe();
            if (timer !== undefined)
                clearTimeout(timer);
            if (watchdog !== undefined)
                clearInterval(watchdog);
            img.remove();
        };
        ctx.onCleanup(dispose);
        return {
            dispose,
            setState(next) {
                if (disposed)
                    return;
                if (next === undefined) {
                    override = undefined;
                    const target = trackForPhase(ctx.phase.get());
                    if (target !== track)
                        play(target);
                    return;
                }
                if (config.tracks[next] === undefined)
                    return;
                override = next;
                if (next !== track)
                    play(next);
            },
            currentTrack() {
                return track;
            },
        };
    },
};
