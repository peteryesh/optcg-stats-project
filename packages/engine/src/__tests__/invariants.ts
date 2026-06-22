import type { GameState } from "../types/state";
import type { Zone } from "../types/primitives";
import { getZoneArray } from "../game/mechanics";

const ALL_ZONES: Zone[] = [
    "CHARACTERS", "DECK", "DON_ACTIVE", "DON_DECK", "DON_RESTED",
    "HAND", "LEADER", "LIFE", "LOOK", "STAGE", "TRASH",
];

export function assertValidGameState(state: GameState): void {
    assertCardDefinitionsExist(state);
    assertStateReferencesValidCards(state);
    assertSingleCardLocation(state);
    assertValidCardZones(state);
    assertCurrentZoneConsistency(state);
    assertDonAttachmentConsistency(state);
    assertControllerZoneConsistency(state);
}

// Every card instance on the state has a matching card definition (except for DON)
export function assertCardDefinitionsExist(state: GameState): void {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON") continue;
        if (!state.definitions[instance.cardId]) {
            throw new Error(`Card definition missing for cardId "${instance.cardId}" on instance "${instance.instanceId}"`);
        }
    }
}

// Every card instance id in the game zones matches a card instance (no dead card instance id references)
export function assertStateReferencesValidCards(state: GameState): void {
    for (const playerId of state.config.playerIds) {
        for (const zone of ALL_ZONES) {
            for (const instanceId of getZoneArray(state, playerId, zone)) {
                if (!state.instances[instanceId]) {
                    throw new Error(`Zone ${zone} of player ${playerId} references unknown instance "${instanceId}"`);
                }
            }
        }
    }
}

// Every card instance id in the game zones is unique (no duplicates)
export function assertSingleCardLocation(state: GameState): void {
    const seen = new Map<string, string>();
    for (const playerId of state.config.playerIds) {
        for (const zone of ALL_ZONES) {
            for (const instanceId of getZoneArray(state, playerId, zone)) {
                if (seen.has(instanceId)) {
                    throw new Error(`Instance "${instanceId}" appears in both ${seen.get(instanceId)} and ${playerId}:${zone}`);
                }
                seen.set(instanceId, `${playerId}:${zone}`);
            }
        }
    }
}

// Every non-DON card instance has a current zone
// Every DON instance has a current zone OR their current zone is null and attachedTo is not null
export function assertValidCardZones(state: GameState): void {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON") {
            const inZone = instance.currentZone !== null;
            const isAttached = instance.currentZone === null && instance.attachedTo !== null;
            if (!inZone && !isAttached) {
                throw new Error(`DON instance "${instance.instanceId}" has no currentZone and no attachedTo`);
            }
        } else {
            if (instance.currentZone === null) {
                throw new Error(`Instance "${instance.instanceId}" (${instance.class}) has null currentZone`);
            }
        }
    }
}

// Every non-DON card instance's current zone must match its location
// Every non-attached DON instance's current zone matches its location
// Every DON with a null current zone and a non-null attachedTo is not in active or rested DON zones
export function assertCurrentZoneConsistency(state: GameState): void {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "DON" && instance.currentZone === null) {
            if (instance.attachedTo === null) {
                throw new Error(`DON instance "${instance.instanceId}" has null currentZone but null attachedTo`);
            }
            continue;
        }
        if (instance.currentZone === null) {
            throw new Error(`Instance "${instance.instanceId}" has null currentZone`);
        }
        const zoneArray = getZoneArray(state, instance.controller, instance.currentZone);
        if (!zoneArray.includes(instance.instanceId)) {
            throw new Error(`Instance "${instance.instanceId}" has currentZone "${instance.currentZone}" but is not found there`);
        }
    }
}

// Every card instance that has attached DON has that DON's attachedTo target as the correct card instance id
// Every DON instance that has attachedTo as not null is located on the target card
export function assertDonAttachmentConsistency(state: GameState): void {
    for (const instance of Object.values(state.instances)) {
        if (instance.class === "CHARACTER" || instance.class === "LEADER" || instance.class === "STAGE") {
            for (const donId of instance.attachedDon) {
                const don = state.instances[donId];
                if (!don || don.class !== "DON") {
                    throw new Error(`Instance "${instance.instanceId}" has attachedDon entry "${donId}" that is not a valid DON instance`);
                }
                if (don.attachedTo !== instance.instanceId) {
                    throw new Error(`DON "${donId}" is in attachedDon of "${instance.instanceId}" but its attachedTo is "${don.attachedTo}"`);
                }
            }
        }
        if (instance.class === "DON" && instance.attachedTo !== null) {
            const target = state.instances[instance.attachedTo];
            if (!target || target.class === "DON" || target.class === "EVENT") {
                throw new Error(`DON "${instance.instanceId}" has attachedTo "${instance.attachedTo}" which is not a valid attachment target`);
            }
            if (!target.attachedDon.includes(instance.instanceId)) {
                throw new Error(`DON "${instance.instanceId}" has attachedTo "${instance.attachedTo}" but is not in that card's attachedDon`);
            }
        }
    }
}

// Every instance id in a player's zone is controlled by that player
export function assertControllerZoneConsistency(state: GameState): void {
    for (const playerId of state.config.playerIds) {
        for (const zone of ALL_ZONES) {
            for (const instanceId of getZoneArray(state, playerId, zone)) {
                const instance = state.instances[instanceId];
                if (!instance) continue; // caught by assertStateReferencesValidCards
                if (instance.controller !== playerId) {
                    throw new Error(`Instance "${instanceId}" (controller: "${instance.controller}") found in zone ${zone} of player "${playerId}"`);
                }
            }
        }
    }
}

// Effect system invariants

// Assert that if there is no current effect, the look zone is empty