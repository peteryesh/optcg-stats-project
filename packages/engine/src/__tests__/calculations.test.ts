import { describe, it, expect } from "vitest";
import { produce } from "immer";
import { calculatePower, calculateCost, calculateCounter } from "../game/calculations";
import {
    setupTestGame,
    mockDefs,
    mockDecklist,
    mockSeeds,
    mockConfig,
    MOCK_EVENT_ID,
    MOCK_STAGE_ID,
    MOCK_CHAR_ID,
} from "./fixtures";
import { initGame } from "../game/init";
import { attachDon } from "../game/mechanics";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const PLAYERS = [P1, P2];

// p1-CARD-0 = EVENT (cost 2), p1-CARD-1 = STAGE (cost 1), rest = CHARACTERs
function makeStateWithAllCardTypes() {
    return initGame({
        gameId: "test-game",
        playerIds: PLAYERS,
        seeds: mockSeeds(PLAYERS),
        config: mockConfig(PLAYERS),
        defs: mockDefs,
        decks: {
            [P1]: mockDecklist({ deck: [MOCK_EVENT_ID, MOCK_STAGE_ID, ...Array(48).fill(MOCK_CHAR_ID)] }),
            [P2]: mockDecklist(),
        },
    });
}

// ============================================================
// calculatePower
// ============================================================

