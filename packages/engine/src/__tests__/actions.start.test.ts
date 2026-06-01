import { describe, it, expect } from "vitest";
import {
    applyChooseFirstPlayer,
    applyKeepHand,
    applyMulligan,
    shuffleDeck,
    setPlayerLife,
} from "../game/actions/start";
import { setupTestGame } from "./fixtures";
import { assertInvariants } from "./invariants";
import { OPENING_HAND_SIZE } from "../game/rules";
import { InvalidActionError } from "../errors";
import type { PlayerId } from "../types";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;

// Advances to START_GAME and deals opening hands. Returns the post-setup state
// along with the coin flip winner so tests can use the correct deciderId.
function makeStateAfterChooseFirstPlayer(firstPlayer: PlayerId = P1) {
    const state = setupTestGame();
    const coinFlipWinner = state.setup.coinFlipWinner;
    const next = applyChooseFirstPlayer(state, {
        type: "CHOOSE_FIRST_PLAYER",
        deciderId: coinFlipWinner,
        choice: firstPlayer,
    });
    return { state: next, coinFlipWinner };
}

// ============================================================
// shuffleDeck
// ============================================================

describe("shuffleDeck", () => {
    it("preserves deck length after shuffle", () => {
        const state = setupTestGame();
        expect(shuffleDeck(state, P1).playerZones[P1].deck).toHaveLength(50);
    });

    it("deck contains the same card instances after shuffle", () => {
        const state = setupTestGame();
        const before = new Set(state.playerZones[P1].deck);
        const after = new Set(shuffleDeck(state, P1).playerZones[P1].deck);
        expect(after).toEqual(before);
    });

    it("advances the player's rngCursor", () => {
        const state = setupTestGame();
        const next = shuffleDeck(state, P1);
        expect(next.rngCursors.players[P1]).toBeGreaterThan(0n);
    });

    it("does not affect the other player's deck", () => {
        const state = setupTestGame();
        const next = shuffleDeck(state, P1);
        expect(next.playerZones[P2].deck).toEqual(state.playerZones[P2].deck);
    });

    it("does not mutate original state", () => {
        const state = setupTestGame();
        const deckBefore = [...state.playerZones[P1].deck];
        shuffleDeck(state, P1);
        expect(state.playerZones[P1].deck).toEqual(deckBefore);
    });

    it("passes invariants", () => {
        assertInvariants(shuffleDeck(setupTestGame(), P1));
    });
});

// ============================================================
// setPlayerLife
// ============================================================

describe("setPlayerLife", () => {
    it("adds leader-life-count cards (5) to the life zone", () => {
        const state = setupTestGame();
        expect(setPlayerLife(state, P1).playerZones[P1].life).toHaveLength(5);
    });

    it("removes the set life cards from the deck", () => {
        const state = setupTestGame();
        const next = setPlayerLife(state, P1);
        expect(next.playerZones[P1].deck).toHaveLength(50 - 5);
    });

    it("uses the top cards from the deck", () => {
        const state = setupTestGame();
        const topFive = state.playerZones[P1].deck.slice(0, 5);
        const next = setPlayerLife(state, P1);
        for (const id of topFive) {
            expect(next.playerZones[P1].life).toContain(id);
        }
    });

    it("does not affect the other player", () => {
        const state = setupTestGame();
        const next = setPlayerLife(state, P1);
        expect(next.playerZones[P2].life).toHaveLength(0);
        expect(next.playerZones[P2].deck).toHaveLength(50);
    });

    it("passes invariants", () => {
        assertInvariants(setPlayerLife(setupTestGame(), P1));
    });
});

// ============================================================
// applyChooseFirstPlayer
// ============================================================

