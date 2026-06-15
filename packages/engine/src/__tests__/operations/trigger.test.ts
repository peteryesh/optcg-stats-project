import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import {
    sendTopLifeToTrigger,
    sendTriggerToTrash,
} from "../../game/operations/zones/trigger";
import { InvalidActionError } from "../../errors";
import { createTestState, makeCharacterInstance, resetIds } from "../helpers";
import { assertValidGameState } from "../invariants";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("sendTopLifeToTrigger", () => {
    it("move top life to trigger zone", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "LIFE" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "LIFE" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2 }, {
            p1: { life: [c1.instanceId, c2.instanceId] },
        });

        const topLifeId = state.playerZones["p1"].life[0];
        const next = sendTopLifeToTrigger(state, "p1", topLifeId, { kind: "RULE" });

        // id does not exist in life
        expect(next.playerZones["p1"].life).not.toContain(topLifeId);
        // id exists in trigger
        expect(next.playerZones["p1"].trigger).toContain(topLifeId);
        assertValidGameState(next);
    });
    it("attempt to call when no life available", () => {
        expect(() => sendTopLifeToTrigger(state, "p1", "card-fake", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
    it("attempt to call when trigger zone is occupied", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "LIFE" });
        const c2 = makeCharacterInstance({ controller: "p1", currentZone: "LIFE" });
        const c3 = makeCharacterInstance({ controller: "p1", currentZone: "TRIGGER" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1, [c2.instanceId]: c2, [c3.instanceId]: c3 }, {
            p1: { life: [c1.instanceId, c2.instanceId], trigger: [c3.instanceId] },
        });

        const topLifeId = state.playerZones["p1"].life[0];
        expect(() => sendTopLifeToTrigger(state, "p1", topLifeId, { kind: "RULE" }))
            .toThrow();
    });
});

describe("sendTriggerToTrash", () => {
    it("move trigger card to trash", () => {
        const c1 = makeCharacterInstance({ controller: "p1", currentZone: "TRIGGER" });
        state = createTestState(["p1", "p2"], { [c1.instanceId]: c1 }, {
            p1: { trigger: [c1.instanceId] },
        });

        const triggerId = state.playerZones["p1"].trigger[0];
        const next = sendTriggerToTrash(state, "p1", { kind: "RULE" });

        // id does not exist in trigger
        expect(next.playerZones["p1"].trigger).toHaveLength(0);
        // id exists in trash
        expect(next.playerZones["p1"].trash).toContain(triggerId);
        assertValidGameState(next);
    });
    it("attempt to call when trigger zone is empty", () => {
        expect(() => sendTriggerToTrash(state, "p1", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });
});
