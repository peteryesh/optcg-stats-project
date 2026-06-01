import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    applyPlayCard,
    applyAttachDon,
    applyDeclareAttack,
    applyDeclareBlocker,
    applyPlayCounter,
    applyCompleteBattle,
    applyActivateEffect,
    applyNextPhase,
} from "../game/actions/main";
import { donAdd } from "../game/operations/don";
import { moveCard, setRested } from "../game/mechanics";
import { assertInvariants } from "./invariants";
import { setupTestGame } from "./fixtures";
import { InvalidActionError } from "../errors";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Base state in MAIN phase
function makeMainPhaseState() {
    return produce(setupTestGame(), draft => { draft.phase = "MAIN"; });
}

// CHARACTER in P1's hand with enough active DON to play
function makeStateForPlayCard(activeDon = 3) {
    let state = makeMainPhaseState();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
    state = donAdd(state, P1, activeDon, false, { kind: "RULE" });
    return { state, charId: "p1-CARD-0" as CardInstanceId };
}

// P1 has a CHARACTER in CHARACTERS zone, P2 LEADER as default defender
function makeStateForDeclareAttack() {
    let state = makeMainPhaseState();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
    return state;
}

// From MAIN: P1 attacks P2's LEADER, ending in BLOCKER phase
function makeStateInBlockerPhase() {
    let state = makeStateForDeclareAttack();
    state = applyDeclareAttack(state, {
        type: "DECLARE_ATTACK",
        playerId: P1,
        attackerId: "p1-CARD-0" as CardInstanceId,
        defenderId: "p2-LEADER" as CardInstanceId,
    });
    return state;
}

// From BLOCKER: P2 skips blocking, ending in COUNTER phase
function makeStateInCounterPhase() {
    let state = makeStateInBlockerPhase(); // BLOCKER
    state = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P2 }); // BLOCKER -> COUNTER
    return state;
}

// ============================================================
// applyPlayCard
// ============================================================

describe("applyPlayCard", () => {
    it("places a CHARACTER in the CHARACTERS zone", () => {
        const { state, charId } = makeStateForPlayCard();
        const next = applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: charId });
        expect(next.playerZones[P1].characters).toContain(charId);
    });

    it("removes the card from hand", () => {
        const { state, charId } = makeStateForPlayCard();
        const next = applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: charId });
        expect(next.playerZones[P1].hand).not.toContain(charId);
    });

    it("rests active DON equal to the card cost (3)", () => {
        const { state, charId } = makeStateForPlayCard(5);
        const next = applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: charId });
        expect(next.playerZones[P1].donActive).toHaveLength(2);
        expect(next.playerZones[P1].donRested).toHaveLength(3);
    });

    it("throws InvalidActionError if card is not in hand", () => {
        const { state, charId } = makeStateForPlayCard();
        // charId was moved to hand in makeStateForPlayCard, but let's use a deck card
        const deckCard = "p1-CARD-1" as CardInstanceId;
        expect(() =>
            applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: deckCard })
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if not enough active DON", () => {
        const { state, charId } = makeStateForPlayCard(1); // cost 3, only 1 active
        expect(() =>
            applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: charId })
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        const { state, charId } = makeStateForPlayCard();
        assertInvariants(applyPlayCard(state, { type: "PLAY_CARD", playerId: P1, instanceId: charId }));
    });
});

// ============================================================
// applyAttachDon
// ============================================================

describe("applyAttachDon", () => {
    it("attaches active DON to P1's CHARACTER", () => {
        let state = makeMainPhaseState();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = applyAttachDon(state, {
            type: "ATTACH_DON",
            playerId: P1,
            donIds: [don],
            targetId: "p1-CARD-0" as CardInstanceId,
        });
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toContain(don);
        expect((next.instances[don] as any).attachedTo).toBe("p1-CARD-0");
    });

    it("attaches active DON to the LEADER", () => {
        let state = makeMainPhaseState();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = applyAttachDon(state, {
            type: "ATTACH_DON",
            playerId: P1,
            donIds: [don],
            targetId: "p1-LEADER" as CardInstanceId,
        });
        expect((next.instances["p1-LEADER" as CardInstanceId] as any).attachedDon).toContain(don);
    });

    it("passes invariants", () => {
        let state = makeMainPhaseState();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        assertInvariants(
            applyAttachDon(state, {
                type: "ATTACH_DON",
                playerId: P1,
                donIds: [don],
                targetId: "p1-LEADER" as CardInstanceId,
            })
        );
    });
});

