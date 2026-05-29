import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    getZoneArray,
    moveCard,
    removeFromZone,
    addToZone,
    insertCardAtZoneIndex,
    replaceCardAtZoneIndex,
    setActive,
    setRested,
    attachDon,
    detachDon,
    donReattach,
} from "../game/mechanics";
import { createInstance } from "../game/instantiation";
import { assertInvariants } from "./invariants";
import {
    setupTestGame,
    makeEmptyState,
    mockDefs,
    mockDecklist,
    mockSeeds,
    mockConfig,
    MOCK_CHAR_ID,
    MOCK_STAGE_ID,
    MOCK_LEADER_ID,
} from "./fixtures";
import { initGame } from "../game/init";
import { CHARACTERS_MAX } from "../game/rules";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const PLAYERS: PlayerId[] = [P1, P2];

// Setup helpers
// p1-CARD-49 is a STAGE when the last deck slot uses MOCK_STAGE_ID
function makeStateWithStage() {
    const state = initGame({
        gameId: "test-game",
        playerIds: PLAYERS,
        seeds: mockSeeds(PLAYERS),
        config: mockConfig(PLAYERS),
        defs: mockDefs,
        decks: {
            [P1]: mockDecklist({ deck: [...Array(49).fill(MOCK_CHAR_ID), MOCK_STAGE_ID] }),
            [P2]: mockDecklist(),
        },
    });
    return { state, stageId: "p1-CARD-49" as CardInstanceId };
}

// ============================================================
// getZoneArray
// ============================================================

describe("getZoneArray", () => {
    it("returns the deck array", () => {
        const state = setupTestGame();
        const deck = getZoneArray(state, P1, "DECK");
        expect(deck).toHaveLength(50);
        expect(deck[0]).toBe("p1-CARD-0");
    });

    it("returns the hand array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "HAND")).toHaveLength(0);
    });

    it("returns the donDeck array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "DON_DECK")).toHaveLength(10);
    });

    it("returns the donActive array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "DON_ACTIVE")).toHaveLength(0);
    });

    it("returns the donRested array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "DON_RESTED")).toHaveLength(0);
    });

    it("returns the life array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "LIFE")).toHaveLength(0);
    });

    it("returns the leader array", () => {
        const state = setupTestGame();
        const leader = getZoneArray(state, P1, "LEADER");
        expect(leader).toHaveLength(1);
        expect(leader[0]).toBe("p1-LEADER");
    });

    it("returns the trash array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "TRASH")).toHaveLength(0);
    });

    it("returns the characters array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "CHARACTERS")).toHaveLength(0);
    });

    it("returns the stage array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "STAGE")).toHaveLength(0);
    });

    it("returns the look array", () => {
        const state = setupTestGame();
        expect(getZoneArray(state, P1, "LOOK")).toHaveLength(0);
    });

    it("throws for unknown playerId", () => {
        const state = setupTestGame();
        expect(() => getZoneArray(state, "unknown" as PlayerId, "DECK")).toThrow("Unknown playerId");
    });

    it("throws for null zone", () => {
        const state = setupTestGame();
        expect(() => getZoneArray(state, P1, null)).toThrow("Null zone provided");
    });
});

// ============================================================
// removeFromZone
// ============================================================

