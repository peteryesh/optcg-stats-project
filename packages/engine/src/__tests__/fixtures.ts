// src/__tests__/fixtures.ts
import type {
    CardId, CardDef, DeckList, GameSeeds,
    GameConfig, PlayerId,
    GameState,
} from "../types";
import { createEmptyGameState, initGame } from "../game/setup";

// ============================================================
// Mock card IDs
// ============================================================
export const MOCK_LEADER_ID: CardId = "TEST-LEADER-001";
export const MOCK_CHAR_ID: CardId = "TEST-CHAR-001";
export const MOCK_EVENT_ID: CardId = "TEST-EVENT-001";
export const MOCK_STAGE_ID: CardId = "TEST-STAGE-001";

// ============================================================
// Mock definitions
// ============================================================
export const mockDefs: Record<CardId, CardDef> = {
    [MOCK_LEADER_ID]: {
        id: MOCK_LEADER_ID,
        name: "Test Leader",
        class: "LEADER",
        power: 5000,
        life: 5,
        colors: ["RED"],
        types: [],
        attributes: [],
        aliases: [],
        restrictions: [],
        effects: [],
    },
    [MOCK_CHAR_ID]: {
        id: MOCK_CHAR_ID,
        name: "Test Character",
        class: "CHARACTER",
        cost: 3,
        power: 4000,
        counter: 1000,
        colors: ["RED"],
        types: [],
        attributes: [],
        aliases: [],
        restrictions: [],
        effects: [],
    },
    [MOCK_EVENT_ID]: {
        id: MOCK_EVENT_ID,
        name: "Test Event",
        class: "EVENT",
        cost: 2,
        colors: ["RED"],
        types: [],
        attributes: [],
        aliases: [],
        restrictions: [],
        effects: [],
    },
    [MOCK_STAGE_ID]: {
        id: MOCK_STAGE_ID,
        name: "Test Stage",
        class: "STAGE",
        cost: 1,
        colors: ["RED"],
        types: [],
        attributes: [],
        aliases: [],
        restrictions: [],
        effects: [],
    },
};

// ============================================================
// Mock decklist — 1 leader + 50 chars + 10 DON!!
// ============================================================
export function mockDecklist(overrides?: Partial<DeckList>): DeckList {
    return {
        leader: MOCK_LEADER_ID,
        deck: Array(50).fill(MOCK_CHAR_ID),
        sideDeck: [],
        donCount: 10,
        ...overrides,
    };
}

// ============================================================
// Mock seeds — fixed for determinism
// ============================================================
export function mockSeeds(playerIds: PlayerId[]): GameSeeds {
    return {
        game: 42n,
        players: Object.fromEntries(
            playerIds.map((id, i) => [id, BigInt(i + 1) * 100n])
        ),
    };
}

// ============================================================
// Mock config
// ============================================================
export function mockConfig(playerIds: PlayerId[]): GameConfig {
    return {
        players: Object.fromEntries(
            playerIds.map(id => [id, { playerId: id, isActive: true }])
        ),
        teamConfig: { kind: "FREE_FOR_ALL" },
        winCondition: { kind: "LAST_STANDING" },
    };
}

// ============================================================
// Empty state helper
// ============================================================
export function makeEmptyState(playerIds: PlayerId[] = ["p1", "p2"]): GameState {
    return createEmptyGameState(
        "test-game",
        playerIds,
        mockSeeds(playerIds),
        mockConfig(playerIds),
    );
}

// ============================================================
// Full initialized game helper
// ============================================================
export function setupTestGame(playerIds: PlayerId[] = ["p1", "p2"]): GameState {
    return initGame({
        gameId: "test-game",
        playerIds,
        seeds: mockSeeds(playerIds),
        config: mockConfig(playerIds),
        defs: mockDefs,
        decks: Object.fromEntries(playerIds.map(id => [id, mockDecklist()])),
    });
}
