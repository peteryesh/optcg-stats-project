export interface RngSource {
    // Returns updated cursor and value in [0, 1)
    next(cursor: bigint): [bigint, number];

    // Returns updated cursor and integer in [0, n)
    nextInt(cursor: bigint, n: number): [bigint, number];

    // Returns updated cursor and shuffled array
    shuffle<T>(items: readonly T[], cursor: bigint): [T[], bigint];
}