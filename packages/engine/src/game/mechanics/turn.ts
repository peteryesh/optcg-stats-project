import { produce } from 'immer';
import { GameState } from '../../types/state';
import { Phase } from '../../types';
import { getCardInstance } from './helpers';

export function setNextActivePlayer(state: GameState): GameState {
    if (state.phase === "START_GAME") {
        // In the case of starting the game, we want to set the active player to the first player in the turn order, but not emit a signal about it since it's just setting up initial state
        return produce(state, draft => {
            draft.activePlayerId = draft.turnOrder[0];
        });
    }
    const currentPlayerId = state.activePlayerId;
    const currentIndex = state.turnOrder.indexOf(currentPlayerId);
    if (currentIndex === -1) {
        throw new Error(`Current active player ${currentPlayerId} not found in turn order`);
    }
    const nextIndex = (currentIndex + 1) % state.turnOrder.length;
    const nextActivePlayerId = state.turnOrder[nextIndex];
    return produce(state, draft => {
        draft.activePlayerId = nextActivePlayerId;
    });
}

export function incrementTurn(state: GameState): GameState {
    return produce(state, draft => {
        draft.turn += 1;
    });
}

export function resetBattleStateForTurn(state: GameState): GameState {
    return produce(state, draft => {
        draft.battlesThisTurn = [];
        draft.currentBattle = null;
    });
}

export function resetCardsPlayedThisTurn(state: GameState): GameState {
    return produce(state, draft => {
        draft.cardsPlayedThisTurn = [];
    });
}

export function resetEffectsUsedThisTurn(state: GameState): GameState {
    return produce(state, draft => {
        for (const instanceId in draft.instances) {
            const instance = getCardInstance(draft, instanceId);
            if (instance.class !== "DON" && instance.effectsUsedThisTurn) {
                instance.effectsUsedThisTurn = {};
            }
        }
    });
}

// Phase Management

export function setPhase(state: GameState, phase: Phase): GameState {
    return produce(state, draft => { draft.phase = phase; });
}

export function changeActivePlayer(state: GameState): GameState {
    const currentPlayerIndex = state.turnOrder.indexOf(state.activePlayerId);
    if (currentPlayerIndex === -1) {
        throw new Error(`Active player ${state.activePlayerId} not found in turn order`);
    }
    const nextPlayerIndex = (currentPlayerIndex + 1) % state.turnOrder.length;
    return produce(state, draft => { draft.activePlayerId = state.turnOrder[nextPlayerIndex]; });
}