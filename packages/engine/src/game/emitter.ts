import { produce } from 'immer';
import type { GameAction, GameSignal, GameState } from '../types';

export function emit(state: GameState, signal: GameSignal): GameState {
    return produce(state, draft => {
        const lastAction = draft.actionLog.at(-1);
        if (lastAction) lastAction.signals.push(signal);
    });
}

// Where signal grouping functions would go, but may not be needed if the signals are general enough and emitted at the right times
// Would want to watch multiple signals for things like "if any card is played" but not sure yet