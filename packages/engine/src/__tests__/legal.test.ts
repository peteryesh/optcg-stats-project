import { describe, it, expect } from "vitest";
import { produce } from "immer";
import { getLegalActions } from "../legal";
import { applyChooseFirstPlayer, applyKeepHand } from "../game/actions/start";
import { moveCard, setRested } from "../game/mechanics";
import { donAdd } from "../game/operations/don";
import { setupTestGame } from "./fixtures";
import type { PlayerId, CardInstanceId, GameAction } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Full setup flow helpers

function makeStartGameState(firstPlayer: PlayerId = P1) {
    const state = setupTestGame();
    const winner = state.setup.coinFlipWinner;
    return applyChooseFirstPlayer(state, {
        type: "CHOOSE_FIRST_PLAYER",
        deciderId: winner,
        choice: firstPlayer,
    });
}

function makeStartOfTurnState() {
    let state = makeStartGameState();
    state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P1 });
    state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P2 });
    // Now in START_OF_TURN phase
    return state;
}

function makeMainPhaseState() {
    // Bypass the full flow so we control turn number
    return produce(setupTestGame(), draft => {
        draft.phase = "MAIN";
        draft.turn = 1;
        draft.activePlayerId = P1;
    });
}

function actionTypes(actions: GameAction[]): string[] {
    return actions.map(a => a.type);
}

// ============================================================
// SETUP phase
// ============================================================

describe("getLegalActions — SETUP phase", () => {
    it("coin flip winner gets 2 CHOOSE_FIRST_PLAYER options", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const actions = getLegalActions(state, winner);
        expect(actions).toHaveLength(2);
        expect(actions.every(a => a.type === "CHOOSE_FIRST_PLAYER")).toBe(true);
    });

    it("the two choices cover both players", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const choices = getLegalActions(state, winner).map(a => (a as any).choice);
        expect(choices).toContain(P1);
        expect(choices).toContain(P2);
    });

    it("coin flip loser gets 0 legal actions", () => {
        const state = setupTestGame();
        const loser = state.setup.coinFlipWinner === P1 ? P2 : P1;
        expect(getLegalActions(state, loser)).toHaveLength(0);
    });

    it("returns empty array when game already has a winner", () => {
        const state = produce(setupTestGame(), draft => { draft.winner = P1; });
        expect(getLegalActions(state, state.setup.coinFlipWinner)).toHaveLength(0);
    });

    it("deciderId on generated actions matches the requesting playerId", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const actions = getLegalActions(state, winner);
        expect(actions.every(a => (a as any).deciderId === winner)).toBe(true);
    });
});

// ============================================================
// START_GAME phase
// ============================================================

describe("getLegalActions — START_GAME phase", () => {
    it("both players get KEEP_HAND and MULLIGAN", () => {
        const state = makeStartGameState();
        expect(actionTypes(getLegalActions(state, P1))).toContain("KEEP_HAND");
        expect(actionTypes(getLegalActions(state, P1))).toContain("MULLIGAN");
        expect(actionTypes(getLegalActions(state, P2))).toContain("KEEP_HAND");
        expect(actionTypes(getLegalActions(state, P2))).toContain("MULLIGAN");
    });

    it("each player gets exactly 2 actions in START_GAME", () => {
        const state = makeStartGameState();
        expect(getLegalActions(state, P1)).toHaveLength(2);
        expect(getLegalActions(state, P2)).toHaveLength(2);
    });

    it("player who already kept hand gets 0 legal START_GAME actions", () => {
        let state = makeStartGameState();
        state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P1 });
        // P1 already decided — both KEEP_HAND and MULLIGAN fail validation
        const actions = getLegalActions(state, P1).filter(
            a => a.type === "KEEP_HAND" || a.type === "MULLIGAN"
        );
        expect(actions).toHaveLength(0);
    });
});

// ============================================================
// START_OF_TURN phase
// ============================================================

describe("getLegalActions — START_OF_TURN phase", () => {
    it("active player gets exactly NEXT_PHASE", () => {
        const state = makeStartOfTurnState();
        const active = state.activePlayerId;
        const actions = getLegalActions(state, active);
        expect(actions).toHaveLength(1);
        expect(actions[0].type).toBe("NEXT_PHASE");
    });

    it("non-active player gets 0 legal actions in START_OF_TURN", () => {
        const state = makeStartOfTurnState();
        const nonActive = state.activePlayerId === P1 ? P2 : P1;
        expect(getLegalActions(state, nonActive)).toHaveLength(0);
    });
});

// ============================================================
// MAIN phase
// ============================================================

