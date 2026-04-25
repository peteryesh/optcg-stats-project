import { useState } from 'react';
import { CharacterZone } from './components/CharacterZone/CharacterZone';
import { LeaderZone } from './components/LeaderZone.tsx';
import { DeckZone } from './components/DeckZone.tsx';
import { LifeZone } from './components/LifeZone.tsx';
import './PlayerArea.css';
import { StageZone } from './components/StageZone.tsx';
import { DonDeckZone } from './components/DonDeckZone.tsx';
import { TrashZone } from './components/TrashZone.tsx';
import { DonZone } from './components/DonZone.tsx';

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
                <StageZone />
                <DeckZone />
                <DonDeckZone />
                <DonZone />
                <div className="hand-zone">
                    Hand Zone
                </div>
                <TrashZone />
            </div>
        </>
    );
}