describe("calculatePower", () => {
    it("returns base power for a CHARACTER (4000)", () => {
        const state = setupTestGame();
        expect(calculatePower(state, "p1-CARD-0" as CardInstanceId)).toBe(4000);
    });

    it("returns base power for the LEADER (5000)", () => {
        const state = setupTestGame();
        expect(calculatePower(state, "p1-LEADER" as CardInstanceId)).toBe(5000);
    });

    it("returns correct power for P2 cards", () => {
        const state = setupTestGame();
        expect(calculatePower(state, "p2-CARD-0" as CardInstanceId)).toBe(4000);
        expect(calculatePower(state, "p2-LEADER" as CardInstanceId)).toBe(5000);
    });

    it("throws for a DON instance (no power field)", () => {
        const state = setupTestGame();
        expect(() => calculatePower(state, "p1-DON-0" as CardInstanceId)).toThrow();
    });

    it("throws for an EVENT instance (no power field)", () => {
        const state = makeStateWithAllCardTypes();
        expect(() => calculatePower(state, "p1-CARD-0" as CardInstanceId)).toThrow();
    });

    it("throws for a STAGE instance (no power field)", () => {
        const state = makeStateWithAllCardTypes();
        expect(() => calculatePower(state, "p1-CARD-1" as CardInstanceId)).toThrow();
    });

    it("throws for an unknown instance", () => {
        const state = setupTestGame();
        expect(() => calculatePower(state, "p1-UNKNOWN" as CardInstanceId)).toThrow();
    });

    it("adds 1000 power per attached DON on the active player's turn", () => {
        let state = setupTestGame(); // P1 is active
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(calculatePower(state, "p1-CARD-0" as CardInstanceId)).toBe(5000);
    });

    it("adds power for multiple attached DON on the active player's turn", () => {
        let state = setupTestGame(); // P1 is active
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = attachDon(state, "p1-DON-1" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(calculatePower(state, "p1-CARD-0" as CardInstanceId)).toBe(6000);
    });

    it("adds DON power to the LEADER on the active player's turn", () => {
        let state = setupTestGame(); // P1 is active
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-LEADER" as CardInstanceId);
        expect(calculatePower(state, "p1-LEADER" as CardInstanceId)).toBe(6000);
    });

    it("does not add DON power on the opponent's turn", () => {
        let state = setupTestGame(); // P1 is active
        state = attachDon(state, "p2-DON-0" as CardInstanceId, "p2-CARD-0" as CardInstanceId);
        // P2 is not the active player, so attached DON gives no bonus
        expect(calculatePower(state, "p2-CARD-0" as CardInstanceId)).toBe(4000);
    });

    it("does not add DON power to the opponent's LEADER", () => {
        let state = setupTestGame(); // P1 is active
        state = attachDon(state, "p2-DON-0" as CardInstanceId, "p2-LEADER" as CardInstanceId);
        expect(calculatePower(state, "p2-LEADER" as CardInstanceId)).toBe(5000);
    });

    it("DON bonus swaps with the active player — P2 gets bonus on P2's turn", () => {
        let state = setupTestGame();
        state = produce(state, draft => { draft.activePlayerId = "p2"; });
        state = attachDon(state, "p2-DON-0" as CardInstanceId, "p2-CARD-0" as CardInstanceId);
        expect(calculatePower(state, "p2-CARD-0" as CardInstanceId)).toBe(5000);
        // P1 is now the non-active player — no DON bonus
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        expect(calculatePower(state, "p1-CARD-0" as CardInstanceId)).toBe(4000);
    });
});

// ============================================================
// calculateCost
// ============================================================

describe("calculateCost", () => {
    it("returns base cost for a CHARACTER (3)", () => {
        const state = setupTestGame();
        expect(calculateCost(state, "p1-CARD-0" as CardInstanceId)).toBe(3);
    });

    it("returns base cost for an EVENT (2)", () => {
        const state = makeStateWithAllCardTypes();
        expect(calculateCost(state, "p1-CARD-0" as CardInstanceId)).toBe(2);
    });

    it("returns base cost for a STAGE (1)", () => {
        const state = makeStateWithAllCardTypes();
        expect(calculateCost(state, "p1-CARD-1" as CardInstanceId)).toBe(1);
    });

    it("throws for a LEADER (no cost field)", () => {
        const state = setupTestGame();
        expect(() => calculateCost(state, "p1-LEADER" as CardInstanceId)).toThrow();
    });

    it("throws for a DON instance (no cost field)", () => {
        const state = setupTestGame();
        expect(() => calculateCost(state, "p1-DON-0" as CardInstanceId)).toThrow();
    });

    it("throws for an unknown instance", () => {
        const state = setupTestGame();
        expect(() => calculateCost(state, "p1-UNKNOWN" as CardInstanceId)).toThrow();
    });
});

// ============================================================
// calculateCounter
// ============================================================

describe("calculateCounter", () => {
    it("returns counter value for a CHARACTER with counter (1000)", () => {
        const state = setupTestGame();
        expect(calculateCounter(state, "p1-CARD-0" as CardInstanceId)).toBe(1000);
    });

    it("returns 0 for a CHARACTER whose definition has no counter", () => {
        const { MOCK_CHAR_ID: _, ...defsWithoutCounter } = mockDefs;
        const NO_CTR = "TEST-CHAR-NO-CTR";
        const customDefs = {
            ...mockDefs,
            [NO_CTR]: {
                ...mockDefs[MOCK_CHAR_ID],
                id: NO_CTR,
                counter: undefined,
            },
        };
        const state = initGame({
            gameId: "test-game",
            playerIds: PLAYERS,
            seeds: mockSeeds(PLAYERS),
            config: mockConfig(PLAYERS),
            defs: customDefs as any,
            decks: {
                [P1]: mockDecklist({ deck: [NO_CTR, ...Array(49).fill(MOCK_CHAR_ID)] }),
                [P2]: mockDecklist(),
            },
        });
        expect(calculateCounter(state, "p1-CARD-0" as CardInstanceId)).toBe(0);
    });

    it("throws for a LEADER (not a CHARACTER)", () => {
        const state = setupTestGame();
        expect(() => calculateCounter(state, "p1-LEADER" as CardInstanceId)).toThrow();
    });

    it("throws for a DON instance (not a CHARACTER)", () => {
        const state = setupTestGame();
        expect(() => calculateCounter(state, "p1-DON-0" as CardInstanceId)).toThrow();
    });

    it("throws for an unknown instance", () => {
        const state = setupTestGame();
        expect(() => calculateCounter(state, "p1-UNKNOWN" as CardInstanceId)).toThrow();
    });
});
