import { useState } from 'react';
import donCardBack from '../../../../assets/don-back.png';

export function DonDeckZone() {
    return (
        <div className={`don-deck-zone`}>
            <img src={donCardBack} alt="Don Deck" className="deck-card-back" />
        </div>
    );
}