describe("removeFromZone", () => {
    it("removes card from zone array", () => {
        const state = setupTestGame();
        const next = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("sets currentZone to null on removed instance", () => {
        const state = setupTestGame();
        const next = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(next.instances["p1-CARD-0" as CardInstanceId].currentZone).toBeNull();
    });

    it("does not mutate original state", () => {
        const state = setupTestGame();
        removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(state.playerZones[P1].deck).toHaveLength(50);
        expect(state.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("DECK");
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => removeFromZone(state, "p1-CARD-999" as CardInstanceId))
            .toThrow("Cannot move unknown instance");
    });

    it("throws when removing a LEADER", () => {
        const state = setupTestGame();
        expect(() => removeFromZone(state, "p1-LEADER" as CardInstanceId))
            .toThrow("Attempting to remove leader card");
    });

    it("passes invariants after removal", () => {
        const state = setupTestGame();
        const next = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        // currentZone is null, so invariant only checks non-null zones
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });
});

// ============================================================
// addToZone
// ============================================================

describe("addToZone", () => {
    it("adds card to TOP of zone (unshift)", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        state = addToZone(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(state.playerZones[P1].hand[0]).toBe("p1-CARD-0");
    });

    it("adds card to BOTTOM of zone (push)", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = addToZone(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = addToZone(state, "p1-CARD-1" as CardInstanceId, "HAND", "BOTTOM");
        expect(state.playerZones[P1].hand[1]).toBe("p1-CARD-1");
    });

    it("sets currentZone on the instance", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        state = addToZone(state, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP");
        expect(state.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("TRASH");
    });

    it("throws if currentZone is not null", () => {
        const state = setupTestGame();
        // p1-CARD-0 is still in DECK (currentZone = "DECK")
        expect(() => addToZone(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP"))
            .toThrow("previous zone has not been cleared");
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => addToZone(state, "p1-CARD-999" as CardInstanceId, "HAND", "TOP"))
            .toThrow("Cannot move unknown instance");
    });

    it("CHARACTERS zone rejects non-CHARACTER cards", () => {
        const { state, stageId } = makeStateWithStage();
        const next = removeFromZone(state, stageId);
        expect(() => addToZone(next, stageId, "CHARACTERS", "BOTTOM"))
            .toThrow("Attempting to move non-character card");
    });

    it("CHARACTERS zone throws when at capacity", () => {
        let state = setupTestGame();
        for (let i = 0; i < CHARACTERS_MAX; i++) {
            state = moveCard(state, `p1-CARD-${i}` as CardInstanceId, "CHARACTERS", "BOTTOM");
        }
        state = removeFromZone(state, `p1-CARD-${CHARACTERS_MAX}` as CardInstanceId);
        expect(() => addToZone(state, `p1-CARD-${CHARACTERS_MAX}` as CardInstanceId, "CHARACTERS", "BOTTOM"))
            .toThrow("exceeded the maximum amount of characters");
    });

    it("STAGE zone rejects non-STAGE card", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(() => addToZone(state, "p1-CARD-0" as CardInstanceId, "STAGE", "BOTTOM"))
            .toThrow("Attempting to move non-stage card");
    });

    it("LEADER zone rejects non-LEADER card", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(() => addToZone(state, "p1-CARD-0" as CardInstanceId, "LEADER", "TOP"))
            .toThrow("Attempting to move non-leader card");
    });

    it("sets DON isRested=true when adding to DON_RESTED", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-DON-0" as CardInstanceId);
        state = addToZone(state, "p1-DON-0" as CardInstanceId, "DON_RESTED", "TOP");
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).isRested).toBe(true);
    });

    it("sets DON isRested=false when adding to DON_ACTIVE", () => {
        let state = setupTestGame();
        // First rest the DON
        state = removeFromZone(state, "p1-DON-0" as CardInstanceId);
        state = addToZone(state, "p1-DON-0" as CardInstanceId, "DON_RESTED", "TOP");
        state = removeFromZone(state, "p1-DON-0" as CardInstanceId);
        state = addToZone(state, "p1-DON-0" as CardInstanceId, "DON_ACTIVE", "TOP");
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).isRested).toBe(false);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        state = addToZone(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        assertInvariants(state);
    });
});

// ============================================================
// moveCard
// ============================================================

