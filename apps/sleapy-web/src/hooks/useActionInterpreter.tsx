import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CardInstanceId, GameAction, PlayerId } from '@optcg/engine';
import { getLegalActions } from '@optcg/engine';
import { useGameStore } from '../stores/gameStore';

// ── Types ─────────────────────────────────────────────────────────────────────

// Per card metadata for user interactivity
export interface CardAffordance {
    clickable: boolean;
    role: 'attacker' | 'defender' | null;
    hoverPrompt: string | null;
}

type InteractionMode =
    | { type: 'idle' }
    | { type: 'attacking'; attackerId: CardInstanceId };

export interface ActionInterpreter {
    mode: InteractionMode;
    activePrompt: string | null;
    getCardAffordance: (instanceId: CardInstanceId) => CardAffordance;
    onCardClick: (instanceId: CardInstanceId) => void;
    cancel: () => void;
    nextPhase: () => void;
    keepHand: () => void;
    mulligan: () => void;
    completeBattle: () => void;
    chooseFirstPlayer: (choice: PlayerId) => void;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_AFFORDANCE: CardAffordance = {
    clickable: false,
    role: null,
    hoverPrompt: null,
};

// ── Lookup precomputation ─────────────────────────────────────────────────────

interface ActionLookups {
    attackers: Set<CardInstanceId>;
    // Per-attacker defenders: only show defenders valid for the selected attacker,
    // since effects can restrict which attackers may target which defenders.
    defendersByAttacker: Map<CardInstanceId, Set<CardInstanceId>>;
    hasNextPhase: boolean;
    hasCompleteBattle: boolean;
    hasKeepHand: boolean;
    hasMulligan: boolean;
    firstPlayerChoices: Set<PlayerId>;
}

function computeLookups(legalActions: GameAction[]): ActionLookups {
    const attackers = new Set<CardInstanceId>();
    const defendersByAttacker = new Map<CardInstanceId, Set<CardInstanceId>>();
    let hasNextPhase = false;
    let hasCompleteBattle = false;
    let hasKeepHand = false;
    let hasMulligan = false;
    const firstPlayerChoices = new Set<PlayerId>();

    for (const action of legalActions) {
        switch (action.type) {
            case 'DECLARE_ATTACK':
                attackers.add(action.attackerId);
                if (!defendersByAttacker.has(action.attackerId))
                    defendersByAttacker.set(action.attackerId, new Set());
                defendersByAttacker.get(action.attackerId)!.add(action.defenderId);
                break;
            case 'NEXT_PHASE':          hasNextPhase = true; break;
            case 'COMPLETE_BATTLE':     hasCompleteBattle = true; break;
            case 'KEEP_HAND':           hasKeepHand = true; break;
            case 'MULLIGAN':            hasMulligan = true; break;
            case 'CHOOSE_FIRST_PLAYER': firstPlayerChoices.add(action.choice); break;
        }
    }

    return { attackers, defendersByAttacker, hasNextPhase, hasCompleteBattle, hasKeepHand, hasMulligan, firstPlayerChoices };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useActionInterpreter(localPlayerId: PlayerId): ActionInterpreter {
    const state = useGameStore((s) => s.state);
    const dispatch = useGameStore((s) => s.dispatch);

    const [mode, setMode] = useState<InteractionMode>({ type: 'idle' });

    const legalActions = useMemo(
        () => (state ? getLegalActions(state, localPlayerId) : []),
        [state, localPlayerId]
    );

    const lookups = useMemo(() => computeLookups(legalActions), [legalActions]);

    // Reset attacking mode if the selected attacker is no longer legal
    useEffect(() => {
        if (mode.type === 'attacking' && !lookups.attackers.has(mode.attackerId))
            setMode({ type: 'idle' });
    }, [lookups]); // eslint-disable-line react-hooks/exhaustive-deps

    const getCardAffordance = useCallback(
        (instanceId: CardInstanceId): CardAffordance => {
            const { attackers, defendersByAttacker } = lookups;

            if (mode.type === 'idle') {
                if (attackers.has(instanceId))
                    return { clickable: true, role: 'attacker', hoverPrompt: 'Declare attack' };
                return DEFAULT_AFFORDANCE;
            }

            if (mode.type === 'attacking') {
                if (instanceId === mode.attackerId)
                    return { clickable: true, role: 'attacker', hoverPrompt: 'Cancel' };
                if (defendersByAttacker.get(mode.attackerId)?.has(instanceId))
                    return { clickable: true, role: 'defender', hoverPrompt: 'Attack this' };
                return DEFAULT_AFFORDANCE;
            }

            return DEFAULT_AFFORDANCE;
        },
        [mode, lookups]
    );

    const onCardClick = useCallback(
        (instanceId: CardInstanceId) => {
            const { attackers, defendersByAttacker } = lookups;

            if (mode.type === 'idle') {
                if (attackers.has(instanceId))
                    setMode({ type: 'attacking', attackerId: instanceId });
                return;
            }

            if (mode.type === 'attacking') {
                if (instanceId === mode.attackerId) {
                    setMode({ type: 'idle' });
                    return;
                }
                if (defendersByAttacker.get(mode.attackerId)?.has(instanceId)) {
                    dispatch({ type: 'DECLARE_ATTACK', playerId: localPlayerId, attackerId: mode.attackerId, defenderId: instanceId });
                    setMode({ type: 'idle' });
                }
            }
        },
        [mode, lookups, dispatch, localPlayerId]
    );

    const cancel         = useCallback(() => setMode({ type: 'idle' }), []);
    const nextPhase      = useCallback(() => { if (lookups.hasNextPhase)      { dispatch({ type: 'NEXT_PHASE',      playerId: localPlayerId }); setMode({ type: 'idle' }); } }, [lookups.hasNextPhase,      dispatch, localPlayerId]);
    const keepHand       = useCallback(() => { if (lookups.hasKeepHand)         dispatch({ type: 'KEEP_HAND',         playerId: localPlayerId });                              }, [lookups.hasKeepHand,       dispatch, localPlayerId]);
    const mulligan       = useCallback(() => { if (lookups.hasMulligan)          dispatch({ type: 'MULLIGAN',          playerId: localPlayerId });                              }, [lookups.hasMulligan,       dispatch, localPlayerId]);
    const completeBattle = useCallback(() => { if (lookups.hasCompleteBattle)  { dispatch({ type: 'COMPLETE_BATTLE', playerId: localPlayerId }); setMode({ type: 'idle' }); } }, [lookups.hasCompleteBattle, dispatch, localPlayerId]);
    const chooseFirstPlayer = useCallback(
        (choice: PlayerId) => { if (lookups.firstPlayerChoices.has(choice)) dispatch({ type: 'CHOOSE_FIRST_PLAYER', deciderId: localPlayerId, choice }); },
        [lookups.firstPlayerChoices, dispatch, localPlayerId]
    );

    const activePrompt = mode.type === 'attacking' ? 'Select a target to attack' : null;

    return { mode, activePrompt, getCardAffordance, onCardClick, cancel, nextPhase, keepHand, mulligan, completeBattle, chooseFirstPlayer };
}

// ── Context + Provider ────────────────────────────────────────────────────────

const ActionInterpreterContext = createContext<ActionInterpreter | null>(null);

export function ActionInterpreterProvider({ localPlayerId, children }: { localPlayerId: PlayerId; children: ReactNode }) {
    const interpreter = useActionInterpreter(localPlayerId);
    return (
        <ActionInterpreterContext.Provider value={interpreter}>
            {children}
        </ActionInterpreterContext.Provider>
    );
}

export function useCardAffordance(instanceId: CardInstanceId): CardAffordance {
    const interpreter = useContext(ActionInterpreterContext);
    return interpreter?.getCardAffordance(instanceId) ?? DEFAULT_AFFORDANCE;
}
