import { useState } from 'react';
import { CharacterZone } from './components/CharacterZone/CharacterZone';
import { LeaderZone } from './components/LeaderZone.tsx';
import { LifeZone } from './components/LifeZone.tsx';
import './PlayerArea.css';

export function PlayerArea() {
    return (
        <>
            <div className="player-area">
                <CharacterZone />
                <LifeZone />
                <div className="effect-zone">
                    Effect Zone
                </div>
                <LeaderZone />
                <div className="stage-zone">
                    Stage Zone
                </div>
                <div className="deck-zone">
                    Deck Zone
                </div>
                <div className="don-deck-zone">
                    Don Deck Zone
                </div>
                <div className="don-zone">
                    Don Zone
                </div>
                <div className="hand-zone">
                    Hand Zone
                </div>
                <div className="trash-zone">
                    Trash Zone
                </div>
            </div>
        </>
    );
}