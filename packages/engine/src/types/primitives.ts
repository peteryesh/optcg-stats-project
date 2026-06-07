// CardInstanceId
export type CardInstanceId = string;

// CardId
export type CardId = string;

export type CardClass = 'CHARACTER' | 'DON' | 'EVENT' | 'LEADER' | 'STAGE';
export type Color = 'BLACK' | 'BLUE' | 'GREEN' | 'PURPLE' | 'RED' | 'YELLOW';
export type Attribute = '?' | 'RANGED' | 'SLASH' | 'SPECIAL' | 'STRIKE' | 'WISDOM';

export type PlayerId = string;
export type ListenerId = string;
export type FrameId = string;

export type Zone =
    | 'CHARACTERS'
    | 'DECK'
    | 'DON_ACTIVE'
    | 'DON_DECK'
    | 'DON_RESTED'
    | 'HAND'
    | 'LEADER'
    | 'LIFE'
    | 'LOOK'
    | 'STAGE'
    | 'TRASH';

// Game Phases
export type GamePhase = 'SETUP' | 'START_GAME' | 'START_OF_TURN' | 'REFRESH' | 'DRAW' | 'MAIN' | 'END_OF_TURN' | 'GAME_END';
export type BattlePhase = 'WHEN_ATTACKING' | 'ON_OPPONENT_ATTACK' | 'BLOCKER' | 'COUNTER' | 'BATTLE_RESOLUTION';
// export type TriggerPhase = 'ACTIVATE_TRIGGER' | 'TO_HAND' | 'TO_TRASH' | 'EFFECT';

export type Phase = 
    | GamePhase
    | BattlePhase
    // | TriggerPhase;

export type BattleRecord = {
    attackerId: CardInstanceId;
    defenderId: CardInstanceId;
    counter: number;
}

export type EndReason = 'KNOCKOUT' | 'DECKOUT' | 'CONCEDE' | 'TIMEOUT' | 'DISCONNECT';

export type StackPosition = "TOP" | "BOTTOM"

export type RevealedTo = "BOTH" | "SELF" | "OPPONENT";
export type CompareOp = ">=" | "<=" | "==" | ">" | "<";

export type Keyword =
  | "BLOCKER"
  | "RUSH"
  | "BANISH"
  | "DOUBLE_ATTACK"
  | "LIFE_TRIGGER";      // replaces "TRIGGER"