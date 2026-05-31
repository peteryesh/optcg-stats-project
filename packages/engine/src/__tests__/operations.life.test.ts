import { describe, it, expect } from "vitest";
import {
    lifeAdd,
    lifeSentToHand,
    lifeSentToDeck,
    lifeSentToTrash,
    dealDamage,
} from "../game/operations/life";
import { assertInvariants } from "./invariants";
import { setupTestGame } from "./fixtures";
import { moveCard } from "../game/mechanics";
import { InvalidActionError } from "../errors";
import type { PlayerId, CardInstanceId, DamageCause } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Helper: move cards into life zone from DECK
function makeStateWithLife(count: number = 5) {
    let state = setupTestGame();
    const lifeIds: CardInstanceId[] = [];
    for (let i = 0; i < count; i++) {
        const id = `p1-CARD-${i}` as CardInstanceId;
        state = lifeAdd(state, P1, [id], "DECK", "BOTTOM", { kind: "RULE" });
        lifeIds.push(id);
    }
    return { state, lifeIds };
}

// ============================================================
// lifeAdd
// ============================================================

describe("lifeAdd", () => {
    it("adds a card to the LIFE zone from DECK", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].life).toContain("p1-CARD-0");
    });

    it("adds multiple cards to LIFE in order", () => {
        const state = setupTestGame();
        const next = lifeAdd(
            state, P1,
            ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId],
            "DECK",
            "BOTTOM",
            { kind: "RULE" }
        );
        expect(next.playerZones[P1].life).toHaveLength(2);
    });

    it("adds card to TOP (index 0) of life", () => {
        let state = setupTestGame();
        state = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "TOP", { kind: "RULE" });
        state = lifeAdd(state, P1, ["p1-CARD-1" as CardInstanceId], "DECK", "TOP", { kind: "RULE" });
        expect(state.playerZones[P1].life[0]).toBe("p1-CARD-1");
    });

    it("adds card to BOTTOM of life", () => {
        let state = setupTestGame();
        state = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        state = lifeAdd(state, P1, ["p1-CARD-1" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        expect(state.playerZones[P1].life.at(-1)).toBe("p1-CARD-1");
    });

    it("removes card from its source zone", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("sets currentZone to LIFE on the added card", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("LIFE");
    });

    it("throws InvalidActionError if card is not in the expected fromZone", () => {
        const { state } = makeStateWithLife(1); // p1-CARD-0 is now in LIFE
        // Try to add it to LIFE again claiming it's in DECK — it's actually in LIFE
        expect(() => lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("can add from HAND zone", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "HAND", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].life).toContain("p1-CARD-0");
        expect(next.playerZones[P1].hand).not.toContain("p1-CARD-0");
    });

    it("does not affect other player", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P2].life).toHaveLength(0);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = lifeAdd(
            state, P1,
            ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId],
            "DECK",
            "BOTTOM",
            { kind: "RULE" }
        );
        assertInvariants(next);
    });
});

// ============================================================
// lifeSentToHand
// ============================================================

