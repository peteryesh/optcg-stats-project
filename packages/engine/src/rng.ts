export interface RngSource {
    shuffle<T>(items: readonly T[]): T[];
}

export class CryptoRng implements RngSource {
    shuffle<T>(items: readonly T[]): T[] {
        const arr = items.slice();
        const n = arr.length;
        if (n <= 1) return arr;

        // Use a 32-bit unsigned int per swap. Reject values that would bias
        // the modulo to keep the distribution uniform.
        const randomBuffer = new Uint32Array(n);
        crypto.getRandomValues(randomBuffer);

        for (let i = n - 1; i > 0; i--) {
        // Fisher-Yates: pick j in [0, i] uniformly
        const limit = i + 1;
        const max = Math.floor(0xFFFFFFFF / limit) * limit;
        let r = randomBuffer[i];
        // If r is in the biased upper region, draw a fresh value
        while (r >= max) {
            const fresh = new Uint32Array(1);
            crypto.getRandomValues(fresh);
            r = fresh[0];
        }
        const j = r % limit;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        return arr;
    }
}

// export class RecordedRng implements RngSource {
//     private cursor = 0;
//     constructor(private readonly recordedShuffles: readonly (readonly unknown[])[]) {}

//     shuffle<T>(items: readonly T[]): T[] {
//         if (this.cursor >= this.recordedShuffles.length) {
//             throw new Error(
//                 `Replay exhausted: requested shuffle ${this.cursor + 1} but only ${this.recordedShuffles.length} recorded`,
//             );
//         }
//         const recorded = this.recordedShuffles[this.cursor++];
//         if (recorded.length !== items.length) {
//             throw new Error(
//                 `Replay shuffle mismatch at index ${this.cursor - 1}: expected ${items.length} items, recorded ${recorded.length}`,
//             );
//         }

//         return recorded.slice() as T[];
//     }
// }

// ─────────────────────────────────────────────────────────────
// TestRng — for unit tests
// ─────────────────────────────────────────────────────────────

/**
 * Seeded deterministic RNG for tests. Same seed always produces the same
 * shuffle outputs. Uses mulberry32 internally — small, fast, deterministic.
 *
 * Not for production use: not cryptographically secure and the algorithm
 * is fixed, so changing it would break test snapshots. That's fine for
 * tests but bad for live play.
 */
export class TestRng implements RngSource {
  private state: number;

  constructor(seed: number) {
    // Allow any 32-bit seed; coerce to unsigned int.
    this.state = seed >>> 0;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private next(): number {
    // mulberry32 — public domain, statistically good for non-crypto use
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}