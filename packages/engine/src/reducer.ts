import { produce } from 'immer';
import type { GameState } from './types/state';
import type { GameAction } from './types/action';
import { validate } from './validators';
import { InvalidActionError } from './errors';
import { 
    applyActivateEffect,
    applyPlayCard,
    applyAttachDon,
    applyDeclareAttack,
    applyDeclareBlocker,
    applyPlayCounter,
    applyCompleteBattle,
    applyNextPhase 
} from './game/actions/main';
import { promoteChosenEffect } from './game/effects';
import { applyChooseFirstPlayer, applyKeepHand, applyMulligan } from './game/actions/start';

export { InvalidActionError } from './errors';

export function reducer(state: GameState, action: GameAction): GameState {
    if (state.winner !== null) {
        throw new InvalidActionError('Game is already finished');
    }

    const error = validate(state, action);
    if (error) throw new InvalidActionError(error);

    state = produce(state, draft => {
        draft.actionLog.push({ action, signals: [] });
    });

    switch (action.type) {
        case 'CHOOSE_FIRST_PLAYER':
            return applyChooseFirstPlayer(state, action);
        case 'KEEP_HAND':
            return applyKeepHand(state, action);
        case 'MULLIGAN':
            return applyMulligan(state, action);
        case 'PLAY_CARD':
            return applyPlayCard(state, action);
        case 'ATTACH_DON':
            return applyAttachDon(state, action);
        case 'DECLARE_ATTACK':
            return applyDeclareAttack(state, action);
        case 'DECLARE_BLOCKER':
            return applyDeclareBlocker(state, action);
        case 'PLAY_COUNTER':
            return applyPlayCounter(state, action);
        case 'COMPLETE_BATTLE':
            return applyCompleteBattle(state, action);
        case 'ACTIVATE_EFFECT':
            return applyActivateEffect(state, action);
        case 'NEXT_PHASE':
            return applyNextPhase(state, action);
        case 'CHOOSE_NEXT_EFFECT':
            return promoteChosenEffect(state, action.playerId, action.frameId);
        case 'CHOOSE_TARGETS':
        case 'CHOOSE_FROM_HAND':
        case 'CHOOSE_FROM_LOOK':
        case 'CONFIRM':
        case 'DECLINE':
            throw new InvalidActionError(`${action.type} is not yet implemented`);
    }
    return state; // add a function that will check for state based actions like deck out
}
