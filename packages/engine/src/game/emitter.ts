import { produce } from 'immer';
import type { GameAction, GameSignal, GameState } from '../types';
import { getCardInstance, setGameEnd } from './mechanics';

export function emit(state: GameState, signal: GameSignal): GameState {
    state = produce(state, draft => {
        const lastAction = draft.actionLog.at(-1);
        if (lastAction) lastAction.signals.push(signal);
    });
    if (signal.type === "LETHAL_DAMAGE_TAKEN" && (signal.cause.kind === "BATTLE" || signal.cause.kind === "EFFECT") && state.playerZones[signal.controller].life.length === 0) {
        const causeCard = getCardInstance(state, signal.cause.sourceId);
        if (!causeCard) throw new Error(`No card instance for card cause when resolving lethal damage`);
        return setGameEnd(state, causeCard.controller, "KNOCKOUT");
    }
    return state;
}
