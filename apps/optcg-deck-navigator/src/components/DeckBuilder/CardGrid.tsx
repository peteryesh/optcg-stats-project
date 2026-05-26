// apps/web/src/components/CardGrid.tsx

import { VirtuosoGrid } from 'react-virtuoso';
import type { CardId, CardDef } from '@optcg/engine';
import { CardThumbnail } from './CardThumbnail';
import styles from './CardGrid.module.css';

interface CardGridProps {
  cards: CardDef[];
  onCardClick: (card: CardId) => void;
}

export function CardGrid({ cards, onCardClick }: CardGridProps) {
  return (
    
    <VirtuosoGrid
        totalCount={cards.length}
        overscan={{main: 1000, reverse: 600}}
        itemContent={(index) => (
            <CardThumbnail
                card={cards[index]}
                onClick={() => onCardClick(cards[index].id)}
            />
        )}
        listClassName="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
        itemClassName={`mt-2 mx-1 h-full ${styles.card}`}
    />
    
    
  );
}