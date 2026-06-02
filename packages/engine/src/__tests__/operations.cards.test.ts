import { describe, it, expect } from "vitest";
import {
    cardsDraw,
    cardsTrashFromHand,
    cardsSetActive,
    cardsSetRested,
    cardsRefresh,
    cardsAddToHand,
    cardsToDeckFromHand,
    playCard,
    playCharacter,
    playStage,
    playEvent,
    playEventFromTrash,
    removeCardFromField,
} from "../game/operations/cards";
import { donAdd } from "../game/operations/don";
import { moveCard, setRested, attachDon } from "../game/mechanics";
import { assertInvariants } from "./invariants";
import {
    setupTestGame,
    mockDefs,
    mockDecklist,
    mockSeeds,
    mockConfig,
    MOCK_CHAR_ID,
    MOCK_STAGE_ID,
    MOCK_EVENT_ID,
} from "./fixtures";
import { initGame } from "../game/init";
import { InvalidActionError } from "../errors";
import { CHARACTERS_MAX } from "../game/rules";
import type { PlayerId, CardInstanceId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const PLAYERS = [P1, P2];

// Builds a game with a specific card at the top of P1's deck (p1-CARD-0)
function makeStateWithCardAtTop(cardId: string) {
    return initGame({
        gameId: "test-game",
        playerIds: PLAYERS,
        seeds: mockSeeds(PLAYERS),
        config: mockConfig(PLAYERS),
        defs: mockDefs,
        decks: {
            [P1]: mockDecklist({ deck: [cardId, ...Array(49).fill(MOCK_CHAR_ID)] }),
            [P2]: mockDecklist(),
        },
    });
}

// Two STAGE cards at p1-CARD-0 and p1-CARD-1
function makeStateWithTwoStageCards() {
    const state = initGame({
        gameId: "test-game",
        playerIds: PLAYERS,
        seeds: mockSeeds(PLAYERS),
        config: mockConfig(PLAYERS),
        defs: mockDefs,
        decks: {
            [P1]: mockDecklist({ deck: [MOCK_STAGE_ID, MOCK_STAGE_ID, ...Array(48).fill(MOCK_CHAR_ID)] }),
            [P2]: mockDecklist(),
        },
    });
    return {
        state,
        stageId1: "p1-CARD-0" as CardInstanceId,
        stageId2: "p1-CARD-1" as CardInstanceId,
    };
}

// CHARACTER in P1's hand with `activeDon` active DON (CHARACTER cost = 3)
function makeStateForCharPlay(activeDon = 3) {
    let state = setupTestGame();
    state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
    state = donAdd(state, P1, activeDon, false, { kind: "RULE" });
    return { state, charId: "p1-CARD-0" as CardInstanceId };
}

// STAGE card in P1's hand with 1 active DON (STAGE cost = 1)
function makeStateForStagePlay() {
    let state = makeStateWithCardAtTop(MOCK_STAGE_ID);
    const stageId = "p1-CARD-0" as CardInstanceId;
    state = moveCard(state, stageId, "HAND", "TOP");
    state = donAdd(state, P1, 1, false, { kind: "RULE" });
    return { state, stageId };
}

// EVENT card in P1's hand with 2 active DON (EVENT cost = 2)
function makeStateForEventPlay() {
    let state = makeStateWithCardAtTop(MOCK_EVENT_ID);
    const eventId = "p1-CARD-0" as CardInstanceId;
    state = moveCard(state, eventId, "HAND", "TOP");
    state = donAdd(state, P1, 2, false, { kind: "RULE" });
    return { state, eventId };
}

// ============================================================
// cardsDraw
// ============================================================

describe("cardsDraw", () => {
    it("draws one card from deck to hand", () => {
        const state = setupTestGame();
        const next = cardsDraw(state, P1, 1, { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(1);
        expect(next.playerZones[P1].deck).toHaveLength(49);
    });

    it("draws the top card (index 0) of the deck", () => {
        const state = setupTestGame();
        const topCard = state.playerZones[P1].deck[0];
        const next = cardsDraw(state, P1, 1, { kind: "RULE" });
        expect(next.playerZones[P1].hand[0]).toBe(topCard);
    });

    it("draws multiple cards", () => {
        const state = setupTestGame();
        const next = cardsDraw(state, P1, 5, { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(5);
        expect(next.playerZones[P1].deck).toHaveLength(45);
    });

    it("stops at deck end without throwing", () => {
        const state = setupTestGame();
        const next = cardsDraw(state, P1, 100, { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(50);
        expect(next.playerZones[P1].deck).toHaveLength(0);
    });

    it("returns unchanged state if deck is empty", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 50, { kind: "RULE" });
        const next = cardsDraw(state, P1, 1, { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(50);
    });

    it("does not mutate original state", () => {
        const state = setupTestGame();
        cardsDraw(state, P1, 3, { kind: "RULE" });
        expect(state.playerZones[P1].hand).toHaveLength(0);
        expect(state.playerZones[P1].deck).toHaveLength(50);
    });

    it("does not affect other player", () => {
        const state = setupTestGame();
        const next = cardsDraw(state, P1, 5, { kind: "RULE" });
        expect(next.playerZones[P2].hand).toHaveLength(0);
        expect(next.playerZones[P2].deck).toHaveLength(50);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = cardsDraw(state, P1, 3, { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// cardsTrashFromHand
// ============================================================

describe("cardsTrashFromHand", () => {
    it("moves card from hand to trash", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        state = cardsTrashFromHand(state, P1, [handCard], { kind: "RULE" });
        expect(state.playerZones[P1].hand).not.toContain(handCard);
        expect(state.playerZones[P1].trash).toContain(handCard);
    });

    it("discards multiple cards at once", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 3, { kind: "RULE" });
        const hand = [...state.playerZones[P1].hand];
        state = cardsTrashFromHand(state, P1, hand, { kind: "RULE" });
        expect(state.playerZones[P1].hand).toHaveLength(0);
        expect(state.playerZones[P1].trash).toHaveLength(3);
    });

    it("sets currentZone to TRASH on discarded instances", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        state = cardsTrashFromHand(state, P1, [handCard], { kind: "RULE" });
        expect(state.instances[handCard].currentZone).toBe("TRASH");
    });

    it("throws InvalidActionError if card is not in hand", () => {
        const state = setupTestGame();
        expect(() => cardsTrashFromHand(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if same card listed twice", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        // After the first trash the card is no longer in hand, so the second should throw
        expect(() => cardsTrashFromHand(state, P1, [handCard, handCard], { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("does not affect other player", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        state = cardsTrashFromHand(state, P1, [handCard], { kind: "RULE" });
        expect(state.playerZones[P2].trash).toHaveLength(0);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 3, { kind: "RULE" });
        const hand = [...state.playerZones[P1].hand];
        state = cardsTrashFromHand(state, P1, hand, { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// cardsSetActive
// ============================================================

describe("cardsSetActive", () => {
    it("sets a rested CHARACTER as active", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = cardsSetActive(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        expect(state.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
    });

    it("sets a rested LEADER as active", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-LEADER" as CardInstanceId);
        state = cardsSetActive(state, P1, ["p1-LEADER" as CardInstanceId], { kind: "RULE" });
        expect(state.instances["p1-LEADER" as CardInstanceId].isRested).toBe(false);
    });

    it("sets a rested STAGE as active", () => {
        let state = makeStateWithCardAtTop(MOCK_STAGE_ID);
        const stageId = "p1-CARD-0" as CardInstanceId;
        state = setRested(state, stageId);
        state = cardsSetActive(state, P1, [stageId], { kind: "RULE" });
        expect(state.instances[stageId].isRested).toBe(false);
    });

    it("sets multiple cards active in one call", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = setRested(state, "p1-CARD-1" as CardInstanceId);
        state = cardsSetActive(state, P1, [
            "p1-CARD-0" as CardInstanceId,
            "p1-CARD-1" as CardInstanceId,
        ], { kind: "RULE" });
        expect(state.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
        expect(state.instances["p1-CARD-1" as CardInstanceId].isRested).toBe(false);
    });

    it("is idempotent on an already-active card", () => {
        const state = setupTestGame();
        const next = cardsSetActive(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
    });

    it("throws InvalidActionError for DON class", () => {
        const state = setupTestGame();
        expect(() => cardsSetActive(state, P1, ["p1-DON-0" as CardInstanceId], { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => cardsSetActive(state, P1, ["p1-CARD-999" as CardInstanceId], { kind: "RULE" }))
            .toThrow();
    });

    it("does not throw for empty instanceIds", () => {
        const state = setupTestGame();
        expect(() => cardsSetActive(state, P1, [], { kind: "RULE" })).not.toThrow();
    });

    it("does not mutate original state", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        const before = state;
        cardsSetActive(before, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        expect(before.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = cardsSetActive(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        assertInvariants(state);
    });
});

// ============================================================
// cardsSetRested
// ============================================================

describe("cardsSetRested", () => {
    it("sets a CHARACTER as rested", () => {
        const state = setupTestGame();
        const next = cardsSetRested(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("sets the LEADER as rested", () => {
        const state = setupTestGame();
        const next = cardsSetRested(state, P1, ["p1-LEADER" as CardInstanceId], { kind: "RULE" });
        expect(next.instances["p1-LEADER" as CardInstanceId].isRested).toBe(true);
    });

    it("sets a STAGE as rested", () => {
        const state = makeStateWithCardAtTop(MOCK_STAGE_ID);
        const stageId = "p1-CARD-0" as CardInstanceId;
        const next = cardsSetRested(state, P1, [stageId], { kind: "RULE" });
        expect(next.instances[stageId].isRested).toBe(true);
    });

    it("sets multiple cards rested in one call", () => {
        const state = setupTestGame();
        const next = cardsSetRested(state, P1, [
            "p1-CARD-0" as CardInstanceId,
            "p1-CARD-1" as CardInstanceId,
        ], { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
        expect(next.instances["p1-CARD-1" as CardInstanceId].isRested).toBe(true);
    });

    it("is idempotent on an already-rested card", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        const next = cardsSetRested(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(true);
    });

    it("throws InvalidActionError for DON class", () => {
        const state = setupTestGame();
        expect(() => cardsSetRested(state, P1, ["p1-DON-0" as CardInstanceId], { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => cardsSetRested(state, P1, ["p1-CARD-999" as CardInstanceId], { kind: "RULE" }))
            .toThrow();
    });

    it("does not throw for empty instanceIds", () => {
        const state = setupTestGame();
        expect(() => cardsSetRested(state, P1, [], { kind: "RULE" })).not.toThrow();
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = cardsSetRested(state, P1, ["p1-CARD-0" as CardInstanceId], { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// playCard
// ============================================================

describe("playCard", () => {
    it("throws for unknown instance", () => {
        const state = setupTestGame();
        expect(() => playCard(state, P1, "p1-CARD-999" as CardInstanceId, { kind: "PLAYER" }))
            .toThrow();
    });

    it("throws InvalidActionError for non-playable class (DON)", () => {
        const state = setupTestGame();
        expect(() => playCard(state, P1, "p1-DON-0" as CardInstanceId, { kind: "PLAYER" }))
            .toThrow(InvalidActionError);
    });

    it("PLAYER cause: throws if card is not in hand", () => {
        const state = setupTestGame();
        expect(() => playCard(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "PLAYER" }))
            .toThrow(InvalidActionError);
    });

    it("PLAYER cause: throws if not enough active DON", () => {
        const { state, charId } = makeStateForCharPlay(2); // cost 3, only 2 active
        expect(() => playCard(state, P1, charId, { kind: "PLAYER" }))
            .toThrow(InvalidActionError);
    });

    it("PLAYER cause: rests DON equal to card cost", () => {
        const { state, charId } = makeStateForCharPlay(5); // 5 active, cost 3
        const next = playCard(state, P1, charId, { kind: "PLAYER" });
        expect(next.playerZones[P1].donActive).toHaveLength(2);
        expect(next.playerZones[P1].donRested).toHaveLength(3);
    });

    it("PLAYER cause: routes CHARACTER to CHARACTERS zone", () => {
        const { state, charId } = makeStateForCharPlay();
        const next = playCard(state, P1, charId, { kind: "PLAYER" });
        expect(next.playerZones[P1].characters).toContain(charId);
        expect(next.playerZones[P1].hand).not.toContain(charId);
    });

    it("PLAYER cause: routes EVENT to TRASH", () => {
        const { state, eventId } = makeStateForEventPlay();
        const next = playCard(state, P1, eventId, { kind: "PLAYER" });
        expect(next.playerZones[P1].trash).toContain(eventId);
        expect(next.playerZones[P1].hand).not.toContain(eventId);
    });

    it("PLAYER cause: routes STAGE to STAGE zone", () => {
        const { state, stageId } = makeStateForStagePlay();
        const next = playCard(state, P1, stageId, { kind: "PLAYER" });
        expect(next.playerZones[P1].stage).toContain(stageId);
        expect(next.playerZones[P1].hand).not.toContain(stageId);
    });

    it("EFFECT cause: plays CHARACTER from non-HAND zone without resting DON", () => {
        const state = setupTestGame(); // p1-CARD-0 is in DECK
        const next = playCard(state, P1, "p1-CARD-0" as CardInstanceId, {
            kind: "EFFECT",
            sourceId: "p2-CARD-0" as CardInstanceId,
        });
        expect(next.playerZones[P1].characters).toContain("p1-CARD-0");
        expect(next.playerZones[P1].donRested).toHaveLength(0);
    });

    it("passes invariants", () => {
        const { state, charId } = makeStateForCharPlay();
        const next = playCard(state, P1, charId, { kind: "PLAYER" });
        assertInvariants(next);
    });
});

// ============================================================
// playCharacter
// ============================================================

describe("playCharacter", () => {
    it("moves CHARACTER to CHARACTERS zone and removes from origin", () => {
        let state = setupTestGame();
        const charId = "p1-CARD-0" as CardInstanceId;
        state = moveCard(state, charId, "HAND", "TOP");
        state = playCharacter(state, P1, charId, { kind: "RULE" });
        expect(state.playerZones[P1].characters).toContain(charId);
        expect(state.playerZones[P1].hand).not.toContain(charId);
    });

    it("can play from a non-HAND zone via RULE cause", () => {
        let state = setupTestGame(); // p1-CARD-0 in DECK
        state = playCharacter(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "RULE" });
        expect(state.playerZones[P1].characters).toContain("p1-CARD-0");
        expect(state.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("throws if CHARACTERS zone is full and no replacedId", () => {
        let state = setupTestGame();
        for (let i = 0; i < CHARACTERS_MAX; i++) {
            state = moveCard(state, `p1-CARD-${i}` as CardInstanceId, "CHARACTERS", "BOTTOM");
        }
        expect(() =>
            playCharacter(state, P1, `p1-CARD-${CHARACTERS_MAX}` as CardInstanceId, { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("replace path: new card lands at replaced index, old card goes to TRASH", () => {
        let state = setupTestGame();
        for (let i = 0; i < CHARACTERS_MAX; i++) {
            state = moveCard(state, `p1-CARD-${i}` as CardInstanceId, "CHARACTERS", "BOTTOM");
        }
        const replacedId = "p1-CARD-2" as CardInstanceId; // index 2
        const newId = `p1-CARD-${CHARACTERS_MAX}` as CardInstanceId;
        state = playCharacter(state, P1, newId, { kind: "RULE" }, replacedId);
        expect(state.playerZones[P1].characters[2]).toBe(newId);
        expect(state.playerZones[P1].characters).not.toContain(replacedId);
        expect(state.playerZones[P1].trash).toContain(replacedId);
    });

    it("replace path: throws if zone is not at capacity", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() =>
            playCharacter(state, P1, "p1-CARD-1" as CardInstanceId, { kind: "RULE" }, "p1-CARD-0" as CardInstanceId)
        ).toThrow(InvalidActionError);
    });

    it("throws if card is not a CHARACTER", () => {
        const state = setupTestGame();
        expect(() => playCharacter(state, P1, "p1-DON-0" as CardInstanceId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants on normal play", () => {
        let state = setupTestGame();
        state = playCharacter(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "RULE" });
        assertInvariants(state);
    });

    it("passes invariants on replace play", () => {
        let state = setupTestGame();
        for (let i = 0; i < CHARACTERS_MAX; i++) {
            state = moveCard(state, `p1-CARD-${i}` as CardInstanceId, "CHARACTERS", "BOTTOM");
        }
        state = playCharacter(
            state, P1,
            `p1-CARD-${CHARACTERS_MAX}` as CardInstanceId,
            { kind: "RULE" },
            "p1-CARD-0" as CardInstanceId,
        );
        assertInvariants(state);
    });
});

// ============================================================
// playStage
// ============================================================

describe("playStage", () => {
    it("moves STAGE card to STAGE zone (not CHARACTERS)", () => {
        const { state, stageId } = makeStateForStagePlay();
        const next = playCard(state, P1, stageId, { kind: "PLAYER" });
        expect(next.playerZones[P1].stage).toContain(stageId);
        expect(next.playerZones[P1].characters).not.toContain(stageId);
    });

    it("removes STAGE card from hand after play", () => {
        const { state, stageId } = makeStateForStagePlay();
        const next = playCard(state, P1, stageId, { kind: "PLAYER" });
        expect(next.playerZones[P1].hand).not.toContain(stageId);
    });

    it("throws if STAGE zone is full and no replacedId", () => {
        const { state, stageId1 } = makeStateWithTwoStageCards();
        const stateWithFullStage = moveCard(state, stageId1, "STAGE", "TOP");
        expect(() =>
            playStage(stateWithFullStage, P1, "p1-CARD-1" as CardInstanceId, { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("replace path: new stage goes to STAGE zone, old stage to TRASH", () => {
        const { state, stageId1, stageId2 } = makeStateWithTwoStageCards();
        let next = moveCard(state, stageId1, "STAGE", "TOP");
        next = playStage(next, P1, stageId2, { kind: "RULE" }, stageId1);
        expect(next.playerZones[P1].stage).toContain(stageId2);
        expect(next.playerZones[P1].trash).toContain(stageId1);
        expect(next.playerZones[P1].stage).not.toContain(stageId1);
    });

    it("throws if card is not a STAGE", () => {
        const state = setupTestGame();
        expect(() => playStage(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants on normal play", () => {
        const { state, stageId } = makeStateForStagePlay();
        const next = playCard(state, P1, stageId, { kind: "PLAYER" });
        assertInvariants(next);
    });

    it("passes invariants on replace play", () => {
        const { state, stageId1, stageId2 } = makeStateWithTwoStageCards();
        let next = moveCard(state, stageId1, "STAGE", "TOP");
        next = playStage(next, P1, stageId2, { kind: "RULE" }, stageId1);
        assertInvariants(next);
    });
});

// ============================================================
// playEvent
// ============================================================

describe("playEvent", () => {
    it("moves EVENT card to TRASH", () => {
        const { state, eventId } = makeStateForEventPlay();
        const next = playCard(state, P1, eventId, { kind: "PLAYER" });
        expect(next.playerZones[P1].trash).toContain(eventId);
    });

    it("removes EVENT card from hand", () => {
        const { state, eventId } = makeStateForEventPlay();
        const next = playCard(state, P1, eventId, { kind: "PLAYER" });
        expect(next.playerZones[P1].hand).not.toContain(eventId);
    });

    it("sets currentZone to TRASH on the event instance", () => {
        const { state, eventId } = makeStateForEventPlay();
        const next = playCard(state, P1, eventId, { kind: "PLAYER" });
        expect(next.instances[eventId].currentZone).toBe("TRASH");
    });

    it("throws if card is not an EVENT", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "HAND", "TOP");
        expect(() => playEvent(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws if played from TRASH (use playEventFromTrash instead)", () => {
        let state = makeStateWithCardAtTop(MOCK_EVENT_ID);
        const eventId = "p1-CARD-0" as CardInstanceId;
        state = moveCard(state, eventId, "TRASH", "TOP");
        expect(() => playEvent(state, P1, eventId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        const { state, eventId } = makeStateForEventPlay();
        const next = playCard(state, P1, eventId, { kind: "PLAYER" });
        assertInvariants(next);
    });
});

// ============================================================
// playEventFromTrash
// ============================================================

describe("playEventFromTrash", () => {
    it("emits EVENT_PLAYED without moving the card", () => {
        let state = makeStateWithCardAtTop(MOCK_EVENT_ID);
        const eventId = "p1-CARD-0" as CardInstanceId;
        state = moveCard(state, eventId, "TRASH", "TOP");
        const next = playEventFromTrash(state, P1, eventId, { kind: "RULE" });
        expect(next.instances[eventId].currentZone).toBe("TRASH");
        expect(next.playerZones[P1].trash).toContain(eventId);
    });

    it("throws if card is not in TRASH", () => {
        const { state, eventId } = makeStateForEventPlay();
        expect(() => playEventFromTrash(state, P1, eventId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws if card is not an EVENT", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP");
        expect(() => playEventFromTrash(state, P1, "p1-CARD-0" as CardInstanceId, { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = makeStateWithCardAtTop(MOCK_EVENT_ID);
        const eventId = "p1-CARD-0" as CardInstanceId;
        state = moveCard(state, eventId, "TRASH", "TOP");
        const next = playEventFromTrash(state, P1, eventId, { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// removeCardFromField
// ============================================================

describe("removeCardFromField", () => {
    it("moves CHARACTER from CHARACTERS to TRASH", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].trash).toContain("p1-CARD-0");
        expect(next.playerZones[P1].characters).not.toContain("p1-CARD-0");
    });

    it("moves CHARACTER from CHARACTERS to HAND", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "HAND", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toContain("p1-CARD-0");
        expect(next.playerZones[P1].characters).not.toContain("p1-CARD-0");
    });

    it("moves CHARACTER from CHARACTERS to DECK", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "DECK", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].deck[0]).toBe("p1-CARD-0");
    });

    it("detaches attached DON before removing from field", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = attachDon(state, "p1-DON-0" as CardInstanceId, "p1-CARD-0" as CardInstanceId);
        const next = removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].donRested).toContain("p1-DON-0");
        expect((next.instances["p1-DON-0" as CardInstanceId] as any).attachedTo).toBeNull();
    });

    it("throws if instance is not a CHARACTER or STAGE", () => {
        const state = setupTestGame();
        expect(() => removeCardFromField(state, P1, "p1-DON-0" as CardInstanceId, "TRASH", "TOP", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws if card is not currently on the field", () => {
        const state = setupTestGame();
        // p1-CARD-0 is in DECK, not CHARACTERS or STAGE
        expect(() => removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("throws for invalid destination zone", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        expect(() => removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "CHARACTERS" as any, "TOP", { kind: "RULE" }))
            .toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        const next = removeCardFromField(state, P1, "p1-CARD-0" as CardInstanceId, "TRASH", "TOP", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// cardsAddToHand
// ============================================================

describe("cardsAddToHand", () => {
    it("moves card from DECK zone to HAND", () => {
        const state = setupTestGame();
        const next = cardsAddToHand(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toContain("p1-CARD-0");
        expect(next.playerZones[P1].deck).not.toContain("p1-CARD-0");
    });

    it("moves multiple cards from DECK to HAND", () => {
        const state = setupTestGame();
        const next = cardsAddToHand(
            state, P1,
            ["p1-CARD-0" as CardInstanceId, "p1-CARD-1" as CardInstanceId],
            "DECK",
            { kind: "RULE" }
        );
        expect(next.playerZones[P1].hand).toHaveLength(2);
        expect(next.playerZones[P1].deck).toHaveLength(48);
    });

    it("sets currentZone to HAND on each moved card", () => {
        const state = setupTestGame();
        const next = cardsAddToHand(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", { kind: "RULE" });
        expect(next.instances["p1-CARD-0" as CardInstanceId].currentZone).toBe("HAND");
    });

    it("throws InvalidActionError if card is not in the expected fromZone", () => {
        const state = setupTestGame(); // p1-CARD-0 is in DECK, not HAND
        expect(() =>
            cardsAddToHand(state, P1, ["p1-CARD-0" as CardInstanceId], "HAND", { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("does not affect other player", () => {
        const state = setupTestGame();
        const next = cardsAddToHand(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", { kind: "RULE" });
        expect(next.playerZones[P2].hand).toHaveLength(0);
    });

    it("passes invariants", () => {
        const state = setupTestGame();
        const next = cardsAddToHand(state, P1, ["p1-CARD-0" as CardInstanceId], "DECK", { kind: "RULE" });
        assertInvariants(next);
    });
});

// ============================================================
// cardsToDeckFromHand
// ============================================================

describe("cardsToDeckFromHand", () => {
    it("moves card from HAND to DECK at TOP", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        const next = cardsToDeckFromHand(state, P1, [handCard], "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].deck[0]).toBe(handCard);
        expect(next.playerZones[P1].hand).not.toContain(handCard);
    });

    it("moves card from HAND to DECK at BOTTOM", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        const next = cardsToDeckFromHand(state, P1, [handCard], "BOTTOM", { kind: "RULE" });
        expect(next.playerZones[P1].deck.at(-1)).toBe(handCard);
    });

    it("returns multiple cards from HAND to DECK", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 3, { kind: "RULE" });
        const hand = [...state.playerZones[P1].hand];
        const next = cardsToDeckFromHand(state, P1, hand, "TOP", { kind: "RULE" });
        expect(next.playerZones[P1].hand).toHaveLength(0);
        expect(next.playerZones[P1].deck).toHaveLength(50);
    });

    it("sets currentZone to DECK on each returned card", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        const next = cardsToDeckFromHand(state, P1, [handCard], "TOP", { kind: "RULE" });
        expect(next.instances[handCard].currentZone).toBe("DECK");
    });

    it("throws InvalidActionError if card is not in HAND", () => {
        const state = setupTestGame(); // p1-CARD-0 is in DECK, not HAND
        expect(() =>
            cardsToDeckFromHand(state, P1, ["p1-CARD-0" as CardInstanceId], "TOP", { kind: "RULE" })
        ).toThrow(InvalidActionError);
    });

    it("does not affect other player", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 1, { kind: "RULE" });
        const handCard = state.playerZones[P1].hand[0];
        const next = cardsToDeckFromHand(state, P1, [handCard], "TOP", { kind: "RULE" });
        expect(next.playerZones[P2].deck).toHaveLength(50);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = cardsDraw(state, P1, 3, { kind: "RULE" });
        const hand = [...state.playerZones[P1].hand];
        assertInvariants(cardsToDeckFromHand(state, P1, hand, "TOP", { kind: "RULE" }));
    });
});

// ============================================================
// cardsRefresh
// ============================================================

describe("cardsRefresh", () => {
    it("sets all rested CHARACTERS to active", () => {
        let state = setupTestGame();
        state = moveCard(state, "p1-CARD-0" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = moveCard(state, "p1-CARD-1" as CardInstanceId, "CHARACTERS", "BOTTOM");
        state = setRested(state, "p1-CARD-0" as CardInstanceId);
        state = setRested(state, "p1-CARD-1" as CardInstanceId);
        const next = cardsRefresh(state, P1);
        expect(next.instances["p1-CARD-0" as CardInstanceId].isRested).toBe(false);
        expect(next.instances["p1-CARD-1" as CardInstanceId].isRested).toBe(false);
    });

    it("sets rested LEADER to active", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-LEADER" as CardInstanceId);
        const next = cardsRefresh(state, P1);
        expect(next.instances["p1-LEADER" as CardInstanceId].isRested).toBe(false);
    });

    it("sets rested STAGE to active", () => {
        let state = makeStateWithCardAtTop(MOCK_STAGE_ID);
        const stageId = "p1-CARD-0" as CardInstanceId;
        state = moveCard(state, stageId, "STAGE", "TOP");
        state = setRested(state, stageId);
        const next = cardsRefresh(state, P1);
        expect(next.instances[stageId].isRested).toBe(false);
    });

    it("does not affect the other player's cards", () => {
        let state = setupTestGame();
        state = setRested(state, "p2-LEADER" as CardInstanceId);
        const next = cardsRefresh(state, P1);
        expect(next.instances["p2-LEADER" as CardInstanceId].isRested).toBe(true);
    });

    it("passes invariants", () => {
        let state = setupTestGame();
        state = setRested(state, "p1-LEADER" as CardInstanceId);
        assertInvariants(cardsRefresh(state, P1));
    });
});
