import type { GameState, PlayerZones } from "../../types/state";
import type { CardInstance, CardDef } from "../../types/card";
import type { CardInstanceId, PlayerId, Zone } from "../../types/primitives";

function emptyZones(): PlayerZones {
    return {
        characters: [],
        deck: [],
        donActive: [],
        donDeck: [],
        donRested: [],
        hand: [],
        leader: [],
        life: [],
        look: [],
        stage: [],
        trash: [],
    };
}

export function createTestState(
    players: PlayerId[] = ["p1", "p2"],
    instances: Record<CardInstanceId, CardInstance> = {},
    zoneOverrides: Partial<Record<PlayerId, Partial<PlayerZones>>> = {},
    definitions: Record<string, CardDef> = {},
): GameState {
    const playerZones: Record<PlayerId, PlayerZones> = {};
    for (const id of players) {
        playerZones[id] = { ...emptyZones(), ...zoneOverrides[id] };
    }

    const allDefinitions = { ...definitions };
    for (const instance of Object.values(instances)) {
        if (instance.class === "DON") continue;
        if (!allDefinitions[instance.cardId]) {
            allDefinitions[instance.cardId] = {
                id: instance.cardId,
                name: instance.cardId,
                class: instance.class,
                colors: [],
                types: [],
                attributes: [],
                aliases: [],
                restrictions: [],
            };
        }
    }

    return {
        version: 0,
        config: {
            gameId: "test",
            playerIds: players,
            seeds: {
                game: BigInt(0) as any,
                players: Object.fromEntries(players.map(id => [id, BigInt(0) as any])),
            },
        },
        setup: {
            coinFlipWinner: players[0],
            mulligan: Object.fromEntries(players.map(id => [id, "PENDING" as const])),
        },
        rngCursors: {
            game: BigInt(0),
            players: Object.fromEntries(players.map(id => [id, BigInt(0)])),
        },
        definitions: allDefinitions,
        instances,
        playerZones,
        turnOrder: players,
        turn: 1,
        activePlayerId: players[0],
        phase: "MAIN",
        cardsPlayedThisTurn: [],
        currentBattle: null,
        battlesThisTurn: [],
        currentEffect: null,
        pendingEffects: Object.fromEntries(players.map(id => [id, []])),
        pendingDecision: null,
        listeners: [],
        activatableEffects: [],
        statusEffects: [],
        actionLog: [],
        winner: null,
        endReason: null,
    };
}

let _nextId = 1;
export function resetIds() { _nextId = 1; }

export function makeCharacterInstance(
    overrides: Partial<{ instanceId: CardInstanceId; controller: PlayerId; cardId: string; currentZone: Zone; }> = {}
): CardInstance {
    const instanceId = overrides.instanceId ?? `card-${_nextId++}`;
    return {
        instanceId,
        cardId: overrides.cardId ?? "test-card",
        controller: overrides.controller ?? "p1",
        class: "CHARACTER",
        currentZone: overrides.currentZone ?? "DECK",
        isRested: false,
        attachedDon: [],
        playedOnTurns: [],
        effectsUsedThisTurn: {},
    };
}

export function makeDonInstance(
    overrides: Partial<{ instanceId: CardInstanceId; controller: PlayerId; }> = {}
): CardInstance {
    const instanceId = overrides.instanceId ?? `don-${_nextId++}`;
    return {
        instanceId,
        class: "DON",
        controller: overrides.controller ?? "p1",
        currentZone: "DON_DECK",
        isRested: false,
        attachedTo: null,
        donValue: 1,
    };
}

export function makeLeaderInstance(
    overrides: Partial<{ instanceId: CardInstanceId; controller: PlayerId; cardId: string; }> = {}
): CardInstance {
    const instanceId = overrides.instanceId ?? `leader-${_nextId++}`;
    return {
        instanceId,
        cardId: overrides.cardId ?? "test-leader",
        controller: overrides.controller ?? "p1",
        class: "LEADER",
        currentZone: "LEADER",
        isRested: false,
        attachedDon: [],
        effectsUsedThisTurn: {},
    };
}
