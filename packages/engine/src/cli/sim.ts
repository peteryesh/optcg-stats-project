import type { CardId } from '../types/primitives';
import type { CardDef } from '../types/card';
import type { PlayerId, Seed } from '../types/primitives';
import type { GameState } from '../types/state';
import { generateLocalSeeds } from '../rng/local';
import { LocalRng } from '../rng/local';
import { LocalGameRecord } from '../types/record';

function runTrainingGame(
    p1Deck: CardId[],
    p2Deck: CardId[],
    defs: Record<CardId, CardDef>,
    seed?: Seed             // pass seed to reproduce a specific game
): LocalGameRecord {
    const seeds = generateLocalSeeds(["p1", "p2"], seed);
    const rngs = {
        game: new LocalRng(seeds.game),
        players: { p1: new LocalRng(seeds.players.p1), p2: new LocalRng(seeds.players.p2) },
        life: { p1: new LocalRng(seeds.life.p1), p2: new LocalRng(seeds.life.p2) },
    };

    let state = initGame(["p1", "p2"], defs, seeds);

    // Play out with random or AI policy
    while (!state.winner) {
        const actions = legalActions(state);
        const action = randomPick(actions);   // or policy.selectAction(state)
        state = step(state, action, rngs);
    }

    return {
        seeds,
        actionLog: state.actionLog,
        finalState: state,
    };
}

function replayLocal(record: LocalGameRecord, defs: Record<CardId, CardDef>): GameState {
    const rngs = {
        game: new LocalRng(record.seeds.game),
        players: Object.fromEntries(
            Object.entries(record.seeds.players).map(([id, seed]) => [id, new LocalRng(seed)])
        ),
        life: Object.fromEntries(
            Object.entries(record.seeds.life).map(([id, seed]) => [id, new LocalRng(seed)])
        ),
    };

    let state = initGame(Object.keys(record.seeds.players), defs, record.seeds);
    for (const action of record.actionLog) {
        state = step(state, action, rngs);
    }
    return state;
}