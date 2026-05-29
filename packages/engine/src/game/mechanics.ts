import { produce } from 'immer';
import { GameState } from '../types/state';
import { CardInstanceId, PlayerId, Zone, StackPosition } from '../types/primitives';
import { CHARACTERS_MAX, LEADER_MAX, STAGE_MAX } from './rules';
import { DonInstance } from '../types/card';

/**
 * Helper function to get the zone array for the provided player
 * @param state - Current game state
 * @param playerId - Player id that we want the zone of
 * @param zone - Zone for the player that we want, nullable due to the currentZone being able to provide a null value, though no null zone value should be expected or provided
 * @returns Game state with the card instance id removed from the instance's current zone, and the instance's current zone set to null
 */
export function getZoneArray(state: GameState, playerId: PlayerId, zone: Zone | null): CardInstanceId[] {
    const playerZones = state.playerZones[playerId];
    if (!playerZones) {
        throw new Error(`Unknown playerId ${playerId}`);
    }
    switch (zone) {
        case "CHARACTERS":  return playerZones.characters;
        case "DECK":        return playerZones.deck;
        case "DON_ACTIVE":  return playerZones.donActive;
        case "DON_DECK":    return playerZones.donDeck;
        case "DON_RESTED":  return playerZones.donRested;
        case "HAND":        return playerZones.hand;
        case "LEADER":      return playerZones.leader;
        case "LIFE":        return playerZones.life;
        case "LOOK":        return playerZones.look;
        case "STAGE":       return playerZones.stage;
        case "TRASH":       return playerZones.trash;
        case null:          throw new Error(`Null zone provided, no zone to return`);
        default:            throw new Error(`Provided zone was not an accepted zone value`);
    }
}

/**
 * Function to move a player's card from one zone to another
 * @param state - Current game state
 * @param instanceId - Id of card to be moved from the zone in its attribute currentZone to the target zone
 * @param targetZone - Target zone for the card instance id to be moved to
 * @param position - Position to add the card stack (top or bottom) of the target zone
 * @returns Game state with the card instance id removed from old zone and added to new zone with updated location
 */
export function moveCard(state: GameState, instanceId: CardInstanceId, targetZone: Zone, position: StackPosition): GameState {
    state = removeFromZone(state, instanceId);
    state = addToZone(state, instanceId, targetZone, position);
    return state;
}

/**
 * Removes a card from a player's zone. The controlling player and the card's current zone is derived from the instance id provided
 * The function itself will only apply game rule logic and it is the responsibility of the caller to provide the intention for the removal
 * Do not call directly during a game's runtime
 * @param state - Game state before remove card from zone is called
 * @param instanceId - Id of card instance to be removed
 * @returns Game state with the card instance id removed from the instance's current zone, and the instance's current zone set to null
 */
export function removeFromZone(state: GameState, instanceId: CardInstanceId): GameState {
    const instance = state.instances[instanceId];
    if (!instance) {
        throw new Error(`Cannot move unknown instance ${instanceId}`);
    }

    if (instance.class === "LEADER") {
        throw new Error (`Attempting to remove leader card from the leader area: ${instance.instanceId}`);
    }

    return produce(state, draft => {
        const originZoneArray = getZoneArray(draft, instance.controller, instance.currentZone);

        const index = originZoneArray.indexOf(instance.instanceId);
        if (index === -1) {
            throw new Error(`Instance ${instance.instanceId} not found in zone ${instance.currentZone}`);
        }

        originZoneArray.splice(index, 1);
        draft.instances[instance.instanceId].currentZone = null;
    });
}
 
/**
 * Adds a card to a player's zone, checks only done for game rule logic and will throw an error if the game rule limit is exceeded
 * The function calling move card or add to zone is responsible for checking the current size of the array so that it can choose to call add or replace card at target zone
 * Do not call directly during a game's runtime
 * @param state - Game state before add card to zone is called
 * @param instanceId - Id of card instance to be added to zone
 * @param targetZone - Zone to add the card instance id
 * @param position - Position to add the card stack (top or bottom)
 * @returns Game state with the card instance id added to the target zone, and the instance's current zone set to the target zone
 */
export function addToZone(state: GameState, instanceId: CardInstanceId, targetZone: Zone, position: StackPosition): GameState {
    const instance = state.instances[instanceId];
    if (!instance) {
        throw new Error(`Cannot move unknown instance ${instanceId}`);
    }
    if (instance.currentZone !== null) {
        throw new Error(`Attempting to add ${instanceId} to new zone when previous zone has not been cleared`);
    }
    return produce(state, draft => {
        const targetZoneArray = getZoneArray(draft, instance.controller, targetZone);
        if (targetZone === "CHARACTERS") {
            if (instance.class !== "CHARACTER") throw new Error (`Attempting to move non-character card to the character area: ${instance.instanceId}`);
            if (targetZoneArray.length >= CHARACTERS_MAX) throw new Error(`Moving character to character area has exceeded the maximum amount of characters allowed: ${instance.instanceId}`);
        }
        if (targetZone === "STAGE") {
            if (instance.class !== "STAGE") throw new Error (`Attempting to move non-stage card to the stage area: ${instance.instanceId}`);
            if (targetZoneArray.length >= STAGE_MAX) throw new Error(`Moving stage to stage area has exceeded the maximum amount of stages allowed: ${instance.instanceId}`);
        }
        if (targetZone === "LEADER") {
            if (instance.class !== "LEADER") throw new Error (`Attempting to move non-leader card to the leader area: ${instance.instanceId}`);
            if (targetZoneArray.length >= LEADER_MAX) throw new Error(`Moving leader to leader area has exceeded the maximum amount of leaders allowed: ${instance.instanceId}`);
        }

        if (position === "TOP") {
            targetZoneArray.unshift(instance.instanceId);
        }
        else if (position === "BOTTOM") {
            targetZoneArray.push(instance.instanceId);
        }
        else {
            throw new Error(`Position (top or bottom of stack) was not provided`);
        }

        draft.instances[instance.instanceId].currentZone = targetZone;

        if (instance.class === "DON") {
            if (targetZone === "DON_RESTED") {
                (draft.instances[instance.instanceId] as DonInstance).isRested = true;
            } else if (targetZone === "DON_ACTIVE") {
                (draft.instances[instance.instanceId] as DonInstance).isRested = false;
            }
        }
    });
}