describe("getLegalActions — MAIN phase", () => {
    it("active player always gets NEXT_PHASE", () => {
        const state = makeMainPhaseState();
        expect(actionTypes(getLegalActions(state, P1))).toContain("NEXT_PHASE");
    });

    it("hand card with sufficient active DON appears as PLAY_CARD", () => {
        let state = makeMainPhaseState();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 3, false, { kind: "RULE" }); // CHARACTER cost = 3
        const actions = getLegalActions(state, P1);
        expect(actions.some(a => a.type === "PLAY_CARD" && (a as any).instanceId === "p1-CARD-0")).toBe(true);
    });

    it("hand card with insufficient DON is filtered out of PLAY_CARD", () => {
        let state = makeMainPhaseState();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 1, false, { kind: "RULE" }); // cost 3, only 1 active
        const actions = getLegalActions(state, P1);
        expect(actions.some(a => a.type === "PLAY_CARD" && (a as any).instanceId === "p1-CARD-0")).toBe(false);
    });

    it("all hand cards appear as PLAY_CARD candidates when fully funded", () => {
        let state = makeMainPhaseState();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 6, false, { kind: "RULE" }); // 2 × cost 3
        const playCandidates = getLegalActions(state, P1).filter(a => a.type === "PLAY_CARD");
        expect(playCandidates).toHaveLength(2);
    });

    it("ATTACH_DON actions appear when active DON and valid targets exist", () => {
        let state = makeMainPhaseState();
        state = donAdd(state, P1, 2, false, { kind: "RULE" });
        const actions = getLegalActions(state, P1);
        expect(actions.some(a => a.type === "ATTACH_DON")).toBe(true);
    });

    it("ATTACH_DON does not appear when active player has no active DON", () => {
        const state = makeMainPhaseState();
        const actions = getLegalActions(state, P1);
        expect(actions.some(a => a.type === "ATTACH_DON")).toBe(false);
    });

    it("DECLARE_ATTACK does not appear on turn 1 (turn <= turnOrder.length)", () => {
        let state = makeMainPhaseState(); // turn 1, 2 players → turn <= 2 is blocked
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(actionTypes(getLegalActions(state, P1))).not.toContain("DECLARE_ATTACK");
    });

    it("DECLARE_ATTACK appears on turn 3+ with a valid attacker and rested defender", () => {
        let state = produce(makeMainPhaseState(), draft => { draft.turn = 3; });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = setRested(state, "p2-CARD-0" as CardInstanceId);
        expect(actionTypes(getLegalActions(state, P1))).toContain("DECLARE_ATTACK");
    });

    it("DECLARE_ATTACK does not target active (non-rested) CHARACTER defenders", () => {
        let state = produce(makeMainPhaseState(), draft => { draft.turn = 3; });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        // p2-CARD-0 is active (isRested = false) — should be filtered
        const attacks = getLegalActions(state, P1).filter(
            a => a.type === "DECLARE_ATTACK" && (a as any).defenderId === "p2-CARD-0"
        );
        expect(attacks).toHaveLength(0);
    });

    it("non-active player gets 0 legal MAIN phase actions", () => {
        const state = makeMainPhaseState(); // P1 is active
        expect(getLegalActions(state, P2)).toHaveLength(0);
    });

    it("returns empty array for a player not in the game", () => {
        const state = makeMainPhaseState();
        expect(getLegalActions(state, "p99" as PlayerId)).toHaveLength(0);
    });
});

// ============================================================
// COUNTER phase
// ============================================================

describe("getLegalActions — COUNTER phase", () => {
    function makeCounterState() {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "COUNTER";
            draft.activePlayerId = P1;
            draft.currentBattle = {
                attackerId: "p1-CARD-0" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
                counter: 0,
            };
        });
        return state;
    }

    it("defending player gets COMPLETE_BATTLE", () => {
        const state = makeCounterState();
        expect(actionTypes(getLegalActions(state, P2))).toContain("COMPLETE_BATTLE");
    });

    it("defending player gets PLAY_COUNTER for hand cards with counter value", () => {
        let state = makeCounterState();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        // p2-CARD-0 is a CHARACTER with counter 1000
        expect(actionTypes(getLegalActions(state, P2))).toContain("PLAY_COUNTER");
    });

    it("active player (attacker) gets no COUNTER or COMPLETE_BATTLE actions", () => {
        const state = makeCounterState();
        const p1Actions = getLegalActions(state, P1);
        expect(p1Actions.filter(a => a.type === "PLAY_COUNTER" || a.type === "COMPLETE_BATTLE")).toHaveLength(0);
    });
});

// ============================================================
// BLOCKER phase
// ============================================================

describe("getLegalActions — BLOCKER phase", () => {
    function makeBlockerState() {
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.phase = "BLOCKER";
            draft.activePlayerId = P1;
            draft.currentBattle = {
                attackerId: "p1-CARD-0" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
                counter: 0,
            };
        });
        return state;
    }

    it("defending player gets exactly NEXT_PHASE in BLOCKER", () => {
        const state = makeBlockerState();
        const actions = getLegalActions(state, P2);
        expect(actions).toHaveLength(1);
        expect(actions[0].type).toBe("NEXT_PHASE");
    });

    it("active player (attacker) gets no legal actions in BLOCKER", () => {
        const state = makeBlockerState();
        expect(getLegalActions(state, P1)).toHaveLength(0);
    });

    it("DECLARE_BLOCKER is never a legal action (not yet implemented)", () => {
        let state = makeBlockerState();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const actions = getLegalActions(state, P2);
        expect(actions.every(a => a.type !== "DECLARE_BLOCKER")).toBe(true);
    });

});

// ============================================================
// Game-over guard
// ============================================================

describe("getLegalActions — game over", () => {
    it("returns empty for all players when winner is set", () => {
        const state = produce(makeMainPhaseState(), draft => { draft.winner = P2; });
        expect(getLegalActions(state, P1)).toHaveLength(0);
        expect(getLegalActions(state, P2)).toHaveLength(0);
    });
});
