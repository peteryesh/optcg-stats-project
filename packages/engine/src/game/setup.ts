import { produce } from "immer";
import type {
    GameConfig,
    GameState,
    PlayerZones
} from "../types/state";
import type { CardDef, DeckList } from "../types/card";
import { GameSeeds, CardId, PlayerId } from "../types/primitives";
import { EffectSequence } from "../types/effect";
import { instantiatePlayerBoard } from "./instances";
import { getCardDefsFromDeckList } from "../database/definitions";

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

    // Instantiate player boards
    for (const playerId of playerIds) {
        state = instantiatePlayerBoard(state, decks[playerId], defs, playerId);
    }

    return state;
}

export function createEmptyGameState(gameId: string, playerIds: PlayerId[], seeds: GameSeeds, config: GameConfig): GameState {
    return {
        gameId,
        version: STATE_VERSION,

        config: config,
        seeds: seeds,
        rngCursors: {
            game: 0n,
            players: Object.fromEntries(playerIds.map(id => [id, 0n]))
        },

        setup: {
            mulligan: Object.fromEntries(playerIds.map(id => [id, false]))
        },

        definitions: {},
        instances: {},

        playerZones: emptyPlayerZones(playerIds),

        turnOrder: playerIds,
        turnNumber: 0,
        activePlayerId: playerIds[0],
        phase: "SETUP",
        cardsPlayedThisTurn: [],

        battlePhase: null,
        battlesThisTurn: [],

        currentEffect: null,
        pendingEffects: setupEffectQueue(playerIds),
        pendingDecision: null,

        listeners: {},
        continuousEffects: [],
        replacementEffects: [],
        effectSuppressions: [],

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

export function setupEffectQueue(playerIds: PlayerId[]) {
    return playerIds.reduce((acc, id) => ({
        ...acc,
        [id]: []
    }), {} as Record<PlayerId, EffectSequence[]>);
}