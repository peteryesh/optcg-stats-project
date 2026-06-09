import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import {
    donAdd,
    donRest,
    donSetActive,
    donAttach,
    donDetach,
    donReturn,
    donRefresh,
} from "../../game/operations/zones/don";
import { InvalidActionError } from "../../errors";
import { createTestState, makeCharacterInstance, makeDonInstance, resetIds } from "./helpers";
import { assertValidGameState } from "../invariants";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("donAdd", () => {
    it("add multiple don as active", () => {
        const d1 = makeDonInstance({ controller: "p1" });
        const d2 = makeDonInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donDeck: [d1.instanceId, d2.instanceId] },
        });

        const next = donAdd(state, "p1", 2, false, { kind: "RULE" });

        // Don deck is decremented by N
        expect(next.playerZones["p1"].donDeck).toHaveLength(0);
        // Don active is incremented by N
        expect(next.playerZones["p1"].donActive).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donActive).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("add multiple don as rested", () => {
        const d1 = makeDonInstance({ controller: "p1" });
        const d2 = makeDonInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donDeck: [d1.instanceId, d2.instanceId] },
        });

        const next = donAdd(state, "p1", 2, true, { kind: "RULE" });

        // Don deck is decremented by N
        expect(next.playerZones["p1"].donDeck).toHaveLength(0);
        // Don rested is incremented by N
        expect(next.playerZones["p1"].donRested).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donRested).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("add as many active don as possible", () => {
        const d1 = makeDonInstance({ controller: "p1" });
        const d2 = makeDonInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donDeck: [d1.instanceId, d2.instanceId] },
        });

        const deckSize = state.playerZones["p1"].donDeck.length;
        const next = donAdd(state, "p1", 10, false, { kind: "RULE" });

        // Don deck is empty
        expect(next.playerZones["p1"].donDeck).toHaveLength(0);
        // Don active increased by the length of the don deck before move
        expect(next.playerZones["p1"].donActive).toHaveLength(deckSize);
        assertValidGameState(next);
    });
    it("add as many rested don as possible", () => {
        const d1 = makeDonInstance({ controller: "p1" });
        const d2 = makeDonInstance({ controller: "p1" });
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donDeck: [d1.instanceId, d2.instanceId] },
        });

        const deckSize = state.playerZones["p1"].donDeck.length;
        const next = donAdd(state, "p1", 10, true, { kind: "RULE" });

        // Don deck is empty
        expect(next.playerZones["p1"].donDeck).toHaveLength(0);
        // Don rested increased by the length of the don deck before move
        expect(next.playerZones["p1"].donRested).toHaveLength(deckSize);
        assertValidGameState(next);
    });
    it("add negative amount of don", () => {
        // Expect error
        expect(() => donAdd(state, "p1", -1, false, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
    it("add zero don", () => {
        const next = donAdd(state, "p1", 0, false, { kind: "RULE" });

        // Does nothing
        expect(next.playerZones["p1"].donDeck).toHaveLength(0);
        expect(next.playerZones["p1"].donActive).toHaveLength(0);
        assertValidGameState(next);
    });
});

describe("donRest", () => {
    it("rest multiple don", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donActive: [d1.instanceId, d2.instanceId] },
        });

        const next = donRest(state, "p1", 2, { kind: "RULE" });

        // Don active is decremented by N
        expect(next.playerZones["p1"].donActive).toHaveLength(0);
        // Don rested is incremented by N
        expect(next.playerZones["p1"].donRested).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donRested).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("rest more don than is active", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1 }, {
            p1: { donActive: [d1.instanceId] },
        });

        // Expect error
        expect(() => donRest(state, "p1", 2, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
});

describe("donSetActive", () => {
    it("set multiple don as active", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donRested: [d1.instanceId, d2.instanceId] },
        });

        const next = donSetActive(state, "p1", 2, { kind: "RULE" });

        // Don rested is decremented by N
        expect(next.playerZones["p1"].donRested).toHaveLength(0);
        // Don active is incremented by N
        expect(next.playerZones["p1"].donActive).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donActive).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("set more don as active than rested", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1 }, {
            p1: { donRested: [d1.instanceId] },
        });

        // Expect error
        expect(() => donSetActive(state, "p1", 2, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
});

describe("donAttach", () => {
    it("attach multiple active don to a character", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        state = createTestState(["p1", "p2"], {
            [char.instanceId]: char,
            [d1.instanceId]: d1,
            [d2.instanceId]: d2,
        }, {
            p1: { characters: [char.instanceId], donActive: [d1.instanceId, d2.instanceId] },
        });

        const next = donAttach(state, "p1", [d1.instanceId, d2.instanceId], char.instanceId, "DON_ACTIVE", { kind: "RULE" });

        // Don active decremented by N attached
        expect(next.playerZones["p1"].donActive).toHaveLength(0);
        // Don ids are in character's attachedDon array
        const attachedDon = (next.instances[char.instanceId] as { attachedDon: string[] }).attachedDon;
        expect(attachedDon).toContain(d1.instanceId);
        expect(attachedDon).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("attach multiple rested don to a character", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        state = createTestState(["p1", "p2"], {
            [char.instanceId]: char,
            [d1.instanceId]: d1,
            [d2.instanceId]: d2,
        }, {
            p1: { characters: [char.instanceId], donRested: [d1.instanceId, d2.instanceId] },
        });

        const next = donAttach(state, "p1", [d1.instanceId, d2.instanceId], char.instanceId, "DON_RESTED", { kind: "RULE" });

        // Don rested decremented by N attached
        expect(next.playerZones["p1"].donRested).toHaveLength(0);
        // Don ids are in character's attachedDon array
        const attachedDon = (next.instances[char.instanceId] as { attachedDon: string[] }).attachedDon;
        expect(attachedDon).toContain(d1.instanceId);
        expect(attachedDon).toContain(d2.instanceId);
        assertValidGameState(next);
    });
});

