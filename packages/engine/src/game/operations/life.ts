import { produce } from 'immer';
import { Action, GameSignal, GameState, PlayerId, SignalCause, DamageCause, CardInstanceId, DonInstance, StackPosition, Zone } from "../../types";
import { moveCard, getZoneArray, attachDon, detachDon } from "../mechanics";
import { emit } from "../emitter";
import { InvalidActionError } from "../../errors";

export function lifeAdd(state: GameState, playerId: PlayerId, instanceIds: CardInstanceId[], position: StackPosition, signalCause: SignalCause): GameState {
    for (const instanceId of instanceIds) {
        const fromZone = state.instances[instanceId].currentZone!;
        state = moveCard(state, instanceId, "LIFE", position);
        state = emit(state, { type: "LIFE_ADDED", instanceId, controller: playerId, fromZone, position, cause: signalCause });
    }
    return state;
}

// Need to figure out if we want to separate this into different functions and different signals based on location and cause of life loss
export function lifeRemove(state: GameState, playerId: PlayerId, lifePosition: StackPosition, destination: Zone, destinationPosition: StackPosition, signalCause: SignalCause): GameState {
    const lifeZone = getZoneArray(state, playerId, "LIFE");
    const lifeCardId = lifePosition === "TOP" ? lifeZone[0] : lifeZone.at(-1);
    if (!lifeCardId) return state;

    state = moveCard(state, lifeCardId, destination, destinationPosition);

    return emit(state, { type: "LIFE_REMOVED", instanceId: lifeCardId, controller: playerId, lifePosition: lifePosition, destination: destination, destinationPosition: destinationPosition, cause: signalCause })
}

export function dealDamage(state: GameState, playerId: PlayerId, cause: DamageCause, lifeDamaged: number = 1): GameState {
    const leaderId = getZoneArray(state, playerId, "LEADER")[0];
    if (!leaderId) throw new InvalidActionError(`No leader id found`);

    if (getZoneArray(state, playerId, "LIFE").length === 0) {
        const winner = state.instances[cause.sourceId].controller;
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
        state = lifeRemove(state, playerId, "TOP", "HAND", "TOP", { kind: "DAMAGE", sourceId: cause.sourceId });
    }

    return state;
}