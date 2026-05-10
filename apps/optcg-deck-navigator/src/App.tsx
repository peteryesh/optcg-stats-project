import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { CardImage } from './components/CardImage.tsx';
import { PlayerArea } from './components/Board/PlayerArea/PlayerArea.tsx';
import { useGameStore } from './stores/gameStore';
import { useDatabaseStore } from './stores/databaseStore';

import type { CardId } from '@optcg/engine';

import { LandingPage } from './pages/LandingPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';


function App() {
    const [count, setCount] = useState<number>(0);
    const [deckInput, setDeckInput] = useState<string>('');

    const state = useGameStore((s) => s.state);
    const initialize = useGameStore((s) => s.initialize);

    const db = useDatabaseStore((s) => s.database);

    return (
        <BrowserRouter>
            <div className="flex flex-col h-dvh bg-red-500">
                <header>
                    <Link to="/">OPTCG Practice Tool</Link>
                    <nav>
                        <Link to="/practice">Practice</Link>
                        <Link to="/decks">Decks</Link>
                    </nav>
                </header>
                <main className="flex-1 min-h-0 overflow-hidden bg-blue-500">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/decks" element={<DeckBuilderPage />} />
                        <Route path="/decks/new" element={<DeckBuilderPage />} />
                        <Route path="/decks/:id" element={<DeckBuilderPage />} />
                    </Routes>
                </main>
            </div>
            
        </BrowserRouter>
    );
}

export default App
