import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
    declareAttack,
    declareBlocker,
    redirectAttack,
    playCounter,
    resolveBattle,
} from "../game/operations/attack";
import { moveCard, setRested, attachDon } from "../game/mechanics";
import { donAdd } from "../game/operations/don";
import { lifeAdd } from "../game/operations/life";
import { assertInvariants } from "./invariants";
import { setupTestGame } from "./fixtures";
import { InvalidActionError } from "../errors";
import type { PlayerId, CardInstanceId, BattleRecord } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// P1's CHARACTER in CHARACTERS zone, ready to attack P2's LEADER or a rested CHARACTER
function makeStateForAttack() {
    let state = setupTestGame();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
    return state;
}

// State with an active battle (P1 char vs P2 leader), no counter yet
function makeStateWithBattle(counter = 0) {
    let state = makeStateForAttack();
    state = produce(state, draft => {
        draft.currentBattle = {
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-LEADER" as CardInstanceId,
            counter,
        };
    });
    return state;
}

// P1's CHARACTER (4000) vs P2's CHARACTER (4000), set up for resolveBattle
function makeStateForCharVsChar() {
    let state = setupTestGame();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
    state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
    state = setRested(state, "p2-CARD-0" as CardInstanceId);
    state = produce(state, draft => {
        draft.currentBattle = {
            attackerId: "p1-CARD-0" as CardInstanceId,
            defenderId: "p2-CARD-0" as CardInstanceId,
            counter: 0,
        };
    });
    return state;
}

// ============================================================
// declareAttack
// ============================================================

