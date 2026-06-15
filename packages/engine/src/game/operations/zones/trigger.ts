import type { GameState, PlayerId, SignalCause, DamageCause, CardInstanceId, DonInstance, StackPosition, Zone } from "../../../types";
import { moveCard, getZoneArray, attachDon, detachDon, getCardInstance } from "../../mechanics";
import { emit } from "../../emitter";
import { InvalidActionError } from "../../../errors";
import { sendLifeToHand } from './hand';
import { _cardsMoveToTrash } from './trash';

// TRIGGER Zone Operations
// Transient Effect Zone

export function sendTopLifeToTrigger(state: GameState, playerId: PlayerId, instanceId: CardInstanceId, signalCause: SignalCause): GameState {
    const life = getZoneArray(state, playerId, "LIFE");
    if (life.length <= 0) throw new InvalidActionError(`${playerId} has no life to consider for trigger`);
    state = moveCard(state, life[0], "TRIGGER", "TOP");
    return emit(state, { type: "CARD_SENT_TO_TRIGGER", instanceId: instanceId, fromZone: "LIFE", controller: playerId, cause: signalCause });
}

export function sendTriggerToTrash(state: GameState, playerId: PlayerId, signalCause: SignalCause): GameState {
    const triggerZone = getZoneArray(state, playerId, "TRIGGER");
    if (triggerZone.length !== 1) throw new InvalidActionError(`Look zone has an invalid amount of card ids: ${triggerZone.length}`);
    return _cardsMoveToTrash(state, playerId, triggerZone, "TRIGGER", signalCause);
}