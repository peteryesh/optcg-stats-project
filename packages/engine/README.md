OPTCG VEGA ENGINE

Pending Decisions
- Nullable field that is set when a user is required to make some kind of decision in order to advance the game state that is not a result of their main turn actions
- Used primarily for effects in order to select targets, select simultaneous effect order, and conditional cost requirement for effects to activate
- EffectSteps must carry a property that marks it as a step that requires player input
- State checks for the effect queues and pendingDecision
    - Legal actions are limited to the currently executing effects and are served to the player that must resolve the effect decision
    - Context is provided based on the action chosen by the user and the most recent effect step that caused the decision point

Battle Phases
- Wanted to have the user consider the entire battle, similarly to how they would do it in person
- Current implementations make phase changes binding, which is procedural and correct, but is frustrating when a defender is considering an entire battle
- Moving phases between the attacker's effects and battle resolution should be considered a fluid "defense phase" with binding commit points should the defender select them
- Commit Points between "ON_OPPONENT_ATTACK", "BLOCKER", "COUNTER", and "BATTLE_RESOLUTION" phases
    - If a commit point has not been reached, user can fluidly move back and forth between phases as they consider their turn
    - ON_OPPONENT_ATTACK: Can be returned to if no commit action has been performed
    - BLOCKER: Declaring any blocker immediately moves to the COUNTER phase and prevents any movement between phases
    - COUNTER: Playing any counter card or event prevents return to BLOCKER or ON_OPPONENT_ATTACK
    - BATTLE_RESOLUTION: Entering is committal resolves attack and moves back to the attacker's main phase
- Think about how things are in person
    - In person, you can plan to skip an "on opponent's attack", think no blocker and no counter, then change your mind and and go back as long as no action was committed
    - Only when you actually declare a blocker or play counter are you prevented from going back and activating effects
    - Technically, declaring no blocker is binding, but in person, people don't declare this and begin countering right away if they do not want to block or use effects
    - However, players declaring "no effect" is quite common, and is binding
        - Online equivalent would be to click the character's effect and choose "no effect"
        - When there are no more effects to consider, automatically go to the BLOCKER phase
        - Player can then move back and forth between BLOCKER and COUNTER until they decide to make an action
    - In an online setting, forcing a phase change commit is equivalent to just thinking "no blocker" in person and having it be a binding action
- Actions are binding, not clicks through phases

Terminology
Cards
- Describes Leader, Character, Stage, and Event cards
    - Even though the OPTCG rules classify all cards in game (including DON!!) as "cards",
    the engine simplifies this to mean "playable cards"

Game Engine Structure
- State reducer pattern
    - All functions affecting the state must be pure functions
    - No asynchronous behavior is allowed to affect the engine during game runtime
- mechanics.ts: Direct state manipulation functions that perform operations that are unbiased and do not take into consideration the player intent behind the action. Used internally by other functions and never directly during a game's runtime.
- operations: Functions that define specific functionality for the actions and game runtime, emitting signals after every state change. Used by actions.
- actions: The entry point for interacting with the engine. Executes a series of operations that take place as a result of player input and interprets how to represent that input to progress the game state. Legal actions are served to the user based on the current state, allowing the user to select a new action and progress the game state further. Actions log the player choice and the series of signals that result from the action for replay purposes.
- emitter: Houses the emit function, which takes a state and signal and checks the appropriate parts of the state to serve the signal to.

Effects
- OPTCG official rules has 4 categories of effects: auto, activate, permanent, and replacement.
- The engine defines effects differently and categorizes them into these categories:
    - ActiveEffect
        - Similar to "activate" in the official rules
        - "Activate: Main", "Main", "Counter"
        - Anything that activates its effect as a result of player choice
    - ReactiveEffect
        - Encompasses "permanent" and "auto" effects
        - Effects that activate as a result of a signal and not direct player choice
        - When in play, these effects are added as listeners on the state and activate when one or more specific signals are emitted
    - StatusEffect
        - Effects that apply some sort of status to cards in play or in hand
        - Applies to power/cost modifiers as well as status conditions like freeze, no rest, etc.
        - Always comes with an expiration flag that listens to signals for cleanup
    - ReplacementEffect
        - Functions the same as in the official rules
        - Listens to ReplacementHooks (name tbd) that take place before game events take place

Signals and Hooks
- GameSignals are always emitted after some state change and are named using past tense terms
    - Describes something that has already happened
    - Stored in the action log under the most recent action that cause the signal to fire
    - Signals are batched when possible to avoid the emit function having to check the entire effect queue on multiple signals firing for multiple consecutive actions
- ReplacementHooks are injected before state changes occur, and are emitted on an as-needed basis
    - Made to intercept normal game actions and replace the result with some other behavior
    - Not logged on the state, the replacement takes place and is logged using the actions and signals that result from the new result of the replacement

Game State
- Zones
    - DON!!
        - Split into 3 zones: don deck, don rested, don active
        - Resting for all other cards are done explicitly on the card instance
        - Don are rested and set active based on their location, as well as on the card instance
        - isRested is tracked on DON but is entirely unused

Game Flow
- Triggers take place before effects
- Triggers only activate after life card is taken to hand as a result of life damage
- Trigger cards are placed in the trash immediately after being activated
- Event cards are placed in the trash immediately after being activated
- Event cards require player decision to actually activate the effect, even though it is implied that paying the cost and playing the card makes it so the user does want to activate the effect
    - i.e. players have the ability to pay the cost but do not have to activate the effect afterward
    - Not always true, see PEnel
- Characters with "Activate: Main" abilities similarly may pay the cost but not activate the effect
- Active player resolves effects before any other player can resolve effects, then the resolution goes in turn order
- Simultaneous effects require player action to resolve the order in which the effects take place

Life and Damage
- Damage is done as a result of either an effect or by combat with a leader, after which the game state is checked to see if the player that dealt the damage knocked out the opponent
- The signal DAMAGE_DEALT is separated from the signal LIFE_DAMAGED for this reason, as "dealing damage" will result in a knockout check while "damage taken to life cards" will not
    - This is relevant for [Double Attack], which officially states "This card deals 2 damage"
    - Base text is confusing and should read "this card deals 2 damage to the user's life cards"
    - Life is still required to be marked as damaged on two separate instances for triggers to activate while still being distinct from life being taken without damage, which bypasses triggers