describe("moveCard", () => {
    it("moves card from deck to hand", () => {
        const state = setupTestGame();
        const next = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(next.playerZones[P1].hand).toContain("p1-CARD-0");
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("updates currentZone on the instance", () => {
        const state = setupTestGame();
        const next = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(next.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("HAND");
    });

    it("removes card from origin zone", () => {
        const state = setupTestGame();
        const next = moveCard(state, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP");
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("does not mutate original state", () => {
        const state = setupTestGame();
        moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(state.playerZones[P1].deck).toHaveLength(50);
        expect(state.playerZones[P1].hand).toHaveLength(0);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        assertInvariants(next);
    });

    it("TOP position places card at index 0", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "TOP");
        expect(state.playerZones[P1].hand[0]).toBe("p1-CARD-1");
    });

    it("BOTTOM position places card at last index", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "BOTTOM");
        expect(state.playerZones[P1].hand.at(-1)).toBe("p1-CARD-1");
    });
});

// ============================================================
// insertCardAtZoneIndex
// ============================================================

describe("insertCardAtZoneIndex", () => {
    it("inserts card at index 0", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-2" as CardInstanceId);
        state = insertCardAtZoneIndex(state, "p1-CARD-2" as CardInstanceId, "HAND", 0);
        expect(state.playerZones[P1].hand[0]).toBe("p1-CARD-2");
    });

    it("inserts card at middle index", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-2" as CardInstanceId);
        state = insertCardAtZoneIndex(state, "p1-CARD-2" as CardInstanceId, "HAND", 1);
        expect(state.playerZones[P1].hand[1]).toBe("p1-CARD-2");
    });

    it("inserts at index equal to length (appends)", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = insertCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "HAND", 1);
        expect(state.playerZones[P1].hand[1]).toBe("p1-CARD-1");
    });

    it("sets currentZone on inserted card", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        state = insertCardAtZoneIndex(state, "p1-CARD-0" as CardInstanceId, "HAND", 0);
        expect(state.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("HAND");
    });

    it("throws for negative index", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(() => insertCardAtZoneIndex(state, "p1-CARD-0" as CardInstanceId, "HAND", -1))
            .toThrow("out of bounds");
    });

    it("throws for index beyond length", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(() => insertCardAtZoneIndex(state, "p1-CARD-0" as CardInstanceId, "HAND", 5))
            .toThrow("out of bounds");
    });

    it("throws for DON card", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-DON-0" as CardInstanceId);
        expect(() => insertCardAtZoneIndex(state, "p1-DON-0" as CardInstanceId, "HAND", 0))
            .toThrow("DON cards");
    });

    it("throws for DON zone target", () => {
        let state = setupTestGame();
        state = removeFromZone(state, "p1-CARD-0" as CardInstanceId);
        expect(() => insertCardAtZoneIndex(state, "p1-CARD-0" as CardInstanceId, "DON_ACTIVE", 0))
            .toThrow("DON cards");
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = insertCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "HAND", 0);
        assertInvariants(state);
    });
});

// ============================================================
// replaceCardAtZoneIndex
// ============================================================

describe("replaceCardAtZoneIndex", () => {
    it("replaces card at index in CHARACTERS zone", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", 0);
        expect(state.playerZones[P1].characters[0]).toBe("p1-CARD-1");
    });

    it("moves replaced card to TRASH", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", 0);
        expect(state.playerZones[P1].trash[0]).toBe("p1-CARD-0");
        expect(state.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("TRASH");
    });

    it("sets currentZone on incoming card", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", 0);
        expect(state.instances["p1-CARD-1" as CardInstanceId].currentZone).toBe("CHARACTERS");
    });

    it("replaces a LIFE card with any card class", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "LIFE", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "LIFE", 0);
        expect(state.playerZones[P1].life[0]).toBe("p1-CARD-1");
        expect(state.playerZones[P1].trash[0]).toBe("p1-CARD-0");
    });

    it("throws for out-of-bounds index", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        expect(() => replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", 5))
            .toThrow("out of bounds");
    });

    it("throws for unsupported zones (e.g. HAND)", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        expect(() => replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "HAND", 0))
            .toThrow("only applies to CHARACTERS, LIFE, and STAGE zones");
    });

    it("throws when replacing CHARACTERS slot with non-CHARACTER card", () => {
        const { state, stageId } = makeStateWithStage();
        let next = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        next = removeFromZone(next, stageId);
        expect(() => replaceCardAtZoneIndex(next, stageId, "CHARACTERS", 0))
            .toThrow("Attempting to move non-character card");
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = removeFromZone(state, "p1-CARD-1" as CardInstanceId);
        state = replaceCardAtZoneIndex(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", 0);
        assertInvariants(state);
    });
});

// ============================================================
// setActive
// ============================================================

describe("setActive", () => {
    it("sets isRested to false", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = setActive(state, "p1-CARD-0" as CardInstanceId);
        expect(state.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
    });

    it("is idempotent on already-active card", () => {
        const state = setupTestGame();
        const next = setActive(state, "p1-CARD-0" as CardInstanceId);
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => setActive(state, "p1-CARD-999" as CardInstanceId))
            .toThrow("Cannot find card instance");
    });
});

