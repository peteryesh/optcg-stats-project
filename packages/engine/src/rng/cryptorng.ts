import type { Nonce, Seed } from '../types/primitives';
import type { RngSource } from './interface';
import { effectiveSeed } from './seeds';

export class CryptoRng implements RngSource {
    // Used only for seed generation — not for gameplay shuffles
    // Kept for interface compatibility and testing purposes

    next(cursor: bigint): [bigint, number] {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return [cursor + 1n, buffer[0] / 0x100000000];
    }

    nextInt(cursor: bigint, n: number): [bigint, number] {
        const limit = n;
        const max = Math.floor(0xFFFFFFFF / limit) * limit;
        let r: number;

        do {
            const buffer = new Uint32Array(1);
            crypto.getRandomValues(buffer);
            r = buffer[0];
        } while (r >= max);

        return [cursor + 1n, r % limit];
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
}
