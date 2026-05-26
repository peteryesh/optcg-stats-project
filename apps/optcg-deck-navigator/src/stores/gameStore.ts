import type { GameState, Action, SetupState } from '@optcg/engine';
import type { CardInstanceId, CardId, CardDatabase } from '@optcg/engine';
import { create } from 'zustand';

const BASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
const ALL_CARDS_URL = `${BASE_URL}/all/optcg-all-cards.json`;

interface GameStore {
    state: GameState | null;
    database: CardDatabase | null;
    history: Action[];
    dispatch: (action: Action) => void;
}

async function loadCardDatabase(): Promise<CardDatabase> {
    const res = await fetch(ALL_CARDS_URL);
    const cardData = await res.json();
    return cardData as CardDatabase;
}

export const useGameStore = create<GameStore>((set, get) => ({
    state: null,
    database: null,
    history: [],
    initialize: async (input) => {
        const database = await loadCardDatabase();
        // const state = createInitialState(input, database, rng);
        // set({state, database});
    },
    dispatch: (action) => {
        const { state, database } = get();
        if (!state || !database) {
            throw new Error ('Store not initialized');
        }
        // const newState = reducer(state, action);
        // set({state: newState});
    }
}))