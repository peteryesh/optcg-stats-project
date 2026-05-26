import { describe, it, expect } from "vitest";
import {
    createEmptyGameState,
    emptyPlayerZones,
    setupEffectQueue,
    initGame,
} from "../game/setup";
import {
    createInstance,
    instantiateLeader,
    instantiateDeck,
    instantiateDon,
    instantiatePlayerBoard,
} from "../game/instances";
import { assertInvariants } from "./invariants";
import {
    MOCK_LEADER_ID,
    MOCK_CHAR_ID,
    MOCK_EVENT_ID,
    MOCK_STAGE_ID,
    mockDefs,
    mockDecklist,
    mockSeeds,
    mockConfig,
    makeEmptyState,
    setupTestGame,
} from "./fixtures";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const PLAYERS: PlayerId[] = [P1, P2];

// ============================================================
// createEmptyGameState
// ============================================================

describe("createEmptyGameState", () => {
    it("sets gameId", () => {
        expect(makeEmptyState().gameId).toBe("test-game");
    });

    it("sets turnOrder from playerIds", () => {
        expect(makeEmptyState().turnOrder).toEqual(PLAYERS);
    });

    it("sets phase to SETUP", () => {
        expect(makeEmptyState().phase).toBe("SETUP");
    });

    it("sets activePlayerId to first player", () => {
        expect(makeEmptyState().activePlayerId).toBe(P1);
    });

    it("starts with no instances", () => {
        expect(Object.keys(makeEmptyState().instances)).toHaveLength(0);
    });

    it("initializes all player zones as empty", () => {
        const state = makeEmptyState();
        for (const id of PLAYERS) {
            const z = state.playerZones[id];
            expect(z.deck).toHaveLength(0);
            expect(z.hand).toHaveLength(0);
            expect(z.life).toHaveLength(0);
            expect(z.trash).toHaveLength(0);
            expect(z.characters).toEqual([]);
            expect(z.donDeck).toHaveLength(0);
            expect(z.donActive).toHaveLength(0);
            expect(z.donRested).toHaveLength(0);
            expect(z.look).toHaveLength(0);
            expect(z.stage).toHaveLength(0);
            expect(z.leader).toHaveLength(0);
        }
    });

    it("advances game rng cursor past coin flip, player cursors start at 0n", () => {
        const state = makeEmptyState();
        expect(state.rngCursors.game).toBeGreaterThan(0n);
        expect(state.rngCursors.players[P1]).toBe(0n);
        expect(state.rngCursors.players[P2]).toBe(0n);
    });

    it("stores seeds on state", () => {
        const seeds = mockSeeds(PLAYERS);
        const state = createEmptyGameState("g", PLAYERS, seeds, mockConfig(PLAYERS));
        expect(state.seeds).toEqual(seeds);
    });

    it("starts with no pending decision", () => {
        expect(makeEmptyState().pendingDecision).toBeNull();
    });

    it("starts with no winner", () => {
        const state = makeEmptyState();
        expect(state.winner).toBeNull();
        expect(state.endReason).toBeNull();
    });

    it("starts with empty action log", () => {
        expect(makeEmptyState().actionLog).toHaveLength(0);
    });

    it("initializes modifier layers as empty", () => {
        const state = makeEmptyState();
        expect(state.continuousEffects).toHaveLength(0);
        expect(state.replacementEffects).toHaveLength(0);
        expect(state.effectSuppressions).toHaveLength(0);
        expect(Object.keys(state.listeners)).toHaveLength(0);
    });

    it("initializes pending effects as empty per player", () => {
        const state = makeEmptyState();
        for (const id of PLAYERS) {
            expect(state.pendingEffects[id]).toHaveLength(0);
        }
    });

    it("stores config", () => {
        const config = mockConfig(PLAYERS);
        const state = createEmptyGameState("g", PLAYERS, mockSeeds(PLAYERS), config);
        expect(state.config).toEqual(config);
    });

    it("works for 4 players", () => {
        const ids: PlayerId[] = ["p1", "p2", "p3", "p4"];
        const state = makeEmptyState(ids);
        expect(state.turnOrder).toEqual(ids);
        expect(Object.keys(state.playerZones)).toHaveLength(4);
        expect(Object.keys(state.rngCursors.players)).toHaveLength(4);
        expect(Object.keys(state.pendingEffects)).toHaveLength(4);
    });

    it("passes invariants", () => {
        assertInvariants(makeEmptyState());
    });
});

// ============================================================
// emptyPlayerZones
// ============================================================

