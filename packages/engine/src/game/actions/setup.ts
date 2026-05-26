import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { Action } from '../../types/action';
import type { CardInstanceId, PlayerId } from '../../types/primitives';
import { shuffle } from '../../rng/splitmix64';
import { moveCard } from '../mechanics/zones';
import { InvalidActionError } from '../../errors';
import { OPENING_HAND_SIZE } from '../rules';
import { startTurn } from './phase';

export function applyChooseTurnOrder(
    state: GameState,
    action: Extract<Action, { type: 'CHOOSE_TURN_ORDER' }>,
): GameState {
    const { playerId, choice } = action;
    if (playerId !== state.setup.coinFlipWinner) {
        throw new InvalidActionError(
            `${playerId} did not win the coin flip — ${state.setup.coinFlipWinner} must choose turn order`
        );
    }

    // Capture flip result before any reordering (winner at index 0 = HEADS)
    const flipResult = state.turnOrder[0] === state.setup.coinFlipWinner ? 'HEADS' : 'TAILS';

    if (choice === 'SECOND') {
        // Put the choosing player last; their opponent leads
        const [first, ...rest] = state.turnOrder;
        state = produce(state, draft => {
            draft.turnOrder = [...rest, first];
            draft.activePlayerId = draft.turnOrder[0];
        });
    }

    // Shuffle each player's deck using their individual seed + cursor
    for (const pid of state.turnOrder) {
        const deckIds = state.playerZones[pid].deck;
        const seed = state.seeds.players[pid];
        const cursor = state.rngCursors.players[pid];
        const [shuffledIds, newCursor] = shuffle(deckIds, seed, cursor);
        state = produce(state, draft => {
            draft.playerZones[pid].deck = shuffledIds as CardInstanceId[];
            draft.rngCursors.players[pid] = newCursor;
        });
    }

    // Deal opening hands — life cards are placed later, after keep/mulligan decisions
    for (const pid of state.turnOrder) {
        state = dealHand(state, pid, OPENING_HAND_SIZE);
    }

    // Emit setup signals into this action's log entry
    state = produce(state, draft => {
        const entry = draft.actionLog[draft.actionLog.length - 1];
        entry.signals.push(
            { type: 'COIN_FLIP_RESOLVED', winner: playerId, result: flipResult },
            { type: 'TURN_ORDER_DECIDED', turnOrder: [...draft.turnOrder] },
        );
        for (const pid of draft.turnOrder) {
            entry.signals.push({ type: 'HAND_DEALT', playerId: pid, instanceIds: [...draft.playerZones[pid].hand] });
        }
    });

    return state;
}

function drawTopCard(state: GameState, playerId: PlayerId, targetZone: 'HAND' | 'LIFE'): GameState {
    const topCard = state.playerZones[playerId].deck[0];
    if (!topCard) return state;
    return moveCard(state, topCard, targetZone, 'TOP');
}

function dealHand(state: GameState, playerId: PlayerId, count: number): GameState {
    for (let i = 0; i < count; i++) {
        state = drawTopCard(state, playerId, 'HAND');
    }
    return state;
}

function placeLifeCards(state: GameState, playerId: PlayerId): GameState {
    const leaderId = state.playerZones[playerId].leader[0];
    if (!leaderId) return state;
    const leader = state.instances[leaderId];
    if (!leader || leader.class !== 'LEADER') return state;
    const def = state.definitions[leader.cardId];
    const lifeCount = def?.life ?? 5;
    for (let i = 0; i < lifeCount; i++) {
        state = drawTopCard(state, playerId, 'LIFE');
    }
    return state;
}

export function applyKeepHand(
    state: GameState,
    action: Extract<Action, { type: 'KEEP_HAND' }>,
): GameState {
    return keepHand(state, action.playerId, false);
}

export function applyMulligan(
    state: GameState,
    action: Extract<Action, { type: 'MULLIGAN' }>,
): GameState {
    const { playerId } = action;

    // Return entire hand to deck
    const hand = [...state.playerZones[playerId].hand];
    for (const instanceId of hand) {
        state = moveCard(state, instanceId, 'DECK', 'TOP');
    }

    // Reshuffle using next cursor position
    const deckIds = state.playerZones[playerId].deck;
    const seed = state.seeds.players[playerId];
    const cursor = state.rngCursors.players[playerId];
    const [shuffledIds, newCursor] = shuffle(deckIds, seed, cursor);
    state = produce(state, draft => {
        draft.playerZones[playerId].deck = shuffledIds as CardInstanceId[];
        draft.rngCursors.players[playerId] = newCursor;
    });

    state = dealHand(state, playerId, OPENING_HAND_SIZE);

    // Hand after mulligan is forced kept — route through the same keep path
    return keepHand(state, playerId, true);
}

// Shared keep path: place life cards, record the decision, check if all players are done
function keepHand(state: GameState, playerId: PlayerId, tookMulligan: boolean): GameState {
    state = placeLifeCards(state, playerId);

    state = produce(state, draft => {
        draft.setup.mulligan[playerId] = tookMulligan;
        const entry = draft.actionLog[draft.actionLog.length - 1];
        entry.signals.push(
            tookMulligan
                ? { type: 'MULLIGAN_TAKEN', playerId }
                : { type: 'MULLIGAN_KEPT', playerId },
            { type: 'LIFE_SET_UP', playerId, instanceIds: [...draft.playerZones[playerId].life] },
        );
    });

    return maybeEndSetup(state);
}

// Start the game once every player's hand is settled
function maybeEndSetup(state: GameState): GameState {
    const allDecided = state.turnOrder.every(pid => state.setup.mulligan[pid] !== null);
    if (!allDecided) return state;

    state = produce(state, draft => {
        draft.actionLog[draft.actionLog.length - 1].signals.push(
            { type: 'GAME_STARTED', firstPlayerId: draft.turnOrder[0] },
        );
    });

    return startTurn(state, state.turnOrder[0], 1);
}