describe("lifeSentToHand", () => {
    it("removes top life card and adds it to hand", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToHand(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].hand).toContain(lifeIds[0]);
    });

    it("removes bottom life card and adds it to hand", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToHand(state, P1, "BOTTOM", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toContain(lifeIds[2]);
    });

    it("places card at TOP of hand", () => {
        const { state, lifeIds } = makeStateWithLife(2);
        const next = lifeSentToHand(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand[0]).toBe(lifeIds[0]);
    });

    it("places card at BOTTOM of hand", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        state = lifeAdd(state, P1, ["p1-CARD-1" as CardInstanceId], "DECK", "TOP", { kind: "RULE" });
        const next = lifeSentToHand(state, P1, "TOP", "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].hand.at(-1)).toBe("p1-CARD-1");
    });

    it("sets currentZone to HAND on the moved card", () => {
        const { state, lifeIds } = makeStateWithLife(2);
        const next = lifeSentToHand(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.instances[lifeIds[0]].currentZone).toBe("HAND");
    });

    it("returns unchanged state if life zone is empty", () => {
        const state = setupTestGame();
        const next = lifeSentToHand(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(0);
        expect(next.playerZones[P1].life).toHaveLength(0);
    });

    it("reduces life zone by 1 per call", () => {
        const { state } = makeStateWithLife(5);
        let next = state;
        for (let i = 0; i < 3; i++) {
            next = lifeSentToHand(next, P1, "TOP", "TOP", { kind: "RULE" });
        }
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].hand).toHaveLength(3);
    });

    it("passes invariants", () => {
        const { state } = makeStateWithLife(3);
        const next = lifeSentToHand(state, P1, "TOP", "TOP", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// lifeSentToDeck
// ============================================================

describe("lifeSentToDeck", () => {
    it("removes top life card and adds it to deck TOP", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToDeck(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].deck[0]).toBe(lifeIds[0]);
    });

    it("removes bottom life card and adds it to deck BOTTOM", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToDeck(state, P1, "BOTTOM", "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].deck.at(-1)).toBe(lifeIds[2]);
    });

    it("sets currentZone to DECK on the moved card", () => {
        const { state, lifeIds } = makeStateWithLife(2);
        const next = lifeSentToDeck(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.instances[lifeIds[0]].currentZone).toBe("DECK");
    });

    it("returns unchanged state if life zone is empty", () => {
        const state = setupTestGame();
        const deckBefore = state.playerZones[P1].deck.length;
        const next = lifeSentToDeck(state, P1, "TOP", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].deck).toHaveLength(deckBefore);
    });

    it("passes invariants", () => {
        const { state } = makeStateWithLife(3);
        const next = lifeSentToDeck(state, P1, "TOP", "TOP", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// lifeSentToTrash
// ============================================================

describe("lifeSentToTrash", () => {
    it("removes top life card and adds it to trash", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToTrash(state, P1, "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].trash).toContain(lifeIds[0]);
    });

    it("removes bottom life card and adds it to trash", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeSentToTrash(state, P1, "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].trash).toContain(lifeIds[2]);
    });

    it("sets currentZone to TRASH on the moved card", () => {
        const { state, lifeIds } = makeStateWithLife(2);
        const next = lifeSentToTrash(state, P1, "TOP", { kind: "RULE" });
        expect(next.instances[lifeIds[0]].currentZone).toBe("TRASH");
    });

    it("returns unchanged state if life zone is empty", () => {
        const state = setupTestGame();
        const next = lifeSentToTrash(state, P1, "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].trash).toHaveLength(0);
    });

    it("passes invariants", () => {
        const { state } = makeStateWithLife(3);
        const next = lifeSentToTrash(state, P1, "TOP", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// dealDamage
// ============================================================

describe("dealDamage", () => {
    const cause: DamageCause = { kind: "BATTLE", sourceId: "p2-CARD-0" as CardInstanceId };

    it("removes one life card and moves it to hand by default", () => {
        const { state, lifeIds } = makeStateWithLife(5);
        const next = dealDamage(state, P1, cause);
        expect(next.playerZones[P1].life).toHaveLength(4);
        expect(next.playerZones[P1].hand).toContain(lifeIds[0]);
    });

    it("deals multiple life damage in one call", () => {
        const { state } = makeStateWithLife(5);
        const next = dealDamage(state, P1, cause, 3);
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].hand).toHaveLength(3);
    });

    it("does not over-damage beyond remaining life", () => {
        const { state } = makeStateWithLife(2);
        const next = dealDamage(state, P1, cause, 5);
        expect(next.playerZones[P1].life).toHaveLength(0);
        expect(next.playerZones[P1].hand).toHaveLength(2);
    });

    it("sets winner when life is already 0 at time of damage", () => {
        const state = setupTestGame(); // no life cards
        const next = dealDamage(state, P1, cause);
        // attacker is p2-CARD-0, controlled by P2
        expect(next.winner).toBe(P2);
        expect(next.endReason).toBe("KNOCKOUT");
    });

    it("does not end game when life is > 0", () => {
        const { state } = makeStateWithLife(3);
        const next = dealDamage(state, P1, cause);
        expect(next.winner).toBeNull();
        expect(next.endReason).toBeNull();
    });

    it("passes invariants when life remains", () => {
        const { state } = makeStateWithLife(5);
        const next = dealDamage(state, P1, cause, 2);
        assertInvariants(next);
    });
});
