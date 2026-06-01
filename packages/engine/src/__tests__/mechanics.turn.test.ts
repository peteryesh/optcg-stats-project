import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    setNextActivePlayer,
    incrementTurn,
    resetBattleStateForTurn,
    resetCardsPlayedThisTurn,
    resetEffectsUsedThisTurn,
} from "../game/mechanics/turn";
import { setupTestGame } from "./fixtures";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// ============================================================
// setNextActivePlayer
// ============================================================

describe("setNextActivePlayer", () => {
    it("in START_GAME phase: sets activePlayerId to turnOrder[0] regardless of current active player", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "START_GAME";
            draft.activePlayerId = P2;
        });
        const next = setNextActivePlayer(state);
        expect(next.activePlayerId).toBe(P1);
    });

    it("advances from P1 to P2 in non-START_GAME phase", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "END_OF_TURN";
            draft.activePlayerId = P1;
        });
        expect(setNextActivePlayer(state).activePlayerId).toBe(P2);
    });

    it("wraps around from last player back to first player", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "END_OF_TURN";
            draft.activePlayerId = P2;
        });
        expect(setNextActivePlayer(state).activePlayerId).toBe(P1);
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = produce(state, draft => { draft.phase = "END_OF_TURN"; });
        setNextActivePlayer(state);
        expect(state.activePlayerId).toBe(P1);
    });

    it("throws if activePlayerId is not in turnOrder", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "END_OF_TURN";
            draft.activePlayerId = "unknown";
        });
        expect(() => setNextActivePlayer(state)).toThrow();
    });

    it("does not change activePlayerId field on original state", () => {
        const state = produce(setupTestGame(), draft => { draft.phase = "END_OF_TURN"; });
        const next = setNextActivePlayer(state);
        expect(next).not.toBe(state);
        expect(state.activePlayerId).toBe(P1);
    });
});

// ============================================================
// incrementTurn
// ============================================================

describe("incrementTurn", () => {
    it("increments turn from 0 to 1", () => {
        const state = setupTestGame();
        expect(incrementTurn(state).turn).toBe(1);
    });

    it("increments from an arbitrary positive turn number", () => {
        const state = produce(setupTestGame(), draft => { draft.turn = 7; });
        expect(incrementTurn(state).turn).toBe(8);
    });

    it("does not mutate original state", () => {
        const state = setupTestGame();
        incrementTurn(state);
        expect(state.turn).toBe(0);
    });

    it("returns a new state reference", () => {
        const state = setupTestGame();
        expect(incrementTurn(state)).not.toBe(state);
    });
});

// ============================================================
// resetBattleStateForTurn
// ============================================================

describe("resetBattleStateForTurn", () => {
    it("clears battlesThisTurn to an empty array", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.battlesThisTurn = [
                { attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 },
            ];
        });
        expect(resetBattleStateForTurn(state).battlesThisTurn).toHaveLength(0);
    });

    it("sets currentBattle to null", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.currentBattle = { attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 };
        });
        expect(resetBattleStateForTurn(state).currentBattle).toBeNull();
    });

    it("is idempotent when already in reset state", () => {
        const state = setupTestGame();
        const next = resetBattleStateForTurn(state);
        expect(next.battlesThisTurn).toHaveLength(0);
        expect(next.currentBattle).toBeNull();
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.battlesThisTurn = [
                { attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 },
            ];
        });
        resetBattleStateForTurn(state);
        expect(state.battlesThisTurn).toHaveLength(1);
    });
});

// ============================================================
// resetCardsPlayedThisTurn
// ============================================================

describe("resetCardsPlayedThisTurn", () => {
    it("clears cardsPlayedThisTurn to empty array", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId];
        });
        expect(resetCardsPlayedThisTurn(state).cardsPlayedThisTurn).toHaveLength(0);
    });

    it("is idempotent on an already-empty list", () => {
        const state = setupTestGame();
        expect(resetCardsPlayedThisTurn(state).cardsPlayedThisTurn).toHaveLength(0);
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId];
        });
        resetCardsPlayedThisTurn(state);
        expect(state.cardsPlayedThisTurn).toHaveLength(1);
    });
});

// ============================================================
// resetEffectsUsedThisTurn
// ============================================================

describe("resetEffectsUsedThisTurn", () => {
    it("clears effectsUsedThisTurn on a CHARACTER instance", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            (draft.instances["p1-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn = { "ability-1": 1 };
        });
        const next = resetEffectsUsedThisTurn(state);
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn).toEqual({});
    });

    it("clears effectsUsedThisTurn on the LEADER instance", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            (draft.instances["p1-LEADER" as CardInstanceId] as any).effectsUsedThisTurn = { "leader-ability": 2 };
        });
        const next = resetEffectsUsedThisTurn(state);
        expect((next.instances["p1-LEADER" as CardInstanceId] as any).effectsUsedThisTurn).toEqual({});
    });

    it("resets effectsUsedThisTurn on instances for all players", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            (draft.instances["p2-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn = { "ability": 1 };
        });
        const next = resetEffectsUsedThisTurn(state);
        expect((next.instances["p2-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn).toEqual({});
    });

    it("does not add effectsUsedThisTurn to DON instances", () => {
        const state = setupTestGame();
        const next = resetEffectsUsedThisTurn(state);
        expect((next.instances["p1-DON-0" as CardInstanceId] as any).effectsUsedThisTurn).toBeUndefined();
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            (draft.instances["p1-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn = { "ability": 1 };
        });
        resetEffectsUsedThisTurn(state);
        expect((state.instances["p1-CARD-0" as CardInstanceId] as any).effectsUsedThisTurn).toEqual({ "ability": 1 });
    });
});
