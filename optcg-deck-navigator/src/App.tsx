import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { CardImage } from './components/CardImage.tsx'
import { PlayerArea } from './components/Board/PlayerArea/PlayerArea.tsx'

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

  const BASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;

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

  return (
    <>
      {/* <section>
        <textarea 
          value={deckInput}
          onChange={(e) => setDeckInput(e.target.value)}
        />
        <button onClick={handleOnSubmit}>Add Deck</button>
        <div>
            {cardList.map((card, index) => (
                <div className="character-card-image-container">
                    <CardImage key={index} id={card.id} name={card.name} />
                </div>
            ))}

        </div>
      </section> */}


      <section className="game-board">
        <PlayerArea />
        <PlayerArea />
      </section>
    </>
  )
}

export default App
