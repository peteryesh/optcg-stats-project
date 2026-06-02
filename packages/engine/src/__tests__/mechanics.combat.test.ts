import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    updateCurrentBattle,
    removeCurrentBattle,
    logCurrentBattleForTurn,
} from "../game/mechanics/combat";
import { setupTestGame } from "./fixtures";
import { moveCard } from "../game/mechanics";
import type { PlayerId, CardInstanceId, BattleRecord } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Both attacker and defender must exist in state.instances
function makeStateWithBattleReady() {
    let state = setupTestGame();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
    return state;
}

const MOCK_BATTLE: BattleRecord = {
    attackerId: "p1-CARD-0" as CardInstanceId,
    defenderId: "p2-LEADER" as CardInstanceId,
    counter: 0,
};

// ============================================================
// updateCurrentBattle
// ============================================================

describe("updateCurrentBattle", () => {
    it("sets currentBattle to the provided record", () => {
        const state = makeStateWithBattleReady();
        const next = updateCurrentBattle(state, MOCK_BATTLE);
        expect(next.currentBattle).toEqual(MOCK_BATTLE);
    });

    it("stores the counter value in currentBattle", () => {
        const state = makeStateWithBattleReady();
        const battle: BattleRecord = { ...MOCK_BATTLE, counter: 2000 };
        const next = updateCurrentBattle(state, battle);
        expect(next.currentBattle!.counter).toBe(2000);
    });

    it("overwrites an existing currentBattle", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        const updated: BattleRecord = { ...MOCK_BATTLE, counter: 1000 };
        const next = updateCurrentBattle(state, updated);
        expect(next.currentBattle!.counter).toBe(1000);
    });

    it("does not mutate original state", () => {
        const state = makeStateWithBattleReady();
        updateCurrentBattle(state, MOCK_BATTLE);
        expect(state.currentBattle).toBeNull();
    });

    it("records unknown instance IDs without validation (existence checked at resolution)", () => {
        const state = setupTestGame();
        const next = updateCurrentBattle(state, {
            attackerId: "p1-UNKNOWN" as CardInstanceId,
            defenderId: "p2-UNKNOWN" as CardInstanceId,
            counter: 0,
        });
        expect(next.currentBattle?.attackerId).toBe("p1-UNKNOWN");
        expect(next.currentBattle?.defenderId).toBe("p2-UNKNOWN");
    });
});

// ============================================================
// removeCurrentBattle
// ============================================================

describe("removeCurrentBattle", () => {
    it("sets currentBattle to null", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        expect(removeCurrentBattle(state).currentBattle).toBeNull();
    });

    it("is idempotent when currentBattle is already null", () => {
        const state = setupTestGame();
        expect(removeCurrentBattle(state).currentBattle).toBeNull();
    });

    it("does not mutate original state", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        removeCurrentBattle(state);
        expect(state.currentBattle).not.toBeNull();
    });

    it("does not affect battlesThisTurn", () => {
        let state = makeStateWithBattleReady();
        state = produce(state, draft => { draft.battlesThisTurn = [MOCK_BATTLE]; });
        state = updateCurrentBattle(state, MOCK_BATTLE);
        const next = removeCurrentBattle(state);
        expect(next.battlesThisTurn).toHaveLength(1);
    });
});

// ============================================================
// logCurrentBattleForTurn
// ============================================================

describe("logCurrentBattleForTurn", () => {
    it("appends currentBattle to battlesThisTurn", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        const next = logCurrentBattleForTurn(state);
        expect(next.battlesThisTurn).toHaveLength(1);
        expect(next.battlesThisTurn[0]).toEqual(MOCK_BATTLE);
    });

    it("accumulates multiple battles across calls", () => {
        let state = makeStateWithBattleReady();
        state = produce(state, draft => { draft.battlesThisTurn = [MOCK_BATTLE]; });
        state = updateCurrentBattle(state, MOCK_BATTLE);
        const next = logCurrentBattleForTurn(state);
        expect(next.battlesThisTurn).toHaveLength(2);
    });

    it("does not clear currentBattle", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        const next = logCurrentBattleForTurn(state);
        expect(next.currentBattle).toEqual(MOCK_BATTLE);
    });

    it("does not mutate original state", () => {
        let state = makeStateWithBattleReady();
        state = updateCurrentBattle(state, MOCK_BATTLE);
        logCurrentBattleForTurn(state);
        expect(state.battlesThisTurn).toHaveLength(0);
    });

    it("throws if currentBattle is null", () => {
        const state = setupTestGame();
        expect(() => logCurrentBattleForTurn(state)).toThrow();
    });
});
