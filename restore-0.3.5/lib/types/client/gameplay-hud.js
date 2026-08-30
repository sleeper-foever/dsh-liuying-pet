import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { touchZoneAt } from "../gameplay.js";
import styles from './pet.module.css';
let floatSeq = 0;
/** The gameplay overlay for one frames2d pet that declares 'gameplay'. */
export function GameplayHud(props) {
    const { definition, store, api, bus } = props;
    const ui = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const def = definition.gameplay;
    const view = ui.snapshot?.gameplay;
    const phase = ui.snapshot?.phase ?? 'idle';
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState('root');
    const hudRef = useRef(null);
    const cardRef = useRef(null);
    const [floats, setFloats] = useState([]);
    // Mutable driver state (refs so intervals never re-arm on a poll tick).
    const modeRef = useRef(view?.mode ?? null);
    modeRef.current = view?.mode ?? null;
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    const draggingRef = useRef(false);
    const touchLockUntilRef = useRef(0);
    const missRef = useRef(0);
    const busyRef = useRef(false);
    // Dynamic-key lookups (stat ids / currency ids are manifest data).
    const tr = props.t;
    const statLabel = (name) => tr('pet.gameplay.stat.' + name);
    const currencyLabel = (name) => tr('pet.gameplay.currency.' + name);
    const pushFloat = (text) => {
        const id = ++floatSeq;
        setFloats(list => [...list.slice(-3), { id, text }]);
        window.setTimeout(() => {
            setFloats(list => list.filter(entry => entry.id !== id));
        }, 1100);
    };
    const applyResult = (result) => {
        if (result.view !== undefined)
            store.actions.setGameplayView(result.view);
    };
    // Tap handling (registered on the bus; PetSprite reports sprite-box
    // fractions). Sleep wakes on tap; work blocks taps; a held touch
    // animation turns taps into the plain-click boost.
    useEffect(() => {
        if (def === undefined)
            return undefined;
        bus.tap = (fx, fy) => {
            if (modeRef.current === 'sleep') {
                void api.setMode(null).then(applyResult, () => undefined);
                return;
            }
            if (modeRef.current === 'work')
                return;
            const box = def.hitBox ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
            const hx = (fx - box.x0) / (box.x1 - box.x0);
            const hy = (fy - box.y0) / (box.y1 - box.y0);
            if (hx < 0 || hx > 1 || hy < 0 || hy > 1)
                return;
            if (Date.now() < touchLockUntilRef.current) {
                void api.touch().then(applyResult, () => undefined);
                return;
            }
            const zone = def.touch === undefined ? undefined : touchZoneAt(def.touch, hy);
            if (zone === undefined)
                return;
            void api.touch(zone.name).then((result) => {
                applyResult(result);
                if (result.hit !== true)
                    return;
                if (result.state !== undefined) {
                    bus.setTrack?.(result.state);
                    const holdMs = result.stateMs ?? 3000;
                    touchLockUntilRef.current = Date.now() + holdMs;
                    window.setTimeout(() => {
                        if (Date.now() >= touchLockUntilRef.current)
                            bus.setTrack?.(undefined);
                    }, holdMs);
                }
                if (result.phrase !== undefined) {
                    store.actions.setFeedback({ text: result.phrase, kind: 'none', at: Date.now() });
                }
            }, () => undefined);
        };
        return () => { bus.tap = undefined; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one registration per pet definition
    }, [definition.id, def]);
    // Panel entry (chrome -> HUD): the hover panel's 玩法 button drives the
    // card through this channel so the chrome never needs the card's state.
    useEffect(() => {
        bus.openCard = (next) => {
            setOpen(prev => next ?? !prev);
            setPage('root');
        };
        return () => { bus.openCard = undefined; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one registration per bus
    }, [bus]);
    // Card placement: the card must not enter the bubble band above the sprite
    // or the hover-panel band below it, so it opens beside the sprite instead
    // of growing upward from the pet's feet. It is vertically centered on the
    // sprite box, clamped to the sprite's height, and the side is chosen by
    // the space available to each side (right first; a pet parked near the
    // right viewport edge flips the card to the left).
    useLayoutEffect(() => {
        if (!open)
            return undefined;
        const hud = hudRef.current;
        const card = cardRef.current;
        if (hud === null || card === null)
            return undefined;
        const place = () => {
            const box = hud.parentElement?.getBoundingClientRect();
            if (box === undefined)
                return;
            const gap = 8;
            const width = card.getBoundingClientRect().width;
            const toRight = window.innerWidth - box.right;
            const x = toRight >= width + gap ? box.width + gap : -(width + gap);
            card.style.transform = 'translate(' + Math.round(x) + 'px, ' + Math.round(-box.height / 2) + 'px) translateY(50%)';
            card.style.maxHeight = Math.round(box.height) + 'px';
        };
        place();
        window.addEventListener('resize', place);
        return () => { window.removeEventListener('resize', place); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one placement per open/page change
    }, [open, page]);
    // Drag gestures wake a sleeping pet (miku behavior); the drag stream also
    // feeds the idle director's suppression check.
    useEffect(() => {
        return props.drag.subscribe((dragging) => {
            draggingRef.current = dragging;
            if (dragging && modeRef.current === 'sleep') {
                void api.setMode(null).then(applyResult, () => undefined);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one subscription per drag stream
    }, [props.drag]);
    // Idle director: weighted rolls between staying idle and playing an act.
    // Runs only while the phase mapping owns the visual (idle phase, no mode,
    // no drag, no held touch animation); maxMiss forces an act after too many
    // idle rolls in a row.
    useEffect(() => {
        const director = def?.idleDirector;
        if (def === undefined || director === undefined)
            return undefined;
        const total = director.idleWeight + director.acts.reduce((sum, act) => sum + act.weight, 0);
        if (total <= 0)
            return undefined;
        const timer = window.setInterval(() => {
            if (phaseRef.current !== 'idle')
                return;
            if (modeRef.current !== null || draggingRef.current)
                return;
            if (Date.now() < touchLockUntilRef.current)
                return;
            let pickedAct;
            if (missRef.current >= director.maxMiss) {
                // Forced act: pick among the acts only.
                const actTotal = director.acts.reduce((sum, act) => sum + act.weight, 0);
                let actRoll = Math.random() * actTotal;
                for (const act of director.acts) {
                    actRoll -= act.weight;
                    if (actRoll < 0) {
                        pickedAct = act;
                        break;
                    }
                }
            }
            else {
                let roll = Math.random() * total;
                for (const act of director.acts) {
                    roll -= act.weight;
                    if (roll < 0) {
                        pickedAct = act;
                        break;
                    }
                }
            }
            if (pickedAct === undefined) {
                missRef.current += 1;
                return;
            }
            missRef.current = 0;
            bus.setTrack?.(pickedAct.track);
            // Acts with a phrase pool speak one line while they play (miku parity).
            if (pickedAct.phrases !== undefined && pickedAct.phrases.length > 0) {
                const phrase = pickedAct.phrases[Math.floor(Math.random() * pickedAct.phrases.length)];
                store.actions.setFeedback({ text: phrase, kind: 'none', at: Date.now() });
            }
        }, director.intervalMs);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one director per pet definition
    }, [definition.id, def]);
    // Work loop: hold the work track, adjudicate one round per tick, play the
    // result track for its hold window, then resume. Leaving the mode
    // releases the override so the phase mapping takes over.
    useEffect(() => {
        const work = def?.work;
        if (def === undefined || work === undefined || view?.mode !== 'work')
            return undefined;
        bus.setTrack?.(work.state);
        let resultTimer = 0;
        const timer = window.setInterval(() => {
            if (busyRef.current)
                return;
            busyRef.current = true;
            void api.workTick().then((result) => {
                busyRef.current = false;
                applyResult(result);
                if (result.ok !== true || result.outcome === undefined)
                    return;
                const resultTrack = result.outcome === 'success' ? work.successState : work.failState;
                const hold = result.outcome === 'success' ? work.resultMs?.success ?? 1300 : work.resultMs?.fail ?? 1900;
                bus.setTrack?.(resultTrack);
                resultTimer = window.setTimeout(() => {
                    if (modeRef.current === 'work')
                        bus.setTrack?.(work.state);
                }, hold);
            }, () => { busyRef.current = false; });
        }, work.tickMs);
        return () => {
            window.clearInterval(timer);
            window.clearTimeout(resultTimer);
            bus.setTrack?.(undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the loop keys on the mode value
    }, [definition.id, def, view?.mode]);
    // Sleep loop: hold the sleep track; restore is host-side (lazy settle).
    useEffect(() => {
        const sleep = def?.sleep;
        if (def === undefined || sleep === undefined || view?.mode !== 'sleep')
            return undefined;
        bus.setTrack?.(sleep.state);
        return () => bus.setTrack?.(undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the loop keys on the mode value
    }, [definition.id, def, view?.mode]);
    if (def === undefined || view === undefined)
        return null;
    const mode = view.mode;
    const stats = def.stats ?? {};
    const shop = def.shop;
    const buy = (itemId) => {
        void api.buy(itemId).then((result) => {
            applyResult(result);
            if (result.ok !== true) {
                if (result.error === 'insufficient-funds') {
                    const item = shop?.items.find(entry => entry.id === itemId);
                    pushFloat(tr('pet.gameplay.insufficient', { currency: currencyLabel(item?.currency ?? 'treats') }));
                }
                return;
            }
            if (result.prize !== undefined) {
                pushFloat(tr('pet.gameplay.prize', { amount: result.prize.amount, currency: currencyLabel(result.prize.currency) }));
            }
        }, () => undefined);
    };
    const setMode = (next) => {
        void api.setMode(next).then(applyResult, () => undefined);
    };
    return (_jsxs("div", { ref: hudRef, className: styles.gameplayHud, "data-dsh-pet-gameplay": definition.id, children: [floats.map(entry => (_jsx("div", { className: styles.gameplayFloat, children: entry.text }, entry.id))), mode !== null && (_jsx("div", { className: styles.gameplayModeChip, children: tr(mode === 'work' ? 'pet.gameplay.working' : 'pet.gameplay.sleeping') })), open && (_jsxs("div", { ref: cardRef, className: styles.gameplayCard, "data-page": page, children: [page === 'root' && (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.gameplayBars, children: Object.entries(stats).map(([name, stat]) => {
                                    const value = view.stats[name] ?? 0;
                                    return (_jsxs("div", { className: styles.gameplayBarRow, title: statLabel(name) + ' ' + String(value) + '/' + String(stat.max), children: [_jsx("span", { className: styles.gameplayBarLabel, children: statLabel(name) }), _jsx("span", { className: styles.gameplayBarTrack, children: _jsx("span", { className: styles.gameplayBarFill, style: { width: Math.round((value / stat.max) * 100) + '%' } }) })] }, name));
                                }) }), _jsxs("div", { className: styles.gameplayActions, children: [def.work !== undefined && (_jsx("button", { type: "button", className: styles.action, onClick: () => setMode(mode === 'work' ? null : 'work'), children: tr(mode === 'work' ? 'pet.gameplay.stopWork' : 'pet.gameplay.work') })), def.sleep !== undefined && (_jsx("button", { type: "button", className: styles.action, onClick: () => setMode(mode === 'sleep' ? null : 'sleep'), children: tr(mode === 'sleep' ? 'pet.gameplay.wake' : 'pet.gameplay.sleep') })), shop !== undefined && (_jsx("button", { type: "button", className: styles.action, onClick: () => setPage('shop'), children: tr('pet.gameplay.shop') }))] })] })), page === 'shop' && shop !== undefined && (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.gameplayShopItems, children: shop.items.map(item => (_jsxs("button", { type: "button", className: styles.gameplayShopItem, onClick: () => buy(item.id), title: item.label + ' — ' + String(item.price) + ' ' + currencyLabel(item.currency), children: [item.image !== undefined && (_jsx("img", { className: styles.gameplayShopItemImage, src: item.image, alt: "", draggable: false })), _jsx("span", { className: styles.gameplayShopItemLabel, children: item.label }), _jsxs("span", { className: styles.gameplayShopItemPrice, children: [item.price, " ", currencyLabel(item.currency)] })] }, item.id))) }), _jsx("div", { className: styles.gameplayActions, children: _jsx("button", { type: "button", className: styles.action, onClick: () => setPage('root'), children: tr('pet.gameplay.back') }) })] })), _jsx("button", { type: "button", className: styles.gameplayClose, "aria-label": tr('pet.gameplay.back'), onClick: () => setOpen(false), children: "\u00D7" })] }))] }));
}
