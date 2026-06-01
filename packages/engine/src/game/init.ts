import { produce } from "immer";
import type { GameConfig, GameState, PlayerZones } from "../types/state";
import type { CardDef, DeckList } from "../types/card";
import type { EffectSequence } from "../types/effect";
import { GameSeeds, CardId, PlayerId } from "../types/primitives";
import { instantiatePlayerBoard } from "./instantiation";
import { nextInt, shuffle } from "../rng/rng";
import { OPENING_HAND_SIZE } from "./rules";
import { getZoneArray, moveCard } from "./mechanics";

const STATE_VERSION = 1;

export function initGame(params: {
    gameId: string;
    playerIds: PlayerId[];
    seeds: GameSeeds;
    config: GameConfig;
    defs: Record<CardId, CardDef>;
    decks: Record<PlayerId, DeckList>;
}): GameState {
    const { gameId, playerIds, seeds, config, defs, decks } = params;

    let state = createEmptyGameState(gameId, playerIds, seeds, config);

    state = produce(state, draft => {
        Object.assign(draft.definitions, defs);
    });

    for (const playerId of playerIds) {
        state = instantiatePlayerBoard(state, decks[playerId], defs, playerId);
    }

    return state;
}

export function createEmptyGameState(gameId: string, playerIds: PlayerId[], seeds: GameSeeds, config: GameConfig): GameState {
    // Coin flip uses game seed at cursor 0 — deterministic and reproducible from the seed
    const [postFlipCursor, flipIdx] = nextInt(seeds.game, 0n, playerIds.length);
    const coinFlipWinner = playerIds[flipIdx];

    return {
        gameId,
        version: STATE_VERSION,

        config: config,
        seeds: seeds,
        rngCursors: {
            game: postFlipCursor,
            players: Object.fromEntries(playerIds.map(id => [id, 0n]))
        },

        setup: {
            coinFlipWinner,
            mulligan: Object.fromEntries(playerIds.map(id => [id, "PENDING"]))
        },

        definitions: {},
        instances: {},

        playerZones: emptyPlayerZones(playerIds),

        turnOrder: playerIds,
        turnNumber: 0,
        activePlayerId: playerIds[0],
        phase: "SETUP",
        cardsPlayedThisTurn: [],

        currentBattle: null,
        battlesThisTurn: [],

        currentEffect: null,
        pendingEffects: emptyPendingEffects(playerIds),
        pendingDecision: null,

        listeners: [],
        activatableEffects: [],
        statusEffects: [],

        actionLog: [],

        winner: null,
        endReason: null
    };
}

export function emptyPlayerZones(playerIds: PlayerId[]): Record<PlayerId, PlayerZones> {
    const zones: Record<PlayerId, PlayerZones> = {} as Record<PlayerId, PlayerZones>;
    for (const id of playerIds) {
        zones[id] = {
            characters: [],
            deck: [],
            donActive: [],
            donDeck: [],
            donRested: [],
            hand: [],
            leader: [],
            life: [],
            look: [],
            stage: [],
            trash: [],
        };
    }
    return zones;
}

export function emptyPendingEffects(playerIds: PlayerId[]): Record<PlayerId, EffectSequence[]> {
    return Object.fromEntries(playerIds.map(id => [id, []]));
}