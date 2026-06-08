import type { CardId, Card } from '@optcg/engine';
import { CardThumbnail } from './CardThumbnail';
import styles from './DeckEditor.module.css';

interface DeckEditorProps {
    leader: Card | null;
    deckCards: {
        cardId: CardId;
        count: number;
        card: Card;
    }[]

    // Deck Editor Functions
    onCardClick: (cardId: CardId) => void;
}

export function DeckEditor({ leader, deckCards, onCardClick }: DeckEditorProps) {

    function calculateOffset(count: number, index: number) {
        let cardOffset = 8;
        if (count > 4) {
            cardOffset = 5;
        }
        if (count > 8) {
            cardOffset = 3;
        }
        if (count > 12) {
            cardOffset = 2;
        }
        if (count > 16) {
            cardOffset = 1.5;
        }
        if (count > 20) {
            cardOffset = 1;
        }
        if (count > 30) {
            cardOffset = 0.75;
        }
        if (count > 40) {
            cardOffset = 0.5;
        }
        return cardOffset * index;
    }

    return <div className='grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] p-4 gap-4 static'>
        <CardThumbnail card={leader} quality='thumb'/>
        {deckCards.map((cardStack, index) => (
            <div key={index} className={`m-4 ${styles.stack}`}>
                {Array.from({length: cardStack.count }, (_, i) => (
                    <div 
                        key={i}
                        className={`w-full h-full ${styles.card} ${i === 0 ? styles.firstCard : ''}`}
                        style={{
                            top: `${calculateOffset(cardStack.count, i)}px`,
                            right: `${calculateOffset(cardStack.count, i)}px`,
                            zIndex: cardStack.count-i
                        }}
                    >
                        <CardThumbnail
                            card={cardStack.card}
                            quality='thumb'
                            onClick={() => onCardClick(cardStack.card.id)}
                        />
                        
                    </div>
                ))}
                <div
                    className={`absolute bottom-[4px] -right-[20px] ${styles.copyCount}`}
                    style={{
                        zIndex: cardStack.count+1
                }}>
                    {cardStack.count}
                </div>
            </div>
        ))}
    </div>
}