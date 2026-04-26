import { useState } from 'react';
import cardBack from '../../../../assets/card-back.png';

export function StageZone() {
    return (
        <div className={`stage-zone`}>
            <img src={cardBack} alt="Stage" className="deck-card-back" />
        </div>
    );
}