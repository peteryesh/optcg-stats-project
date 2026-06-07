import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    getCardInstance,
    getCardDef,
    setCardPlayedThisTurn,
    changeActivePlayer,
} from "../game/mechanics";
import { setupTestGame } from "./fixtures";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// ============================================================
// getCardInstance
// ============================================================

describe("getCardInstance", () => {
    it("returns the instance for the LEADER", () => {
        const state = setupTestGame();
        const inst = getCardInstance(state, "p1-LEADER" as CardInstanceId);
        expect(inst.instanceId).toBe("p1-LEADER");
        expect(inst.class).toBe("LEADER");
    });

    it("returns the instance for a deck card", () => {
        const state = setupTestGame();
        const inst = getCardInstance(state, "p1-CARD-0" as CardInstanceId);
        expect(inst.instanceId).toBe("p1-CARD-0");
        expect(inst.class).toBe("CHARACTER");
    });

    it("returns a DON instance", () => {
        const state = setupTestGame();
        const inst = getCardInstance(state, "p1-DON-0" as CardInstanceId);
        expect(inst.class).toBe("DON");
        expect(inst.instanceId).toBe("p1-DON-0");
    });

    it("returns instances for P2 cards", () => {
        const state = setupTestGame();
        const inst = getCardInstance(state, "p2-LEADER" as CardInstanceId);
        expect(inst.controller).toBe(P2);
    });

    it("throws for an unknown instanceId", () => {
        const state = setupTestGame();
        expect(() => getCardInstance(state, "p1-CARD-999" as CardInstanceId))
            .toThrow("not found");
    });

    it("throws for an empty string instanceId", () => {
        const state = setupTestGame();
        expect(() => getCardInstance(state, "" as CardInstanceId)).toThrow();
    });
});

// ============================================================
// getCardDef
// ============================================================

describe("getCardDef", () => {
    it("returns the CHARACTER card definition", () => {
        const state = setupTestGame();
        const def = getCardDef(state, "p1-CARD-0" as CardInstanceId);
        expect(def.class).toBe("CHARACTER");
        expect(def.cost).toBe(3);
    });

    it("returns the LEADER card definition", () => {
        const state = setupTestGame();
        const def = getCardDef(state, "p1-LEADER" as CardInstanceId);
        expect(def.class).toBe("LEADER");
        expect(def.life).toBe(5);
    });

    it("returns definitions for P2 cards", () => {
        const state = setupTestGame();
        const def = getCardDef(state, "p2-CARD-0" as CardInstanceId);
        expect(def.class).toBe("CHARACTER");
    });

    it("throws for a DON instance (DON has no card definition)", () => {
        const state = setupTestGame();
        expect(() => getCardDef(state, "p1-DON-0" as CardInstanceId))
            .toThrow("Cannot get DON card definition");
    });

    it("throws for an unknown instanceId", () => {
        const state = setupTestGame();
        expect(() => getCardDef(state, "p1-CARD-999" as CardInstanceId)).toThrow();
    });
});

// ============================================================
// setCardPlayedThisTurn
// ============================================================

describe("setCardPlayedThisTurn", () => {
    it("appends the instanceId to cardsPlayedThisTurn", () => {
        const state = setupTestGame();
        const next = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        expect(next.cardsPlayedThisTurn).toContain("p1-CARD-0");
    });

    it("starts from an empty list on a fresh state", () => {
        const state = setupTestGame();
        expect(state.cardsPlayedThisTurn).toHaveLength(0);
        const next = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        expect(next.cardsPlayedThisTurn).toHaveLength(1);
    });

    it("accumulates multiple calls", () => {
        let state = setupTestGame();
        state = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        state = setCardPlayedThisTurn(state, "p1-CARD-1" as CardInstanceId);
        expect(state.cardsPlayedThisTurn).toHaveLength(2);
        expect(state.cardsPlayedThisTurn).toContain("p1-CARD-0");
        expect(state.cardsPlayedThisTurn).toContain("p1-CARD-1");
    });

    it("does not mutate the original state", () => {
        const state = setupTestGame();
        setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        expect(state.cardsPlayedThisTurn).toHaveLength(0);
    });

    it("returns a new state reference", () => {
        const state = setupTestGame();
        const next = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        expect(next).not.toBe(state);
    });

    it("can record the same instanceId multiple times", () => {
        let state = setupTestGame();
        state = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        state = setCardPlayedThisTurn(state, "p1-CARD-0" as CardInstanceId);
        expect(state.cardsPlayedThisTurn).toHaveLength(2);
    });
});

// ============================================================
// changeActivePlayer
// ============================================================

describe("changeActivePlayer", () => {
    it("advances from P1 to P2", () => {
        const state = setupTestGame(); // activePlayerId = P1
        const next = changeActivePlayer(state);
        expect(next.activePlayerId).toBe(P2);
    });

    it("wraps from the last player back to the first", () => {
        const state = produce(setupTestGame(), draft => { draft.activePlayerId = P2; });
        const next = changeActivePlayer(state);
        expect(next.activePlayerId).toBe(P1);
    });

    it("does not mutate the original state", () => {
        const state = setupTestGame();
        changeActivePlayer(state);
        expect(state.activePlayerId).toBe(P1);
    });

    it("returns a new state reference", () => {
        const state = setupTestGame();
        expect(changeActivePlayer(state)).not.toBe(state);
    });

    it("throws if activePlayerId is not in turnOrder", () => {
        const state = produce(setupTestGame(), draft => {
            draft.activePlayerId = "unknown-player";
        });
        expect(() => changeActivePlayer(state)).toThrow();
    });

    it("advances correctly in a 4-player game", () => {
        const ids: PlayerId[] = ["p1", "p2", "p3", "p4"];
        let state = produce(setupTestGame(ids as [PlayerId, PlayerId]), draft => {
            draft.turnOrder = ids;
            draft.activePlayerId = "p3";
        });
        expect(changeActivePlayer(state).activePlayerId).toBe("p4");
    });
});
