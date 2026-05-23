import type { Nonce, PlayerId, Seed, GameSeeds } from '../types/primitives';

export function generateGameSeeds(playerCount: number, fixedSeed?: Seed): GameSeeds {
    const playerIds = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
    return {
        game: fixedSeed ?? generateSeed(),
        players: Object.fromEntries(
            playerIds.map((id, i) => [id, fixedSeed !== undefined
                ? fixedSeed + BigInt(i + 1)
                : generateSeed()
            ])
        ),
    };
}

export function generateSeed(): Seed {
    const buffer = new BigUint64Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0];
}

// Mixes nonce into seed — attacker who derives seed gets seed XOR nonce
// Without nonce value, effective seed cannot be derived
export function effectiveSeed(seed: Seed, nonce: Nonce): Seed {
    return seed ^ nonce;
}

// Future commit-reveal — call before game starts, send to clients
async function commitNonce(nonce: Nonce): Promise<string> {
    const data = new TextEncoder().encode(nonce.toString());
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Future commit-reveal — call after game ends for client verification
function verifyNonce(nonce: Nonce, commitment: string): Promise<boolean> {
    return commitNonce(nonce).then(hash => hash === commitment);
}