// ============================================================
// setRested
// ============================================================

describe("setRested", () => {
    it("sets isRested to true", () => {
        const state = setupTestGame();
        const next = setRested(state, "p1-CARD-0" as CardInstanceId);
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("is idempotent on already-rested card", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        expect(state.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => setRested(state, "p1-CARD-999" as CardInstanceId))
            .toThrow("Cannot find card instance");
    });
});

// ============================================================
// attachDon
// ============================================================

describe("attachDon", () => {
    it("sets attachedTo on the DON instance", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect((next.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBe("p1-CARD-0");
    });

    it("adds DON to attachedDon on the target", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toContain("p1-DON-0");
    });

    it("removes DON from its zone (currentZone becomes null)", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(next.instances["p1-DON-0" as CardInstanceId].currentZone).toBeNull();
        expect(next.playerZones[P1].donDeck).not.toContain("p1-DON-0");
    });

    it("attaches DON to the leader", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-LEADER" as CardInstanceId);
        expect((next.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBe("p1-LEADER");
        expect((next.instances["p1-LEADER" as CardInstanceId] as any).attachedDon).toContain("p1-DON-0");
    });

    it("throws for non-DON card", () => {
        const state = setupTestGame();
        expect(() => attachDon(state, "p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId))
            .toThrow("is not a DON!!");
    });

    it("throws if DON is already attached", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(() => attachDon(next, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId))
            .toThrow("already attached");
    });

    it("throws when attaching DON to a STAGE card", () => {
        const { state, stageId } = makeStateWithStage();
        expect(() => attachDon(state, "p1-DON-0" as CardInstanceId, stageId))
            .toThrow("stage card");
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        assertInvariants(next);
    });
});

// ============================================================
// detachDon
// ============================================================

describe("detachDon", () => {
    it("sets attachedTo to null on the DON", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = detachDon(state, "p1-DON-0" as CardInstanceId, "DON_RESTED");
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
    });

    it("removes DON from target's attachedDon", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = detachDon(state, "p1-DON-0" as CardInstanceId, "DON_RESTED");
        expect((state.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).not.toContain("p1-DON-0");
    });

    it("moves DON to the specified destination zone", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = detachDon(state, "p1-DON-0" as CardInstanceId, "DON_RESTED");
        expect(state.playerZones[P1].donRested).toContain("p1-DON-0");
        expect(state.instances["p1-DON-0" as CardInstanceId].currentZone).toBe("DON_RESTED");
    });

    it("throws if DON is not attached", () => {
        const state = setupTestGame();
        expect(() => detachDon(state, "p1-DON-0" as CardInstanceId, "DON_RESTED"))
            .toThrow("not attached");
    });

    it("throws for non-DON card", () => {
        const state = setupTestGame();
        expect(() => detachDon(state, "p1-CARD-0" as CardInstanceId, "DON_RESTED"))
            .toThrow("is not a DON!!");
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = detachDon(state, "p1-DON-0" as CardInstanceId, "DON_RESTED");
        assertInvariants(state);
    });
});

// ============================================================
// donReattach
// ============================================================

describe("donReattach", () => {
    it("updates attachedTo on the DON to new target", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId);
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBe("p1-CARD-1");
    });

    it("removes DON from origin's attachedDon", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId);
        expect((state.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).not.toContain("p1-DON-0");
    });

    it("adds DON to new target's attachedDon", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId);
        expect((state.instances["p1-CARD-1" as CardInstanceId] as any).attachedDon).toContain("p1-DON-0");
    });

    it("does not change DON's currentZone (stays null)", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId);
        expect(state.instances["p1-DON-0" as CardInstanceId].currentZone).toBeNull();
    });

    it("throws if DON is not currently attached", () => {
        const state = setupTestGame();
        expect(() => donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId))
            .toThrow("not attached");
    });

    it("throws when reattaching to a STAGE card", () => {
        const { state, stageId } = makeStateWithStage();
        let next = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(() => donReattach(next, "p1-DON-0" as CardInstanceId, stageId))
            .toThrow("stage card");
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReattach(state, "p1-DON-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId);
        assertInvariants(state);
    });
});
