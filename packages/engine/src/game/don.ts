import { produce } from 'immer';
import { GameState } from '../types/state';
import { CardInstanceId } from '../types/primitives';
import { DonInstance } from '../types/card';
import { removeFromZone, addToZone, moveCard } from './movement';

/**
 * Moves a DON!! card from the DON deck to the DON active zone.
 * The caller is responsible for determining which DON!! instance to draw (typically the top of the deck).
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to move from the deck
 * @returns Game state with the DON!! moved from DON_DECK to DON_ACTIVE
 */
export function addDonFromDeck(state: GameState, donId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);

    return moveCard(state, donId, "DON_ACTIVE", "TOP");
}

/**
 * Returns a DON!! card to the bottom of the DON deck from any state: active, rested, or attached.
 * If the DON!! is currently attached, the attachment relationship is cleared on both instances
 * before the move, without routing through the rested zone.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to return to the deck
 * @returns Game state with the DON!! in DON_DECK and detached from any target
 */
export function returnDonToDeck(state: GameState, donId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);

    if (don.attachedTo !== null) {
        const targetId = don.attachedTo;
        state = produce(state, draft => {
            const target = draft.instances[targetId];
            if (!target || !("attachedDon" in target)) {
                throw new Error(`DON!! ${donId} references unknown or invalid attachment target ${targetId}`);
            }

            const idx = target.attachedDon.indexOf(donId);
            if (idx === -1) throw new Error(`DON!! ${donId} not found in attachedDon of ${targetId}`);

            target.attachedDon.splice(idx, 1); // Remove from target's attachedDon array
            (draft.instances[donId] as DonInstance).attachedTo = null; // Set don's attachment field to null

            // currentZone is already null for attached DON — addToZone can proceed directly and will set the don's currentZone
        });
        return addToZone(state, donId, "DON_DECK", "TOP");
    }

    return moveCard(state, donId, "DON_DECK", "TOP");
}

/**
 * Moves a DON!! card from the DON active zone to the DON rested zone.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to rest
 * @returns Game state with the DON!! moved from DON_ACTIVE to DON_RESTED
 */
export function donRest(state: GameState, donId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);

    return moveCard(state, donId, "DON_RESTED", "TOP");
}

/**
 * Moves a DON!! card from the DON rested zone to the DON active zone.
 * Called during the refresh step at the start of each turn for all rested DON!!.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to activate
 * @returns Game state with the DON!! moved from DON_RESTED to DON_ACTIVE
 */
export function donSetActive(state: GameState, donId: CardInstanceId): GameState {
    const don = state.instances[donId];
    if (!don) throw new Error(`Cannot find DON!! instance ${donId}`);
    if (don.class !== "DON") throw new Error(`Instance ${donId} is not a DON!! card`);

    return moveCard(state, donId, "DON_ACTIVE", "TOP");
}

/**
 * Attaches a DON!! card to a character or leader. The DON!! is removed from its current zone,
 * its currentZone is set to null, and the attachment is recorded on both instances.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to attach
 * @param targetId - Instance ID of the character or leader to attach the DON!! to
 * @returns Game state with the DON!! removed from its zone and attached to the target
 */
export function donAttach(state: GameState, donId: CardInstanceId, targetId: CardInstanceId): GameState {
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
 * Detaches a DON!! card from its attachment target and moves it to the DON rested zone.
 * Called when a character or leader with attached DON!! leaves play, or when DON!! is
 * otherwise forcibly detached by a card effect.
 * @param state - Current game state
 * @param donId - Instance ID of the DON!! to detach
 * @returns Game state with the DON!! detached from its target and moved to DON_RESTED
 */
export function donDetach(state: GameState, donId: CardInstanceId): GameState {
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

    return addToZone(state, donId, "DON_RESTED", "TOP"); // currentZone already null, will be updated by addToZone
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