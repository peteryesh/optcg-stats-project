import { useEffect, useState } from 'react'
import './App.css'
import { CardImage } from './components/CardImage.tsx'
import { PlayerArea } from './components/Board/PlayerArea/PlayerArea.tsx'
import { useGameStore } from './stores/gameStore.ts';

import type { CardId } from '@optcg/engine';

interface Card {
    id: string;
    set_id: string;
    name: string;
    class: string;
    rarity: string;
    block: number;
    cost: number;
    power: number;
    counter: number;
    raw_effect: string;
    artist: string;
    colors: string[];
    types: string[];
    attributes: string[];
    alts: { id: string, artist: string }[];
    aliases: string[];
    restrictions: string[];
}

function App() {
  const [count, setCount] = useState<number>(0);
  const [cardList, setCardList] = useState<Card[]>([]);
  const [deckInput, setDeckInput] = useState<string>('');

  const state = useGameStore((s) => s. state);
  const initialize = useGameStore((s) => s.initialize);

  const BASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;

  useEffect(() => {
    console.log("initializing")
    initialize({
        decks: {
            'p1': {
                leaderCardId: "ST21-001" as CardId,
                deckCardIds: [
                    "OP01-016",
                    "ST21-003",
                    "ST21-010",
                    "ST21-008",
                    "ST21-014"
                ] as CardId[]
            },
            'p2': {
                leaderCardId: "ST21-001" as CardId,
                deckCardIds: [
                    "OP01-016",
                    "ST21-003",
                    "ST21-010",
                    "ST21-008",
                    "ST21-014"
                ] as CardId[]
            }
        },
        firstPlayer: 'p1'
    })
  }, [initialize]);

  const getCard = async (cardID: string) => {
    // Implementation for fetching card details
    const cardDataURL = `${BASE_URL}/cards/${cardID}.json`;
    const res = await fetch(cardDataURL);
    const cardData = await res.json();
    console.log(cardData);
    return cardData;
  }

  const parseDeckInput = (input: string) => {
    return input.trim().split('\n').map(line => {
      const [quantity, cardCode] = line.trim().split('x');
      return { quantity: parseInt(quantity), cardCode };
    });
  }

  const expandDeck = (parsedDeck: { quantity: number; cardCode: string }[]) => {
    return parsedDeck.flatMap(entry => {
      const { quantity, cardCode } = entry;
      return Array(quantity).fill(cardCode);
    });
  }

  const handleOnSubmit = async () => {
    const parsedDeck = parseDeckInput(deckInput);
    const expandedDeck = expandDeck(parsedDeck);
    const cardDetails = await Promise.all(expandedDeck.map(getCard));
    setCardList(cardDetails);
  }

  const handleLogState = () => {
    console.log(state);
  }

  return (
    <>
      <section>
        <textarea 
          value={deckInput}
          onChange={(e) => setDeckInput(e.target.value)}
        />
        <button onClick={handleOnSubmit}>Add Deck</button>
        <button onClick={handleLogState}>Log State</button>
        <div>
            {cardList.map((card, index) => (
                <div className="character-card-image-container">
                    <CardImage key={index} id={card.id} name={card.name} />
                </div>
            ))}

        </div>
      </section>


      <section className="game-board">
        <PlayerArea />
        <PlayerArea />
      </section>
    </>
  )
}

export default App
