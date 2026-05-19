import type { Action } from './action';
import type { GameState } from './state';
import type { Seed, PlayerId } from './primitives';
import type { Nonce } from './primitives';

export type LocalGameRecord = {
    seeds: LocalGameSeeds;        // everything exposed — no secrets
    actionLog: Action[];
    finalState?: GameState;
};

export type LocalGameSeeds = {
    game: Seed;
    players: Record<PlayerId, Seed>;
    life: Record<PlayerId, Seed>;
};


// Sent to clients — safe, no nonce or life seeds
export type PublicGameRecord = {
    seeds: {
        game: Seed;
        players: Record<PlayerId, Seed>;
    };
    actionLog: Action[];
};

// Server-only — full fidelity for replay and training
export type GameRecord = {
    seeds: GameSeeds;              // includes nonce and life seeds
    actionLog: Action[];
    finalState?: GameState;
};

export type GameSeeds = {
    game: Seed;
    players: Record<PlayerId, Seed>;
    life: Record<PlayerId, Seed>;    // never exposed, even in replays
    nonce: Nonce;                    // server secret, never transmitted during play
    nonceCommitment?: string;        // hash(nonce) — for future commit-reveal scheme
};