describe("emptyPlayerZones", () => {
    it("returns a key for each player", () => {
        const zones = emptyPlayerZones(PLAYERS);
        expect(Object.keys(zones)).toEqual(PLAYERS);
    });

    it("all array zones start empty", () => {
        const zones = emptyPlayerZones(PLAYERS);
        for (const id of PLAYERS) {
            expect(zones[id].deck).toEqual([]);
            expect(zones[id].hand).toEqual([]);
            expect(zones[id].life).toEqual([]);
            expect(zones[id].trash).toEqual([]);
            expect(zones[id].characters).toEqual([]);
            expect(zones[id].donDeck).toEqual([]);
            expect(zones[id].donActive).toEqual([]);
            expect(zones[id].donRested).toEqual([]);
            expect(zones[id].look).toEqual([]);
        }
    });

    it("stage and leader start null", () => {
        const zones = emptyPlayerZones(PLAYERS);
        for (const id of PLAYERS) {
            expect(zones[id].stage).toHaveLength(0);
            expect(zones[id].leader).toHaveLength(0);
        }
    });

    it("each player gets independent zone objects", () => {
        const zones = emptyPlayerZones(PLAYERS);
        zones[P1].deck.push("p1-CARD-0" as CardInstanceId);
        expect(zones[P2].deck).toHaveLength(0);
    });

    it("works for a single player", () => {
        const zones = emptyPlayerZones([P1]);
        expect(Object.keys(zones)).toHaveLength(1);
        expect(zones[P1].deck).toEqual([]);
    });
});

// ============================================================
// setupEffectQueue
// ============================================================

describe("setupEffectQueue", () => {
    it("returns a key for each player", () => {
        const queue = setupEffectQueue(PLAYERS);
        expect(Object.keys(queue)).toEqual(PLAYERS);
    });

    it("each player queue starts empty", () => {
        const queue = setupEffectQueue(PLAYERS);
        for (const id of PLAYERS) {
            expect(queue[id]).toEqual([]);
        }
    });

    it("works for a single player", () => {
        const queue = setupEffectQueue([P1]);
        expect(Object.keys(queue)).toHaveLength(1);
        expect(queue[P1]).toEqual([]);
    });

    it("works for 4 players", () => {
        const ids: PlayerId[] = ["p1", "p2", "p3", "p4"];
        const queue = setupEffectQueue(ids);
        expect(Object.keys(queue)).toHaveLength(4);
    });
});

// ============================================================
// createInstance
// ============================================================

describe("createInstance", () => {
    it("creates a LEADER instance with correct shape", () => {
        const id = `${P1}-LEADER` as CardInstanceId;
        const inst = createInstance(id, "LEADER", P1, mockDefs[MOCK_LEADER_ID]);
        expect(inst.class).toBe("LEADER");
        expect(inst.instanceId).toBe(id);
        expect(inst.controller).toBe(P1);
        expect(inst.isRested).toBe(false);
        if (inst.class === "LEADER") {
            expect(inst.cardId).toBe(MOCK_LEADER_ID);
            expect(inst.attachedDon).toEqual([]);
            expect(inst.effectsUsedThisTurn).toEqual({});
        }
    });

    it("creates a CHARACTER instance with correct shape", () => {
        const id = `${P1}-CARD-0` as CardInstanceId;
        const inst = createInstance(id, "CHARACTER", P1, mockDefs[MOCK_CHAR_ID]);
        expect(inst.class).toBe("CHARACTER");
        if (inst.class === "CHARACTER") {
            expect(inst.cardId).toBe(MOCK_CHAR_ID);
            expect(inst.attachedDon).toEqual([]);
            expect(inst.playedOnTurns).toEqual([]);
            expect(inst.effectsUsedThisTurn).toEqual({});
        }
    });

    it("creates a STAGE instance with correct shape", () => {
        const id = `${P1}-CARD-0` as CardInstanceId;
        const inst = createInstance(id, "STAGE", P1, mockDefs[MOCK_STAGE_ID]);
        expect(inst.class).toBe("STAGE");
        if (inst.class === "STAGE") {
            expect(inst.cardId).toBe(MOCK_STAGE_ID);
            expect(inst.playedOnTurns).toEqual([]);
            expect(inst.effectsUsedThisTurn).toEqual({});
        }
    });

    it("creates an EVENT instance with correct shape", () => {
        const id = `${P1}-CARD-0` as CardInstanceId;
        const inst = createInstance(id, "EVENT", P1, mockDefs[MOCK_EVENT_ID]);
        expect(inst.class).toBe("EVENT");
        if (inst.class === "EVENT") {
            expect(inst.cardId).toBe(MOCK_EVENT_ID);
            expect(inst.playedOnTurns).toEqual([]);
        }
    });

    it("creates a DON instance without a cardDef", () => {
        const id = `${P1}-DON-0` as CardInstanceId;
        const inst = createInstance(id, "DON", P1);
        expect(inst.class).toBe("DON");
        expect(inst.instanceId).toBe(id);
        expect(inst.controller).toBe(P1);
        if (inst.class === "DON") {
            expect(inst.attachedTo).toBeNull();
        }
    });

    it("throws for an unknown card class", () => {
        expect(() =>
            createInstance(`${P1}-X` as CardInstanceId, "UNKNOWN" as any, P1)
        ).toThrow();
    });
});

