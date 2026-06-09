import { GameState, PlayerId, SignalCause, CardInstanceId, DonInstance, StackPosition, Zone, CardInstance } from "../../../types";
import { moveCard, getZoneArray, attachDon, detachDon } from "../../mechanics";
import { emit } from "../../emitter";
import { InvalidActionError } from "../../../errors";
import { getCardInstance } from "../../mechanics";

/**
 * Adds one or more DON to a player's active or rested DON cards.
 * @param state - Game state
 * @param playerId - Player to add DON for
 * @param count - Number of DON to add
 * @param rested - Add DON as rested if true, add as active if false
 * @param signalCause - Reason for adding DON (game rule or card effect)
 * @returns Game state with the DON added to the correct active or rested zone
 */
export function donAdd(state: GameState, playerId: PlayerId, count: number, rested: boolean, signalCause: SignalCause): GameState {
    if (count < 0) throw new InvalidActionError(`Cannot request to add a negative amount of don`);
    const donAdded = [];
    for (let i = 0; i < count; i++) {
        const topDon = getZoneArray(state, playerId, "DON_DECK")[0];
        if (!topDon) break;
        donAdded.push(topDon);

        const donLocation = rested ? "DON_RESTED" : "DON_ACTIVE";
        state = moveCard(state, topDon, donLocation, "TOP");
    }
    if (donAdded.length === 0) return state;

    return emit(state, { type: "DON_ADDED", instanceIds: donAdded, rested: rested, controller: playerId, cause: signalCause });
}

/**
 * Rests one or more DON for a player, moving active DON from the active zone to the rested zone.
 * @param state - Game state
 * @param playerId - Player to rest DON for
 * @param count - Number of DON to rest
 * @param signalCause - Reason for resting DON (game rule or card effect)
 * @returns Game state with DON moved from active to rested
 */
export function donRest(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    if (count < 0) throw new InvalidActionError(`Cannot request to rest a negative amount of don`);
    const activeCount = getZoneArray(state, playerId, "DON_ACTIVE").length;
    if (count > activeCount) {
        throw new InvalidActionError(`${count} DON requested to be rested but player ${playerId} only has ${activeCount} active`);
    }
    const donRested = [];
    for (let i = 0; i < count; i++) {
        const topActiveDon = getZoneArray(state, playerId, "DON_ACTIVE")[0];
        donRested.push(topActiveDon);
        state = moveCard(state, topActiveDon, "DON_RESTED", "TOP");
    }
    if (donRested.length === 0) return state;
    return emit(state, { type: "DON_RESTED", instanceIds: donRested, controller: playerId, cause: signalCause })
}

/**
 * Sets one or more DON as active for a player, moving rested DON from the rested zone to the active zone.
 * @param state - Game state
 * @param playerId - Player to set DON as active for
 * @param count - Number of DON to set as active
 * @param signalCause - Reason for setting DON as active (game rule or card effect)
 * @returns Game state with DON moved from rested to active
 */
export function donSetActive(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    if (count < 0) throw new InvalidActionError(`Cannot request to set active a negative amount of don`);
    const restedCount = getZoneArray(state, playerId, "DON_RESTED").length;
    if (count > restedCount) {
        throw new InvalidActionError(`${count} DON requested to be set as active but player ${playerId} only has ${restedCount} rested`);
    }
    const donActivated = [];
    for (let i = 0; i < count; i++) {
        const topRestedDon = getZoneArray(state, playerId, "DON_RESTED")[0];
        donActivated.push(topRestedDon);
        state = moveCard(state, topRestedDon, "DON_ACTIVE", "TOP");
    }
    if (donActivated.length === 0) return state;
    return emit(state, { type: "DON_SET_ACTIVE", instanceIds: donActivated, controller: playerId, cause: signalCause })
}

/**
 * Takes a list of DON ids and returns them to the DON deck
 * @param state - Game state
 * @param playerId - Player to return DON for
 * @param donIds - List of DON ids to be returned
 * @param signalCause - Reason for returning DON (game rule or card effect)
 * @returns Game state with the DON returned to the DON deck
 */
export function donReturn(state: GameState, playerId: PlayerId, donIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const donId of donIds) {
        const don = getCardInstance(state, donId);
        if (don.class !== "DON") throw new InvalidActionError(`Cannot return non-DON instance ${donId} to DON deck`);
        if (don.attachedTo !== null) {
            state = detachDon(state, donId, "DON_DECK");
        }
        else {
            state = moveCard(state, donId, "DON_DECK", "TOP");
        }
    }
    return emit(state, { type: "DON_RETURNED", instanceIds: donIds, controller: playerId, cause: signalCause});
}

/**
 * Attaches one or more DON to a target. It is the responsibility of the caller to check that the DON being attached are valid.
 * @param state - Game state
 * @param playerId - Player performing DON attachment
 * @param targetId - The target to attach one or more DON to
 * @param donIds - One or more DON to be attached to the target
 * @param signalCause - The cause for DON attachment
 * @return Game state with the specified DON attached to the target
 */
