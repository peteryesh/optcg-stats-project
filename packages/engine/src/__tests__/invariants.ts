import type { GameState } from "../types/state";
import type { Zone } from "../types/primitives";
import { getZoneArray } from "../game/mechanics";

const ALL_ZONES: Zone[] = [
    "CHARACTERS", "DECK", "DON_ACTIVE", "DON_DECK", "DON_RESTED",
    "HAND", "LEADER", "LIFE", "LOOK", "STAGE", "TRASH",
];

export function assertValidGameState(state: GameState): boolean {
    return assertCardDefinitionsExist(state)
    && assertStateReferencesValidCards(state)
    && assertSingleCardLocation(state)
    && assertValidCardZones(state)
    && assertCurrentZoneConsistency(state)
    && assertDonAttachmentConsistency(state)
    && assertDecisionContext(state);
}

// Every card instance on the state has a matching card definition (except for DON)
export function assertCardDefinitionsExist(state: GameState): boolean {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON") continue;
        if (!state.definitions[instance.cardId]) return false;
    }
    return true;
}

// Every card instance id in the game zones matches a card instance (no dead card instance id references)
export function assertStateReferencesValidCards(state: GameState): boolean {
    for (const playerId of state.config.playerIds) {
        for (const zone of ALL_ZONES) {
            for (const instanceId of getZoneArray(state, playerId, zone)) {
                if (!state.instances[instanceId]) return false;
            }
        }
    }
    return true;
}

// Every card instance id in the game zones is unique (no duplicates)
export function assertSingleCardLocation(state: GameState): boolean {
    const seen = new Set<string>();
    for (const playerId of state.config.playerIds) {
        for (const zone of ALL_ZONES) {
            for (const instanceId of getZoneArray(state, playerId, zone)) {
                if (seen.has(instanceId)) return false;
                seen.add(instanceId);
            }
        }
    }
    return true;
}

// Every non-DON card instance has a current zone
// Every DON instance has a current zone OR their current zone is null and attachedTo is not null
export function assertValidCardZones(state: GameState): boolean {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON") {
            const inZone = instance.currentZone !== null;
            const isAttached = instance.currentZone === null && instance.attachedTo !== null;
            if (!inZone && !isAttached) return false;
        } else {
            if (instance.currentZone === null) return false;
        }
    }
    return true;
}

// Every non-DON card instance's current zone must match its location
// Every non-attached DON instance's current zone matches its location
// Every DON with a null current zone and a non-null attachedTo is not in active or rested DON zones
export function assertCurrentZoneConsistency(state: GameState): boolean {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON" && instance.currentZone === null) {
            if (instance.attachedTo === null) return false;
            continue;
        }
        if (instance.currentZone === null) return false;
        const zoneArray = getZoneArray(state, instance.controller, instance.currentZone);
        if (!zoneArray.includes(instance.instanceId)) return false;
    }
    return true;
}

// Every card instance that has attached DON has that DON's attachedTo target as the correct card instance id
// Every DON instance that has attachedTo as not null is located on the target card
export function assertDonAttachmentConsistency(state: GameState): boolean {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "CHARACTER" || instance.class === "LEADER" || instance.class === "STAGE") {
            for (const donId of instance.attachedDon) {
                const don = state.instances[donId];
                if (!don || don.class !== "DON") return false;
                if (don.attachedTo !== instance.instanceId) return false;
            }
        }
        if (instance.class === "DON" && instance.attachedTo !== null) {
            const target = state.instances[instance.attachedTo];
            if (!target || target.class === "DON" || target.class === "EVENT") return false;
            if (!target.attachedDon.includes(instance.instanceId)) return false;
        }
    }
    return true;
}


// Pending Decision Invariants

// If pendingDecision is not null, either currentEffect is not null or there is a player with a non-empty pendingEffects array
export function assertDecisionContext(state: GameState): boolean {
    if (state.pendingDecision === null) return true;
    if (state.currentEffect !== null) return true;
    return state.config.playerIds.some(id => state.pendingEffects[id]?.length > 0);
}