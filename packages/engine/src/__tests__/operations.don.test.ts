import { describe, it, expect } from "vitest";
import {
    donAdd,
    donRest,
    donSetActive,
    donReturn,
    donAttach,
    donDetach,
    donRefresh,
} from "../game/operations/don";
import { attachDon, moveCard } from "../game/mechanics";
import { assertInvariants } from "./invariants";
import { setupTestGame } from "./fixtures";
import { InvalidActionError } from "../errors";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// ============================================================
// donAdd
// ============================================================

describe("donAdd", () => {
    it("moves DON from donDeck to donActive (rested=false)", () => {
        const state = setupTestGame();
        const next = donAdd(state, P1, 2, false, { kind: "RULE" });
        expect(next.playerZones[P1].donActive).toHaveLength(2);
        expect(next.playerZones[P1].donDeck).toHaveLength(8);
    });

    it("moves DON from donDeck to donRested (rested=true)", () => {
        const state = setupTestGame();
        const next = donAdd(state, P1, 3, true, { kind: "RULE" });
        expect(next.playerZones[P1].donRested).toHaveLength(3);
        expect(next.playerZones[P1].donDeck).toHaveLength(7);
    });

    it("takes from top of donDeck (index 0)", () => {
        const state = setupTestGame();
        const topDon = state.playerZones[P1].donDeck[0];
        const next = donAdd(state, P1, 1, false, { kind: "RULE" });
        expect(next.playerZones[P1].donActive).toContain(topDon);
    });

    it("stops when donDeck is exhausted without throwing", () => {
        const state = setupTestGame();
        const next = donAdd(state, P1, 20, false, { kind: "RULE" });
        expect(next.playerZones[P1].donActive).toHaveLength(10);
        expect(next.playerZones[P1].donDeck).toHaveLength(0);
    });

    it("returns unchanged state if donDeck is empty", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 10, false, { kind: "RULE" });
        const next = donAdd(state, P1, 1, false, { kind: "RULE" });
        expect(next.playerZones[P1].donActive).toHaveLength(10);
    });

    it("does not affect other player", () => {
        const state = setupTestGame();
        const next = donAdd(state, P1, 2, false, { kind: "RULE" });
        expect(next.playerZones[P2].donActive).toHaveLength(0);
        expect(next.playerZones[P2].donDeck).toHaveLength(10);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = donAdd(state, P1, 3, false, { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// donRest
// ============================================================

describe("donRest", () => {
    it("moves DON from donActive to donRested", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 3, false, { kind: "RULE" });
        state = donRest(state, P1, 2, { kind: "RULE" });
        expect(state.playerZones[P1].donActive).toHaveLength(1);
        expect(state.playerZones[P1].donRested).toHaveLength(2);
    });

    it("rests the correct count", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 5, false, { kind: "RULE" });
        state = donRest(state, P1, 5, { kind: "RULE" });
        expect(state.playerZones[P1].donActive).toHaveLength(0);
        expect(state.playerZones[P1].donRested).toHaveLength(5);
    });

    it("throws InvalidActionError if count exceeds active DON", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 2, false, { kind: "RULE" });
        expect(() => donRest(state, P1, 3, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("sets isRested=true on moved DON instances", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const activeDon = state.playerZones[P1].donActive[0];
        state = donRest(state, P1, 1, { kind: "RULE" });
        expect((state.instances[activeDon] as any).isRested).toBe(true);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 4, false, { kind: "RULE" });
        state = donRest(state, P1, 2, { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// donSetActive
// ============================================================

describe("donSetActive", () => {
    it("moves DON from donRested to donActive", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 3, true, { kind: "RULE" });
        state = donSetActive(state, P1, 2, { kind: "RULE" });
        expect(state.playerZones[P1].donRested).toHaveLength(1);
        expect(state.playerZones[P1].donActive).toHaveLength(2);
    });

    it("activates the correct count", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 4, true, { kind: "RULE" });
        state = donSetActive(state, P1, 4, { kind: "RULE" });
        expect(state.playerZones[P1].donRested).toHaveLength(0);
        expect(state.playerZones[P1].donActive).toHaveLength(4);
    });

    it("throws InvalidActionError if count exceeds rested DON", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, true, { kind: "RULE" });
        expect(() => donSetActive(state, P1, 2, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("sets isRested=false on moved DON instances", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, true, { kind: "RULE" });
        const restedDon = state.playerZones[P1].donRested[0];
        state = donSetActive(state, P1, 1, { kind: "RULE" });
        expect((state.instances[restedDon] as any).isRested).toBe(false);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 3, true, { kind: "RULE" });
        state = donSetActive(state, P1, 2, { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// donReturn
// ============================================================

describe("donReturn", () => {
    it("returns active DON to donDeck", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 2, false, { kind: "RULE" });
        const activeDon = state.playerZones[P1].donActive[0];
        state = donReturn(state, P1, [activeDon], { kind: "RULE" });
        expect(state.playerZones[P1].donActive).not.toContain(activeDon);
        expect(state.playerZones[P1].donDeck).toContain(activeDon);
    });

    it("returns rested DON to donDeck", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 2, true, { kind: "RULE" });
        const restedDon = state.playerZones[P1].donRested[0];
        state = donReturn(state, P1, [restedDon], { kind: "RULE" });
        expect(state.playerZones[P1].donRested).not.toContain(restedDon);
        expect(state.playerZones[P1].donDeck).toContain(restedDon);
    });

    it("detaches and returns attached DON to donDeck", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donReturn(state, P1, ["p1-DON-0" as CardInstanceId], { kind: "RULE" });
        expect(state.playerZones[P1].donDeck).toContain("p1-DON-0");
        expect(state.instances["p1-DON-0" as CardInstanceId].currentZone).toBe("DON_DECK");
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
    });

    it("throws InvalidActionError for non-DON instance", () => {
        const state = setupTestGame();
        expect(() => donReturn(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 3, false, { kind: "RULE" });
        const active = [...state.playerZones[P1].donActive];
        state = donReturn(state, P1, active, { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// donAttach
// ============================================================

describe("donAttach", () => {
    it("attaches active DON to target card", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = donAttach(state, P1, [don], "p1-CARD-0" as CardInstanceId, "DON_ACTIVE", { kind: "RULE" });
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toContain(don);
        expect((next.instances[don] as any).attachedTo).toBe("p1-CARD-0");
    });

    it("attaches rested DON to target card", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, true, { kind: "RULE" });
        const don = state.playerZones[P1].donRested[0];
        const next = donAttach(state, P1, [don], "p1-CARD-0" as CardInstanceId, "DON_RESTED", { kind: "RULE" });
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toContain(don);
        expect((next.instances[don] as any).attachedTo).toBe("p1-CARD-0");
    });

    it("attaches multiple DON to target", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 2, false, { kind: "RULE" });
        const [don0, don1] = state.playerZones[P1].donActive;
        const next = donAttach(state, P1, [don0, don1], "p1-CARD-0" as CardInstanceId, "DON_ACTIVE", { kind: "RULE" });
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toHaveLength(2);
    });

    it("attaches DON to the leader", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = donAttach(state, P1, [don], "p1-LEADER" as CardInstanceId, "DON_ACTIVE", { kind: "RULE" });
        expect((next.instances["p1-LEADER" as CardInstanceId] as any).attachedDon).toContain(don);
    });

    it("throws InvalidActionError when DON is not in the expected zone", () => {
        const state = setupTestGame();
        // DON is in DON_DECK, not DON_ACTIVE
        expect(() => donAttach(
            state, P1,
            ["p1-DON-0" as CardInstanceId],
            "p1-CARD-0" as CardInstanceId,
            "DON_ACTIVE",
            { kind: "RULE" }
        )).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError for invalid fromDonZone", () => {
        const state = setupTestGame();
        expect(() => donAttach(
            state, P1,
            ["p1-DON-0" as CardInstanceId],
            "p1-CARD-0" as CardInstanceId,
            "DON_DECK" as any,
            { kind: "RULE" }
        )).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError when DON and target have different controllers", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        expect(() => donAttach(
            state, P1,
            [don],
            "p2-CARD-0" as CardInstanceId,
            "DON_ACTIVE",
            { kind: "RULE" }
        )).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError for non-DON instance", () => {
        const state = setupTestGame();
        expect(() => donAttach(
            state, P1,
            ["p1-CARD-0" as CardInstanceId],
            "p1-LEADER" as CardInstanceId,
            "DON_ACTIVE",
            { kind: "RULE" }
        )).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 1, false, { kind: "RULE" });
        const don = state.playerZones[P1].donActive[0];
        const next = donAttach(state, P1, [don], "p1-LEADER" as CardInstanceId, "DON_ACTIVE", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// donDetach
// ============================================================

describe("donDetach", () => {
    it("detaches DON from origin and moves to donRested", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donDetach(state, P1, "p1-CARD-0" as CardInstanceId, ["p1-DON-0" as CardInstanceId], { kind: "RULE" });
        expect(state.playerZones[P1].donRested).toContain("p1-DON-0");
        expect((state.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
        expect((state.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).not.toContain("p1-DON-0");
    });

    it("detaches multiple DON from origin", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = attachDon(state, "p1-DON-1" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donDetach(
            state, P1,
            "p1-CARD-0" as CardInstanceId,
            ["p1-DON-0" as CardInstanceId, "p1-DON-1" as CardInstanceId],
            { kind: "RULE" }
        );
        expect(state.playerZones[P1].donRested).toHaveLength(2);
        expect((state.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toHaveLength(0);
    });

    it("throws InvalidActionError when DON is not attached to origin", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        // DON-0 is on CARD-0, not CARD-1
        expect(() => donDetach(
            state, P1,
            "p1-CARD-1" as CardInstanceId,
            ["p1-DON-0" as CardInstanceId],
            { kind: "RULE" }
        )).toThrow(InvalidActionError);
    });

    it("throws for unknown origin instance", () => {
        const state = setupTestGame();
        expect(() => donDetach(
            state, P1,
            "p1-CARD-999" as CardInstanceId,  // unknown card
            ["p1-DON-0" as CardInstanceId],
            { kind: "RULE" }
        )).toThrow();
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = donDetach(state, P1, "p1-CARD-0" as CardInstanceId, ["p1-DON-0" as CardInstanceId], { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// donRefresh
// ============================================================

describe("donRefresh", () => {
    it("moves all rested DON to donActive", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 3, true, { kind: "RULE" }); // 3 rested
        const next = donRefresh(state, P1);
        expect(next.playerZones[P1].donRested).toHaveLength(0);
        expect(next.playerZones[P1].donActive).toHaveLength(3);
    });

    it("returns state unchanged when no DON are rested or attached", () => {
        const state = setupTestGame();
        const next = donRefresh(state, P1);
        expect(next.playerZones[P1].donRested).toHaveLength(0);
        expect(next.playerZones[P1].donActive).toHaveLength(0);
    });

    it("detaches attached DON and then refreshes them to donActive", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        const next = donRefresh(state, P1);
        // DON-0 was attached -> detached to DON_RESTED -> moved to DON_ACTIVE
        expect(next.playerZones[P1].donActive).toContain("p1-DON-0");
        expect((next.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
        expect((next.instances["p1-CARD-0" as CardInstanceId] as any).attachedDon).toHaveLength(0);
    });

    it("detaches multiple DON from the same card and refreshes all", () => {
        let state = setupTestGame();
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        state = attachDon(state, "p1-DON-1" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        const next = donRefresh(state, P1);
        expect(next.playerZones[P1].donActive).toContain("p1-DON-0");
        expect(next.playerZones[P1].donActive).toContain("p1-DON-1");
    });

    it("does not affect the other player's DON", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 2, true, { kind: "RULE" });
        state = donAdd(state, P2, 3, true, { kind: "RULE" });
        const next = donRefresh(state, P1);
        expect(next.playerZones[P2].donRested).toHaveLength(3);
        expect(next.playerZones[P2].donActive).toHaveLength(0);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = donAdd(state, P1, 4, true, { kind: "RULE" });
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        assertInvariants(donRefresh(state, P1));
    });
});
