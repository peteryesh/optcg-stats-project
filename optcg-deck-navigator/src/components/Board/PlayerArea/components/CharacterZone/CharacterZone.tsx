import { Character } from './Character.tsx';
import '../../PlayerArea.css';
import './CharacterZone.css';

export function CharacterZone() {
    return (
        <div className="character-zone">
            <div className="character-zone-grid">
                <div className="character-slot"><Character /></div>
                <div className="character-slot"><Character /></div>
                <div className="character-slot"><Character /></div>
                <div className="character-slot"><Character /></div>
                <div className="character-slot"><Character /></div>
            </div>
        </div>
    );
}