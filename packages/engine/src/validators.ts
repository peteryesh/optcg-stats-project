import { GameState } from "./types/state";
import { GameAction } from "./types/action";

export function validate(state: GameState, action: GameAction): string | null {
    switch (action.type) {
        case 'CHOOSE_TURN_ORDER':
        case 'KEEP_HAND':
        case 'MULLIGAN':
            if (state.phase !== 'SETUP') return `${action.type} is only valid in SETUP phase`;
            break;

        case 'END_PHASE':
        case 'PLAY_CARD':
        case 'ATTACH_DON':
        case 'ACTIVATE_EFFECT':
        case 'DECLARE_ATTACK':
        case 'DECLARE_BLOCKER':
        case 'PLAY_COUNTER':
        case 'PASS_COUNTER':
            if (state.phase === 'SETUP') return `${action.type} is not valid during SETUP phase`;
            break;
    }
    return null;
}
