import { Character } from './Character.tsx';
import '../../PlayerArea.css';
import './CharacterZone.css';

export function CharacterZone() {
    return (
        <div className="character-zone">
            <div className="character-zone-grid">
                <Character position={1} />
                <Character position={2} />
                <Character position={3} />
                <Character position={4} />
                <Character position={5} />
            </div>
        </div>
    );
}