// ============================================================
// instantiateLeader
// ============================================================

describe("instantiateLeader", () => {
    it("adds the leader instance to state.instances", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        expect(next.instances[`${P1}-LEADER` as CardInstanceId]).toBeDefined();
    });

    it("sets the leader zone for the controller", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        expect(next.playerZones[P1].leader).toContain(`${P1}-LEADER`);
    });

    it("instance has class LEADER and correct cardId", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        const inst = next.instances[`${P1}-LEADER` as CardInstanceId];
        expect(inst.class).toBe("LEADER");
        if (inst.class === "LEADER") {
            expect(inst.cardId).toBe(MOCK_LEADER_ID);
            expect(inst.controller).toBe(P1);
        }
    });

    it("does not affect the other player's leader zone", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        expect(next.playerZones[P2].leader).toHaveLength(0);
    });

    it("does not mutate the original state", () => {
        const state = makeEmptyState();
        instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        expect(state.playerZones[P1].leader).toHaveLength(0);
        expect(Object.keys(state.instances)).toHaveLength(0);
    });

    it("only adds one instance", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        expect(Object.keys(next.instances)).toHaveLength(1);
    });

    it("leader instance currentZone is LEADER", () => {
        const state = makeEmptyState();
        const next = instantiateLeader(state, MOCK_LEADER_ID, mockDefs, P1);
        const inst = next.instances[`${P1}-LEADER` as CardInstanceId];
        expect(inst.currentZone).toBe("LEADER");
    });
});

// ============================================================
// instantiateDeck
// ============================================================

describe("instantiateDeck", () => {
    const DECK = Array(50).fill(MOCK_CHAR_ID);

    it("adds one instance per card", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        expect(Object.keys(next.instances)).toHaveLength(50);
    });

    it("places all instances in the deck zone", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        expect(next.playerZones[P1].deck).toHaveLength(50);
    });

    it("uses {controller}-CARD-{index} as instance IDs", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        expect(next.playerZones[P1].deck[0]).toBe(`${P1}-CARD-0`);
        expect(next.playerZones[P1].deck[49]).toBe(`${P1}-CARD-49`);
    });

    it("each instance references the correct cardId", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        const inst = next.instances[`${P1}-CARD-0` as CardInstanceId];
        expect(inst.class).toBe("CHARACTER");
        if (inst.class === "CHARACTER") {
            expect(inst.cardId).toBe(MOCK_CHAR_ID);
        }
    });

    it("does not affect the other player", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        expect(next.playerZones[P2].deck).toHaveLength(0);
    });

    it("does not mutate the original state", () => {
        const state = makeEmptyState();
        instantiateDeck(state, DECK, mockDefs, P1);
        expect(state.playerZones[P1].deck).toHaveLength(0);
    });

    it("works for a small deck", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, [MOCK_CHAR_ID, MOCK_CHAR_ID], mockDefs, P1);
        expect(next.playerZones[P1].deck).toHaveLength(2);
        expect(Object.keys(next.instances)).toHaveLength(2);
    });

    it("all deck instances have currentZone DECK", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        for (const id of next.playerZones[P1].deck) {
            expect(next.instances[id].currentZone).toBe("DECK");
        }
    });

    it("passes invariants", () => {
        const state = makeEmptyState();
        const next = instantiateDeck(state, DECK, mockDefs, P1);
        assertInvariants(next);
    });
});

// ============================================================
// instantiateDon
// ============================================================

describe("instantiateDon", () => {
    const DON_COUNT = 10;

    it("adds the correct number of DON instances", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        expect(Object.keys(next.instances)).toHaveLength(DON_COUNT);
    });

    it("places all DON in the donDeck zone", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        expect(next.playerZones[P1].donDeck).toHaveLength(DON_COUNT);
    });

    it("uses {controller}-DON-{index} as instance IDs", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        expect(next.playerZones[P1].donDeck[0]).toBe(`${P1}-DON-0`);
        expect(next.playerZones[P1].donDeck[9]).toBe(`${P1}-DON-9`);
    });

    it("all DON instances have class DON and attachedTo null", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        for (let i = 0; i < DON_COUNT; i++) {
            const inst = next.instances[`${P1}-DON-${i}` as CardInstanceId];
            expect(inst.class).toBe("DON");
            if (inst.class === "DON") {
                expect(inst.attachedTo).toBeNull();
            }
        }
    });

    it("does not affect the other player", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        expect(next.playerZones[P2].donDeck).toHaveLength(0);
    });

    it("does not mutate the original state", () => {
        const state = makeEmptyState();
        instantiateDon(state, DON_COUNT, P1);
        expect(state.playerZones[P1].donDeck).toHaveLength(0);
    });

    it("works for donCount = 0", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, 0, P1);
        expect(Object.keys(next.instances)).toHaveLength(0);
        expect(next.playerZones[P1].donDeck).toHaveLength(0);
    });

    it("all DON instances have currentZone DON_DECK", () => {
        const state = makeEmptyState();
        const next = instantiateDon(state, DON_COUNT, P1);
        for (const id of next.playerZones[P1].donDeck) {
            expect(next.instances[id].currentZone).toBe("DON_DECK");
        }
    });
});

