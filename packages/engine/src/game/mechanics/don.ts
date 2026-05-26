import { produce } from 'immer';
import { GameState } from '../../types/state';
import { CardInstanceId, Zone } from '../../types/primitives';
import { DonInstance } from '../../types/card';
import { removeFromZone, addToZone, moveCard } from './zones';

/**
 * Attaches a DON!! card to a character or leader. The DON!! is removed from its current zone,
 * its currentZone is set to null, and the attachment is recorded on both instances.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to attach
 * @param targetId - Instance ID of the character or leader to attach the DON!! to
 * @returns Game state with the DON!! removed from its zone and attached to the target
 */
export function attachDon(state: GameState, donId: CardInstanceId, targetId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);
    if (don.attachedTo !== null) throw new Error(`DON!! ${donId} is already attached to ${don.attachedTo}`);

    const target = state.instances[targetId];
    if (!target) throw new Error(`Cannot find target instance ${targetId}`);
    if (target.class === "STAGE") throw new Error(`Attaching DON!! to a stage card is not yet implemented`);
    if (target.class !== "CHARACTER" && target.class !== "LEADER") {
        throw new Error(`Cannot attach DON!! to a ${target.class} card: ${targetId}`);
    }

    // Remove DON!! from its zone — sets currentZone to null
    state = removeFromZone(state, donId);

    // Record attachment on both instances
    return produce(state, draft => {
        (draft.instances[donId] as DonInstance).attachedTo = targetId;
        (draft.instances[targetId] as { attachedDon: CardInstanceId[] }).attachedDon.push(donId);
    });
}

/**
 * Detaches a DON!! card from its attachment target and moves it to a destination DON zone.
 * Called when a character or leader with attached DON!! leaves play, or when DON!! is
 * otherwise forcibly detached by a card effect.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to detach
 * @returns Game state with the DON!! detached from its target and moved to DON_RESTED
 */
export function detachDon(state: GameState, donId: CardInstanceId, destination: Zone): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);
    if (don.attachedTo === null) throw new Error(`DON!! ${donId} is not attached to any card`);

    const targetId = don.attachedTo;

    // Clear attachment relationship on both instances
    // currentZone remains null — addToZone requires this to proceed
    state = produce(state, draft => {
        const target = draft.instances[targetId];
        if (!target || !("attachedDon" in target)) {
            throw new Error(`DON!! ${donId} references unknown or invalid attachment target ${targetId}`);
        }
        const idx = target.attachedDon.indexOf(donId);
        if (idx === -1) throw new Error(`DON!! ${donId} not found in attachedDon of ${targetId}`);
        target.attachedDon.splice(idx, 1);
        (draft.instances[donId] as DonInstance).attachedTo = null;
    });

    return addToZone(state, donId, destination, "TOP"); // currentZone already null, will be updated by addToZone
}

/**
 * Attaches a DON!! card to a character or leader that is already attached. The DON!! is removed from its card,
 * and the updated don location is updated on the original card, the target card, and the attached don.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to attach
 * @param targetId - Instance ID of the character or leader to attach the DON!! to
 * @returns Game state with the DON!! removed from its zone and attached to the target
 */
export function donReattach(state: GameState, donId: CardInstanceId, targetId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);

    // Record attachment on target card instance and the don instance, record detachment on origin card instance
    return produce(state, draft => {
        const originId = don.attachedTo;
        if (originId === null) throw new Error(`Don is not attached and cannot be used for reattachment`);

        const origin = draft.instances[originId];
        if (!origin || !("attachedDon" in origin)) throw new Error(`Don attachment origin ${originId} not found or is invalid don attachment target`);

        const target = draft.instances[targetId];
        if (!target || !("attachedDon" in target)) throw new Error(`DON!! ${donId} references unknown or invalid attachment target ${targetId}`);
        if (target.class === "STAGE") throw new Error(`Attaching DON!! to a stage card is not yet implemented`);

        const idx = origin.attachedDon.indexOf(donId);
        if (idx === -1) throw new Error(`DON!! ${donId} not found in attachedDon of ${originId}`);
        origin.attachedDon.splice(idx, 1);

        (draft.instances[donId] as DonInstance).attachedTo = targetId;
        (draft.instances[targetId] as { attachedDon: CardInstanceId[] }).attachedDon.push(donId);
    });
}