import { describe, it, expect } from "vitest";
import { produce } from "immer";
import { reducer, InvalidActionError } from "../reducer";
import { moveCard } from "../game/mechanics";
import { donAdd } from "../game/operations/don";
import { setupTestGame } from "./fixtures";
import { OPENING_HAND_SIZE } from "../game/rules";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// ============================================================
// Setup helpers
// ============================================================

function makeAfterChooseFirstPlayer(firstPlayer: PlayerId = P1) {
    const state = setupTestGame();
    const winner = state.setup.coinFlipWinner;
    return reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: firstPlayer });
}

function makeStartOfTurnState() {
    let state = makeAfterChooseFirstPlayer();
    state = reducer(state, { type: "KEEP_HAND", playerId: P1 });
    state = reducer(state, { type: "KEEP_HAND", playerId: P2 });
    return state; // START_OF_TURN
}

function makeMainPhaseState() {
    let state = makeStartOfTurnState();
    const active = state.activePlayerId;
    return reducer(state, { type: "NEXT_PHASE", playerId: active }); // → MAIN
}

// ============================================================
// General reducer behaviour
// ============================================================

describe("reducer — general", () => {
    it("throws InvalidActionError when game is already won", () => {
        const state = produce(setupTestGame(), draft => { draft.winner = P1; });
        expect(() =>
            reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: state.setup.coinFlipWinner, choice: P1 })
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError for actions invalid in the current phase", () => {
        const state = setupTestGame(); // SETUP phase
        expect(() =>
            reducer(state, { type: "PLAY_CARD", playerId: P1, instanceId: "p1-CARD-0" as CardInstanceId })
        ).toThrow(InvalidActionError);
    });

    it("appends an entry to actionLog for each valid action", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const next = reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: P1 });
        expect(next.actionLog).toHaveLength(1);
    });

    it("actionLog accumulates across successive actions", () => {
        let state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        state = reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: P1 });
        state = reducer(state, { type: "KEEP_HAND", playerId: P1 });
        state = reducer(state, { type: "KEEP_HAND", playerId: P2 });
        expect(state.actionLog).toHaveLength(3);
    });

    it("logged action matches the dispatched action type", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const next = reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: P1 });
        expect(next.actionLog[0].action.type).toBe("CHOOSE_FIRST_PLAYER");
    });

    it("does not mutate the incoming state", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        const phaseBefore = state.phase;
        reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: P1 });
        expect(state.phase).toBe(phaseBefore);
    });
});

// ============================================================
// SETUP → CHOOSE_FIRST_PLAYER
// ============================================================

describe("reducer — CHOOSE_FIRST_PLAYER", () => {
    it("transitions to START_GAME phase", () => {
        expect(makeAfterChooseFirstPlayer().phase).toBe("START_GAME");
    });

    it("deals OPENING_HAND_SIZE cards to both players", () => {
        const state = makeAfterChooseFirstPlayer();
        expect(state.playerZones[P1].hand).toHaveLength(OPENING_HAND_SIZE);
        expect(state.playerZones[P2].hand).toHaveLength(OPENING_HAND_SIZE);
    });

    it("puts chosen player first in turnOrder", () => {
        const state = makeAfterChooseFirstPlayer(P2);
        expect(state.turnOrder[0]).toBe(P2);
    });

    it("throws when the non-winner tries to choose", () => {
        const state = setupTestGame();
        const loser = state.setup.coinFlipWinner === P1 ? P2 : P1;
        expect(() =>
            reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: loser, choice: P1 })
        ).toThrow(InvalidActionError);
    });

    it("throws when the choice is not a valid player", () => {
        const state = setupTestGame();
        const winner = state.setup.coinFlipWinner;
        expect(() =>
            reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: "p99" as PlayerId })
        ).toThrow(InvalidActionError);
    });

    it("throws when called outside SETUP phase", () => {
        const state = makeAfterChooseFirstPlayer(); // already in START_GAME
        const winner = state.setup.coinFlipWinner;
        expect(() =>
            reducer(state, { type: "CHOOSE_FIRST_PLAYER", deciderId: winner, choice: P1 })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// START_GAME → KEEP_HAND / MULLIGAN
// ============================================================

describe("reducer — KEEP_HAND", () => {
    it("marks the player's mulligan status as KEEP", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "KEEP_HAND", playerId: P1 });
        expect(next.setup.mulligan[P1]).toBe("KEEP");
    });

    it("does not change the other player's mulligan status", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "KEEP_HAND", playerId: P1 });
        expect(next.setup.mulligan[P2]).toBe("PENDING");
    });

    it("sets 5 life cards for the keeping player", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "KEEP_HAND", playerId: P1 });
        expect(next.playerZones[P1].life).toHaveLength(5);
    });

    it("both players keeping transitions to START_OF_TURN", () => {
        expect(makeStartOfTurnState().phase).toBe("START_OF_TURN");
    });

    it("throws if player already decided (KEEP again)", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "KEEP_HAND", playerId: P1 });
        expect(() => reducer(next, { type: "KEEP_HAND", playerId: P1 })).toThrow(InvalidActionError);
    });

    it("throws outside START_GAME phase", () => {
        const state = setupTestGame(); // SETUP phase
        expect(() => reducer(state, { type: "KEEP_HAND", playerId: P1 })).toThrow(InvalidActionError);
    });
});