describe("donDetach", () => {
    it("detach multiple don from a character", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char.instanceId };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char.instanceId };
        const charWithDon = { ...char, attachedDon: [d1.instanceId, d2.instanceId] } as typeof char & { attachedDon: string[] };
        state = createTestState(["p1", "p2"], {
            [charWithDon.instanceId]: charWithDon,
            [d1.instanceId]: d1,
            [d2.instanceId]: d2,
        }, {
            p1: { characters: [charWithDon.instanceId] },
        });

        const next = donDetach(state, "p1", char.instanceId, [d1.instanceId, d2.instanceId], { kind: "RULE" });

        // Don rested incremented by N detached
        expect(next.playerZones["p1"].donRested).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donRested).toContain(d2.instanceId);
        // Don ids detached do not exist in the character's attachedDon
        const attachedDon = (next.instances[char.instanceId] as { attachedDon: string[] }).attachedDon;
        expect(attachedDon).toHaveLength(0);
        // Don ids do not exist in don active
        assertValidGameState(next);
    });
});

describe("donReturn", () => {
    it("return an active don to the don deck", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donActive: [d1.instanceId, d2.instanceId] },
        });

        const next = donReturn(state, "p1", [d1.instanceId, d2.instanceId], { kind: "RULE" });

        // Don active decremented by N returned
        expect(next.playerZones["p1"].donActive).toHaveLength(0);
        // Don deck incremented by N returned
        expect(next.playerZones["p1"].donDeck).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donDeck).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("return a rested don to the don deck", () => {
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        state = createTestState(["p1", "p2"], { [d1.instanceId]: d1, [d2.instanceId]: d2 }, {
            p1: { donRested: [d1.instanceId, d2.instanceId] },
        });

        const next = donReturn(state, "p1", [d1.instanceId, d2.instanceId], { kind: "RULE" });

        // Don rested decremented by N returned
        expect(next.playerZones["p1"].donRested).toHaveLength(0);
        // Don deck incremented by N returned
        expect(next.playerZones["p1"].donDeck).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donDeck).toContain(d2.instanceId);
        assertValidGameState(next);
    });
    it("return an attached don on character to the don deck", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const d1 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char.instanceId };
        const d2 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char.instanceId };
        const charWithDon = { ...char, attachedDon: [d1.instanceId, d2.instanceId] } as typeof char & { attachedDon: string[] };
        state = createTestState(["p1", "p2"], {
            [charWithDon.instanceId]: charWithDon,
            [d1.instanceId]: d1,
            [d2.instanceId]: d2,
        }, {
            p1: { characters: [charWithDon.instanceId] },
        });

        const next = donReturn(state, "p1", [d1.instanceId, d2.instanceId], { kind: "RULE" });

        // Don attached on character decremented by N returned
        const attachedDon = (next.instances[char.instanceId] as { attachedDon: string[] }).attachedDon;
        expect(attachedDon).toHaveLength(0);
        // Don ids exist in don deck
        expect(next.playerZones["p1"].donDeck).toContain(d1.instanceId);
        expect(next.playerZones["p1"].donDeck).toContain(d2.instanceId);
        assertValidGameState(next);
    });
});

describe("donRefresh", () => {
    it("detaches all attached don and moves all rested don to active", () => {
        const char1 = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const char2 = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const dAttached1 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char1.instanceId };
        const dAttached2 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char1.instanceId };
        const dAttached3 = { ...makeDonInstance({ controller: "p1" }), currentZone: null as null, attachedTo: char2.instanceId };
        const dActive =    { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_ACTIVE" as const };
        const dRested =    { ...makeDonInstance({ controller: "p1" }), currentZone: "DON_RESTED" as const, isRested: true };
        const char1WithDon = { ...char1, attachedDon: [dAttached1.instanceId, dAttached2.instanceId] } as typeof char1 & { attachedDon: string[] };
        const char2WithDon = { ...char2, attachedDon: [dAttached3.instanceId] } as typeof char2 & { attachedDon: string[] };
        state = createTestState(["p1", "p2"], {
            [char1WithDon.instanceId]: char1WithDon,
            [char2WithDon.instanceId]: char2WithDon,
            [dAttached1.instanceId]: dAttached1,
            [dAttached2.instanceId]: dAttached2,
            [dAttached3.instanceId]: dAttached3,
            [dActive.instanceId]: dActive,
            [dRested.instanceId]: dRested,
        }, {
            p1: { characters: [char1WithDon.instanceId, char2WithDon.instanceId], donActive: [dActive.instanceId], donRested: [dRested.instanceId] },
        });

        const next = donRefresh(state, "p1");

        // All don end up in don active
        expect(next.playerZones["p1"].donActive).toHaveLength(5);
        expect(next.playerZones["p1"].donRested).toHaveLength(0);
        // Both characters have no attached don
        expect((next.instances[char1.instanceId] as { attachedDon: string[] }).attachedDon).toHaveLength(0);
        expect((next.instances[char2.instanceId] as { attachedDon: string[] }).attachedDon).toHaveLength(0);
        assertValidGameState(next);
    });
});
