import type { Nonce, Seed } from '../types/primitives';
import type { RngSource } from './interface';
import { effectiveSeed } from './seeds';


function next(seed: Seed, cursor: bigint): [bigint, number] {
    const value = splitmix64(seed ^ cursor);
    return [cursor + 1n, value];
}

export function nextInt(seed: Seed, cursor: bigint, n: number): [bigint, number] {
    // Rejection sampling — bias free
    const limit = BigInt(n);
    const max = (0xFFFFFFFFFFFFFFFFn / limit) * limit;
    let r: bigint;

    do {
        let value: number;
        [cursor, value] = next(seed, cursor);
        r = BigInt(Math.floor(value * Number(0xFFFFFFFFFFFFFFFFn)));
    } while (r >= max);

    return [cursor, Number(r % limit)];
}

export function shuffle<T>(items: readonly T[], seed: Seed, cursor: bigint): [T[], bigint] {
    const arr = items.slice();
    const n = arr.length;

    for (let i = n - 1; i > 0; i--) {
        let j: number;
        [cursor, j] = nextInt(seed, cursor, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return [arr, cursor];
}

function splitmix64(s: bigint): number {
    s = (s + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
    s = ((s ^ (s >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
    s = ((s ^ (s >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
    s = s ^ (s >> 31n);
    return Number(s & 0xFFFFFFFFn) / 0x100000000;
}