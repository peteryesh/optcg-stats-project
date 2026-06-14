import { InvalidActionError } from "../../../errors";
import type { GameState, PlayerId, CardInstanceId, StackPosition, SignalCause, Zone } from "../../../types";
import { emit } from "../../emitter";
import { getCardInstance, getZoneArray, moveCard } from "../../mechanics";


export function _cardsMoveToTrash(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], fromZone: Zone, signalCause: SignalCause): GameState {
    for (const id of instanceIds) {
        const zone = getZoneArray(state, playerId, fromZone);
        if (!zone.includes(id)) {
            throw new InvalidActionError(`${id} not found in hand of player ${playerId}`);
        }
        const card = getCardInstance(state, id);
        if (card.class === "DON" || card.class === "LEADER") throw new InvalidActionError(`${id} has a card class of ${card.class} cannot be added to trash`);
        state = moveCard(state, id, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: instanceIds, fromZone: "HAND", controller: playerId, cause: signalCause });
}

/**
 * Discards one or more cards from a player's hand and moves them to the player's trash
 * @param state - Game state
 * @param playerId - Player to discard cards from
 * @param instanceIds - Array of card ids to discard
 * @param signalCause - Cause of discard action
 * @returns Game state with the cards specified discarded from the player's hand
 */
export function sendHandToTrash(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const playerHand = getZoneArray(state, playerId, "HAND");
        if (!(playerHand.includes(instanceId))){
            throw new InvalidActionError(`${instanceId} not found in hand of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: instanceIds, fromZone: "HAND", controller: playerId, cause: signalCause });
}

export function sendTopDeckToTrash(state: GameState, playerId: PlayerId, count: number, signalCause: SignalCause): GameState {
    const topDeck = [];
    // get all card ids to draw or until there are none left
    const deck = getZoneArray(state, playerId, "DECK");
    for (let i = 0; i < count; i++) {
        if (!deck[i]) break;
        topDeck.push(deck[i]);
    }
    if (topDeck.length === 0) return state;
    return _cardsMoveToTrash(state, playerId, topDeck, "DECK", signalCause);
}