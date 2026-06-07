import type { GameState, GameAction, GameConfig, DeckList, PlayerId, CardId, CardDef, GameSeeds } from '@optcg/engine';
import { reducer, getLegalActions, initGame, InvalidActionError } from '@optcg/engine';
import { create } from 'zustand';

interface GameStore {
    state: GameState | null;

    // Start a new game from config + decklists
    initialize: (params: {
        gameId: string;
        playerIds: PlayerId[];
        defs: Record<CardId, CardDef>;
        decks: Record<PlayerId, DeckList>;
        seeds?: GameSeeds;
    }) => void;

    // Dispatch a validated action. Throws InvalidActionError if the action is illegal.
    dispatch: (action: GameAction) => void;

    // Return legal actions for a player from the current state.
    // Returns [] if the game hasn't started yet.
    getLegalActions: (playerId: PlayerId) => GameAction[];

    // Reset the state (dev only)
    resetState: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    state: null,

    initialize: (params) => {
        const state = initGame(params);
        set({ state });
    },

    dispatch: (action) => {
        const { state } = get();
        if (!state) throw new Error('Game not initialized');
        const newState = reducer(state, action);
        set({ state: newState });
    },

    getLegalActions: (playerId) => {
        const { state } = get();
        if (!state) return [];
        return getLegalActions(state, playerId);
    },

    resetState: () => {
        set({state: null});
    }
}));
