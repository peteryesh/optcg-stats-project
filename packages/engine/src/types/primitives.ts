// CardInstanceId
export type CardInstanceId = string & { __brand: 'CardInstanceId' };
export const CardInstanceId = (s: string): CardInstanceId => s as CardInstanceId;

// CardId
export type CardId = string & { __brand: 'CardId' };
export const CardId = (s: string): CardId => s as CardId;

export type Seed = bigint;
export type Nonce = bigint;

export type CardClass = 'LEADER' | 'CHARACTER' | 'DON' | 'EVENT' | 'STAGE';
export type Color = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW';
export type Attribute = 'SLASH' | 'STRIKE' | 'RANGED' | 'SPECIAL' | 'WISDOM' | '?';

export type PlayerId = string;
export type ListenerId = string;
export type FrameId = string;

export type Zone =
    | 'DECK'
    | 'HAND'
    | 'LIFE'
    | 'TRASH'
    | 'CHARACTERS'
    | 'STAGE'
    | 'LEADER'
    | 'DON_DECK'
    | 'DON_ACTIVE'
    | 'DON_RESTED'
    | 'LOOK';

// Game Phases
export type Phase = 'SETUP' | 'START_OF_TURN' | 'REFRESH' | 'DRAW' | 'MAIN' | 'END_OF_TURN' | 'GAME_END';
export type BattlePhase = 'WHEN_ATTACKING' | 'ON_OPPONENT_ATTACK' | 'BLOCKER' | 'COUNTER' | 'RESOLUTION' | 'DAMAGE';
export type TriggerPhase = 'ACTIVATE_TRIGGER' | 'TO_HAND' | 'TO_TRASH' | 'EFFECT';

export type EndReason = 'KNOCKOUT' | 'DECKOUT' | 'CONCEDE' | 'TIMEOUT' | 'DISCONNECT';

export type Position = "TOP" | "BOTTOM";
export type RevealedTo = "BOTH" | "SELF" | "OPPONENT";
export type CompareOp = ">=" | "<=" | "==" | ">" | "<";

export type Keyword =
  | "BLOCKER"
  | "RUSH"
  | "BANISH"
  | "DOUBLE_ATTACK"
  | "LIFE_TRIGGER";      // replaces "TRIGGER"