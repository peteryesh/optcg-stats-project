import { produce } from 'immer';
import type { Action, GameSignal, GameState } from '../types';

export function emit(state: GameState, signal: GameSignal): GameState {
    return produce(state, draft => {
        const lastAction = draft.actionLog.at(-1);
        if (lastAction) lastAction.signals.push(signal);
    });
}