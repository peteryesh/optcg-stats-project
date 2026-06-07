import type { RngSource } from './interface';
import { effectiveSeed, Seed, Nonce } from './seeds';

function next(seed: Seed, cursor: bigint): [bigint, bigint] {
    const value = splitmix64(seed ^ cursor);
    return [cursor + 1n, value];
}

export function nextInt(seed: Seed, cursor: bigint, n: number): [bigint, number] {
    // Rejection sampling — bias free, operates on full 64-bit output
    const limit = BigInt(n);
    const max = (0xFFFFFFFFFFFFFFFFn / limit) * limit;
    let r: bigint;

    do {
        [cursor, r] = next(seed, cursor);
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

function splitmix64(s: bigint): bigint {
    s = (s + 0x9e3779b97f4a7c15n) & 0xFFFFFFFFFFFFFFFFn;
    s = ((s ^ (s >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xFFFFFFFFFFFFFFFFn;
    s = ((s ^ (s >> 27n)) * 0x94d049bb133111ebn) & 0xFFFFFFFFFFFFFFFFn;
    return s ^ (s >> 31n);
}