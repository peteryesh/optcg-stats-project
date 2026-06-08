import { useState } from 'react';
import './Player.css';
import { useGameStore } from '../../../stores/gameStore';
import type { PlayerZones } from '@optcg/engine';

type PlayerProps = {
    playerId: string;
}

export function Player({playerId}: PlayerProps) {
    const state = useGameStore(s => s.state);

    if (!state) return;

    const playerZones = state.playerZones[playerId];

    function zoneToString(zone: string[]): string {
        return JSON.stringify(zone, null, 2);
    }

    return (
        <>
            <div>
                {"Player: " + playerId}
            </div>
            <div>
                Hand: {zoneToString(playerZones.hand)}
            </div>
            <div>
                Don Deck: {zoneToString(playerZones.donDeck)}
            </div>
            <div>
                Don Active: {zoneToString(playerZones.donActive)}
            </div>
            <div>
                Don Rested: {zoneToString(playerZones.donRested)}
            </div>
            <div>
                Characters: {zoneToString(playerZones.characters)}
            </div>
            <div>
                Life: {zoneToString(playerZones.life)}
            </div>
            <div>
                Deck: {zoneToString(playerZones.deck)}
            </div>
            <div>
                Trash: {zoneToString(playerZones.trash)}
            </div>
        </>
    );
}