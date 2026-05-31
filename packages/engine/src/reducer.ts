import { produce } from 'immer';
import type { GameState } from './types/state';
import type { GameAction } from './types/action';
import { validate } from './validators';
import { InvalidActionError } from './errors';

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
        case 'CHOOSE_TURN_ORDER':
            
            break;
        case 'KEEP_HAND':
            
            break;
        case 'MULLIGAN':
            
            break;
        case 'END_PHASE':
            
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