/**
 * Inserts a card into a zone at a specific index. Rejects with invalid index, appends to end of zone if index is equal to zone length and zone is not at capacity.
 * @param state - Game state
 * @param instanceId - The card to be inserted
 * @param targetZone - The zone to insert the card
 * @param index - The index to insert the card at. Must be a valid index.
 * @returns The state with the card inserted at the index and all other items shifted accordingly.
 */
export function insertCardAtZoneIndex(state: GameState, instanceId: CardInstanceId, targetZone: Zone, index: number): GameState {
    const instance = state.instances[instanceId];
    if (!instance) {
        throw new Error(`Cannot move unknown instance ${instanceId}`);
    }
    if (instance.currentZone !== null) {
        throw new Error(`Attempting to add ${instanceId} to new zone when previous zone has not been cleared`);
    }
    return produce(state, draft => {
        const targetZoneArray = getZoneArray(draft, instance.controller, targetZone);
        if (targetZone === "CHARACTERS") {
            if (instance.class !== "CHARACTER") throw new Error(`Attempting to move non-character card to the character area: ${instance.instanceId}`);
            if (targetZoneArray.length >= CHARACTERS_MAX) throw new Error(`Moving character to character area has exceeded the maximum amount of characters allowed: ${instance.instanceId}`);
        }
        if (targetZone === "STAGE") {
            if (instance.class !== "STAGE") throw new Error(`Attempting to move non-stage card to the stage area: ${instance.instanceId}`);
            if (targetZoneArray.length >= STAGE_MAX) throw new Error(`Moving stage to stage area has exceeded the maximum amount of stages allowed: ${instance.instanceId}`);
        }
        if (targetZone === "LEADER") {
            if (instance.class !== "LEADER") throw new Error(`Attempting to move non-leader card to the leader area: ${instance.instanceId}`);
            if (targetZoneArray.length >= LEADER_MAX) throw new Error(`Moving leader to leader area has exceeded the maximum amount of leaders allowed: ${instance.instanceId}`);
        }
        if (targetZone.includes("DON") || instance.class === "DON") throw new Error("Do not use this function to trasnfer DON cards, use addToZone");

        if (index < 0 || index > targetZoneArray.length) throw new Error(`Index ${index} is out of bounds for zone ${targetZone} with length ${targetZoneArray.length}`);
        targetZoneArray.splice(index, 0, instance.instanceId);
        draft.instances[instance.instanceId].currentZone = targetZone;
    });
}

export function replaceCardAtZoneIndex(state: GameState, instanceId: CardInstanceId, targetZone: Zone, index: number): GameState {
    const instance = state.instances[instanceId];
    if (!instance) throw new Error(`Cannot move unknown instance ${instanceId}`);
    if (instance.currentZone !== null) throw new Error(`Attempting to add ${instanceId} to new zone when previous zone has not been cleared`);
    if (targetZone !== "CHARACTERS" && targetZone !== "LIFE" && targetZone !== "STAGE") {
        throw new Error(`replaceCardAtZoneIndex only applies to CHARACTERS, LIFE, and STAGE zones`);
    }

    return produce(state, draft => {
        const targetZoneArray = getZoneArray(draft, instance.controller, targetZone);
        if (targetZone === "CHARACTERS" && instance.class !== "CHARACTER") throw new Error(`Attempting to move non-character card to the character area: ${instance.instanceId}`);
        if (targetZone === "STAGE" && instance.class !== "STAGE") throw new Error(`Attempting to move non-stage card to the stage area: ${instance.instanceId}`);

        if (index < 0 || index >= targetZoneArray.length) throw new Error(`Index ${index} is out of bounds for zone ${targetZone} with length ${targetZoneArray.length}`);

        const replacedId = targetZoneArray[index];
        const trashZone = getZoneArray(draft, instance.controller, "TRASH");
        trashZone.unshift(replacedId);
        draft.instances[replacedId].currentZone = "TRASH";

        targetZoneArray[index] = instance.instanceId;
        draft.instances[instance.instanceId].currentZone = targetZone;
    });
}


/**
 * Set card as active
 * @param state - Game state
 * @param playerId - Player controlling the card to set as active
 * @param instanceId - Instance id to set as active
 * @param signalCause - Cause of setting card as active
 * @returns Game state with the card specified set as active
 */
export function setActive(state: GameState, instanceId: CardInstanceId): GameState {
    return produce(state, draft => {
        const card = draft.instances[instanceId];
        if (!card) throw new Error(`Cannot find card instance ${instanceId}`);
        card.isRested = false;
    });
}

/**
 * Set card as rested
 * @param state - Game state
 * @param playerId - Player controlling the card to set as rested
 * @param instanceId - Instance id to set as rested
 * @param signalCause - Cause of setting card as rested
 * @returns Game state with the card specified set as rested
 */
export function setRested(state: GameState, instanceId: CardInstanceId): GameState {
    return produce(state, draft => {
        const card = draft.instances[instanceId];
        if (!card) throw new Error(`Cannot find card instance ${instanceId}`);
        card.isRested = true;
    });
}

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