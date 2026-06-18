import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../../types/state";
import type { CardInstance } from "../../types/card";
import { InvalidActionError } from "../../errors";
import { createTestState, makeCharacterInstance, makeDonInstance, makeStageInstance, makeEventInstance, resetIds } from "../helpers";
import { assertValidGameState } from "../invariants";
import { playCard, playCharacter, playStage, displaceCard, playEvent, removeCardsFromField } from "../../game/operations/cards";
import { CHARACTERS_MAX } from "../../game/constants";

let state!: GameState;

beforeEach(() => {
    resetIds();
    state = createTestState();
});

describe("playCard", () => {
    it("play character with a don cost from hand to empty character zone", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "HAND", cardId: "char-2cost" });
        const don1 = makeDonInstance({ controller: "p1", currentZone: "DON_ACTIVE" });
        const don2 = makeDonInstance({ controller: "p1", currentZone: "DON_ACTIVE" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char, [don1.instanceId]: don1, [don2.instanceId]: don2 },
            { p1: { hand: [char.instanceId], donActive: [don1.instanceId, don2.instanceId] } },
            { "char-2cost": { id: "char-2cost", name: "char-2cost", class: "CHARACTER", cost: 2, colors: [], types: [], attributes: [], aliases: [], restrictions: [] } }
        );
        const next = playCard(state, "p1", char.instanceId, { kind: "PLAYER" });
        // don active before play - character don cost = don active moved to don rested
        expect(next.playerZones["p1"].donActive).toHaveLength(0);
        expect(next.playerZones["p1"].donRested).toHaveLength(2);
        // character is not in the hand
        expect(next.playerZones["p1"].hand).not.toContain(char.instanceId);
        // character is in the player's character zone
        expect(next.playerZones["p1"].characters).toContain(char.instanceId);
        assertValidGameState(next);
    });

    it("play an event with 0 don cost from hand", () => {
        const event = makeEventInstance({ controller: "p1", currentZone: "HAND", cardId: "event-0cost" });
        const don = makeDonInstance({ controller: "p1", currentZone: "DON_ACTIVE" });
        state = createTestState(
            ["p1", "p2"],
            { [event.instanceId]: event, [don.instanceId]: don },
            { p1: { hand: [event.instanceId], donActive: [don.instanceId] } },
            { "event-0cost": { id: "event-0cost", name: "event-0cost", class: "EVENT", cost: 0, colors: [], types: [], attributes: [], aliases: [], restrictions: [] } }
        );
        const next = playCard(state, "p1", event.instanceId, { kind: "PLAYER" });
        // don active does not change
        expect(next.playerZones["p1"].donActive).toHaveLength(1);
        // event is not in hand
        expect(next.playerZones["p1"].hand).not.toContain(event.instanceId);
        // event is in the trash
        expect(next.playerZones["p1"].trash).toContain(event.instanceId);
        assertValidGameState(next);
    });

    it("play a character with a don cost more than current don set active from hand", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "HAND", cardId: "char-3cost" });
        const don = makeDonInstance({ controller: "p1", currentZone: "DON_ACTIVE" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char, [don.instanceId]: don },
            { p1: { hand: [char.instanceId], donActive: [don.instanceId] } },
            { "char-3cost": { id: "char-3cost", name: "char-3cost", class: "CHARACTER", cost: 3, colors: [], types: [], attributes: [], aliases: [], restrictions: [] } }
        );
        // expect error
        expect(() => playCard(state, "p1", char.instanceId, { kind: "PLAYER" })).toThrow(InvalidActionError);
    });
});

describe("playCharacter", () => {
    it("play character from trash to empty character zone", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "TRASH" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char },
            { p1: { trash: [char.instanceId] } }
        );
        const next = playCharacter(state, "p1", char.instanceId, { kind: "EFFECT", sourceId: char.instanceId });
        // character is not in trash
        expect(next.playerZones["p1"].trash).not.toContain(char.instanceId);
        // character is in the character zone
        expect(next.playerZones["p1"].characters).toContain(char.instanceId);
        assertValidGameState(next);
    });

    it("play character to a full character zone", () => {
        const chars = Array.from({ length: CHARACTERS_MAX }, () =>
            makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" })
        );
        const played = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const instances: Record<string, CardInstance> = { [played.instanceId]: played };
        for (const c of chars) instances[c.instanceId] = c;
        state = createTestState(
            ["p1", "p2"],
            instances,
            { p1: { characters: chars.map(c => c.instanceId), hand: [played.instanceId] } }
        );
        const next = playCharacter(state, "p1", played.instanceId, { kind: "PLAYER" });
        // character stays in the hand
        expect(next.playerZones["p1"].hand).toContain(played.instanceId);
        // decisionPoint is set to type "DISPLACE_CARD"
        expect(next.decisionPoint?.type).toBe("DISPLACE_CARD");
        // decisionPoint has playedCardId set to the played character
        expect(next.decisionPoint?.type === "DISPLACE_CARD" && next.decisionPoint.playedCardId).toBe(played.instanceId);
    });
});

