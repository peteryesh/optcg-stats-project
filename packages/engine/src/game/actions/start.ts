import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import type { CardInstanceId, PlayerId } from '../../types/primitives';
import { shuffle } from '../../rng/rng';
import { moveCard, getZoneArray } from '../mechanics';
import { InvalidActionError } from '../../errors';
import { OPENING_HAND_SIZE } from '../rules';
import { enterStartGamePhase, cardsDraw, cardsToDeckFromHand, enterStartOfTurnPhase, lifeAdd } from '../operations';
import { processEffects } from '../effects';

// state = shuffleDeck(state, playerId);
//         for (let i = 0; i < OPENING_HAND_SIZE; i++) {
//             const deckZone = getZoneArray(state, playerId, "DECK");
//             const cardId = deckZone[0];
//             if (!cardId) break;
//             // for setup, we do not want to emit signals for these card moves
//             // change this is there is a leader that causes the initial phase 
//             state = moveCard(state, cardId, "HAND", "TOP");
//         }

// Coin flip is decided by initGame and already exists by the time we enter start game phase
// Decide turn order
// Start game (enter start game phase, emit game start signal, etc)
// Apply start of game actions (in order of coin flip winner, regardless of choosing first or second, not sure for more than 2)
// Start turn for the player who goes first (enter start of turn phase, emit phase changed signal, etc)

export function applyChooseFirstPlayer(state: GameState, action: Extract<GameAction, { type: "CHOOSE_TURN_ORDER" }>): GameState {
    const { playerId, choice } = action; // playerId picks, choice is the playerId of the player to go first
    if (state.setup.coinFlipWinner !== playerId) {
        throw new InvalidActionError(`Player ${playerId} cannot choose turn order because they did not win the coin flip`);
    }
    const defaultTurnOrder = state.turnOrder;
    const firstPlayerIndex = defaultTurnOrder.indexOf(choice);
    if (firstPlayerIndex === -1) {
        throw new InvalidActionError(`Player ${playerId} cannot choose player ${choice} to go first because they are not in the game`);
    }
    const chosenTurnOrder = [...defaultTurnOrder.slice(firstPlayerIndex), ...defaultTurnOrder.slice(0, firstPlayerIndex)];
    state = produce(state, draft => {
        draft.turnOrder = chosenTurnOrder;
    });

    // Emit should enqueue start of game effects
    state = enterStartGamePhase(state);

    // Process start of game effects before shuffles and draws
    // If there are any, the effect handler should resume start of game actions
    // Player who chose turn order (coin flip winner) resolve their effects first, then the other player resolves their effects
    state = processEffects(state);
    if (state.pendingDecision !== null) return state;

    for (const playerId of state.turnOrder) {
        state = shuffleDeck(state, playerId);
        state = cardsDraw(state, playerId, OPENING_HAND_SIZE, { kind: "RULE" });
    }
    return state;
}

export function applyKeepHand(state: GameState, action: Extract<GameAction, { type: "KEEP_HAND" }>): GameState {
    const { playerId } = action;
    if (state.setup.mulligan[playerId] !== "PENDING") {
        throw new InvalidActionError(`Player ${playerId} cannot keep hand because they have already made their mulligan choice`);
    }
    state = produce(state, draft => {
        // Set keep choice, hand is kept, set life cards, ready to play
        draft.setup.mulligan[playerId] = "KEEP";
    });
    state = setPlayerLife(state, playerId);
    return state;
}

export function applyMulligan(state: GameState, action: Extract<GameAction, { type: "MULLIGAN" }>): GameState {
    const { playerId } = action;
    if (state.setup.mulligan[playerId] !== "PENDING") {
        throw new InvalidActionError(`Player ${playerId} cannot choose to mulligan because they have already made their mulligan choice`);
    }
    // Set mulligan choice, reset hand and deck
    state = produce(state, draft => {
        draft.setup.mulligan[playerId] = "MULLIGAN";
        const handZone = getZoneArray(state, playerId, "HAND");
        const deckZone = getZoneArray(state, playerId, "DECK");
        state.playerZones[playerId].hand = [];
        state.playerZones[playerId].deck = [...handZone, ...deckZone];
    });
    
    // Reshuffle and draw new hand
    state = shuffleDeck(state, playerId);
    state = cardsDraw(state, playerId, OPENING_HAND_SIZE, { kind: "RULE" });
    
    // Set life cards
    state = setPlayerLife(state, playerId);

    // Check for other players still pending on mulligan choice, if not, start the game
    let playersReady = true;
    for (const playerId of state.turnOrder) {
        if (state.setup.mulligan[playerId] === "PENDING") {
            playersReady = false;
        }
    }
    // Last player to mulligan starts the game, player assigned first is set in start of turn phase
    if (playersReady) {
        state = enterStartOfTurnPhase(state);
    }
    return state;
}

export function shuffleDeck(state: GameState, playerId: PlayerId): GameState {
    const playerSeed = state.seeds.players[playerId];
    const rngCursor = state.rngCursors.players[playerId];
    const playerZones = state.playerZones[playerId];
    const [shuffledDeck, postShuffleCursor] = shuffle(playerZones.deck, playerSeed, rngCursor);
    return produce(state, draft => {
        draft.rngCursors.players[playerId] = postShuffleCursor;
        playerZones.deck = shuffledDeck;
    });
}

export function setPlayerLife(state: GameState, playerId: PlayerId): GameState {
    const leaderId = getZoneArray(state, playerId, "LEADER")[0];
    if (!leaderId) throw new InvalidActionError(`No leader id found for player ${playerId}`);
    const leader = state.instances[leaderId];
    if (!leader) throw new InvalidActionError(`No leader instance found for player ${playerId}`);
    if (leader.class !== "LEADER") throw new InvalidActionError(`Card ${leaderId} is not a leader for player ${playerId}`);
    const leaderDef = state.definitions[leader.cardId];
    if (!leaderDef) throw new InvalidActionError(`No leader definition found for player ${playerId}`);
    const lifeCount = leaderDef.life;
    const lifeCards = getZoneArray(state, playerId, "DECK").slice(0, lifeCount);
    return lifeAdd(state, playerId, lifeCards, "DECK", "TOP", { kind: "RULE" });
}