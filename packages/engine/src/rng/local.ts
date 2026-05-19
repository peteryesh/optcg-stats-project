import type { PlayerId, Seed } from '../types/primitives';
import type { RngSource } from './interface';
import { generateSeed } from './seeds';
import { GameSeeds, LocalGameSeeds } from '../types/record';

export function generateLocalSeeds(playerIds: PlayerId[], seed?: Seed): LocalGameSeeds {
    // Optional fixed seed for training — pass seed to get deterministic games
    // Omit seed for random local play
    const baseSeed = seed ?? generateSeed();
    return {
        game: baseSeed,
        players: Object.fromEntries(playerIds.map((id, i) => [id, baseSeed + BigInt(i + 1)])) as Record<PlayerId, Seed>,
        life: Object.fromEntries(playerIds.map((id, i) => [id, baseSeed + BigInt(i + 3)])) as Record<PlayerId, Seed>,
    };
}

export class LocalRng implements RngSource {
    constructor(private readonly seed: Seed) { }

    next(cursor: bigint): [bigint, number] {
        const value = this.splitmix64(this.seed ^ cursor);
        return [cursor + 1n, value];
    }

    nextInt(cursor: bigint, n: number): [bigint, number] {
        const limit = BigInt(n);
        const max = (0xFFFFFFFFFFFFFFFFn / limit) * limit;
        let r: bigint;

        do {
            let value: number;
            [cursor, value] = this.next(cursor);
            r = BigInt(Math.floor(value * Number(0xFFFFFFFFFFFFFFFFn)));
        } while (r >= max);

        return [cursor, Number(r % limit)];
    }

    shuffle<T>(items: readonly T[], cursor: bigint): [T[], bigint] {
        const arr = items.slice();
        const n = arr.length;

        for (let i = n - 1; i > 0; i--) {
            let j: number;
            [cursor, j] = this.nextInt(cursor, i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        return [arr, cursor];
    }

    private splitmix64(s: bigint): number {
        s = (s + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
        s = ((s ^ (s >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
        s = ((s ^ (s >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
        s = s ^ (s >> 31n);
        return Number(s & 0xFFFFFFFFn) / 0x100000000;
    }
}