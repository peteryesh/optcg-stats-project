import type { GameState } from './types/state';
import type { GameAction } from './types/action';
import type { PlayerId } from './types/primitives';
import { validate } from './validators';

export function getLegalActions(state: GameState, playerId: PlayerId): GameAction[] {
    if (state.winner !== null) return [];
    return buildCandidates(state, playerId).filter(action => validate(state, action) === null);
}

function buildCandidates(state: GameState, playerId: PlayerId): GameAction[] {
    const { phase } = state;
    const isActive = state.activePlayerId === playerId;

    if (phase === "SETUP") {
        return state.turnOrder.map(choice => ({
            type: "CHOOSE_FIRST_PLAYER" as const,
            deciderId: playerId,
            choice,
        }));
    }

    if (phase === "START_GAME") {
        return [
            { type: "KEEP_HAND" as const, playerId },
            { type: "MULLIGAN" as const, playerId },
        ];
    }

    const actions: GameAction[] = [];

    // NEXT_PHASE is a candidate in START_OF_TURN, MAIN, BLOCKER, ON_OPPONENT_ATTACK
    actions.push({ type: "NEXT_PHASE", playerId });

    if (phase === "MAIN" && isActive) {
        const zones = state.playerZones[playerId];

        // PLAY_CARD — every hand card is a candidate; validate filters by class and cost
        for (const instanceId of zones.hand) {
            actions.push({ type: "PLAY_CARD", playerId, instanceId });
        }

        // ATTACH_DON — each valid target × each DON count 1..N
        // All active DON are fungible so slicing the first N is equivalent to any subset of size N
        if (zones.donActive.length > 0) {
            const targets = [...zones.characters, ...zones.leader];
            for (const targetId of targets) {
                actions.push({
                    type: "ATTACH_DON",
                    playerId,
                    targetId,
                    count: zones.donActive.length // max available
                });
            }
        }

        // DECLARE_ATTACK — each own attacker × each opponent defender
        const attackers = [...zones.characters, ...zones.leader];
        const opponents = state.turnOrder.filter(id => id !== playerId);
        for (const opponentId of opponents) {
            const oppZones = state.playerZones[opponentId];
            const defenders = [...oppZones.characters, ...oppZones.leader];
            for (const attackerId of attackers) {
                for (const defenderId of defenders) {
                    actions.push({ type: "DECLARE_ATTACK", playerId, attackerId, defenderId });
                }
            }
        }
    }

    // COUNTER phase — defending player may counter or complete battle
    if (phase === "COUNTER" && !isActive) {
        const zones = state.playerZones[playerId];
        for (const counterId of zones.hand) {
            actions.push({ type: "PLAY_COUNTER", playerId, counterId });
        }
        actions.push({ type: "COMPLETE_BATTLE", playerId });
    }

    return actions;
}
