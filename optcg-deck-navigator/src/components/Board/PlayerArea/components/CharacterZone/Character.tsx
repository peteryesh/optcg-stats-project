import { useState } from 'react';
import { CardImage } from '../../../../CardImage';

interface CharacterProps {
    position: number;
}

export function Character({ position }: CharacterProps) {
    return (
        <div className={`character-container character-${position}`}>
            <div className="play-card-display">
                <div className="play-card-cost">7</div>
                <div className="play-card-cost-change">
                    <div className="play-card-cost-change-value">+10</div>
                </div>
                <div className="play-card-power">9000</div>
                <div className="play-card-power-change">+1000</div>
                <CardImage id="OP15-092_p1" name="Hibari" className="play-card-image" />
            </div>
        </div>
    );
}