describe("declareAttack", () => {
    it("sets currentBattle with the attacker and defender", () => {
        const state = makeStateForAttack();
        const next = declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId);
        expect(next.currentBattle).not.toBeNull();
        expect(next.currentBattle!.attackerId).toBe("p1-CARD-0");
        expect(next.currentBattle!.defenderId).toBe("p2-LEADER");
    });

    it("initialises battle counter to 0", () => {
        const state = makeStateForAttack();
        const next = declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId);
        expect(next.currentBattle!.counter).toBe(0);
    });

    it("rests the attacker", () => {
        const state = makeStateForAttack();
        const next = declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId);
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("allows attacking a rested opponent CHARACTER", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = setRested(state, "p2-CARD-0" as CardInstanceId);
        const next = declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-CARD-0" as CardInstanceId);
        expect(next.currentBattle!.defenderId).toBe("p2-CARD-0");
    });

    it("allows attacking the opponent LEADER regardless of rest status", () => {
        const state = makeStateForAttack();
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).not.toThrow();
    });

    it("throws InvalidActionError if a battle is already in progress", () => {
        const state = makeStateWithBattle();
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if player does not control the attacker", () => {
        const state = makeStateForAttack();
        expect(() =>
            declareAttack(state, P2, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if the attacker is rested", () => {
        let state = makeStateForAttack();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if attacker was played this turn (no rush)", () => {
        let state = makeStateForAttack();
        state = produce(state, draft => {
            draft.cardsPlayedThisTurn = ["p1-CARD-0" as CardInstanceId];
        });
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if attacker is not in CHARACTERS or LEADER zone", () => {
        const state = setupTestGame(); // p1-CARD-0 is in DECK
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if defender is controlled by the attacking player", () => {
        const state = makeStateForAttack();
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p1-LEADER" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError when targeting an active CHARACTER (not rested)", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        // p2-CARD-0 is active (isRested = false)
        expect(() =>
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        const state = makeStateForAttack();
        assertInvariants(
            declareAttack(state, P1, "p1-CARD-0" as CardInstanceId, "p2-LEADER" as CardInstanceId)
        );
    });
});

// ============================================================
// declareBlocker
// ============================================================

describe("declareBlocker", () => {
    it("updates currentBattle defender to the blocker", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId);
        expect(next.currentBattle!.defenderId).toBe("p2-CARD-0");
    });

    it("rests the blocker", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId);
        expect(next.instances["p2-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("throws InvalidActionError if there is no current battle", () => {
        let state = setupTestGame();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if player does not control the blocker", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            declareBlocker(state, P1, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if blocker is not in CHARACTERS zone", () => {
        const state = makeStateWithBattle(); // p2-CARD-0 is in DECK
        expect(() =>
            declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if blocker is rested", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = setRested(state, "p2-CARD-0" as CardInstanceId);
        expect(() =>
            declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        assertInvariants(declareBlocker(state, P2, "p2-CARD-0" as CardInstanceId));
    });
});

// ============================================================
// redirectAttack
// ============================================================

describe("redirectAttack", () => {
    it("updates currentBattle.defenderId to the new target", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = setRested(state, "p2-CARD-0" as CardInstanceId);
        const next = redirectAttack(state, P2, "p2-CARD-0" as CardInstanceId, { kind: "RULE" });
        expect(next.currentBattle!.defenderId).toBe("p2-CARD-0");
    });

    it("throws InvalidActionError if there is no current battle", () => {
        let state = setupTestGame();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            redirectAttack(state, P2, "p2-CARD-0" as CardInstanceId, { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if new target is not controlled by the player", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            redirectAttack(state, P1, "p2-CARD-0" as CardInstanceId, { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if new target is not in CHARACTERS or LEADER zone", () => {
        const state = makeStateWithBattle(); // p2-CARD-0 in DECK
        expect(() =>
            redirectAttack(state, P2, "p2-CARD-0" as CardInstanceId, { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });
});

// ============================================================
// playCounter
// ============================================================

describe("playCounter", () => {
    it("adds the card's counter value (1000) to currentBattle.counter", () => {
        let state = makeStateWithBattle(0);
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = playCounter(state, P2, "p2-CARD-0" as CardInstanceId);
        expect(next.currentBattle!.counter).toBe(1000);
    });

    it("stacks counter over an existing counter value", () => {
        let state = makeStateWithBattle(500);
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = playCounter(state, P2, "p2-CARD-0" as CardInstanceId);
        expect(next.currentBattle!.counter).toBe(1500);
    });

    it("moves the counter card to trash", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = playCounter(state, P2, "p2-CARD-0" as CardInstanceId);
        expect(next.playerZones[P2].trash).toContain("p2-CARD-0");
    });

    it("throws when the counter card is not a CHARACTER (e.g. LEADER has no counter)", () => {
        let state = makeStateWithBattle();
        state = produce(state, draft => {
            draft.playerZones[P2].hand.push("p2-LEADER" as CardInstanceId);
            draft.instances["p2-LEADER" as CardInstanceId].currentZone = "HAND";
        });
        // calculateCounter throws a plain Error for non-CHARACTER cards
        expect(() =>
            playCounter(state, P2, "p2-LEADER" as CardInstanceId)
        ).toThrow();
    });

    it("throws InvalidActionError if no current battle", () => {
        let state = setupTestGame();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(() =>
            playCounter(state, P2, "p2-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if card is not owned by the player", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "HAND", "TOP");
        // p1-CARD-1 is controlled by P1, but we pass P2 as the player
        expect(() =>
            playCounter(state, P2, "p1-CARD-1" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = makeStateWithBattle();
        state = moveCard(state, "p2-CARD-0" as CardInstanceId, "HAND", "TOP");
        assertInvariants(playCounter(state, P2, "p2-CARD-0" as CardInstanceId));
    });
});

// ============================================================
// resolveBattle
// ============================================================

describe("resolveBattle", () => {
    it("appends the battle to battlesThisTurn", () => {
        const state = makeStateWithBattle();
        const next = resolveBattle(state);
        expect(next.battlesThisTurn).toHaveLength(1);
    });

    it("clears currentBattle after resolution", () => {
        const state = makeStateWithBattle();
        const next = resolveBattle(state);
        expect(next.currentBattle).toBeNull();
    });

    it("FAIL outcome: CHARACTER (4000) vs LEADER (5000) with no counter — no damage or removal", () => {
        const state = makeStateWithBattle(0); // 4000 vs 5000 -> fail
        const next = resolveBattle(state);
        expect(next.winner).toBeNull();
        // P2 LEADER still alive
        expect(next.playerZones[P2].leader).toContain("p2-LEADER");
    });

    it("FAIL outcome: attacker power meets defender + counter threshold — no damage", () => {
        // 4000 vs 4000 + 1000 counter = fail
        const state = makeStateWithBattle(1000);
        const next = resolveBattle(state);
        expect(next.winner).toBeNull();
    });

    it("CHARACTER HIT outcome: removes defender from the field", () => {
        const state = makeStateForCharVsChar(); // 4000 vs 4000, counter 0 -> hit
        const next = resolveBattle(state);
        expect(next.playerZones[P2].characters).not.toContain("p2-CARD-0");
        expect(next.playerZones[P2].trash).toContain("p2-CARD-0");
    });

    it("CHARACTER HIT: detaches any DON attached to the defender", () => {
        let state = makeStateForCharVsChar();
        state = attachDon(state, "p2-DON-0" as CardInstanceId, "p2-CARD-0" as CardInstanceId);
        const next = resolveBattle(state);
        expect(next.playerZones[P2].donRested).toContain("p2-DON-0");
        expect((next.instances["p2-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
    });

    it("LEADER HIT outcome: deals damage to the defending player when they have life", () => {
        // Use P1 LEADER (5000) vs P2 LEADER (5000) -> hit
        let state = setupTestGame();
        // Add 5 life cards for P2
        const lifeCards = state.playerZones[P2].deck.slice(0, 5);
        state = lifeAdd(state, P2, lifeCards, "DECK", "BOTTOM", { kind: "RULE" });
        state = produce(state, draft => {
            draft.currentBattle = {
                attackerId: "p1-LEADER" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
                counter: 0,
            };
        });
        const next = resolveBattle(state);
        expect(next.playerZones[P2].life).toHaveLength(4); // 1 life card dealt
        expect(next.winner).toBeNull(); // game not over
    });

    it("LEADER HIT with no life: sets winner and KNOCKOUT", () => {
        // P2 has no life cards, so hitting their LEADER ends the game
        let state = setupTestGame();
        state = produce(state, draft => {
            draft.currentBattle = {
                attackerId: "p1-LEADER" as CardInstanceId,
                defenderId: "p2-LEADER" as CardInstanceId,
                counter: 0,
            };
        });
        const next = resolveBattle(state);
        expect(next.winner).toBe(P1);
        expect(next.endReason).toBe("KNOCKOUT");
    });

    it("throws InvalidActionError if no current battle exists", () => {
        const state = setupTestGame();
        expect(() => resolveBattle(state)).toThrow();
    });

    it("passes invariants on FAIL outcome", () => {
        assertInvariants(resolveBattle(makeStateWithBattle()));
    });

    it("passes invariants on CHARACTER HIT outcome", () => {
        assertInvariants(resolveBattle(makeStateForCharVsChar()));
    });
});