// ============================================================
// instantiatePlayerBoard
// ============================================================

describe("instantiatePlayerBoard", () => {
    it("sets up leader for the player", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(next.playerZones[P1].leader).toContain(`${P1}-LEADER`);
    });

    it("fills the deck zone with 50 cards", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(next.playerZones[P1].deck).toHaveLength(50);
    });

    it("fills the donDeck zone with 10 DON", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(next.playerZones[P1].donDeck).toHaveLength(10);
    });

    it("total instances = 1 (leader) + 50 (deck) + 10 (don) = 61", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(Object.keys(next.instances)).toHaveLength(61);
    });

    it("does not affect the other player's zones", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(next.playerZones[P2].leader).toHaveLength(0);
        expect(next.playerZones[P2].deck).toHaveLength(0);
        expect(next.playerZones[P2].donDeck).toHaveLength(0);
    });

    it("does not mutate the original state", () => {
        const state = makeEmptyState();
        instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        expect(Object.keys(state.instances)).toHaveLength(0);
    });

    it("deck instance IDs are namespaced to the controller", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        for (const id of next.playerZones[P1].deck) {
            expect(id).toContain(P1);
        }
    });

    it("each instance's currentZone matches its actual zone", () => {
        const state = makeEmptyState();
        const next = instantiatePlayerBoard(state, mockDecklist(), mockDefs, P1);
        const leaderId = next.playerZones[P1].leader[0];
        expect(next.instances[leaderId].currentZone).toBe("LEADER");
        for (const id of next.playerZones[P1].deck) {
            expect(next.instances[id].currentZone).toBe("DECK");
        }
        for (const id of next.playerZones[P1].donDeck) {
            expect(next.instances[id].currentZone).toBe("DON_DECK");
        }
    });
});

// ============================================================
// initGame
// ============================================================

describe("initGame", () => {
    it("stores the gameId", () => {
        const state = setupTestGame();
        expect(state.gameId).toBe("test-game");
    });

    it("both players have a leader", () => {
        const state = setupTestGame();
        expect(state.playerZones[P1].leader).not.toHaveLength(0);
        expect(state.playerZones[P2].leader).not.toHaveLength(0);
    });

    it("both players have 50 cards in their deck", () => {
        const state = setupTestGame();
        expect(state.playerZones[P1].deck).toHaveLength(50);
        expect(state.playerZones[P2].deck).toHaveLength(50);
    });

    it("both players have 10 DON in their donDeck", () => {
        const state = setupTestGame();
        expect(state.playerZones[P1].donDeck).toHaveLength(10);
        expect(state.playerZones[P2].donDeck).toHaveLength(10);
    });

    it("total instances = 2 * (1 + 50 + 10) = 122", () => {
        const state = setupTestGame();
        expect(Object.keys(state.instances)).toHaveLength(122);
    });

    it("deck instance IDs are namespaced per player", () => {
        const state = setupTestGame();
        for (const id of state.playerZones[P1].deck) {
            expect(id).toContain(P1);
        }
        for (const id of state.playerZones[P2].deck) {
            expect(id).toContain(P2);
        }
    });

    it("leader instance IDs are namespaced per player", () => {
        const state = setupTestGame();
        expect(state.playerZones[P1].leader[0]).toContain(P1);
        expect(state.playerZones[P2].leader[0]).toContain(P2);
    });

    it("phase is SETUP", () => {
        expect(setupTestGame().phase).toBe("SETUP");
    });

    it("starts with no winner", () => {
        const state = setupTestGame();
        expect(state.winner).toBeNull();
        expect(state.endReason).toBeNull();
    });

    it("seeds are stored on state", () => {
        const seeds = mockSeeds(PLAYERS);
        const state = initGame({
            gameId: "g",
            playerIds: PLAYERS,
            seeds,
            config: mockConfig(PLAYERS),
            defs: mockDefs,
            decks: Object.fromEntries(PLAYERS.map(id => [id, mockDecklist()])),
        });
        expect(state.seeds).toEqual(seeds);
    });
});
