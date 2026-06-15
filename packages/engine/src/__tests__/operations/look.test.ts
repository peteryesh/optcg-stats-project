import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import {
    _cardsMoveToLook,
    sendTopDeckToLook,
    sendLookToDeck,
    sendLookToTrash,
} from "../../game/operations/zones/look";
import { createTestState, makeCharacterInstance, resetIds } from "../helpers";
import { assertValidGameState } from "../invariants";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("_cardsMoveToLook", () => {
    it("move cards from deck to look", () => {
        const c1 = makeCharacterInstance({ controller: "p1" });
        const c2 = makeCharacterInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { deck: [c1.instanceId, c2.instanceId] },
        });

        const next = _cardsMoveToLook(state, "p1", [c1.instanceId, c2.instanceId], "DECK", { kind: "RULE" });

        // ids do not exist in deck
        expect(next.playerZones["p1"].deck).toHaveLength(0);
        // ids exist in look zone
        expect(next.playerZones["p1"].look).toContain(c1.instanceId);
        expect(next.playerZones["p1"].look).toContain(c2.instanceId);
        assertValidGameState(next);
    });
});

describe("sendTopDeckToLook", () => {
    it("move 5 cards from top deck to look", () => {
        const cards = Array.from({ length: 5 }, () => makeCharacterInstance({ controller: "p1" }));
        const instances = Object.fromEntries(cards.map(c => [c.instanceId, c]));
        state = createTestState(["p1", "p2"], instances, {
            p1: { deck: cards.map(c => c.instanceId) },
        });

        const next = sendTopDeckToLook(state, "p1", 5, { kind: "RULE" });

        // ids do not exist in deck
        expect(next.playerZones["p1"].deck).toHaveLength(0);
        // ids exist in look zone
        for (const card of cards) {
            expect(next.playerZones["p1"].look).toContain(card.instanceId);
        }
        assertValidGameState(next);
    });
    it("move as many possible cards to look", () => {
        const c1 = makeCharacterInstance({ controller: "p1" });
        const c2 = makeCharacterInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { deck: [c1.instanceId, c2.instanceId] },
        });

        const next = sendTopDeckToLook(state, "p1", 10, { kind: "RULE" });

        // ids do not exist in deck
        expect(next.playerZones["p1"].deck).toHaveLength(0);
        // ids exist in look zone
        expect(next.playerZones["p1"].look).toContain(c1.instanceId);
        expect(next.playerZones["p1"].look).toContain(c2.instanceId);
        // stops when no cards left
        expect(next.playerZones["p1"].look).toHaveLength(2);
        assertValidGameState(next);
    });
    it("do nothing if nothing in deck", () => {
        const next = sendTopDeckToLook(state, "p1", 5, { kind: "RULE" });

        expect(next.playerZones["p1"].deck).toHaveLength(0);
        expect(next.playerZones["p1"].look).toHaveLength(0);
        assertValidGameState(next);
    });
});

describe("sendLookToDeck", () => {
    it("send look to top deck", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { look: [c1.instanceId, c2.instanceId] },
        });

        const next = sendLookToDeck(state, "p1", "TOP", { kind: "RULE" });

        // ids do not exist in look
        expect(next.playerZones["p1"].look).toHaveLength(0);
        // ids exist at top of deck in stack order (last card pushed ends at deck[0])
        expect(next.playerZones["p1"].deck).toEqual([c2.instanceId, c1.instanceId]);
        assertValidGameState(next);
    });
    it("send look to bottom deck", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { look: [c1.instanceId, c2.instanceId] },
        });

        const next = sendLookToDeck(state, "p1", "BOTTOM", { kind: "RULE" });

        // ids do not exist in look
        expect(next.playerZones["p1"].look).toHaveLength(0);
        // ids appended to deck bottom in order
        expect(next.playerZones["p1"].deck).toEqual([c1.instanceId, c2.instanceId]);
        assertValidGameState(next);
    });
});

describe("sendLookToTrash", () => {
    it("send look to trash", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "LOOK" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { look: [c1.instanceId, c2.instanceId] },
        });

        const next = sendLookToTrash(state, "p1", { kind: "RULE" });

        // look zone is empty
        expect(next.playerZones["p1"].look).toHaveLength(0);
        // ids exist in trash
        expect(next.playerZones["p1"].trash).toContain(c1.instanceId);
        expect(next.playerZones["p1"].trash).toContain(c2.instanceId);
        assertValidGameState(next);
    });
});