describe("playStage", () => {
    it("play stage from hand to empty stage zone", () => {
        const stage = makeStageInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(
            ["p1", "p2"],
            { [stage.instanceId]: stage },
            { p1: { hand: [stage.instanceId] } }
        );
        const next = playStage(state, "p1", stage.instanceId, { kind: "PLAYER" });
        // stage is not in the hand
        expect(next.playerZones["p1"].hand).not.toContain(stage.instanceId);
        // stage is in the stage zone
        expect(next.playerZones["p1"].stage).toContain(stage.instanceId);
        assertValidGameState(next);
    });

    it("play stage to a full stage zone", () => {
        const existing = makeStageInstance({ controller: "p1", currentZone: "STAGE" });
        const played = makeStageInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(
            ["p1", "p2"],
            { [existing.instanceId]: existing, [played.instanceId]: played },
            { p1: { stage: [existing.instanceId], hand: [played.instanceId] } }
        );
        const next = playStage(state, "p1", played.instanceId, { kind: "PLAYER" });
        // stage stays in the hand
        expect(next.playerZones["p1"].hand).toContain(played.instanceId);
        // decisionPoint is set to type "DISPLACE_CARD"
        expect(next.decisionPoint?.type).toBe("DISPLACE_CARD");
        // decisionPoint has playedCardId set to the played stage
        expect(next.decisionPoint?.type === "DISPLACE_CARD" && next.decisionPoint.playedCardId).toBe(played.instanceId);
    });
});

describe("displaceCard", () => {
    it("displace character on board", () => {
        const chars = Array.from({ length: CHARACTERS_MAX }, () =>
            makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" })
        );
        const played = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const replaced = chars[2];
        const instances: Record<string, CardInstance> = { [played.instanceId]: played };
        for (const c of chars) instances[c.instanceId] = c;
        state = createTestState(
            ["p1", "p2"],
            instances,
            { p1: { characters: chars.map(c => c.instanceId), hand: [played.instanceId] } }
        );
        const next = displaceCard(state, "p1", played.instanceId, replaced.instanceId);
        // played character is not in the hand
        expect(next.playerZones["p1"].hand).not.toContain(played.instanceId);
        // played character is in the same index as the previous index as the replaced card
        expect(next.playerZones["p1"].characters[2]).toBe(played.instanceId);
        // replaced character is in the trash
        expect(next.playerZones["p1"].trash).toContain(replaced.instanceId);
        assertValidGameState(next);
    });

    it("displace character with don attached", () => {
        const chars = Array.from({ length: CHARACTERS_MAX }, () =>
            makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" })
        );
        const played = makeCharacterInstance({ controller: "p1", currentZone: "HAND" });
        const replaced = chars[0];
        const don = makeDonInstance({ controller: "p1" });
        (don as any).currentZone = null;
        (don as any).attachedTo = replaced.instanceId;
        (replaced as any).attachedDon = [don.instanceId];
        const instances: Record<string, CardInstance> = { [played.instanceId]: played, [don.instanceId]: don };
        for (const c of chars) instances[c.instanceId] = c;
        state = createTestState(
            ["p1", "p2"],
            instances,
            { p1: { characters: chars.map(c => c.instanceId), hand: [played.instanceId] } }
        );
        const next = displaceCard(state, "p1", played.instanceId, replaced.instanceId);
        // played character is in the same index as the previous index as the replaced card
        expect(next.playerZones["p1"].characters[0]).toBe(played.instanceId);
        // replaced character is in the trash
        expect(next.playerZones["p1"].trash).toContain(replaced.instanceId);
        // character has no attached don
        expect((next.instances[replaced.instanceId] as any).attachedDon).toHaveLength(0);
        // previously attached don is in the don rested zone
        expect(next.playerZones["p1"].donRested).toContain(don.instanceId);
        assertValidGameState(next);
    });

    it("displace stage on board", () => {
        const existing = makeStageInstance({ controller: "p1", currentZone: "STAGE" });
        const played = makeStageInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(
            ["p1", "p2"],
            { [existing.instanceId]: existing, [played.instanceId]: played },
            { p1: { stage: [existing.instanceId], hand: [played.instanceId] } }
        );
        const next = displaceCard(state, "p1", played.instanceId, existing.instanceId);
        // played stage is not in the hand
        expect(next.playerZones["p1"].hand).not.toContain(played.instanceId);
        // played stage is in the same index as the previous index as the replaced card
        expect(next.playerZones["p1"].stage[0]).toBe(played.instanceId);
        // replaced stage is in the trash
        expect(next.playerZones["p1"].trash).toContain(existing.instanceId);
        assertValidGameState(next);
    });
});