describe("applyChooseFirstPlayer", () => {
    it("transitions phase to START_GAME", () => {
        const { state } = makeStateAfterChooseFirstPlayer();
        expect(state.phase).toBe("START_GAME");
    });

    it("deals OPENING_HAND_SIZE cards to both players", () => {
        const { state } = makeStateAfterChooseFirstPlayer();
        expect(state.playerZones[P1].hand).toHaveLength(OPENING_HAND_SIZE);
        expect(state.playerZones[P2].hand).toHaveLength(OPENING_HAND_SIZE);
    });

    it("reduces each player's deck by OPENING_HAND_SIZE", () => {
        const { state } = makeStateAfterChooseFirstPlayer();
        expect(state.playerZones[P1].deck).toHaveLength(50 - OPENING_HAND_SIZE);
        expect(state.playerZones[P2].deck).toHaveLength(50 - OPENING_HAND_SIZE);
    });

    it("puts chosen player first in turnOrder", () => {
        // P2 chosen to go first
        const { state } = makeStateAfterChooseFirstPlayer(P2);
        expect(state.turnOrder[0]).toBe(P2);
    });

    it("puts P1 first when P1 is chosen", () => {
        const { state } = makeStateAfterChooseFirstPlayer(P1);
        expect(state.turnOrder[0]).toBe(P1);
    });

    it("throws InvalidActionError if deciderId is not the coin flip winner", () => {
        const state = setupTestGame();
        const coinFlipWinner = state.setup.coinFlipWinner;
        const loser = coinFlipWinner === P1 ? P2 : P1;
        expect(() =>
            applyChooseFirstPlayer(state, {
                type: "CHOOSE_FIRST_PLAYER",
                deciderId: loser,
                choice: P1,
            })
        ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError if choice is not a player in the game", () => {
        const state = setupTestGame();
        const coinFlipWinner = state.setup.coinFlipWinner;
        expect(() =>
            applyChooseFirstPlayer(state, {
                type: "CHOOSE_FIRST_PLAYER",
                deciderId: coinFlipWinner,
                choice: "p99" as PlayerId,
            })
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        const { state } = makeStateAfterChooseFirstPlayer();
        assertInvariants(state);
    });
});

// ============================================================
// applyKeepHand
// ============================================================

describe("applyKeepHand", () => {
    it("marks the player's mulligan status as KEEP", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyKeepHand(state, { type: "KEEP_HAND", playerId: coinFlipWinner });
        expect(next.setup.mulligan[coinFlipWinner]).toBe("KEEP");
    });

    it("sets life cards for the keeping player", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyKeepHand(state, { type: "KEEP_HAND", playerId: coinFlipWinner });
        expect(next.playerZones[coinFlipWinner].life).toHaveLength(5);
    });

    it("phase stays START_GAME while the other player hasn't decided", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyKeepHand(state, { type: "KEEP_HAND", playerId: coinFlipWinner });
        const otherPlayer = coinFlipWinner === P1 ? P2 : P1;
        if (next.setup.mulligan[otherPlayer] === "PENDING") {
            expect(next.phase).toBe("START_GAME");
        }
    });

    it("transitions to START_OF_TURN after both players keep", () => {
        let { state } = makeStateAfterChooseFirstPlayer();
        state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P1 });
        state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P2 });
        expect(state.phase).toBe("START_OF_TURN");
    });

    it("throws InvalidActionError if player already made a mulligan decision", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyKeepHand(state, { type: "KEEP_HAND", playerId: coinFlipWinner });
        expect(() =>
            applyKeepHand(next, { type: "KEEP_HAND", playerId: coinFlipWinner })
        ).toThrow(InvalidActionError);
    });

    it("passes invariants", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        assertInvariants(applyKeepHand(state, { type: "KEEP_HAND", playerId: coinFlipWinner }));
    });
});

// ============================================================
// applyMulligan
// ============================================================

describe("applyMulligan", () => {
    it("marks the player's mulligan status as MULLIGAN", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyMulligan(state, { type: "MULLIGAN", playerId: coinFlipWinner });
        expect(next.setup.mulligan[coinFlipWinner]).toBe("MULLIGAN");
    });

    it("player still has OPENING_HAND_SIZE cards after mulligan redraw", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyMulligan(state, { type: "MULLIGAN", playerId: coinFlipWinner });
        expect(next.playerZones[coinFlipWinner].hand).toHaveLength(OPENING_HAND_SIZE);
    });

    it("sets life cards for the mulliganing player", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyMulligan(state, { type: "MULLIGAN", playerId: coinFlipWinner });
        expect(next.playerZones[coinFlipWinner].life).toHaveLength(5);
    });

    it("throws InvalidActionError if player already made a mulligan decision", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        const next = applyMulligan(state, { type: "MULLIGAN", playerId: coinFlipWinner });
        expect(() =>
            applyMulligan(next, { type: "MULLIGAN", playerId: coinFlipWinner })
        ).toThrow(InvalidActionError);
    });

    it("transitions to START_OF_TURN after both players decide", () => {
        let { state } = makeStateAfterChooseFirstPlayer();
        state = applyMulligan(state, { type: "MULLIGAN", playerId: P1 });
        state = applyMulligan(state, { type: "MULLIGAN", playerId: P2 });
        expect(state.phase).toBe("START_OF_TURN");
    });

    it("turn 1 incremented after both players decide (start of game)", () => {
        let { state } = makeStateAfterChooseFirstPlayer();
        state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P1 });
        state = applyKeepHand(state, { type: "KEEP_HAND", playerId: P2 });
        expect(state.turn).toBe(1);
    });

    it("passes invariants", () => {
        const { state, coinFlipWinner } = makeStateAfterChooseFirstPlayer();
        assertInvariants(applyMulligan(state, { type: "MULLIGAN", playerId: coinFlipWinner }));
    });
});
