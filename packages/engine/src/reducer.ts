import { produce } from 'immer';
import type { GameState } from './types/state';
import type { Action } from './types/action';
import { validate } from './validators';
import { InvalidActionError } from './errors';
import { applyChooseTurnOrder, applyKeepHand, applyMulligan } from './game/actions/setup';
import { applyEndPhase } from './game/actions/phase';

export { InvalidActionError } from './errors';

export function reducer(state: GameState, action: Action): GameState {
    if (state.winner !== null) {
        throw new InvalidActionError('Game is already finished');
    }

    const error = validate(state, action);
    if (error) throw new InvalidActionError(error);

    state = produce(state, draft => {
        draft.actionLog.push({ action, signals: [] });
    });

    switch (action.type) {
        case 'CHOOSE_TURN_ORDER':
            state =  applyChooseTurnOrder(state, action);
            break;
        case 'KEEP_HAND':
            state =  applyKeepHand(state, action);
            break;
        case 'MULLIGAN':
            state =  applyMulligan(state, action);
            break;
        case 'END_PHASE':
            state =  applyEndPhase(state, action);
            break;
        case 'PLAY_CARD':
        case 'ATTACH_DON':
        case 'ACTIVATE_EFFECT':
        case 'DECLARE_ATTACK':
        case 'DECLARE_BLOCKER':
        case 'PLAY_COUNTER':
        case 'PASS_COUNTER':
        case 'CHOOSE_NEXT_EFFECT':
        case 'CHOOSE_TARGETS':
        case 'CHOOSE_FROM_HAND':
        case 'CHOOSE_FROM_LOOK':
        case 'CONFIRM':
        case 'DECLINE':
            throw new InvalidActionError(`${action.type} is not yet implemented`);
    }
    return state; // add a function that will check for state based actions like deck out
}
