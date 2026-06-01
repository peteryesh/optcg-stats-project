import { GameState } from "./types/state";
import { GameAction } from "./types/action";

export function validate(state: GameState, action: GameAction): string | null {
    switch (action.type) {
        case 'CHOOSE_FIRST_PLAYER':
        case 'KEEP_HAND':
        case 'MULLIGAN':
        case 'NEXT_PHASE':
        case 'PLAY_CARD':
        case 'ATTACH_DON':
        case 'ACTIVATE_EFFECT':
        case 'DECLARE_ATTACK':
        case 'DECLARE_BLOCKER':
        case 'PLAY_COUNTER':
        case 'COMPLETE_BATTLE':
    }
    return null;
}
