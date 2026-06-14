import { useState, useMemo } from 'react';
import { Player } from './Player/Player';

import { useGameStore } from '../../stores/gameStore';
import { useDatabaseStore } from '../../stores/databaseStore';
import { useDeckStore } from '../../stores/deckStore';

import { ActionInterpreterProvider } from '../../hooks/useActionInterpreter';
import type { Deck } from '../../stores/deckStore';
import type { CardDef, CardId, DeckList, PlayerId } from '@optcg/engine';
import { setPhase } from '@optcg/engine/src/game/mechanics/turn';

type GameBoardProps = {
    
}

export function GameBoard() {
    /**
     *  gameState = current game state in gameStore
     *  get player decks (require for both for now)
     *  get card defs from the decks
     * 
     *  game start is available when both players have decks selected
     * 
     *  generate game id
     *  playerIds = playerIds in the current game (stored in turn order)
     *  getPlayerIds
     *      return default 2p player ids [p1, p2]
     *  
     *  call initialize when these are set
     *  
     *  
     */
    const state = useGameStore(s => s.state);
    const initialize = useGameStore(s => s.initialize);
    const getLegalActions = useGameStore(s => s.getLegalActions);
    const dispatch = useGameStore(s => s.dispatch);
    const resetState = useGameStore(s => s.resetState);

    const database = useDatabaseStore(s => s.database);

    const myDecks = useDeckStore(s => s.getAllDecks()) ?? {};

    const gameId = useMemo(() => crypto.randomUUID().toString(), []); // reset on page reload, but set on the state at game initialization

    const playerIds: PlayerId[] = ["p1", "p2"];
    
    const [playerDecks, setPlayerDecks] = useState<Record<PlayerId, Deck>>({});

    const selectPlayerDeck = (playerId: PlayerId, deck: Deck) => {
        setPlayerDecks(prev => ({...prev, [playerId]: deck}));
    }

    const initializeCardDefs = (): Record<CardId, CardDef> => {
        const cardDefs: Record<CardId, CardDef> = {};
        if (!database) return {};
        Object.keys(playerDecks).forEach(playerId => {
            const deck = playerDecks[playerId];
            if (!deck.leaderCardId) throw new Error(`No leader card set for deck`);
            cardDefs[deck.leaderCardId] = database[deck.leaderCardId];
            deck.cardIds.forEach(cardId => {
                if (!Object.keys(cardDefs).includes(cardId)) {
                    cardDefs[cardId] = database[cardId];
                }
            });
        });
        return cardDefs;
    }

    const initializeDeckLists = (): Record<CardId, DeckList> => {
        const deckLists: Record<PlayerId, DeckList> = {};
        if (!database) return {};
        Object.keys(playerDecks).forEach(playerId => {
            const deck = playerDecks[playerId];
            if (!deck.leaderCardId) throw new Error(`No leader card set for deck`);
            console.log(database[deck.leaderCardId]);
            const deckList = {
                leader: deck.leaderCardId,
                deck: deck.cardIds,
                sideDeck: [],
                donCount: 10
            }
            deckLists[playerId] = deckList;
        });
        return deckLists;
    }

    // Testing functions
    const selectDefaultDecks = () => {
        if (Object.keys(myDecks).length <= 0) {
            console.log("No decks");
            return;
        }
        const defaultDeck = Object.values(myDecks)[0];
        selectPlayerDeck("p1", defaultDeck);
        selectPlayerDeck("p2", defaultDeck);

        Object.keys(playerDecks).forEach(playerId => {
            console.log(playerId);
            console.log(playerDecks[playerId]);
        });

        const defs = initializeCardDefs();
        const decks = initializeDeckLists();
        console.log(defs, decks);

        initialize({
            gameId: gameId,
            playerIds: playerIds,
            defs: defs,
            decks: decks
        });
    }

    const printLegalActions = () => {
        if (!state) return;
        console.log(getLegalActions(state?.turnPlayerId));
        return `${state.turnPlayerId}  ${JSON.stringify(getLegalActions(state?.turnPlayerId), null, 2)}`;
    }

    const testLegalActionButtons = () => {
        if (!state) return;
        return <div>
            <p>Active Player: {state?.turnPlayerId}</p><p> Phase: {state.phase}</p>
            {getLegalActions('p1').map((action, i) => 
                <button className='bg-green-500 m-1' key={i} onClick={() => dispatch(action)}>
                    {`${JSON.stringify(action, null, 2)}`}
                </button>
            )}
            {getLegalActions('p2').map((action, i) => 
                <button className='bg-green-500 m-1' key={i} onClick={() => dispatch(action)}>
                    {`${JSON.stringify(action, null, 2)}`}
                </button>
            )}
        </div>
    }

    const [gameReady, setGameReady] = useState<boolean>(false);
    
    if (!state) {
        return (
            <div>
                <button onClick={() => selectDefaultDecks()}>TEST DEFAULT DECKS</button>
                <button onClick={() => console.log(state)}>See State</button>
            </div>
        );
    }
    return (
        <div>
            <button onClick={() => console.log(state)}>See State</button>
            <button onClick={() => printLegalActions()}>Legal Moves</button>
            <button onClick={() => resetState()}>RESET</button>
            <div>
                {testLegalActionButtons()}
            </div>
            <Player playerId='p1' />
            <Player playerId='p2' />
        </div>
    );
}