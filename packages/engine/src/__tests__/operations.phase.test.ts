import { describe, it, expect } from "vitest";
import {
    enterStartOfTurnPhase,
    enterRefreshPhase,
    enterDrawPhase,
    enterMainPhase,
    enterEndOfTurnPhase,
    enterGameEndPhase,
    enterWhenAttackingPhase,
    enterOnOpponentAttackPhase,
    enterBlockerPhase,
    enterCounterPhase,
    enterBattleResolutionPhase,
    setStartTurnState,
} from "../game/operations/phase";
import { setupTestGame } from "./fixtures";
import { InvalidActionError } from "../errors";
import { produce } from "immer";
import type { GameState, Phase } from "../types";
import type { CardInstanceId } from "../types";

function stateWithPhase(phase: Phase): GameState {
    const base = setupTestGame();
    return produce(base, draft => { draft.phase = phase; });
}

// ============================================================
// Main turn phase progression
// ============================================================

describe("enterStartOfTurnPhase", () => {
    it("transitions from END_OF_TURN to START_OF_TURN", () => {
        const state = stateWithPhase("END_OF_TURN");
        const next = enterStartOfTurnPhase(state);
        expect(next.phase).toBe("START_OF_TURN");
    });

    it("transitions from START_GAME to START_OF_TURN", () => {
        const state = stateWithPhase("START_GAME");
        const next = enterStartOfTurnPhase(state);
        expect(next.phase).toBe("START_OF_TURN");
    });

    it("throws from an invalid predecessor phase", () => {
        const state = stateWithPhase("MAIN");
        expect(() => enterStartOfTurnPhase(state)).toThrow(InvalidActionError);
    });

    it("throws from DRAW phase", () => {
        const state = stateWithPhase("DRAW");
        expect(() => enterStartOfTurnPhase(state)).toThrow(InvalidActionError);
    });

    it("throws from SETUP phase", () => {
        const state = stateWithPhase("SETUP");
        expect(() => enterStartOfTurnPhase(state)).toThrow(InvalidActionError);
    });

    it("increments the turn counter", () => {
        const state = stateWithPhase("END_OF_TURN");
        const next = enterStartOfTurnPhase(state);
        expect(next.turn).toBe(state.turn + 1);
    });

    it("advances to the next active player", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = produce(state, draft => { draft.activePlayerId = "p1"; });
        const next = enterStartOfTurnPhase(state);
        expect(next.activePlayerId).toBe("p2");
    });

    it("resets battlesThisTurn and currentBattle", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = produce(state, draft => {
            draft.battlesThisTurn = [{ attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 }];
            draft.currentBattle = { attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 };
        });
        const next = enterStartOfTurnPhase(state);
        expect(next.battlesThisTurn).toHaveLength(0);
        expect(next.currentBattle).toBeNull();
    });

    it("resets cardsPlayedThisTurn", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId];
        });
        const next = enterStartOfTurnPhase(state);
        expect(next.cardsPlayedThisTurn).toHaveLength(0);
    });
});

describe("enterRefreshPhase", () => {
    it("returns MAIN phase (auto-chains through REFRESH → DRAW → MAIN)", () => {
        const state = stateWithPhase("START_OF_TURN");
        const next = enterRefreshPhase(state);
        expect(next.phase).toBe("MAIN");
    });

    it("throws from a non-START_OF_TURN phase", () => {
        const state = stateWithPhase("DRAW");
        expect(() => enterRefreshPhase(state)).toThrow(InvalidActionError);
    });

    it("unrests cards for the active player", () => {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "START_OF_TURN";
            draft.instances["p1-LEADER" as CardInstanceId].isRested = true;
        });
        const next = enterRefreshPhase(state);
        expect(next.instances["p1-LEADER" as CardInstanceId].isRested).toBe(false);
    });

    it("gives the active player DON on first turn (turn 1: 1 DON)", () => {
        let state = stateWithPhase("START_OF_TURN");
        state = produce(state, draft => { draft.turn = 1; });
        const next = enterRefreshPhase(state);
        expect(next.playerZones[next.activePlayerId].donActive).toHaveLength(1);
    });

    it("gives the active player 2 DON on turns after turn 1", () => {
        let state = stateWithPhase("START_OF_TURN");
        state = produce(state, draft => { draft.turn = 2; });
        const next = enterRefreshPhase(state);
        expect(next.playerZones[next.activePlayerId].donActive).toHaveLength(2);
    });

    it("draws 1 card for the active player on turns after turn 1", () => {
        let state = stateWithPhase("START_OF_TURN");
        state = produce(state, draft => { draft.turn = 2; });
        const initialDeckSize = state.playerZones[state.activePlayerId].deck.length;
        const next = enterRefreshPhase(state);
        expect(next.playerZones[next.activePlayerId].hand).toHaveLength(1);
        expect(next.playerZones[next.activePlayerId].deck).toHaveLength(initialDeckSize - 1);
    });

    it("does not draw a card on turn 1", () => {
        let state = stateWithPhase("START_OF_TURN");
        state = produce(state, draft => { draft.turn = 1; });
        const next = enterRefreshPhase(state);
        expect(next.playerZones[next.activePlayerId].hand).toHaveLength(0);
    });
});

