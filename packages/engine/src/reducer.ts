import type { GameState } from './types/state';
import type { Action } from './types/action';
// import { RngSource } from './rng';
import { validate } from './validators';
// import {} from './apply';

export class InvalidActionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidActionError';
    }
}

export function step(state: GameState, action: Action): GameState {
    return;
}

/**
 * Takes a state and returns an updated state based on the action provided.
 * The core of the OPTCG game engine that directs what action to use.
 * Given a state and an action, the reducer will always return the same updated state.
 */
export function reducer(state: GameState, action: Action): GameState {
    if (state.status.type === 'finished') {
        throw new InvalidActionError('Cannot apply action to a finished game');
    }
    
    const error = validate(state, action);
    if (error) {
        throw new InvalidActionError(error);
    }

    switch (action.type) {
        // case 'START_GAME':
        //     return applyStartGame(state, action);
    }

    return state; // change later to return the new state after applying the action
}

// Keep for reference, delete later