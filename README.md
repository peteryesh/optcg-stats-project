dispatch(action)


Effect Schema

The basic building block of an effect. Any individual card's effect will be a sequence of these chained together.

Activation (on play, when attacking, on block, etc.)
Payment before effect can be used (take a life, return don, return a character to hand, etc.)
Conditions for activation ("only characters with type {Straw Hat Pirates}", 6 cards in hand, etc.)
Target(s)
Effect (power down, power up, KO, etc.)
Optional ("you may," "up to," etc.)
Origin (the card that the effect belongs to)
From (zone)
To (zone)
Duration (until end of turn, start of next turn, end of next turn, etc.)
EffectType (activate, auto, permanent, replacement)