describe("reducer — MULLIGAN", () => {
    it("marks the player's mulligan status as MULLIGAN", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "MULLIGAN", playerId: P1 });
        expect(next.setup.mulligan[P1]).toBe("MULLIGAN");
    });

    it("player has OPENING_HAND_SIZE cards after redraw", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "MULLIGAN", playerId: P1 });
        expect(next.playerZones[P1].hand).toHaveLength(OPENING_HAND_SIZE);
    });

    it("both players mulliganing transitions to START_OF_TURN", () => {
        let state = makeAfterChooseFirstPlayer();
        state = reducer(state, { type: "MULLIGAN", playerId: P1 });
        state = reducer(state, { type: "MULLIGAN", playerId: P2 });
        expect(state.phase).toBe("START_OF_TURN");
    });

    it("throws if player already mulliganed", () => {
        const state = makeAfterChooseFirstPlayer();
        const next = reducer(state, { type: "MULLIGAN", playerId: P1 });
        expect(() => reducer(next, { type: "MULLIGAN", playerId: P1 })).toThrow(InvalidActionError);
    });
});

// ============================================================
// NEXT_PHASE
// ============================================================

describe("reducer — NEXT_PHASE", () => {
    it("from START_OF_TURN auto-advances to MAIN", () => {
        const state = makeStartOfTurnState();
        const active = state.activePlayerId;
        expect(reducer(state, { type: "NEXT_PHASE", playerId: active }).phase).toBe("MAIN");
    });

    it("from MAIN ends the turn cycle and returns to START_OF_TURN", () => {
        let state = makeMainPhaseState();
        const active = state.activePlayerId;
        state = reducer(state, { type: "NEXT_PHASE", playerId: active });
        expect(state.phase).toBe("START_OF_TURN");
    });

    it("from MAIN increments the turn counter", () => {
        let state = makeMainPhaseState();
        const turnBefore = state.turn;
        const active = state.activePlayerId;
        state = reducer(state, { type: "NEXT_PHASE", playerId: active });
        expect(state.turn).toBe(turnBefore + 1);
    });

    it("from MAIN rotates the active player", () => {
        let state = makeMainPhaseState();
        const prevActive = state.activePlayerId;
        state = reducer(state, { type: "NEXT_PHASE", playerId: prevActive });
        expect(state.activePlayerId).not.toBe(prevActive);
    });

    it("throws when called by the non-active player in START_OF_TURN", () => {
        const state = makeStartOfTurnState();
        const nonActive = state.activePlayerId === P1 ? P2 : P1;
        expect(() => reducer(state, { type: "NEXT_PHASE", playerId: nonActive })).toThrow(InvalidActionError);
    });

    it("throws when called from an invalid phase (REFRESH)", () => {
        const state = produce(setupTestGame(), draft => { draft.phase = "REFRESH"; });
        expect(() => reducer(state, { type: "NEXT_PHASE", playerId: P1 })).toThrow(InvalidActionError);
    });
});

