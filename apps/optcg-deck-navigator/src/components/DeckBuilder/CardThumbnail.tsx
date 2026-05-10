import type { CardDefinition } from "@optcg/engine";
import './CardGrid.css';

interface CardThumbnailProps {
    card: CardDefinition;
    onClick?: () => void;
}

export function CardThumbnail({card, onClick}: CardThumbnailProps) {
    const DATABASE_IMG_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
    return <button onClick={onClick} className="card-thumbnail">
        <img
            src={`${DATABASE_IMG_URL}/images/${card.id}-thumb.webp`}
            alt={card.name}
            loading="lazy"
            draggable={false}              // disables HTML5 drag API
            onDragStart={(e) => e.preventDefault()}  // belt-and-suspenders
            className="select-none w-full hover:z-10"    // prevents text/image selection
            style={{ WebkitUserDrag: 'none' }}  // Safari-specific
        />
    </button>
}