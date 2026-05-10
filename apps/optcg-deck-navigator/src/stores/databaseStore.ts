// apps/web/src/stores/databaseStore.ts

import { create } from 'zustand';
import type { CardDatabase } from '@optcg/engine';
import { loadCardDatabase } from '../lib/card-database';

interface DatabaseStore {
  /** The loaded card database, or null if not yet loaded. */
  database: CardDatabase | null;

  /** True while the database fetch is in flight. */
  isLoading: boolean;

  /** Set if the most recent load attempt failed. */
  error: Error | null;

  /**
   * Triggers the database load. Idempotent — calling multiple times while
   * already loaded or in flight is a no-op.
   */
  load: () => Promise<void>;
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
  database: null,
  isLoading: false,
  error: null,

  load: async () => {
    // Skip if already loaded or currently loading
    if (get().database || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const database = await loadCardDatabase();
      set({ database, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
      });
    }
  },
}));

useDatabaseStore.getState().load();