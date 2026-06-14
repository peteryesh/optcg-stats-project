OPTCG VEGA ENGINE

Player Action -> Validate Action -> Reducer -> Apply -> Operations -> Emit -> Add Listeners -> Clear decisionPoint -> Advance/Step -> Set decisionPoint -> Generate Actions (based on decision type) -> Validate Actions -> Legal Actions -> Player Action

Advance/Step

Validation
- responsible for building the set of possible mechanical actions
- reads game state to validate which possible mechanical actions are allowed at that moment
- serves filtered list to client
- never mutates state
- never emits signals
- The decisionPoint's type on the state routes the correct actions to be generated
- getLegalActions builds the candidate list of actions
- validate checks the action type and allows the action to pass it to the legal actions if valid
- validate is called again in reducer when the player actually submits an action (throws on error)

Actions (no read/write)
- directly interacts with the reducer
- can call operations
- client interactions
- direct player decision
- never mutates state or emits signals
Operations (read-only)
- can call operations, internal operations, mechanics
- core game rules and engine workflows, describes the purpose of state changes
- calls mechanics to change state, never mutates state directly
- must emit a signal describing the resulting state change (either directly or  indirectly through another operation)
- multiple emits are allowed in an operation if there are transient state changes (each state change requires an emit)
Domain Operations (read-only)
- can call mechanics
- abstracted wrappers for mechanics, never mutates state directly
- should be reusable across multiple operations
- domain operations should not call other domain operations
- only meant to be called by the operations layer
- must call emit directly describing the resulting state change
Emit
- sole handler for signals
- responsible for iterating through all listeners and enqueueing effects that are activated by the signal
- never executes operations or resolves effects inline
Mechanics (read/write)
- can call mechanics
- functions that define how state changes
- primitive functions that mutate state directly
- should contain no contextual or intentional game logic
- should enforce structural state validity and state invariants by throwing an error (e.g. no leaders in the leader zone)
- should never call emit

Signal Contract
- Signals are transient and only exist during emit resolution
- Gameplay operations and logic must not use signals outside of emit resolution
- All levels of the engine should not read the action/signal log at any point, only write at emit
- Signals are logged in the action that caused the signal to be emitted
- Any state mutation performed outside of emit resolution must be followed by an emit
- Mechanics may not emit
- Internal Operations must emit by calling emit directly (not from another operation)
- Operations must guarantee that any state mutation they initiate results in at least one emit before returning
- Signal granularity should track the game's vocabulary, aka what the cards in the game actually react to

State Contract
- The game state should be fully derivable from the current state and action log on the state
- Signals are transient and must not be required to interpret the current game state after emit resolution completes.

Question: should a click be a declaration?
- This is the main UI/UX question

Actions
- Actions are required to resolve effects that appear in the effect queue while it holds the context
- Action should peek at next step before popping it off the queue and consuming it
- If an effect step does not require a pending decision, it is auto-resolved and logged via signal
- If an effect step is marked as requiring a player decision, action should set pendingDecision and return the state at that point and it is the responsibility of the legal actions system to serve the user actions only related to the player's choice
- The action that is made next should only be one that resolves the currently executing effect and should set pendingDecision to null. This action is then given the task of consuming and executing the effect queue
- The effect context will be kept by the currently executing effect sequence because the effect step at the front of the queue is what caused the pending player decision

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
    - ReplacementEffect
        - Functions the same as in the official rules
        - Listens to ReplacementHooks (name tbd) that take place before game events take place
    - StatusEffect
        - Effects that apply some sort of status to cards in play or in hand
        - Applies to power/cost modifiers as well as status conditions like freeze, no rest, etc.
        - Always comes with an expiration flag that listens to signals for cleanup
- Active, Reactive, and Replacement effects all fall under the same signal/enqueue architecture
- Status effects have their own system, used primarily by the derived state
    
Starting from when a card ability activates:

Effect system
1. Staging — When an operation emits a signal, the emitter checks listeners and adds matching EffectSequence objects to the triggering player's pendingEffects[playerId] array.

2. processEffects — Called after any operation returns. If currentEffect is already running, it does nothing. Otherwise it checks each player's staging zone in order (active player first):

0 effects: skip to next player
1 effect: auto-promote — call promoteEffect then advanceCurrentEffect
2+ effects: set NEXT_EFFECT pendingDecision and return — player must choose the order
3. promoteChosenEffect — Called when the player resolves a NEXT_EFFECT decision. Moves the chosen sequence from pendingEffects into currentEffect, then calls advanceCurrentEffect.

4. advanceCurrentEffect — The execution loop. Walks currentEffect.steps from the front:

- ConditionStep: evaluates check against state. If true, splices onTrue steps into the front of the queue. If false, discards them. Either way, the condition step is consumed and the loop continues.
- StandardStep AUTO: calls executeStep, removes the step, continues the loop.
- StandardStep PLAYER: calls pendingDecisionForStep to build the right PendingDecision shape, sets it on state, and returns — execution pauses here.
5. Step resolution — The player submits an action (CHOOSE_TARGETS, CHOOSE_FROM_HAND, etc.). That action handler records the choice in currentEffect.resolved[outputKey], then calls advanceCurrentEffect again to continue from where it paused.

6. Sequence complete — When steps is empty, currentEffect is cleared and processEffects is called again to pick up anything that accumulated in staging during execution.

- EffectSequence does not live on definitions, it is constructed from card def and pushed to state at runtime

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

Game Flow (deprecated)
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

Life and Damage (deprecated, needs rewrite)
- Damage is done as a result of either an effect or by combat with a leader, after which the game state is checked to see if the player that dealt the damage knocked out the opponent
- The signal DAMAGE_DEALT is separated from the signal LIFE_DAMAGED for this reason, as "dealing damage" will result in a knockout check while "damage taken to life cards" will not
    - This is relevant for [Double Attack], which officially states "This card deals 2 damage"
    - Base text is confusing and should read "this card deals 2 damage to the user's life cards"
    - Life is still required to be marked as damaged on two separate instances for triggers to activate while still being distinct from life being taken without damage, which bypasses triggers

Yes, that is a defending player action. I would restrict "batch actions" to just these two scenarios. 

Alternatively, maybe "START_OF_TURN" should be explicit and the draw/draw don signals can be done within that context so instead of "batching" we could auto advance these phases like how phase changed for when attacking is logged under different action consequences (one for just attack declaration, one for player decision and continuation to next phase).

For battle itself, it might be all right to have branching paths. The flow could be like this: player has many "on opponent attack" effects. Opponent attacks. Player does not want to activate any of them and instead counter immediately. On the frontend, it would look like they click "no effect", "no blocker", then play a counter card. However, on the engine, they do not actually advance the state until they play a binding action that prevents them from going back. This way, they could change their mind on the frontend (go to counter step, if no binding action is played, can go back and activate effects). Thus, playing the counter card while in perhaps a more general unofficial "defending phase", would prevent the user from going back to the blocker phase or the "on opponent attack" phase, and the engine would jump them forward. If they click "quick resolve attack," the engine could jump them forward to attack resolution as well. This would allow for the best flexibility and UX for the players in my opinion.