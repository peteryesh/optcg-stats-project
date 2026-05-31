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
} from "../game/operations/phase";
import { setupTestGame } from "./fixtures";
import { InvalidActionError } from "../errors";
import { produce } from "immer";
import type { GameState, Phase } from "../types";

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

    it("transitions from SETUP to START_OF_TURN", () => {
        const state = stateWithPhase("SETUP");
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
});

describe("enterRefreshPhase", () => {
    it("transitions from START_OF_TURN to REFRESH", () => {
        const state = stateWithPhase("START_OF_TURN");
        const next = enterRefreshPhase(state);
        expect(next.phase).toBe("REFRESH");
    });

    it("throws from a non-START_OF_TURN phase", () => {
        const state = stateWithPhase("DRAW");
        expect(() => enterRefreshPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterDrawPhase", () => {
    it("transitions from REFRESH to DRAW", () => {
        const state = stateWithPhase("REFRESH");
        const next = enterDrawPhase(state);
        expect(next.phase).toBe("DRAW");
    });

    it("throws from a non-REFRESH phase", () => {
        const state = stateWithPhase("MAIN");
        expect(() => enterDrawPhase(state)).toThrow(InvalidActionError);
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

    it("throws from a non-ON_OPPONENT_ATTACK phase", () => {
        const state = stateWithPhase("WHEN_ATTACKING");
        expect(() => enterBlockerPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterCounterPhase", () => {
    it("transitions from BLOCKER to COUNTER", () => {
        const state = stateWithPhase("BLOCKER");
        const next = enterCounterPhase(state);
        expect(next.phase).toBe("COUNTER");
    });

    it("throws from a non-BLOCKER phase", () => {
        const state = stateWithPhase("ON_OPPONENT_ATTACK");
        expect(() => enterCounterPhase(state)).toThrow(InvalidActionError);
    });
});

describe("enterBattleResolutionPhase", () => {
    it("transitions from COUNTER to BATTLE_RESOLUTION", () => {
        const state = stateWithPhase("COUNTER");
        const next = enterBattleResolutionPhase(state);
        expect(next.phase).toBe("BATTLE_RESOLUTION");
    });

    it("throws from a non-COUNTER phase", () => {
        const state = stateWithPhase("BLOCKER");
        expect(() => enterBattleResolutionPhase(state)).toThrow(InvalidActionError);
    });
});

// ============================================================
// Full turn phase sequence
// ============================================================

describe("full turn phase sequence", () => {
    it("progresses through all main turn phases in order", () => {
        let state = stateWithPhase("END_OF_TURN");
        state = enterStartOfTurnPhase(state);
        expect(state.phase).toBe("START_OF_TURN");
        state = enterRefreshPhase(state);
        expect(state.phase).toBe("REFRESH");
        state = enterDrawPhase(state);
        expect(state.phase).toBe("DRAW");
        state = enterMainPhase(state);
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
});
