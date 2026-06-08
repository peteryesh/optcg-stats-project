import type { CardDef } from "@optcg/engine";

interface CardThumbnailProps {
    card: CardDef | null;
    quality?: 'thumb' | 'full';
    onClick?: () => void;
}
// !!! IDK ABOUT PASSING DOWN A SPECIFIC CLASS NAME
export function CardThumbnail({ card, quality, onClick }: CardThumbnailProps) {
    const DATABASE_IMG_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
    if (!card) {
        return;
    }
    return <button onClick={onClick} className='aspect-[5/7] h-full w-full'>
        <img
            src={`${DATABASE_IMG_URL}/images/${card.id}-${quality ? quality : 'thumb'}.webp`}
            alt={card.name}
            loading="lazy"
            draggable={false}              // disables HTML5 drag API
            onDragStart={(e) => e.preventDefault()}  // belt-and-suspenders
            className="select-none w-full cursor-pointer block aspect-[5/7]"    // prevents text/image selection
            style={{ WebkitUserDrag: 'none' }}  // Safari-specific
        />
    </button>
}