import { describe, it, expect } from 'vitest';
import { createInitialState } from './setup';
import type { CardDatabase, CardDefinition } from './card-database';
import type { CardId } from './state';
import { CardId as makeCardId } from './state';
import { TestRng } from './rng';

function buildTestDatabase(): CardDatabase {
    const db: CardDatabase = {};

    const TEST_SET_ID: string = 'TEST';

    db['TEST-001' as CardId] = {
        id: makeCardId('TEST-001'),
        set_id: 'TEST',
        name: 'Test Leader 1',
        class: 'LEADER',
        rarity: 'T',
        block: 1,
        power: 5000,
        life: 5,
        raw_effect: 'This card is a test card with a test effect',
        colors: [],
        types: [],
        attributes: [],
        alts: [],
        aliases: [],
        restrictions: []
    }
}