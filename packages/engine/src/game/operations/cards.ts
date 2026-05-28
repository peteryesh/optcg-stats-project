import { produce } from 'immer';
import { Action, GameSignal, GameState, PlayerId, SignalCause, DamageCause, CardInstanceId, DonInstance, StackPosition, Zone, PlayCause } from "../../types";
import { moveCard, getZoneArray, attachDon, detachDon, setActive, setRested } from "../mechanics";
import { emit } from "../emitter";
import { InvalidActionError } from "../../errors";

/**
 * Draws one or more cards to a player's hand.
 * @param state - Game state
 * @param playerId - Player to draw cards for
 * @param count - Number of cards to draw
 * @param signalCause - Reason for drawing cards (game rule or card effect)
 * @returns Game state with cards drawn from the deck and placed into the target player's hand
 */
export function cardsDraw(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
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
export function cardsDiscard(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    const playerHand = getZoneArray(state, playerId, "HAND");
    for (const instanceId of instanceIds) {
        if (!(playerHand.includes(instanceId))){
            throw new InvalidActionError(`${instanceId} not found in hand of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_DISCARDED", instanceIds: instanceIds, controller: playerId, cause: signalCause });
}

/**
 * Sets a list of cards as active. It is the responsibility of the caller to collect the cards to be set as active.
 * @param state - Game state
 * @param playerId - Player that owns the cards that are being set as active
 * @param instanceIds - Ids of cards to set as active
 * @param signalCause - Reason to set cards as active
 * @return Game state with the specified cards set as active
 */
export function cardsSetActive(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId in instanceIds) {
        const card = state.instances[instanceId];
        if (!card) throw new InvalidActionError(`${instanceId} not found in card instances`);
        if (card.class === "DON") {
            throw new InvalidActionError(`Wrong function used to set DON!! as active`);
        } 
        if (!(card.class === "CHARACTER" || card.class === "LEADER" || card.class === "STAGE")) {
            throw new InvalidActionError(`${instanceId} is not a valid target to set active`);
        }
        state = setActive(state, instanceId);
    }
    return emit(state, { type: "CARDS_SET_ACTIVE", instanceIds: instanceIds, controller: playerId, cause: signalCause });
}

/**
 * Sets a list of cards as rested. It is the responsibility of the caller to collect the cards to be set as rested.
 * @param state - Game state
 * @param playerId - Player that owns the cards that are being set as rested
 * @param instanceIds - Ids of cards to set as rested
 * @param signalCause - Reason to set cards as rested
 * @return Game state with the specified cards set as rested
 */
export function cardsSetRested(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId in instanceIds) {
        const card = state.instances[instanceId];
        if (!card) throw new InvalidActionError(`${instanceId} not found in card instances`);
        if (card.class === "DON") {
            throw new InvalidActionError(`Wrong function used to set DON!! as rested`);
        } 
        if (!(card.class === "CHARACTER" || card.class === "LEADER" || card.class === "STAGE")) {
            throw new InvalidActionError(`${instanceId} is not a valid target to set rested`);
        }
        state = setRested(state, instanceId);
    }
    return emit(state, { type: "CARDS_RESTED", instanceIds: instanceIds, controller: playerId, cause: signalCause });
}

export function playCardFromHand(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: PlayCause, index?: number): GameState {
    // Rest the prerequisite DON
    // Play character, go to character zone
        // Play at index, otherwise play at zone bottom
        // if full, enact card replacement
    // Play stage
        // Play to stage, if one exists, replace it
    // Play event
        // Play directly to trash
}