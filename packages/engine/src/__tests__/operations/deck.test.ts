import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import { _cardsMoveToDeck } from "../../game/operations/zones/deck";
import { InvalidActionError } from "../../errors";
import { createTestState, makeCharacterInstance, makeDonInstance, makeLeaderInstance, resetIds } from "../helpers";
import { assertValidGameState } from "../invariants";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("_cardsMoveToDeck", () => {
    it("move card from zone to deck top", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { hand: [c1.instanceId, c2.instanceId] },
        });

        const next = _cardsMoveToDeck(state, "p1", [c1.instanceId], "HAND", "TOP", { kind: "RULE" });

        // card does not exist in previous zone
        expect(next.playerZones["p1"].hand).not.toContain(c1.instanceId);
        // card exists at deck top
        expect(next.playerZones["p1"].deck[0]).toBe(c1.instanceId);
        assertValidGameState(next);
    });
    it("move cards from zone to deck top", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { hand: [c1.instanceId, c2.instanceId] },
        });

        const next = _cardsMoveToDeck(state, "p1", [c1.instanceId, c2.instanceId], "HAND", "TOP", { kind: "RULE" });

        // cards do not exist in previous zone
        expect(next.playerZones["p1"].hand).toHaveLength(0);
        // cards pushed to deck top in order (last card pushed ends at deck[0])
        expect(next.playerZones["p1"].deck).toEqual([c2.instanceId, c1.instanceId]);
        assertValidGameState(next);
    });
    it("move cards from zone to deck bottom", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { hand: [c1.instanceId, c2.instanceId] },
        });

        const next = _cardsMoveToDeck(state, "p1", [c1.instanceId, c2.instanceId], "HAND", "BOTTOM", { kind: "RULE" });

        // cards do not exist in previous zone
        expect(next.playerZones["p1"].hand).toHaveLength(0);
        // cards appended to deck bottom in order
        expect(next.playerZones["p1"].deck).toEqual([c1.instanceId, c2.instanceId]);
        assertValidGameState(next);
    });
    it("attempt to move don to deck", () => {
        const don = makeDonInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [don.instanceId]: don }, {
            p1: { donDeck: [don.instanceId] },
        });

        expect(() => _cardsMoveToDeck(state, "p1", [don.instanceId], "DON_DECK", "TOP", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
    it("attempt to move leader to deck", () => {
        // leaders cannot be removed from LEADER zone — place in trash to isolate the class guard
        const leader = makeLeaderInstance({ controller: "p1" });
        const leaderInTrash = { ...leader, currentZone: "TRASH" as const };
        state = createTestState(["p1", "p2"], { [leader.instanceId]: leaderInTrash }, {
            p1: { trash: [leader.instanceId] },
        });

        expect(() => _cardsMoveToDeck(state, "p1", [leader.instanceId], "TRASH", "TOP", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
});
