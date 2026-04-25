import { useState } from 'react';
import cardBack from '../../../../assets/card-back.png';

export function DeckZone() {
    return (
        <div className={`deck-zone`}>
            <img src={cardBack} alt="Deck" className="deck-card-back" />
        </div>
    );
}