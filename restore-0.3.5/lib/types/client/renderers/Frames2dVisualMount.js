import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Frames2d visual mount — the React bridge between the pet center chrome
 * and the imperative frames2d renderer, mirroring the live2d mount. The
 * bridge owns the contract context (asset base, phase stream, interaction
 * write-back, activation cleanups), feeds the polled phase into the stream,
 * forwards the chrome's drag gesture onto the conventional 'drag' track
 * (when the pet declares one), and renders the localized fallback card when
 * the served config is invalid.
 * @module @linxin666/dsh-pet/client/renderers/Frames2dVisualMount
 */
import { useEffect, useRef, useState } from 'react';
import { createPhaseStream } from "../phase-stream.js";
import { defaultPetRendererRegistry } from "./registry.js";
/** Mount the frames2d renderer as the sprite's visual (inside the chrome). */
export function Frames2dVisualMount(props) {
    const containerRef = useRef(null);
    const streamRef = useRef(null);
    const handleRef = useRef(null);
    const [invalid, setInvalid] = useState(false);
    // One activation per pet definition: build the contract context and mount.
    useEffect(() => {
        setInvalid(false);
        const container = containerRef.current;
        const frames2d = props.definition.frames2d;
        if (container === null || frames2d === undefined)
            return undefined;
        streamRef.current ??= createPhaseStream(props.phase);
        const cleanups = [];
        const ctx = {
            petId: props.definition.id,
            assetBase: '/pet/' + encodeURIComponent(props.definition.id),
            container,
            phase: streamRef.current,
            interact: props.onPet,
            onCleanup: (fn) => { cleanups.push(fn); },
        };
        let handle;
        try {
            handle = defaultPetRendererRegistry.mount('frames2d', ctx, frames2d);
        }
        catch {
            setInvalid(true);
            return () => { for (const fn of cleanups.splice(0))
                fn(); };
        }
        handleRef.current = handle;
        // The gameplay HUD steers one shared override slot through the bus;
        // mode rules (work blocks drag, sleep wakes on it) keep the two
        // producers from fighting over the slot.
        if (props.bus !== undefined) {
            const gameplayBus = props.bus;
            gameplayBus.setTrack = (track) => { handleRef.current?.setState(track); };
            cleanups.push(() => { gameplayBus.setTrack = undefined; });
        }
        // The drag gesture drives the conventional 'drag' track when declared.
        // On release, a declared gameplay.dragEndState (miku: standup) plays
        // once; its fallback auto-releases the override back to the phase map.
        const dragTrack = props.definition.gameplay?.dragState ?? (frames2d.tracks.drag === undefined ? undefined : 'drag');
        const offDrag = props.drag.subscribe((dragging) => {
            if (dragTrack === undefined)
                return;
            if (dragging) {
                handle.setState(dragTrack);
                return;
            }
            handle.setState(props.definition.gameplay?.dragEndState);
        });
        cleanups.push(offDrag);
        return () => {
            handleRef.current = null;
            for (const fn of cleanups.splice(0))
                fn();
            handle.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one activation per pet identity
    }, [props.definition]);
    // Feed the polled phase into the activation's stream (change-only).
    useEffect(() => {
        streamRef.current?.push(props.phase);
    }, [props.phase]);
    return (_jsx("div", { ref: containerRef, "data-dsh-pet-frames2d": props.definition.id, style: { width: '100%', height: '100%', pointerEvents: 'none' }, children: invalid && (_jsx("span", { "data-dsh-pet-frames2d-error": "invalid-config", children: props.t('pet.renderer.unavailable', { renderer: 'frames2d' }) })) }));
}
