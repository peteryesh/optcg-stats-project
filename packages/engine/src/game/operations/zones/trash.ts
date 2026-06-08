import { InvalidActionError } from "../../../errors";
import type { GameState, PlayerId, CardInstanceId, StackPosition, SignalCause } from "../../../types";
import { emit } from "../../emitter";
import { getZoneArray, moveCard } from "../../mechanics";

/**
 * Discards one or more cards from a player's hand and moves them to the player's trash
 * @param state - Game state
 * @param playerId - Player to discard cards from
 * @param instanceIds - Array of card ids to discard
 * @param signalCause - Cause of discard action
 * @returns Game state with the cards specified discarded from the player's hand
 */
export function cardsTrashFromHand(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const playerHand = getZoneArray(state, playerId, "HAND");
        if (!(playerHand.includes(instanceId))){
            throw new InvalidActionError(`${instanceId} not found in hand of player ${playerId}`);
        }
        state = moveCard(state, instanceId, "TRASH", "TOP");
    }
    return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: instanceIds, fromZone: "HAND", controller: playerId, cause: signalCause });
}