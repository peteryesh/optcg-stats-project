import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import type { CardInstanceId, PlayerId } from '../../types/primitives';
import { shuffle } from '../../rng/rng';
import { moveCard, getZoneArray, setMulliganChoice } from '../mechanics';
import { InvalidActionError } from '../../errors';
import { OPENING_HAND_SIZE } from '../constants';
import { enterStartGamePhase, cardsDraw, sendHandToDeck, enterStartOfTurnPhase, sendTopDeckToLife } from '../operations';
import { getCardInstance, getCardDef } from '../mechanics';

export function applyChooseFirstPlayer(state: GameState, action: Extract<GameAction, { type: "CHOOSE_FIRST_PLAYER" }>): GameState {
    const { playerId, choice } = action; // deciderId picks, choice is the playerId of the player to go first
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
    return setMulliganChoice(state, action.playerId, "KEEP");
}

export function applyMulligan(state: GameState, action: Extract<GameAction, { type: "MULLIGAN" }>): GameState {
    const { playerId } = action;
    if (state.setup.mulligan[playerId] !== "PENDING") {
        throw new InvalidActionError(`Player ${playerId} cannot choose to mulligan because they have already made their mulligan choice`);
    }
    state = setMulliganChoice(state, action.playerId, "MULLIGAN");

    // Reset hand and deck
    state = sendHandToDeck(state, playerId, state.playerZones[playerId].hand, "TOP", { kind: "RULE" });
    
    // Reshuffle and draw new hand
    state = shuffleDeck(state, playerId);
    state = cardsDraw(state, playerId, OPENING_HAND_SIZE, { kind: "RULE" });
    return state;
}

export function shuffleDeck(state: GameState, playerId: PlayerId): GameState {
    const playerSeed = state.config.seeds.players[playerId];
    const rngCursor = state.rngCursors.players[playerId];
    const playerZones = state.playerZones[playerId];
    const [shuffledDeck, postShuffleCursor] = shuffle(playerZones.deck, playerSeed, rngCursor);
    return produce(state, draft => {
        draft.rngCursors.players[playerId] = postShuffleCursor;
        draft.playerZones[playerId].deck = shuffledDeck;
    });
}

export function setPlayerLife(state: GameState, playerId: PlayerId): GameState {
    const leaderId = getZoneArray(state, playerId, "LEADER")[0];
    if (!leaderId) throw new InvalidActionError(`No leader id found for player ${playerId}`);
    const leaderDef = getCardDef(state, leaderId);
    if (leaderDef.class !== "LEADER") throw new InvalidActionError(`Card ${leaderId} is not a leader for player ${playerId}`);
    if (!leaderDef.life) throw new InvalidActionError(`Leader ${leaderDef.id} does not have a life value for player ${playerId}`);    
    return sendTopDeckToLife(state, playerId, leaderDef.life, "TOP", { kind: "RULE" });
}