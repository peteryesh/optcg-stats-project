import { createInitialState } from "../setup";
import { GameState } from "../state";
import { ActionOfType } from "../actions";
import { CardDatabase } from "../card-database";
import { RngSource } from "../rng";

export function applyStartGame(
    state: GameState,
    action: ActionOfType<'START_GAME'>,
    database: CardDatabase,
    rng: RngSource
): GameState {
    return createInitialState({
        decks: action.decks,
        firstPlayer: action.firstPlayer,
    }, database, rng)
}