import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "../types/state";
import {
    cardsDraw,
    cardsTrashFromHand,
    cardsToDeckFromHand,
    cardsSetActive,
    cardsSetRested,
    cardsRefresh,
    playCard,
    playCharacter,
    playStage,
    playEvent,
    playEventFromTrash,
    removeCardsFromField,
} from "../game/operations/cards";

let state!: GameState;

beforeEach(() => {
    // TODO: initialize state
});

describe("cardsDraw", () => {
    it("moves the top card of the deck into the hand", () => {
        // Keep the card instance id of the top card of the deck pre-draw
        // Check that the card instance id does not exist in the deck
        // Check that the card instance id exists in hand
        // Check that the card's current zone was updated to "HAND"
    });
    it("moves the top n cards of the deck into the hand", () => {
        // Keep the array of card instance ids of the top N cards of the deck pre-draw
        // Check that the ids in the array do not exist in the deck
        // Check that the ids exist in the hand in order that they were added (always pushes to top or front of the array so check reverse order)
        // Note: hand order doesn't matter for gameplay but may be important for replay purposes
        // Check that the card's current zone was updated to "HAND"
    });
    it("draws as many cards as possible", () => {
        // Same checks as above
        // Check that deck is empty
    });
    it("does nothing when the deck is empty", () => {
        // Check draw 1, draw N
        // Verify that nothing changed between deck and hand
    });
});

describe("returnTrashToHand", () => {

});

describe("cardsTrashFromHand", () => {
    it.todo("moves the specified cards from hand to trash");
    it.todo("throws when a card is not in hand");
});

describe("cardsToDeckFromHand", () => {
    it.todo("moves the specified cards to the top of the deck");
    it.todo("moves the specified cards to the bottom of the deck");
    it.todo("throws when a card is not in hand");
});

describe("cardsSetActive", () => {
    it.todo("sets the specified characters and leaders as active");
    it.todo("throws when given a DON instance");
    it.todo("throws when given an instance that is not a character, leader, or stage");
});

describe("cardsSetRested", () => {
    it.todo("sets the specified characters and leaders as rested");
    it.todo("throws when given a DON instance");
    it.todo("throws when given an instance that is not a character, leader, or stage");
});

describe("cardsRefresh", () => {
    it.todo("sets all characters, the leader, and any stage cards as active");
});

describe("playCard", () => {
    it.todo("rests DON equal to the card cost when played by a player");
    it.todo("throws when the player does not have enough active DON");
    it.todo("throws when played directly by a player but the card is not in hand");
    it.todo("routes to playCharacter for CHARACTER class cards");
    it.todo("routes to playStage for STAGE class cards");
    it.todo("routes to playEvent for EVENT class cards");
    it.todo("throws for non-playable card classes");
});

describe("playCharacter", () => {
    it.todo("places the character in the CHARACTERS zone");
    it.todo("throws when the character zone is full and no replacement is provided");
    it.todo("replaces the target character at the same slot index when the zone is full");
    it.todo("sends the replaced character to trash");
    it.todo("throws when the replacedId is not in the CHARACTERS zone");
});

describe("playStage", () => {
    it.todo("places the stage in the STAGE zone");
    it.todo("throws when the stage zone is full and no replacement is provided");
    it.todo("replaces the existing stage when one is provided");
    it.todo("sends the replaced stage to trash");
});

describe("playEvent", () => {
    it.todo("moves the event card to trash");
    it.todo("throws when the event is already in trash");
});

describe("playEventFromTrash", () => {
    it.todo("emits EVENT_PLAYED without moving the card");
    it.todo("throws when the event is not in trash");
});

describe("removeCardsFromField", () => {
    it.todo("moves a character to the specified destination zone");
    it.todo("detaches all attached DON before removing the character");
    it.todo("moves a stage to the specified destination zone");
    it.todo("throws when the card is not a character or stage");
    it.todo("throws when the card is not in the characters or stage zone");
});