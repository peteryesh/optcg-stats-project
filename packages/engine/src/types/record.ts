import type { Action } from './action';
import type { GameState } from './state';
import type { Seed, GameSeeds, PlayerId, EndReason } from './primitives';
import type { Nonce } from './primitives';



export type SecureGameSeeds = GameSeeds & {
    nonce: Nonce;
    nonceCommitment?: string;
};

export type GameRecord = {
    seeds: GameSeeds;
    actionLog: Action[];
    winner: PlayerId | null;
    endReason: EndReason | null;
    turnCount: number;
};

type ServerGameRecord = Omit<GameRecord, "seeds"> & {
    seeds: SecureGameSeeds;
};