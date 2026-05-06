import { produce } from "immer";
import type { 
    GameState,
    GameStatus,
    PlayerId,
    PlayerState,
    PlayerZones,
    Card,
    CardInstanceId,
    CardId,
    TurnState
} from "./state";
import { CardInstanceId as makeCardInstanceId, CardId as makeCardId } from "./state";
import type { CardDatabase } from "./card-database";
import type { RngSource } from "./rng";

const STATE_VERSION = 1;
const DECK_SIZE = 50;
const OPENING_HAND_SIZE = 5;
const DEFAULT_DON_DECK_SIZE = 10;

const PLAYER_IDS: readonly PlayerId[] = ["p1", "p2"] as const;

export interface DeckInput {
    leaderCardId: CardId;
    deckCardIds: CardId[];
}

export interface SetupInput {
    decks: Record<PlayerId, DeckInput>;
    firstPlayer: PlayerId;
}

export function createInitialState(
    input: SetupInput,
    database: CardDatabase,
    rng: RngSource,
): GameState {
    // Current game version (change to an environment variable)
    let version = 0;

    // Game State to be returned
    // Need to decide where and how to actually fill the information given the parameters of the game
    // like how much life, how much don, etc.
    const gameState = {
        version: STATE_VERSION,
        players: {},
        status: {type: 'not_started'},
        tick: 0
    } as GameState;

    const cards: Record<CardInstanceId, Card> = {}

    // Build cards list and individual player zones
    for (const playerId of PLAYER_IDS) {
        const deckInput = input.decks[playerId];
        
        // Build the list of all cards in the player's deck
        const playerCards = buildPlayerCards(playerId, deckInput, database);

        // Add player's deck to the list of total cards in the game
        Object.assign(cards, playerCards);

        // Build the player state
        const playerState = buildPlayerState(playerId, playerCards);

        // Shuffle player cards
        rng.shuffle(playerState.zones.deck);

        gameState.players[playerId] = playerState;
    }
    gameState.cards = cards;

    const turnState = {
        activePlayer: 'p1',
        phase: 'game-start',
        turnNumber: 0
    } as TurnState;
    gameState.turn = turnState;

    return gameState;
}

function getLeaderInstanceId(playerId: PlayerId) {
    return makeCardInstanceId(`${playerId}-leader`);
}

// Still need to shuffle cards using whatever RNG implementation is passed in
function buildPlayerState(
    playerId: PlayerId,
    playerCards: Record<CardInstanceId, Card>
): PlayerState {
    const {[getLeaderInstanceId(playerId)]: _, ...deckCards} = playerCards;
    const playerState = {
        id: playerId,
        zones: {
            deck: Object.keys(deckCards) as CardInstanceId[],
            life: [],
            characters: [],
            stage: null,
            leader: getLeaderInstanceId(playerId),
            trash: [],
            hand: [],
            donDeck: buildDonDeck(playerId),
            donActive: [],
            donRested: []
        }
    }
    return playerState;
}

function buildPlayerCards(
    playerId: PlayerId,
    deckInput: DeckInput,
    database: CardDatabase,
): Record<CardInstanceId, Card> {
    const result: Record<CardInstanceId, Card> = {};

    const leaderInstanceId = getLeaderInstanceId(playerId);
    result[leaderInstanceId] = buildCardInstance(
        leaderInstanceId,
        deckInput.leaderCardId,
        playerId,
        database,
    );

    let i = 0
    for (const cardId of deckInput.deckCardIds) {
        const cardInstanceId = makeCardInstanceId(`${playerId}-card-${i}`)
        result[cardInstanceId] = buildCardInstance(
            cardInstanceId,
            cardId,
            playerId,
            database,
        );
    }

    return result;
}

function buildCardInstance(
    instanceId: CardInstanceId,
    cardId: CardId,
    playerId: PlayerId,
    database: CardDatabase
): Card {
    const cardDef = database[cardId];
    
    if (!cardDef) {
        throw new Error(`Card defintion not found for ${cardId}`);
    }

    const base = {instanceId, cardId, playerId};

    // "class" is translated to "kind"
    switch (cardDef.class) {
        case "LEADER":
            return {
                ...base,
                kind: "LEADER",
                attachedDon: [],
                rested: false,
                abilityUsage: [],
                basePowerOverrides: [],
                basePowerModifiers: [],
                powerModifiers: []
            }
        
        case "CHARACTER":
            return {
                ...base,
                kind: "CHARACTER",
                attachedDon: [],
                rested: false,
                playedThisTurn: false,
                abilityUsage: [],
                statusEffects: [],
                basePowerOverrides: [],
                basePowerModifiers: [],
                powerModifiers: [],
                baseCostOverrides: [],
                baseCostModifiers: [],
                costModifiers: []
            }
        
        case "STAGE":
            return {
                ...base,
                kind: "STAGE",
                rested: false,
                abilityUsage: [],
                baseCostOverrides: [],
                baseCostModifiers: [],
                costModifiers: []
            }

        case "EVENT":
            return {
                ...base,
                kind: "EVENT",
                abilityUsage: [],
                baseCostOverrides: [],
                baseCostModifiers: [],
                costModifiers: []
            }
        
        case "DON":
            return {
                ...base,
                kind: "DON",
                statusEffects: []
            }
    }
}

function buildDonDeck(playerId: PlayerId): CardInstanceId[] {
    const don = [];
    for(let i = 0; i < DEFAULT_DON_DECK_SIZE; i++) {
        don.push(makeCardInstanceId(`${playerId}-don-${i}`))
    }
    return don;
}