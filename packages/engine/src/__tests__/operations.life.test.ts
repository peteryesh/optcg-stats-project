import { describe, it, expect } from "vitest";
import {
    lifeAdd,
    lifeRemove,
    dealDamage,
} from "../game/operations/life";
import { assertInvariants } from "./invariants";
import { setupTestGame } from "./fixtures";
import type { PlayerId, CardInstanceId, DamageCause } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Helper: move cards into life zone so tests have life to work with
function makeStateWithLife(count: number = 5) {
    let state = setupTestGame();
    const lifeIds: CardInstanceId[] = [];
    for (let i = 0; i < count; i++) {
        const id = `p1-CARD-${i}` as CardInstanceId;
        state = lifeAdd(state, P1, [id], "BOTTOM", { kind: "RULE" });
        lifeIds.push(id);
    }
    return { state, lifeIds };
}

// ============================================================
// lifeAdd
// ============================================================

describe("lifeAdd", () => {
    it("adds a card to the LIFE zone", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].life).toContain("p1-CARD-0");
    });

    it("adds multiple cards to LIFE in order", () => {
        const state = setupTestGame();
        const next = lifeAdd(
            state, P1,
            ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId],
            "BOTTOM",
            { kind: "RULE" }
        );
        expect(next.playerZones[P1].life).toHaveLength(2);
    });

    it("adds card to TOP (index 0) of life", () => {
        let state = setupTestGame();
        state = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "TOP", { kind: "RULE" });
        state = lifeAdd(state, P1, ["p1-CARD-1" as CardInstanceId], "TOP", { kind: "RULE" });
        expect(state.playerZones[P1].life[0]).toBe("p1-CARD-1");
    });

    it("adds card to BOTTOM of life", () => {
        let state = setupTestGame();
        state = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        state = lifeAdd(state, P1, ["p1-CARD-1" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        expect(state.playerZones[P1].life.at(-1)).toBe("p1-CARD-1");
    });

    it("removes card from its source zone", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("sets currentZone to LIFE on the added card", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("LIFE");
    });

    it("does not affect other player", () => {
        const state = setupTestGame();
        const next = lifeAdd(state, P1, ["p1-CARD-0" as CardInstanceId], "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P2].life).toHaveLength(0);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = lifeAdd(
            state, P1,
            ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId],
            "BOTTOM",
            { kind: "RULE" }
        );
        assertInvariants(next);
    });
});

// ============================================================
// lifeRemove
// ============================================================

describe("lifeRemove", () => {
    it("removes top life card and moves to destination", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeRemove(state, P1, "TOP", "HAND", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].hand).toContain(lifeIds[0]);
    });

    it("removes bottom life card", () => {
        const { state, lifeIds } = makeStateWithLife(3);
        const next = lifeRemove(state, P1, "BOTTOM", "HAND", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toContain(lifeIds[2]);
    });

    it("sets currentZone to destination on the removed card", () => {
        const { state, lifeIds } = makeStateWithLife(2);
        const next = lifeRemove(state, P1, "TOP", "TRASH", "TOP", { kind: "RULE" });
        expect(next.instances[lifeIds[0]].currentZone).toBe("TRASH");
    });

    it("returns unchanged state if life zone is empty", () => {
        const state = setupTestGame();
        const next = lifeRemove(state, P1, "TOP", "HAND", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(0);
        expect(next.playerZones[P1].life).toHaveLength(0);
    });

    it("reduces life zone by 1 per call", () => {
        const { state } = makeStateWithLife(5);
        let next = state;
        for (let i = 0; i < 3; i++) {
            next = lifeRemove(next, P1, "TOP", "HAND", "TOP", { kind: "RULE" });
        }
        expect(next.playerZones[P1].life).toHaveLength(2);
        expect(next.playerZones[P1].hand).toHaveLength(3);
    });

    it("passes invariants", () => {
        const { state } = makeStateWithLife(3);
        const next = lifeRemove(state, P1, "TOP", "HAND", "TOP", { kind: "RULE" });
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
