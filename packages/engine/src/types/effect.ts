import type { CardInstanceId, PlayerId, Zone } from './primitives';
import type { GameSignal } from './signal';
import type { CardFilter } from './filter';

export type EffectSequence = {
    sequenceId: string;
    sourceInstanceId: CardInstanceId;
    triggeringSignal: GameSignal | null;
    controllerAtQueueTime: PlayerId;
    steps: EffectStep[];
    resolved: Record<string, CardInstanceId | CardInstanceId[] | boolean | number>;
};

type EffectStep = {
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

type EffectResolution =
  | { kind: "AUTO" }
  | { kind: "PLAYER"; outputKey: string };

type EffectStepType =
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

type EffectActivationType =
  | { kind: "ON_PLAY" }
  | { kind: "ON_KO" }
  | { kind: "WHEN_ATTACKING" }
  | { kind: "ON_OPPONENT_ATTACK" }
  | { kind: "LIFE_TRIGGER" }        // the actual OPTCG [Trigger] keyword
  | { kind: "ACTIVATED" }
  | { kind: "CONTINUOUS" };

type EffectDeclaration = {
  effectId: string;
  activation: EffectActivationType;
  condition: CardFilter | null;
  effectCost: EffectCost | null;
  sequence: EffectStep[];
};

type EffectCost =
  | { kind: "REST_THIS" }
  | { kind: "TRASH_DON"; count: number }
  | { kind: "DISCARD"; count: number; filter: CardFilter };

type EffectOperation = null;    // stubbed
type EffectDuration = null;           // stubbed