describe("playEvent", () => {
    it("play an event from hand", () => {
        const event = makeEventInstance({ controller: "p1", currentZone: "HAND" });
        state = createTestState(
            ["p1", "p2"],
            { [event.instanceId]: event },
            { p1: { hand: [event.instanceId] } }
        );
        const next = playEvent(state, "p1", event.instanceId, { kind: "PLAYER" });
        // event is not in the hand
        expect(next.playerZones["p1"].hand).not.toContain(event.instanceId);
        // event is in the trash
        expect(next.playerZones["p1"].trash).toContain(event.instanceId);
        assertValidGameState(next);
    });
});

describe("_removeCardFromField", () => {
    it("remove card by trashing", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char },
            { p1: { characters: [char.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "TRASH_CARD", "TOP", { kind: "RULE" });
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the trash
        expect(next.playerZones["p1"].trash).toContain(char.instanceId);
        assertValidGameState(next);
    });

    it("remove card by ko", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char },
            { p1: { characters: [char.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "KO", "TOP", { kind: "RULE" });
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the trash
        expect(next.playerZones["p1"].trash).toContain(char.instanceId);
        assertValidGameState(next);
    });

    it("bounce card to hand", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char },
            { p1: { characters: [char.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "BOUNCE_TO_HAND", "TOP", { kind: "RULE" });
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the hand
        expect(next.playerZones["p1"].hand).toContain(char.instanceId);
        assertValidGameState(next);
    });

    it("send card to bottom deck", () => {
        const deckCard = makeCharacterInstance({ controller: "p1", currentZone: "DECK" });
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char, [deckCard.instanceId]: deckCard },
            { p1: { characters: [char.instanceId], deck: [deckCard.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "SEND_TO_DECK", "BOTTOM", { kind: "RULE" });
        const deck = next.playerZones["p1"].deck;
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the bottom of the deck
        expect(deck[deck.length - 1]).toBe(char.instanceId);
        assertValidGameState(next);
    });

    it("send card to top life", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char },
            { p1: { characters: [char.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "SEND_TO_LIFE", "TOP", { kind: "RULE" });
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the top of life
        expect(next.playerZones["p1"].life[0]).toBe(char.instanceId);
        assertValidGameState(next);
    });

    it("remove card with don attached by trashing", () => {
        const char = makeCharacterInstance({ controller: "p1", currentZone: "CHARACTERS" });
        const don = makeDonInstance({ controller: "p1" });
        (don as any).currentZone = null;
        (don as any).attachedTo = char.instanceId;
        (char as any).attachedDon = [don.instanceId];
        state = createTestState(
            ["p1", "p2"],
            { [char.instanceId]: char, [don.instanceId]: don },
            { p1: { characters: [char.instanceId] } }
        );
        const next = removeCardsFromField(state, "p1", [char.instanceId], "KO", "TOP", { kind: "RULE" });
        // character is not in the character zone
        expect(next.playerZones["p1"].characters).not.toContain(char.instanceId);
        // character is in the trash
        expect(next.playerZones["p1"].trash).toContain(char.instanceId);
        // character has no attached don
        expect((next.instances[char.instanceId] as any).attachedDon).toHaveLength(0);
        // previously attached don is in the don rested zone
        expect(next.playerZones["p1"].donRested).toContain(don.instanceId);
        assertValidGameState(next);
    });
});