describe("enterDrawPhase", () => {
    it("returns MAIN phase (auto-chains DRAW → MAIN)", () => {
        const state = stateWithPhase("REFRESH");
        const next = enterDrawPhase(state);
        expect(next.phase).toBe("MAIN");
    });

    it("throws from a non-REFRESH phase", () => {
        const state = stateWithPhase("MAIN");
        expect(() => enterDrawPhase(state)).toThrow(InvalidActionError);
    });

    it("adds 2 DON when turn > 1", () => {
        let state = stateWithPhase("REFRESH");
        state = produce(state, draft => { draft.turn = 3; });
        const next = enterDrawPhase(state);
        expect(next.playerZones[next.activePlayerId].donActive).toHaveLength(2);
    });

    it("adds 1 DON when turn === 1", () => {
        let state = stateWithPhase("REFRESH");
        state = produce(state, draft => { draft.turn = 1; });
        const next = enterDrawPhase(state);
        expect(next.playerZones[next.activePlayerId].donActive).toHaveLength(1);
    });

    it("draws 1 card when turn > 1", () => {
        let state = stateWithPhase("REFRESH");
        state = produce(state, draft => { draft.turn = 3; });
        const next = enterDrawPhase(state);
        expect(next.playerZones[next.activePlayerId].hand).toHaveLength(1);
    });

    it("does not draw when turn === 1", () => {
        let state = stateWithPhase("REFRESH");
        state = produce(state, draft => { draft.turn = 1; });
        const next = enterDrawPhase(state);
        expect(next.playerZones[next.activePlayerId].hand).toHaveLength(0);
    });
});

