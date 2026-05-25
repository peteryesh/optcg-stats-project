import type { CardInstanceId, PlayerId, Zone, Keyword, StackPosition } from './primitives';
import type { GameSignal, SignalType } from './signal';
import type { CardFilter } from './filter';

export type EffectSequence = {
    sequenceId: string;
    sourceInstanceId: CardInstanceId;
    activatingSignal: GameSignal | null;
    controllerAtQueueTime: PlayerId;
    steps: EffectStep[];
    resolved: Record<string, CardInstanceId | CardInstanceId[] | boolean | number>;
};

export type EffectStep = {
    type: EffectStepType;
    resolution: EffectResolution;
    condition: CardFilter | null;
    effectCost: EffectCost | null;
    target: CardFilter | null;
    effect: EffectOperation | null;
    min: number;
    max: number;
    origin: CardInstanceId;
    from: Zone | null;
    to: Zone | null;
    duration: EffectDuration | null;
};

export type EffectResolution =
    | { kind: "AUTO" }
    | { kind: "PLAYER"; outputKey: string };

export type EffectStepType =
    | "CHOOSE_TARGET"
    | "CHOOSE_FROM_ZONE"
    | "MOVE_CARD"
    | "KO_TARGET"
    | "TRASH_TARGET"
    | "BOUNCE_TARGET"
    | "SEND_TO_DECK"
    | "DRAW_CARDS"
    | "DISCARD_CARDS"
    | "ADD_TO_LOOK"
    | "GAIN_DON"
    | "ATTACH_DON"
    | "RETURN_DON"
    | "ADD_LIFE"
    | "TRASH_LIFE"
    | "APPLY_MODIFIER"
    | "GRANT_KEYWORD"
    | "CONDITION";

export type EffectActivationType =
    | { kind: "ON_PLAY" }
    | { kind: "ON_KO" }
    | { kind: "WHEN_ATTACKING" }
    | { kind: "ON_OPPONENT_ATTACK" }
    | { kind: "LIFE_TRIGGER" }        // the actual OPTCG [Trigger] keyword
    | { kind: "ACTIVATED" }
    | { kind: "CONTINUOUS" };

export type EffectDefinition = {
    effectId: string;
    activation: EffectActivationType;
    condition: CardFilter | null;
    effectCost: EffectCost | null;
    sequence: EffectStep[];
};

export type EffectOperation =
    // Zone movement
    | { kind: "MOVE_CARD"; toZone: Zone; position: StackPosition }

    // Card removal
    | { kind: "KO_TARGET" }
    | { kind: "TRASH_TARGET" }
    | { kind: "BOUNCE_TARGET" }
    | { kind: "SEND_TO_DECK"; position: StackPosition }

    // Draw & hand
    | { kind: "DRAW_CARDS"; count: number }
    | { kind: "DISCARD_CARDS" }

    // DON!!
    | { kind: "GAIN_DON"; count: number }
    | { kind: "ATTACH_DON"; count: number }
    | { kind: "RETURN_DON"; count: number }

    // Modifier layer interactions
    | { kind: "APPLY_CONTINUOUS"; modification: Modification; duration: EffectDuration }
    | { kind: "APPLY_SUPPRESSION"; scope: SuppressionScope; duration: EffectDuration }
    | { kind: "APPLY_REPLACEMENT"; replacedAction: ReplacedActionType; duration: EffectDuration }

    // Life
    | { kind: "ADD_LIFE"; count: number; position: StackPosition }
    | { kind: "TRASH_LIFE"; count: number; position: StackPosition }

    // Look zone
    | { kind: "ADD_TO_LOOK"; count: number; fromZone: Zone }

    // Branching — stubbed until condition system built
    | { kind: "CONDITION" };

type EffectCost =
    | { kind: "REST_THIS" }
    | { kind: "TRASH_DON"; count: number }
    | { kind: "DISCARD"; count: number; filter: CardFilter };

type EffectDuration =
    | { kind: "WHILE_SOURCE_IN_PLAY" }
    | { kind: "END_OF_TURN" }
    | { kind: "END_OF_OPPONENT_TURN" }
    | { kind: "PERMANENT" }
    | { kind: "UNTIL_SIGNAL"; signalType: SignalType };


// Continuous Effects
type PowerModification =
    | { kind: "BASE_POWER_OVERRIDE"; value: number }
    | { kind: "POWER_ADD"; amount: number };

type CostModification =
    | { kind: "BASE_COST_OVERRIDE"; value: number }
    | { kind: "COST_ADD"; amount: number };

type KeywordModification =
    | { kind: "GRANT_KEYWORD"; keyword: Keyword }
    | { kind: "REMOVE_KEYWORD"; keyword: Keyword };

type Modification =
    | PowerModification
    | CostModification
    | KeywordModification;

export type ContinuousEffect = {
    effectId: string;
    sourceInstanceId: CardInstanceId;
    affects: CardFilter;
    modification: Modification;
    duration: EffectDuration;
    appliedAt: number;              // rngCursor position for ordering
    condition: CardFilter | null;   // null = always applies
};

// Replacement Effects
type ReplacedActionType =
    | "KO"
    | "TRASH"
    | "BOUNCE"
    | "DISCARD"
    | "MILL"
    | "SEND_TO_DECK"
    | "LEAVE_FIELD";

export type ReplacementEffect = {
    replacementId: string;
    sourceInstanceId: CardInstanceId;
    targetFilter: CardFilter;
    replacedAction: ReplacedActionType;
    effectCost: EffectCost | null;
    duration: EffectDuration;
    appliedAt: number;
    condition: CardFilter | null;
};

// Effect Suppressions
type SuppressionScope =
    | "ALL_ABILITIES"
    | "ON_PLAY"
    | "ON_KO"
    | "WHEN_ATTACKING"
    | "ACTIVATED";

export type AbilitySuppression = {
    suppressionId: string;
    sourceInstanceId: CardInstanceId;
    targetFilter: CardFilter;
    scope: SuppressionScope;
    duration: EffectDuration;
    appliedAt: number;
};