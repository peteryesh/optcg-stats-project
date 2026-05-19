import type { RngSource } from './interface';

export class TestRng implements RngSource {
    private index = 0;

    constructor(private readonly values: number[]) { }

    next(cursor: bigint): [bigint, number] {
        if (this.index >= this.values.length) {
            throw new Error(`TestRng exhausted after ${this.values.length} calls`);
        }
        return [cursor + 1n, this.values[this.index++]];
    }

    nextInt(cursor: bigint, n: number): [bigint, number] {
        const [newCursor, value] = this.next(cursor);
        return [newCursor, Math.floor(value * n)];
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