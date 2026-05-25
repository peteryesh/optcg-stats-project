import { GameState, CardInstanceId, PlayerId, Zone, PlayerZones, DonInstance } from "../types";

// Mapping from PlayerZones property keys to Zone enum values.
// findZoneOf iterates Object.entries(zones) which yields camelCase keys;
// these must be normalized before comparing to instance.currentZone.
const ZONE_KEY_TO_ZONE: Record<string, Zone> = {
    deck: "DECK",
    hand: "HAND",
    life: "LIFE",
    trash: "TRASH",
    characters: "CHARACTERS",
    stage: "STAGE",
    leader: "LEADER",
    donDeck: "DON_DECK",
    donActive: "DON_ACTIVE",
    donRested: "DON_RESTED",
    look: "LOOK",
};

export function assertInvariants(state: GameState): void {
    // Every ID in a zone has a corresponding instance
    for (const [playerId, zones] of Object.entries(state.playerZones)) {
        for (const zone of getAllZoneArrays(zones)) {
            for (const instanceId of zone) {
                if (!state.instances[instanceId]) {
                    throw new Error(
                        `Zone contains unknown instanceId: ${instanceId} for player ${playerId}`
                    );
                }
            }
        }
    }

    // instance.currentZone matches actual zone location
    for (const [instanceId, instance] of Object.entries(state.instances)) {
        const actualZone = findZoneOf(state, instanceId as CardInstanceId);
        if (actualZone !== instance.currentZone) {
            throw new Error(
                `Instance ${instanceId} has currentZone "${instance.currentZone}" but is actually in "${actualZone}"`
            );
        }
    }

    // DON!! attachment invariant
    for (const [instanceId, instance] of Object.entries(state.instances)) {
        if (instance.class === "DON" && instance.attachedTo) {
            const target = state.instances[instance.attachedTo];
            if (!target) {
                throw new Error(`DON!! ${instanceId} attached to unknown instance ${instance.attachedTo}`);
            }
            if (!("attachedDon" in target) || !target.attachedDon.includes(instanceId as CardInstanceId)) {
                throw new Error(`DON!! ${instanceId} attachedTo ${instance.attachedTo} but not in their attachedDon`);
            }
        }

        if ("attachedDon" in instance) {
            for (const donId of instance.attachedDon) {
                const don = state.instances[donId] as DonInstance;
                if (!don) {
                    throw new Error(`Instance ${instanceId} has unknown DON!! ${donId} in attachedDon`);
                }
                if (don.class !== "DON" || don.attachedTo !== instanceId) {
                    throw new Error(`DON!! ${donId} in attachedDon of ${instanceId} but attachedTo is ${don.attachedTo}`);
                }
            }
        }
    }
}

function getAllZoneArrays(zones: PlayerZones): CardInstanceId[][] {
    return [
        zones.characters,
        zones.deck, zones.donActive, zones.donDeck,
        zones.donRested, zones.hand, zones.leader, zones.life,
        zones.look, zones.stage, zones.trash,
    ];
}

function findZoneOf(state: GameState, instanceId: CardInstanceId): Zone | null {
    for (const [, zones] of Object.entries(state.playerZones)) {
        for (const [zoneName, zone] of Object.entries(zones)) {
            const mappedZone = ZONE_KEY_TO_ZONE[zoneName];
            if (!mappedZone) continue;
            if (Array.isArray(zone) && zone.includes(instanceId)) {
                return mappedZone;
            }
            if (zone === instanceId) {
                return mappedZone;
            }
        }
    }
    return null;
}
