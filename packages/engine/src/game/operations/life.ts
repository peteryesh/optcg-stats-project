import { produce } from 'immer';
import type { GameState, PlayerId, SignalCause, DamageCause, CardInstanceId, DonInstance, StackPosition, Zone } from "../../types";
import { moveCard, getZoneArray, attachDon, detachDon, getCardInstance } from "../mechanics";
import { emit } from "../emitter";
import { InvalidActionError } from "../../errors";

export function lifeAdd(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], fromZone: Zone, position: StackPosition, signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const zone = getCardInstance(state, instanceId).currentZone;
        if (!zone) throw new InvalidActionError(`${instanceId} has no current zone`);
        if (zone !== fromZone) throw new InvalidActionError(`Cannot add ${instanceId} to life from ${zone}, expected ${fromZone}`);
        state = moveCard(state, instanceId, "LIFE", position);
    }
    return emit(state, { type: "CARDS_SENT_TO_LIFE", instanceIds: instanceIds, fromZone: fromZone, position: position, controller: playerId, cause: signalCause });
}

export function lifeSentToHand(state: GameState, playerId: PlayerId, lifePosition: StackPosition, toZonePosition: StackPosition, signalCause: SignalCause): GameState {
    const lifeZone = getZoneArray(state, playerId, "LIFE");
    const lifeCardId = lifePosition === "TOP" ? lifeZone[0] : lifeZone.at(-1);
    if (!lifeCardId) return state;

    state = moveCard(state, lifeCardId, "HAND", toZonePosition);

    return emit(state, { type: "CARDS_SENT_TO_HAND", instanceIds: [lifeCardId], fromZone: "LIFE", controller: playerId, cause: signalCause });
}

export function lifeSentToDeck(state: GameState, playerId: PlayerId, lifePosition: StackPosition, toZonePosition: StackPosition, signalCause: SignalCause): GameState {
    const lifeZone = getZoneArray(state, playerId, "LIFE");
    const lifeCardId = lifePosition === "TOP" ? lifeZone[0] : lifeZone.at(-1);
    if (!lifeCardId) return state;

    state = moveCard(state, lifeCardId, "DECK", toZonePosition);

    return emit(state, { type: "CARDS_SENT_TO_DECK", instanceIds: [lifeCardId], fromZone: "LIFE", position: toZonePosition, controller: playerId, cause: signalCause });
}

export function lifeSentToTrash(state: GameState, playerId: PlayerId, lifePosition: StackPosition, signalCause: SignalCause): GameState {
    const lifeZone = getZoneArray(state, playerId, "LIFE");
    const lifeCardId = lifePosition === "TOP" ? lifeZone[0] : lifeZone.at(-1);
    if (!lifeCardId) return state;

    state = moveCard(state, lifeCardId, "TRASH", "TOP");

    return emit(state, { type: "CARDS_SENT_TO_TRASH", instanceIds: [lifeCardId], fromZone: "LIFE", controller: playerId, cause: signalCause });
}

export function dealDamage(state: GameState, playerId: PlayerId, cause: DamageCause, lifeDamaged: number = 1): GameState {
    const leaderId = getZoneArray(state, playerId, "LEADER")[0];
    if (!leaderId) throw new InvalidActionError(`No leader id found`);

    if (getZoneArray(state, playerId, "LIFE").length === 0) {
        const winner = getCardInstance(state, cause.sourceId).controller;
        state = produce(state, draft => {
            draft.winner = winner;
            draft.endReason = "KNOCKOUT";
        });
        return emit(state, { type: "DAMAGE_DEALT", instanceId: leaderId, controller: playerId, cause });
    }

    state = emit(state, { type: "DAMAGE_DEALT", instanceId: leaderId, controller: playerId, cause });

    for (let i = 0; i < lifeDamaged; i++) {
        const lifeZone = getZoneArray(state, playerId, "LIFE");
        if (lifeZone.length === 0) break;

        const topLifeCard = lifeZone[0];
        state = emit(state, { type: "LIFE_DAMAGED", instanceId: topLifeCard, controller: playerId, cause });
        state = lifeSentToHand(state, playerId, "TOP", "TOP", { kind: "DAMAGE", sourceId: cause.sourceId });
    }

    return state;
}