describe("enterMainPhase", () => {
    it("transitions from DRAW to MAIN", () => {
        const state = stateWithPhase("DRAW");
        const next = enterMainPhase(state);
        expect(next.phase).toBe("MAIN");
    });

    it("transitions from BATTLE_RESOLUTION back to MAIN", () => {
        const state = stateWithPhase("BATTLE_RESOLUTION");
        const next = enterMainPhase(state);
        expect(next.phase).toBe("MAIN");
    });

    it("throws from a non-DRAW/BATTLE_RESOLUTION phase", () => {
        const state = stateWithPhase("REFRESH");
        expect(() => enterMainPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterEndOfTurnPhase", () => {
    it("transitions from MAIN to END_OF_TURN", () => {
        const state = stateWithPhase("MAIN");
        const next = enterEndOfTurnPhase(state);
        expect(next.phase).toBe("END_OF_TURN");
    });

    it("throws from a non-MAIN phase", () => {
        const state = stateWithPhase("DRAW");
        expect(() => enterEndOfTurnPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterGameEndPhase", () => {
    it("transitions from any phase to GAME_END", () => {
        const phases: Phase[] = ["MAIN", "END_OF_TURN", "REFRESH", "DRAW", "BATTLE_RESOLUTION"];
        for (const phase of phases) {
            const state = stateWithPhase(phase);
            const next = enterGameEndPhase(state);
            expect(next.phase).toBe("GAME_END");
        }
    });
});

// ============================================================
// Battle phase progression
// ============================================================

describe("enterWhenAttackingPhase", () => {
    it("transitions from MAIN to WHEN_ATTACKING", () => {
        const state = stateWithPhase("MAIN");
        const next = enterWhenAttackingPhase(state);
        expect(next.phase).toBe("WHEN_ATTACKING");
    });

    it("throws from a non-MAIN phase", () => {
        const state = stateWithPhase("DRAW");
        expect(() => enterWhenAttackingPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterOnOpponentAttackPhase", () => {
    it("transitions from WHEN_ATTACKING to ON_OPPONENT_ATTACK", () => {
        const state = stateWithPhase("WHEN_ATTACKING");
        const next = enterOnOpponentAttackPhase(state);
        expect(next.phase).toBe("ON_OPPONENT_ATTACK");
    });

    it("throws from a non-WHEN_ATTACKING phase", () => {
        const state = stateWithPhase("MAIN");
        expect(() => enterOnOpponentAttackPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterBlockerPhase", () => {
    it("transitions from ON_OPPONENT_ATTACK to BLOCKER", () => {
        const state = stateWithPhase("ON_OPPONENT_ATTACK");
        const next = enterBlockerPhase(state);
        expect(next.phase).toBe("BLOCKER");
    });

    it("accepts any phase (no predecessor guard)", () => {
        const state = stateWithPhase("WHEN_ATTACKING");
        expect(() => enterBlockerPhase(state)).not.toThrow();
        expect(enterBlockerPhase(state).phase).toBe("BLOCKER");
    });
});

describe("enterCounterPhase", () => {
    it("transitions from BLOCKER to COUNTER", () => {
        const state = stateWithPhase("BLOCKER");
        const next = enterCounterPhase(state);
        expect(next.phase).toBe("COUNTER");
    });

    it("accepts any phase (no predecessor guard)", () => {
        const state = stateWithPhase("ON_OPPONENT_ATTACK");
        expect(() => enterCounterPhase(state)).not.toThrow();
        expect(enterCounterPhase(state).phase).toBe("COUNTER");
    });
});

describe("enterBattleResolutionPhase", () => {
    it("transitions from COUNTER to BATTLE_RESOLUTION", () => {
        const state = stateWithPhase("COUNTER");
        const next = enterBattleResolutionPhase(state);
        expect(next.phase).toBe("BATTLE_RESOLUTION");
    });

    it("transitions from BLOCKER to BATTLE_RESOLUTION (blocker passed, no counter)", () => {
        const state = stateWithPhase("BLOCKER");
        const next = enterBattleResolutionPhase(state);
        expect(next.phase).toBe("BATTLE_RESOLUTION");
    });

    it("throws from an invalid predecessor phase (e.g. MAIN)", () => {
        const state = stateWithPhase("MAIN");
        expect(() => enterBattleResolutionPhase(state)).toThrow(InvalidActionError);
    });

    it("throws from ON_OPPONENT_ATTACK phase", () => {
        const state = stateWithPhase("ON_OPPONENT_ATTACK");
        expect(() => enterBattleResolutionPhase(state)).toThrow(InvalidActionError);
    });
});

// ============================================================
// setStartTurnState
// ============================================================

describe("setStartTurnState", () => {
    it("advances the active player from P1 to P2", () => {
        const state = stateWithPhase("END_OF_TURN");
        expect(setStartTurnState(state).activePlayerId).toBe("p2");
    });

    it("increments turn count", () => {
        const state = stateWithPhase("END_OF_TURN");
        expect(setStartTurnState(state).turn).toBe(state.turn + 1);
    });

    it("clears currentBattle and battlesThisTurn", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = produce(state, draft => {
            draft.currentBattle = { attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 };
            draft.battlesThisTurn = [{ attackerId: "p1-CARD-0" as CardInstanceId, defenderId: "p2-LEADER" as CardInstanceId, counter: 0 }];
        });
        const next = setStartTurnState(state);
        expect(next.currentBattle).toBeNull();
        expect(next.battlesThisTurn).toHaveLength(0);
    });

    it("clears cardsPlayedThisTurn", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId];
        });
        expect(setStartTurnState(state).cardsPlayedThisTurn).toHaveLength(0);
    });

    it("throws from SETUP phase", () => {
        const state = stateWithPhase("SETUP");
        expect(() => setStartTurnState(state)).toThrow(InvalidActionError);
    });

    it("throws from MAIN phase", () => {
        const state = stateWithPhase("MAIN");
        expect(() => setStartTurnState(state)).toThrow(InvalidActionError);
    });

    it("accepts START_GAME phase", () => {
        const state = stateWithPhase("START_GAME");
        expect(() => setStartTurnState(state)).not.toThrow();
    });

    it("does not mutate original state", () => {
        const state = stateWithPhase("END_OF_TURN");
        setStartTurnState(state);
        expect(state.turn).toBe(0);
    });
});

// ============================================================
// Full turn phase sequence
// ============================================================

describe("full turn phase sequence", () => {
    it("progresses from END_OF_TURN through refresh/draw to MAIN in one call", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = enterStartOfTurnPhase(state);
        expect(state.phase).toBe("START_OF_TURN");
        // enterRefreshPhase auto-chains through REFRESH and DRAW into MAIN
        state = enterRefreshPhase(state);
        expect(state.phase).toBe("MAIN");
        state = enterEndOfTurnPhase(state);
        expect(state.phase).toBe("END_OF_TURN");
    });

    it("progresses through the full battle phase sequence", () => {
        let state = stateWithPhase("MAIN");
        state = enterWhenAttackingPhase(state);
        expect(state.phase).toBe("WHEN_ATTACKING");
        state = enterOnOpponentAttackPhase(state);
        expect(state.phase).toBe("ON_OPPONENT_ATTACK");
        state = enterBlockerPhase(state);
        expect(state.phase).toBe("BLOCKER");
        state = enterCounterPhase(state);
        expect(state.phase).toBe("COUNTER");
        state = enterBattleResolutionPhase(state);
        expect(state.phase).toBe("BATTLE_RESOLUTION");
        state = enterMainPhase(state);
        expect(state.phase).toBe("MAIN");
    });

    it("battle resolution is reachable directly from BLOCKER (no counter played)", () => {
        let state = stateWithPhase("MAIN");
        state = enterWhenAttackingPhase(state);
        state = enterOnOpponentAttackPhase(state);
        state = enterBlockerPhase(state);
        state = enterBattleResolutionPhase(state);
        expect(state.phase).toBe("BATTLE_RESOLUTION");
    });
});
