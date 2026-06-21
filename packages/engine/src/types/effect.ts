import type { CardInstanceId, PlayerId, Zone, Keyword, StackPosition, CardId } from './primitives';
import type { GameSignal, SignalType } from './signal';
import type { CardFilter } from './filter';

export type EffectId = string;

// Effect as it is stored on the database
// Effect is stored on the definition as Record<EffectId, EffectDef>
export type EffectDef = {
    activatingSignals: SignalType[];
    condition?: BoardCondition;
    cost?: EffectCost;
    activeZone: Zone;
    oncePerTurn: boolean;
    optional: boolean;
    steps: (EffectStep | ConditionStep)[];
}

export type Effect = {
    playerId: PlayerId;
    effectId: EffectId;
    instanceId: CardInstanceId;
    condition?: BoardCondition;
    cost?: EffectCost;
    optional: boolean;
    steps: (EffectStep | ConditionStep)[];
}

export type StatusEffectDef = {
    effectId: EffectId;
    type: StatusEffectType;
    modification: Modification;
    expiration: EffectDuration | null;
    affects?: CardFilter;
}

export type EffectFrame = Record<PlayerId, EffectRef[]>;

export type EffectRef = {
    cardId: CardId; // Reference to the card id to get the effect from
    effectId: EffectId; // Effect id to get from the card
    instanceId: CardInstanceId; // instance that activated the effect
}

interface EffectStep {
    condition?: BoardCondition;
    effectOp: EffectOperation;
    resolution: EffectResolution;
}

// Think about what "play" means when the operation inevitably is called by the effect
// Do we need a play op? Or can we just derive it from the context of a character moving to the character zone?
type EffectOperation =
| { op: "MOVE"; from: Zone; to: Zone; fromPos?: StackPosition; toPos?: StackPosition, revealed?: boolean }
| { op: "ORIENT"; to: "RESTED" | "ACTIVE" | "FACEUP" | "FACEDOWN" }
| { op: "MODIFY"; mod: Modification; duration: EffectDuration }
| { op: "REORDER" }

// Auto may also require a target/card filter
type EffectResolution =
    | { mode: "SELECT"; min: number; max: number; zones: Zone[]; chooser: PlayerId; filter?: CardFilter; }
    | { mode: "AUTO", count?: number }
    | { mode: "REORDER", chooser: PlayerId }

export type ConditionStep = {
    condition?: BoardCondition;
    filter?: CardFilter;
    cost?: EffectCost;
    effect: (EffectStep | ConditionStep)[];
}

// Add effect costs as we go
export type EffectCost =
    | { kind: "REST" }
    | { kind: "TRASH" }

export type EffectDuration =
    | { expiration: "END_OF_BATTLE" }
    | { expiration: "END_OF_REFRESH" }
    | { expiration: "END_OF_MAIN" }
    | { expiration: "END_OF_TURN" }
    | { expiration: "START_OF_NEXT_TURN" }
    | { expiration: "END_OF_NEXT_TURN" }
    | { expiration: "END_OF_OPP_NEXT_MAIN" }
    | { expiration: "END_OF_OPP_NEXT_TURN" }

export type Modification =
    | { type: "KEYWORD"; keyword: Keyword }
    | { type: "POWER"; amount: number }
    | { type: "BASE_POWER"; value: number }
    | { type: "COST"; amount: number }
    | { type: "BASE_COST"; value: number }
    | { type: "BASE_COUNTER"; value: number }
    // add statuses here (cannot attack, cannot rest, cannot block, can attack active, etc.)

export type StatusEffectType =
    | { type: "INNATE" } // Keywords
    | { type: "PROJECTION" } // Sits on card definition, affects all other cards
    | { type: "MARK" } // Lives in state, has an expiration and is resistant to suppression

// Add board conditions as they come up
export type BoardCondition =
    | { }