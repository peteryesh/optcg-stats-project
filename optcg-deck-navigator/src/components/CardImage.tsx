interface CardImageProps {
    id: string;
    name: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function CardImage({ id, name, size, className }: CardImageProps) {
    const BASE_URL = `${import.meta.env.VITE_PUBLIC_CARDS_URL}`;
    return (
        <img src={`${BASE_URL}/images/${id}.png`} alt={name} className={`${className || ''}`} />
    );
}