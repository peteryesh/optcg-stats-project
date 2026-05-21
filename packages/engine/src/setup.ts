import { produce } from "immer";
import type { 
    GameConfig,
    GameState,
    PlayerZones
} from "./types/state";
import type { CardDef } from "./types/card";
import { CardId, PlayerId } from "./types/primitives";
import { LocalGameSeeds } from "./types/record";
import { EffectSequence } from "./types/effect";

const STATE_VERSION = 1;
const DECK_SIZE = 50;
const OPENING_HAND_SIZE = 5;
const DEFAULT_DON_DECK_SIZE = 10;

export function initGame(params: {
    gameId: string;
    playerCount: number;
    defs: Record<CardId, CardDef>;
    seeds: LocalGameSeeds;
    config: GameConfig;
}): GameState {
    const { gameId, playerCount, defs, seeds, config } = params;
    
    const playerIds = ['p1', 'p2', 'p3', 'p4'].slice(0, playerCount) as PlayerId[];
    
    const state: GameState = {
        gameId,
        version: STATE_VERSION,
        
        config: config,
        rngCursors: {
            game: 0n,
            players: Object.fromEntries(playerIds.map(id => [id, 0n])),
            life: Object.fromEntries(playerIds.map(id => [id, 0n]))
        },

        setup: {
            decksSubmitted: Object.fromEntries(playerIds.map(id => [id, false])),
            mulligan: Object.fromEntries(playerIds.map(id => [id, false]))
        },

        definitions: defs,
        instances: {},
        players: emptyPlayerZones(playerIds),

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
    return state;
}

function emptyPlayerZones(playerIds: PlayerId[]): Record<PlayerId, PlayerZones> {
    const zones: Record<PlayerId, PlayerZones> = {} as Record<PlayerId, PlayerZones>;
    for (const id of playerIds) {
        zones[id] = {
            deck: [],
            life: [],
            characters: [],
            stage: null,
            leader: null,
            trash: [],
            hand: [],
            donDeck: [],
            donActive: [],
            donRested: [],
            look: []
        };
    }
    return zones;
}

function setupEffectQueue(playerIds: PlayerId[]) {
    return playerIds.reduce((acc, id) => ({
        ...acc,
        [id]: []
    }), {} as Record<PlayerId, EffectSequence[]>);
}