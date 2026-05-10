// apps/web/src/stores/deckStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CardId } from '@optcg/engine';

export interface Deck {
  id: string;
  name: string;
  leaderCardId: CardId | null;
  cardIds: CardId[];
  createdAt: number;
  updatedAt: number;
}

interface DeckStore {
  decks: Record<string, Deck>;
  saveDeck: (deck: Omit<Deck, 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  deleteDeck: (id: string) => void;
  getDeck: (id: string) => Deck | null;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: {},

      /**
       * Save a deck. If id is provided and exists, updates that deck.
       * Otherwise creates a new deck with a fresh id.
       * Returns the deck's id.
       */
      saveDeck: (input) => {
        const id = input.id && input.id !== "" ? input.id : generateId();
        const now = Date.now();
        const existing = get().decks[id];

        const deck: Deck = {
          id,
          name: input.name,
          leaderCardId: input.leaderCardId,
          cardIds: input.cardIds,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        set((state) => ({
          decks: { ...state.decks, [id]: deck },
        }));

        return id;
      },

      deleteDeck: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.decks;
          return { decks: rest };
        });
      },

      getDeck: (id) => get().decks[id] ?? null,
    }),
    {
      name: 'optcg-decks',
      version: 1,
    }
  )
);

function generateId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}