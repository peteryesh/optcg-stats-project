import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { Action } from '../../types/action';
import type { PlayerId } from '../../types/primitives';
import type { CharacterInstance, LeaderInstance, StageInstance, EventInstance } from '../../types/card';
import { InvalidActionError } from '../../errors';
import { moveCard } from '../mechanics/zones';

type FlowAction = Extract<Action, { type: 'END_PHASE' }>;

export function applyEndPhase(state: GameState, action: FlowAction): GameState {
    if (action.playerId !== state.activePlayerId) {
        throw new InvalidActionError('Only the active player can end the phase');
    }
    switch (state.phase) {
        case 'MAIN':
            return endMainPhase(state);
        default:
            throw new InvalidActionError(`Cannot END_PHASE from ${state.phase}`);
    }
}

function endMainPhase(state: GameState): GameState {
    state = produce(state, draft => { draft.phase = 'END_OF_TURN'; });
    const nextPlayer = getNextPlayer(state);
    return startTurn(state, nextPlayer, state.turnNumber + 1);
}

export function startTurn(state: GameState, playerId: PlayerId, turnNumber: number): GameState {
    state = produce(state, draft => {
        draft.activePlayerId = playerId;
        draft.turnNumber = turnNumber;
        draft.cardsPlayedThisTurn = [];
        draft.battlesThisTurn = [];
        draft.battlePhase = null;
        draft.phase = 'REFRESH';
    });

    state = applyRefresh(state, playerId);

    state = produce(state, draft => { draft.phase = 'DRAW'; });
    state = applyDraw(state, playerId, turnNumber);

    return produce(state, draft => { draft.phase = 'MAIN'; });
}

function applyRefresh(state: GameState, playerId: PlayerId): GameState {
    state = produce(state, draft => {
        const leaderId = draft.playerZones[playerId].leader[0];
        if (leaderId) {
            const leader = draft.instances[leaderId];
            if (leader && leader.class === 'LEADER') {
                leader.isRested = false;
                leader.effectsUsedThisTurn = {};
            }
        }
        for (const charId of draft.playerZones[playerId].characters) {
            const char = draft.instances[charId];
            if (!char || char.class === 'DON') continue;
            (char as CharacterInstance | LeaderInstance | StageInstance | EventInstance).isRested = false;
            (char as CharacterInstance).effectsUsedThisTurn = {};
        }
    });

    const restedDon = [...state.playerZones[playerId].donRested];
    for (const donId of restedDon) {
        state = moveCard(state, donId, 'DON_ACTIVE', 'TOP');
    }

    return state;
}

function applyDraw(state: GameState, playerId: PlayerId, turnNumber: number): GameState {
    // First player's very first turn draws 1 DON!!, all other turns draw 2
    const isFirstTurn = turnNumber === 1 && playerId === state.turnOrder[0];
    const donToDraw = isFirstTurn ? 1 : 2;

    for (let i = 0; i < donToDraw; i++) {
        const donDeck = state.playerZones[playerId].donDeck;
        if (donDeck.length === 0) break;
        state = moveCard(state, donDeck[0], 'DON_ACTIVE', 'TOP');
    }

    const topCard = state.playerZones[playerId].deck[0];
    if (topCard) state = moveCard(state, topCard, 'HAND', 'TOP');

    return state;
}

function getNextPlayer(state: GameState): PlayerId {
    const idx = state.turnOrder.indexOf(state.activePlayerId);
    return state.turnOrder[(idx + 1) % state.turnOrder.length];
}
