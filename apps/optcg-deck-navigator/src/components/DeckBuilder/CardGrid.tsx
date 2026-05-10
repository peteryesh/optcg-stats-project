// apps/web/src/components/CardGrid.tsx

import { VirtuosoGrid } from 'react-virtuoso';
import type { CardId, CardDefinition } from '@optcg/engine';
import { CardThumbnail } from './CardThumbnail';
import './CardGrid.css';

interface CardGridProps {
  cards: CardDefinition[];
  onCardClick: (card: CardId) => void;
}

export function CardGrid({ cards, onCardClick }: CardGridProps) {
  return (
    
    <VirtuosoGrid
        totalCount={cards.length}
        overscan={{main: 1000, reverse: 200}}
        itemContent={(index) => (
            <CardThumbnail
            card={cards[index]}
            onClick={() => onCardClick(cards[index].id)}
            />
        )}
        listClassName="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] p-4"
        itemClassName="mt-2"
    />
    
    
  );
}