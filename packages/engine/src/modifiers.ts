import type { Phase, BattlePhase, TriggerPhase } from './constants';
import type { CardInstanceId, PlayerId } from './state';

export interface ExpirationTrigger {
    playerId: PlayerId;
    phase: Phase | BattlePhase | TriggerPhase;
    when: 'start' | 'end';
}

// Power
export interface BasePowerOverride {
    value: number;
    expiresAt?: ExpirationTrigger;
    source?: CardInstanceId;
}

export interface PowerModifier {
    amount: number;
    expiresAt: ExpirationTrigger;
    source?: CardInstanceId;
}

// Cost
export interface BaseCostOverride {
    value: number;
    expiresAt?: ExpirationTrigger;
    source?: CardInstanceId;
}

export interface CostModifier {
    value: number;
    expiresAt?: ExpirationTrigger;
    source?: CardInstanceId;
}

// Status Effects
 export type StatusEffectKind =
    | 'cannot-attack'
    | 'will-not-restand'
    | 'rush'
    | 'rush-character'
    | 'blocker'
    | 'banish'
    | 'double-attack'

export interface StatusEffect {
    kind: StatusEffectKind;
    expiresAt?: ExpirationTrigger,
    source?: CardInstanceId
}