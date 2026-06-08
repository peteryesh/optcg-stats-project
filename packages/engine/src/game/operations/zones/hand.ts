import { InvalidActionError } from "../../../errors";
import { GameState, PlayerId, SignalCause, CardInstanceId, Zone } from "../../../types";
import { emit } from "../../emitter";
import { getCardInstance, getZoneArray, moveCard } from "../../mechanics";


export function _cardsAddToHand(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], fromZone: Zone, signalCause: SignalCause): GameState {
    for (const id of instanceIds) {
        const card = getCardInstance(state, id);
        if (card.class === "DON" || card.class === "LEADER") throw new InvalidActionError(`${id} has a card class of ${card.class} cannot be added to hand`);
        state = moveCard(state, id, "HAND", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: instanceIds, fromZone: fromZone, controller: playerId, cause: signalCause });
}

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
    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: cardsDrawn, fromZone: "DECK", controller: playerId, cause: signalCause });
}

export function sendTrashToHand(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const trash = getZoneArray(state, playerId, "TRASH");
        if (!(trash.includes(instanceId))){
            throw new InvalidActionError(`${instanceId} not found in trash of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "HAND", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: instanceIds, fromZone: "TRASH", controller: playerId, cause: signalCause });
}