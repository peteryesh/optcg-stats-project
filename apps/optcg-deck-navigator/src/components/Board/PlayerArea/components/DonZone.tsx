import { useState } from 'react';
import donCardBack from '../../../../assets/don-back.png';

export function DonZone() {
    return (
        <div className={`don-zone`}>
            <img src={donCardBack} alt="Don" className="deck-card-back" />
        </div>
    );
}