// ============================================================
// applyDeclareAttack
// ============================================================

describe("applyDeclareAttack", () => {
    it("sets currentBattle with attacker and defender", () => {
        const state = makeStateForDeclareAttack();
        const next = applyDeclareAttack(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        expect(next.currentBattle).not.toBeNull();
        expect(next.currentBattle!.attackerId).toBe("p1-CARD-0");
        expect(next.currentBattle!.defenderId).toBe("p2-LEADER");
    });

    it("advances phase to BLOCKER (auto-advancing through WHEN_ATTACKING and ON_OPPONENT_ATTACK)", () => {
        const state = makeStateForDeclareAttack();
        const next = applyDeclareAttack(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        expect(next.phase).toBe("BLOCKER");
    });

    it("rests the attacker", () => {
        const state = makeStateForDeclareAttack();
        const next = applyDeclareAttack(state, {
            type: "DECLARE_ATTACK",
            playerId: P1,
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
        });
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("passes invariants", () => {
        const state = makeStateForDeclareAttack();
        assertInvariants(
            applyDeclareAttack(state, {
                type: "DECLARE_ATTACK",
                playerId: P1,
                attackerId: "p1-CARD-0" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
            })
        );
    });
});

// ============================================================
// applyDeclareBlocker
// ============================================================

describe("applyDeclareBlocker", () => {
    it("updates currentBattle defender to the blocker and advances to COUNTER", () => {
        let state = makeStateInBlockerPhase();
        // Put P2 CHARACTER in CHARACTERS as a potential blocker
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = applyDeclareBlocker(state, {
            type: "DECLARE_BLOCKER",
            playerId: P2,
            blockerId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.currentBattle!.defenderId).toBe("p2-CARD-0");
        expect(next.phase).toBe("COUNTER");
    });

    it("rests the blocker", () => {
        let state = makeStateInBlockerPhase();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = applyDeclareBlocker(state, {
            type: "DECLARE_BLOCKER",
            playerId: P2,
            blockerId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.instances["p2-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("passes invariants", () => {
        let state = makeStateInBlockerPhase();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        assertInvariants(
            applyDeclareBlocker(state, {
                type: "DECLARE_BLOCKER",
                playerId: P2,
                blockerId: "p2-CARD-0" as CardInstanceId,
            })
        );
    });
});

// ============================================================
// applyPlayCounter
// ============================================================

describe("applyPlayCounter", () => {
    it("adds the card's counter value to currentBattle.counter", () => {
        let state = makeStateInCounterPhase();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = applyPlayCounter(state, {
            type: "PLAY_COUNTER",
            playerId: P2,
            counterId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.currentBattle!.counter).toBe(1000); // MOCK_CHAR counter
    });

    it("moves the counter card to trash", () => {
        let state = makeStateInCounterPhase();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = applyPlayCounter(state, {
            type: "PLAY_COUNTER",
            playerId: P2,
            counterId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.playerZones[P2].trash).toContain("p2-CARD-0");
    });

    it("passes invariants", () => {
        let state = makeStateInCounterPhase();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        assertInvariants(
            applyPlayCounter(state, {
                type: "PLAY_COUNTER",
                playerId: P2,
                counterId: "p2-CARD-0" as CardInstanceId,
            })
        );
    });
});

// ============================================================
// applyCompleteBattle
// ============================================================

describe("applyCompleteBattle", () => {
    it("resolves battle and returns to MAIN phase", () => {
        const state = makeStateInCounterPhase();
        const next = applyCompleteBattle(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.phase).toBe("MAIN");
    });

    it("clears currentBattle after resolution", () => {
        const state = makeStateInCounterPhase();
        const next = applyCompleteBattle(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.currentBattle).toBeNull();
    });

    it("logs the battle to battlesThisTurn", () => {
        const state = makeStateInCounterPhase();
        const next = applyCompleteBattle(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.battlesThisTurn).toHaveLength(1);
    });

    it("FAIL outcome (4000 vs 5000): does not deal damage or remove cards", () => {
        // P1's CHARACTER (4000) attacks P2's LEADER (5000) — FAIL
        const state = makeStateInCounterPhase();
        const next = applyCompleteBattle(state, { type: "COMPLETE_BATTLE", playerId: P2 });
        expect(next.winner).toBeNull();
        expect(next.playerZones[P2].life).toHaveLength(0); // no life was set up
    });

    it("passes invariants", () => {
        assertInvariants(
            applyCompleteBattle(makeStateInCounterPhase(), { type: "COMPLETE_BATTLE", playerId: P2 })
        );
    });
});

// ============================================================
// applyActivateEffect
// ============================================================

describe("applyActivateEffect", () => {
    it("throws InvalidActionError (not yet implemented)", () => {
        const state = makeMainPhaseState();
        expect(() =>
            applyActivateEffect(state, {
                type: "ACTIVATE_EFFECT",
                playerId: P1,
                instanceId: "p1-CARD-0" as CardInstanceId,
                abilityId: "some-ability",
            })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// applyNextPhase
// ============================================================

describe("applyNextPhase", () => {
    it("from START_OF_TURN auto-advances to MAIN (through REFRESH and DRAW)", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "START_OF_TURN";
            draft.turn = 1;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        expect(next.phase).toBe("MAIN");
    });

    it("from MAIN advances to START_OF_TURN (through END_OF_TURN)", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.turn = 1;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        expect(next.phase).toBe("START_OF_TURN");
    });

    it("from MAIN increments the turn counter", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.turn = 3;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        expect(next.turn).toBe(4);
    });

    it("from MAIN rotates the active player", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "MAIN";
            draft.turn = 1;
            draft.activePlayerId = P1;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        expect(next.activePlayerId).toBe(P2);
    });

    it("from BLOCKER advances to COUNTER", () => {
        const state = makeStateInBlockerPhase(); // BLOCKER
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P2 });
        expect(next.phase).toBe("COUNTER");
    });

    it("from ON_OPPONENT_ATTACK advances to BLOCKER", () => {
        let state = produce(setupTestGame(), draft => { draft.phase = "ON_OPPONENT_ATTACK"; });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P2 });
        expect(next.phase).toBe("BLOCKER");
    });

    it("throws InvalidActionError from an invalid phase (REFRESH)", () => {
        let state = produce(setupTestGame(), draft => { draft.phase = "REFRESH"; });
        expect(() =>
            applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 })
        ).toThrow(InvalidActionError);
    });

    it("turn 1: START_OF_TURN -> MAIN adds only 1 DON (first turn rule)", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "START_OF_TURN";
            draft.turn = 1;
            draft.activePlayerId = P1;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        // Turn 1: donAdd 1 DON only
        expect(next.playerZones[P1].donActive).toHaveLength(1);
        expect(next.playerZones[P1].hand).toHaveLength(0); // no draw on turn 1
    });

    it("turn 2+: START_OF_TURN -> MAIN draws 1 card and adds 2 DON", () => {
        let state = produce(setupTestGame(), draft => {
            draft.phase = "START_OF_TURN";
            draft.turn = 2;
            draft.activePlayerId = P1;
        });
        const next = applyNextPhase(state, { type: "NEXT_PHASE", playerId: P1 });
        expect(next.playerZones[P1].donActive).toHaveLength(2);
        expect(next.playerZones[P1].hand).toHaveLength(1);
    });
});