// ============================================================
// PLAY_CARD
// ============================================================

describe("reducer — PLAY_CARD", () => {
    it("plays a CHARACTER from hand to CHARACTERS zone", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 3, false, { kind: "RULE" });
        const next = reducer(state, { type: "PLAY_CARD", playerId: P1, instanceId: "p1-CARD-0" as CardInstanceId });
        expect(next.playerZones[P1].characters).toContain("p1-CARD-0");
        expect(next.playerZones[P1].hand).not.toContain("p1-CARD-0");
    });

    it("rests DON equal to the card cost (3)", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 5, false, { kind: "RULE" });
        const next = reducer(state, { type: "PLAY_CARD", playerId: P1, instanceId: "p1-CARD-0" as CardInstanceId });
        expect(next.playerZones[P1].donActive).toHaveLength(2);
        expect(next.playerZones[P1].donRested).toHaveLength(3);
    });

    it("throws when card is not in hand", () => {
        const state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        expect(() =>
            reducer(state, { type: "PLAY_CARD", playerId: P1, instanceId: "p1-CARD-0" as CardInstanceId })
        ).toThrow(InvalidActionError);
    });

    it("throws when not enough active DON", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = donAdd(state, P1, 1, false, { kind: "RULE" }); // cost 3, only 1
        expect(() =>
            reducer(state, { type: "PLAY_CARD", playerId: P1, instanceId: "p1-CARD-0" as CardInstanceId })
        ).toThrow(InvalidActionError);
    });

    it("throws when called outside MAIN phase", () => {
        const state = makeStartOfTurnState();
        expect(() =>
            reducer(state, { type: "PLAY_CARD", playerId: state.activePlayerId, instanceId: "p1-CARD-0" as CardInstanceId })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// ATTACH_DON
// ============================================================

describe("reducer — ATTACH_DON", () => {
    it("attaches active DON to the LEADER", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = reducer(state, {
            type: "ATTACH_DON",
            playerId: P1,
            donIds: [don],
            targetId: "p1-LEADER" as CardInstanceId,
        });
        expect((next.instances["p1-LEADER" as CardInstanceId] as any).attachedDon).toContain(don);
    });

    it("throws when no DON is provided", () => {
        const state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        expect(() =>
            reducer(state, {
                type: "ATTACH_DON",
                playerId: P1,
                donIds: [],
                targetId: "p1-LEADER" as CardInstanceId,
            })
        ).toThrow(InvalidActionError);
    });

    it("throws when targeting an opponent's card", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        expect(() =>
            reducer(state, {
                type: "ATTACH_DON",
                playerId: P1,
                donIds: [don],
                targetId: "p2-LEADER" as CardInstanceId,
            })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// ACTIVATE_EFFECT
// ============================================================

describe("reducer — ACTIVATE_EFFECT", () => {
    it("throws InvalidActionError (not yet implemented)", () => {
        const state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.activePlayerId = P1;
        });
        expect(() =>
            reducer(state, {
                type: "ACTIVATE_EFFECT",
                playerId: P1,
                instanceId: "p1-CARD-0" as CardInstanceId,
                effectId: "some-ability",
            })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// CHOOSE_NEXT_EFFECT
// ============================================================

describe("reducer — CHOOSE_NEXT_EFFECT", () => {
    it("throws when there is no pending decision", () => {
        const state = produce(setupTestGame(), draft => { draft.pendingDecision = null; });
        expect(() =>
            reducer(state, { type: "CHOOSE_NEXT_EFFECT", playerId: P1, sequenceId: "seq-1" })
        ).toThrow(InvalidActionError);
    });

    it("throws when currentEffect is already executing", () => {
        const state = produce(setupTestGame(), draft => {
            draft.pendingDecision = { type: "NEXT_EFFECT", playerId: P1 };
            (draft.currentEffect as any) = {
                effectId: "e1",
                sequenceId: "seq-1",
                sourceInstanceId: "p1-CARD-0",
                activatingSignal: null,
                controllerAtQueueTime: P1,
                steps: [],
                resolved: {},
            };
        });
        expect(() =>
            reducer(state, { type: "CHOOSE_NEXT_EFFECT", playerId: P1, sequenceId: "seq-1" })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// Battle flow: DECLARE_ATTACK → NEXT_PHASE (BLOCKER→COUNTER) → PLAY_COUNTER → COMPLETE_BATTLE
// ============================================================

describe("reducer — battle flow", () => {
    // Turn 3 is the first turn where attacks are legal (turn <= turnOrder.length blocks turns 1 & 2)
    function makeMainStateForBattle() {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.turn = 3;
            draft.activePlayerId = P1;
        });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        return state;
    }

    it("DECLARE_ATTACK sets currentBattle, rests the attacker, and advances to BLOCKER", () => {
        const state = makeMainStateForBattle();
        const next = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        expect(next.currentBattle!.attackerId).toBe("p1-CARD-0");
        expect(next.currentBattle!.defenderId).toBe("p2-LEADER");
        expect(next.currentBattle!.counter).toBe(0);
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
        expect(next.phase).toBe("BLOCKER");
    });

    it("DECLARE_ATTACK throws when attacker was played this turn", () => {
        let state = makeMainStateForBattle();
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId];
        });
        expect(() =>
            reducer(state, {
                type: "DECLARE_ATTACK",
                playerId: P1,
                attackerId: "p1-CARD-0" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
            })
        ).toThrow(InvalidActionError);
    });

    it("DECLARE_ATTACK throws before turn 3 (first two turns restricted)", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.turn = 2;
            draft.activePlayerId = P1;
        });
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            reducer(state, {
                type: "DECLARE_ATTACK",
                playerId: P1,
                attackerId: "p1-CARD-0" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
            })
        ).toThrow(InvalidActionError);
    });

    it("NEXT_PHASE in BLOCKER (by defending player) advances to COUNTER", () => {
        let state = makeMainStateForBattle();
        state = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        }); // → BLOCKER
        const next = reducer(state, { type: "NEXT_PHASE", playerId: P2 });
        expect(next.phase).toBe("COUNTER");
    });

    it("PLAY_COUNTER adds counter value and moves card to trash", () => {
        let state = makeMainStateForBattle();
        state = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        state = reducer(state, { type: "NEXT_PHASE", playerId: P2 }); // → COUNTER
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = reducer(state, {
            type: "PLAY_COUNTER",
            playerId: P2,
            counterId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.currentBattle!.counter).toBe(1000); // CHARACTER counter value
        expect(next.playerZones[P2].trash).toContain("p2-CARD-0");
        expect(next.phase).toBe("COUNTER"); // stays in COUNTER after playing counter
    });

    it("COMPLETE_BATTLE resolves the battle and returns to MAIN", () => {
        let state = makeMainStateForBattle();
        state = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        state = reducer(state, { type: "NEXT_PHASE", playerId: P2 }); // → COUNTER
        const next = reducer(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.phase).toBe("MAIN");
        expect(next.currentBattle).toBeNull();
        expect(next.battlesThisTurn).toHaveLength(1);
    });

    it("COMPLETE_BATTLE: FAIL outcome (4000 vs 5000) does not deal damage", () => {
        let state = makeMainStateForBattle();
        state = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        state = reducer(state, { type: "NEXT_PHASE", playerId: P2 });
        const next = reducer(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.winner).toBeNull();
        expect(next.playerZones[P2].life).toHaveLength(0); // no life was set up to begin with
    });

    it("full battle logged in actionLog", () => {
        let state = makeMainStateForBattle();
        const logBefore = state.actionLog.length;
        state = reducer(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        state = reducer(state, { type: "NEXT_PHASE", playerId: P2 });
        state = reducer(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(state.actionLog.length).toBe(logBefore + 3);
    });
});
