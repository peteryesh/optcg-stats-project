import type { CardDatabase, CardDefinition } from '@optcg/engine';

const DATABASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
const ALL_CARDS_URL = `${DATABASE_URL}/all/optcg-all-cards.json`;

export async function loadCardDatabase(): Promise<CardDatabase> {
    const response = await fetch(ALL_CARDS_URL);
    if (!response.ok) {
        throw new Error(`Failed to load card database: HTTP ${response.status}`);
    }
    return response.json() as Promise<CardDatabase>;
}