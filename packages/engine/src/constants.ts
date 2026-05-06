// Card Components
export type CardKind = 'LEADER' | 'CHARACTER' | 'DON' | 'EVENT' | 'STAGE'; // class of the card, using "kind" to avoid reserved keywords

export type Color = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Black' | 'Yellow';

export type Attribute = 'Slash' | 'Strike' | 'Ranged' | 'Special' | 'Wisdom' | '?';

// Game Phases
export type Phase = 'game-start' | 'start-of-turn' | 'refresh' | 'draw' | 'main' | 'end-of-turn' | 'game-end';

export type BattlePhase = 'when-attacking' | 'on-opponent-attack' | 'blocker' | 'counter' | 'resolution' | 'damage';

export type TriggerPhase = 'activate-trigger' | 'to-hand' | 'to-trash' | 'effect'

// Game Board
export type ZoneName =
  | 'deck' | 'hand' | 'life' | 'characters' | 'stage' | 'leader' | 'trash'
  | 'donDeck' | 'donAreaActive' | 'donAreaRested';