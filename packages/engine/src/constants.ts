export type CardKind = 'leader' | 'character' | 'don' | 'event' | 'stage'; // class of the card, using "kind" to avoid reserved keywords

export type Color = 'red' | 'green' | 'blue' | 'purple' | 'black' | 'yellow';

export type Phase = 'gameStart' | 'start-of-turn' | 'refresh' | 'draw' | 'main' | 'end-of-turn' | 'gameEnd';

export type BattlePhase = 'when-attacking' | 'on-opponent-attack' | 'blocker' | 'counter' | 'resolution' | 'damage';

export type TriggerPhase = 'activate-trigger' | 'to-hand' | 'to-trash' | 'effect'

export type ZoneName =
  | 'deck' | 'hand' | 'life' | 'characters' | 'stage' | 'leader' | 'trash'
  | 'donDeck' | 'donAreaActive' | 'donAreaRested';