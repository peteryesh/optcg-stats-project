import type { GameState, PlayerId, StackPosition, Zone, CardInstanceId, SignalCause } from "../../../types";
import { InvalidActionError } from "../../../errors";
import { moveCard, getZoneArray, getCardInstance } from "../../mechanics";
import { emit } from "../../emitter";

export function _cardsMoveToDeck(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], fromZone: Zone, position: StackPosition, signalCause: SignalCause): GameState {
    for (const id of instanceIds) {
        const zone = getZoneArray(state, playerId, fromZone);
        if (!zone.includes(id)) throw new InvalidActionError(`${id} not found in zone ${fromZone} of player ${playerId}`);
        const card = getCardInstance(state, id);
        if (card.class === "DON" || card.class === "LEADER") throw new InvalidActionError(`${id} has a card class of ${card.class} cannot be added to life`);
        state = moveCard(state, id, "DECK", position);
    }
    return emit(state, { type: "CARDS_SENT_TO_DECK", instanceIds: instanceIds, fromZone: fromZone, position: position, controller: playerId, cause: signalCause });
}

export function sendHandToDeck(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], position: StackPosition, signalCause: SignalCause): GameState {
    return _cardsMoveToDeck(state, playerId, instanceIds, "HAND", position, signalCause);
}