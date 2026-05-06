import { reducer, createInitialState, CryptoRng, type GameState, type Action, type SetupInput } from '@optcg/engine';
import type { CardInstanceId, CardId, CardDatabase } from '@optcg/engine';
import { create } from 'zustand';

const BASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
const ALL_CARDS_URL = `${BASE_URL}/all/optcg-all-cards.json`;

interface GameStore {
    state: GameState | null;
    database: CardDatabase | null;
    history: Action[];
    initialize: (input: SetupInput) => void;
    dispatch: (action: Action) => void;
}

const defaultSetupInput = {
    decks: {
        'p1': {
            leaderCardId: "ST21-001" as CardId,
            deckCardIds: [
                "OP01-016",
                "ST21-003",
                "ST21-010",
                "ST21-008",
                "ST21-014"
            ] as CardId[]
        },
        'p2': {
            leaderCardId: "ST21-001" as CardId,
            deckCardIds: [
                "OP01-016",
                "ST21-003",
                "ST21-010",
                "ST21-008",
                "ST21-014"
            ] as CardId[]
        }
    },
    firstPlayer: 'p1'
} as SetupInput;

async function loadCardDatabase(): Promise<CardDatabase> {
    const res = await fetch(ALL_CARDS_URL);
    const cardData = await res.json();
    return cardData as CardDatabase;
}

const rng = new CryptoRng();

export const useGameStore = create<GameStore>((set, get) => ({
    state: null,
    database: null,
    history: [],
    initialize: async (input) => {
        const database = await loadCardDatabase();
        const state = createInitialState(input, database, rng)
    },
    dispatch: (action) => {
        const { state, database } = get();
        if (!state || !database) {
            throw new Error ('Store not initialized');
        }
        const newState = reducer(state, action);
        set({state: newState});
    }
}))