// Operations are functions that perform state manipulation and emit one or more signals to describe
// what was changed for other cards in the game to listen to

import { Action, GameSignal, GameState, PlayerId, SignalCause, CardInstanceId, DonInstance } from "../types";
import { moveCard, getZoneArray } from "./mechanics/zones";
import { attachDon, detachDon } from "./mechanics/don";
import { emit } from "./emitter";
import { InvalidActionError } from "../errors";

// Hand and Deck

/**
 * Draws one or more cards to a player's hand.
 * @param state - Game state
 * @param playerId - Player to draw cards for
 * @param count - Number of cards to draw
 * @param signalCause - Reason for drawing cards (game rule or card effect)
 * @returns Game state with cards drawn from the deck and placed into the target player's hand
 */
export function drawCards(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    const cardsDrawn = [];
    for (let i = 0; i < count; i++) {
        const topCard = getZoneArray(state, playerId, "DECK")[0];
        if (!topCard) break;
        cardsDrawn.push(topCard);
        state = moveCard(state, topCard, "HAND", "TOP");
    }
    if (cardsDrawn.length === 0) return state;
    return emit(state, { type: "CARDS_DRAWN", instanceIds: cardsDrawn, controller: playerId, cause: signalCause });
}

/**
 * Discards one or more cards from a player's hand and moves them to the player's trash
 * @param state - Game state
 * @param playerId - Player to discard cards from
 * @param instanceIds - Array of card ids to discard
 * @param signalCause - Cause of discard action
 * @returns Game state with the cards specified discarded from the player's hand
 */
export function discardCards(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    const playerHand = getZoneArray(state, playerId, "HAND");
    for (const instanceId of instanceIds) {
        if (!(instanceId in playerHand)){
            throw new InvalidActionError(`${instanceId} not found in hand of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_DISCARDED", instanceIds: instanceIds, controller: playerId, cause: signalCause })
}


// DON!!

/**
 * Adds one or more DON to a player's active or rested DON cards.
 * @param state - Game state
 * @param playerId - Player to add DON for
 * @param count - Number of DON to add
 * @param rested - Add DON as rested if true, add as active if false
 * @param signalCause - Reason for adding DON (game rule or card effect)
 * @returns Game state with the DON added to the correct active or rested zone
 */
export function addDon(state: GameState, playerId: PlayerId, count: number, rested: boolean, signalCause: SignalCause): GameState {
    const donAdded = [];
    for (let i = 0; i < count; i++) {
        const topDon = getZoneArray(state, playerId, "DON_DECK")[0];
        if (!topDon) break;
        donAdded.push(topDon);

        const donLocation = rested ? "DON_RESTED" : "DON_ACTIVE";
        state = moveCard(state, topDon, donLocation, "TOP");
    }
    if (donAdded.length === 0) return state;

    const donAddedSignalType = rested ? "ADDED_RESTED_DON" : "ADDED_ACTIVE_DON";
    return emit(state, { type: donAddedSignalType, instanceIds: donAdded, controller: playerId, cause: signalCause });
}

/**
 * Rests one or more DON for a player, moving active DON from the active zone to the rested zone.
 * @param state - Game state
 * @param playerId - Player to rest DON for
 * @param count - Number of DON to rest
 * @param signalCause - Reason for resting DON (game rule or card effect)
 * @returns Game state with DON moved from active to rested
 */
export function restDon(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
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
export function setDonActive(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    const restedCount = getZoneArray(state, playerId, "DON_RESTED").length;
    if (count > restedCount) {
        throw new InvalidActionError(`${count} DON requested to be set as active but player ${playerId} only has ${restedCount} rested`);
    }
    const donActivated = [];
    for (let i = 0; i < count; i++) {
        const topRestedDon = getZoneArray(state, playerId, "DON_ACTIVE")[0];
        donActivated.push(topRestedDon);
        state = moveCard(state, topRestedDon, "DON_ACTIVE", "TOP");
    }
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
export function returnDon(state: GameState, playerId: PlayerId, donIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const donId of donIds) {
        const don = state.instances[donId] as DonInstance;
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


// Life

// Need to figure out if the origin matters
export function addLife(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    return state;
}

// Need to figure out if we want to separate this into different functions and different signals based on location and cause of life loss
export function removeLife(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    return state;
}