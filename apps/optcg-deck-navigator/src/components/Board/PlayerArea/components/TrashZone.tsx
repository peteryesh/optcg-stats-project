import { useState } from 'react';
import cardBack from '../../../../assets/card-back.png';

export function TrashZone() {
    return (
        <div className={`trash-zone`}>
            <img src={cardBack} alt="Trash" className="deck-card-back" />
        </div>
    );
}