export function donAttach(state: GameState, playerId: PlayerId, donIds: CardInstanceId[], targetId: CardInstanceId, fromDonZone: Zone, signalCause: SignalCause): GameState {
    for (const donId of donIds) {
        const don = getCardInstance(state, donId);
        if (don.class !== "DON") throw new InvalidActionError(`Cannot attach non-DON instance ${donId} as a DON`);
        if (fromDonZone !== "DON_ACTIVE" && fromDonZone !== "DON_RESTED") throw new InvalidActionError(`Invalid fromDonZone ${fromDonZone} for attaching DON ${donId}, expected DON_ACTIVE or DON_RESTED`);
        if (fromDonZone === "DON_ACTIVE" && don.currentZone !== "DON_ACTIVE") throw new InvalidActionError(`Attempting to attach DON ${donId} from ${don.currentZone}, expected DON_ACTIVE`);
        if (fromDonZone === "DON_RESTED" && don.currentZone !== "DON_RESTED") throw new InvalidActionError(`Attempting to attach DON ${donId} from ${don.currentZone}, expected DON_RESTED`);

        const targetCard = getCardInstance(state, targetId);
        if (targetCard.class !== "LEADER" && targetCard.class !== "CHARACTER") throw new InvalidActionError(`Cannot attach DON to instance ${targetId} of class ${targetCard.class}, expected LEADER or CHARACTER`);
        if (don.controller !== targetCard.controller) throw new InvalidActionError(`${donId} cannot be attached to ${targetId} as they are controlled by different players`);
        state = attachDon(state, donId, targetId);
    }
    return emit(state, { type: "DON_ATTACHED", instanceIds: donIds, targetId: targetId, controller: playerId, cause: signalCause })
}

/**
 * Detaches one or more DON from a target.
 * @param state - Game state
 * @param playerId - Player performing DON detachment
 * @param originId - The card to detach the DON from
 * @param donIds - One or more DON to be detached
 * @param signalCause - The cause for DON detachment
 * @return Game state with the specified DON detached from the target
 */
export function donDetach(state: GameState, playerId: PlayerId, originId: CardInstanceId, donIds: CardInstanceId[], signalCause: SignalCause): GameState {
    const originCard = getCardInstance(state, originId);
    if (!(originCard.class === "LEADER" || originCard.class === "CHARACTER")) throw new InvalidActionError(`Attempting to detach DON from invalid DON attachment origin ${originId}`); 
    for (const donId of donIds) {
        if (!(originCard.attachedDon.includes(donId))) throw new InvalidActionError(`DON ${donId} is not attached to the origin card ${originId}`)
        state = detachDon(state, donId, "DON_RESTED");
    }
    return emit(state, { type: "DON_DETACHED", instanceIds: donIds, originId: originId, controller: playerId, cause: signalCause })
}

// Consider status effects that cause DON to not be refreshed
export function donRefresh(state: GameState, playerId: PlayerId): GameState {
    const attachedDonInstances = getAllAttachedDonInstances(state, playerId);
    const seen = new Set<CardInstanceId>();
    for (const donInstance of attachedDonInstances) {
        if (donInstance.attachedTo && !seen.has(donInstance.attachedTo)) {
            seen.add(donInstance.attachedTo);
            const originCard = getCardInstance(state, donInstance.attachedTo);
            if (originCard.class !== "LEADER" && originCard.class !== "CHARACTER") throw new InvalidActionError(`Invalid DON attachment origin ${donInstance.attachedTo} for attached DON ${donInstance.instanceId}`);
            if (playerId !== originCard.controller) throw new InvalidActionError(`Cannot refresh attached DON ${donInstance.instanceId} for player ${playerId} as it is attached to a card controlled by a different player`);
            state = donDetach(state, originCard.controller, originCard.instanceId, originCard.attachedDon, { kind: "RULE" });
        }
    }
    const donToRefresh = getZoneArray(state, playerId, "DON_RESTED");
    if (donToRefresh.length === 0) return state;
    let refreshedDon = [];
    for (const donId of donToRefresh) {
        // STATUS EFFECT: if don is frozen, do not refresh it
        state = moveCard(state, donId, "DON_ACTIVE", "TOP");
        refreshedDon.push(donId);
    }
    return emit(state, { type: "DON_SET_ACTIVE", instanceIds: refreshedDon, controller: playerId, cause: { kind: "RULE" } });
    
}

function getAllAttachedDonInstances(state: GameState, playerId: PlayerId): DonInstance[] {
    return (Object.values(state.instances) as CardInstance[]).filter((instance): instance is DonInstance => instance.class === "DON" && instance.controller === playerId && instance.attachedTo !== null);
}