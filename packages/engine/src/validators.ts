import { GameState } from "./types/state";
import { Action } from "./types/action";

export function validate(state: GameState, action: Action): string | null {
    return null;
}

// add custom validators for action types here if the check can be done by a pure read of the state