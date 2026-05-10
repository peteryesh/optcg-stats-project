import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabaseStore } from '../stores/databaseStore';
import { useDeckStore } from '../stores/deckStore';
import type { CardId } from '@optcg/engine';

import { CardGrid } from '../components/DeckBuilder/CardGrid';
import './DeckBuilderPage.css';



export function DeckBuilderPage() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    const database = useDatabaseStore((s) => s.database);
    const isLoading = useDatabaseStore((s) => s.isLoading);

    const getDeck = useDeckStore((s) => s.getDeck);
    const saveDeck = useDeckStore((s) => s.saveDeck);
    const deleteDeck = useDeckStore((s) => s.deleteDeck);

    // Working State
    const [name, setName] = useState('');
    const [leaderCardId, setLeaderCardId] = useState<CardId | null>(null);
    const [cardIds, setCardIds] = useState<CardId[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Deck Builder Functions
    function countCopies(cardIds: CardId[], cardId: CardId): number {
        return cardIds.filter(id => id === cardId).length;
    }

    function canAddCard(cardIds: CardId[], cardId: CardId): boolean {
        // Add checks against max deck limit, max copies allowed, etc.
        return true;
    }

    const handleAddCard = (cardId: CardId) => {
        if (canAddCard(cardIds, cardId)) {
            setCardIds([...cardIds, cardId]);
            setHasChanges(true);
        }
    }

    const handleRemoveCard = (cardId: CardId) => {
        const index = cardIds.indexOf(cardId);
        if (index >= 0) {
            setCardIds([...cardIds.slice(0, index), ...cardIds.slice(index + 1)]);
            setHasChanges(true);
        }
    }

    const handleSetLeader = (leaderId: CardId) => {
        setLeaderCardId(leaderId);
        setHasChanges(true);
    }

    // Deck Attribute Functions
    const handleSetName = (newName: string) => {
        setName(newName);
        setHasChanges(true);
    }

    // Deck Save Functions
    const handleSave = () => {
        const savedId = saveDeck({
            id: id ?? "",
            name,
            leaderCardId,
            cardIds
        });

        setHasChanges(false);

        if (!id) {
            navigate(`/decks/${savedId}`);
        }
    }

    const handleDiscard = () => {
        if (id) {
            const deck = getDeck(id);
            if (deck) {
                setName(deck.name);
                setLeaderCardId(deck.leaderCardId);
                setCardIds([...deck.cardIds]);
                setHasChanges(false);
            }
        }
        else {
            navigate('/decks');
        }
    }

    const handleDelete = () => {
        if (id && confirm(`Delete "${name}"?`)) {
            deleteDeck(id);
            navigate('/decks');
        }
    };

    const handleViewDeck = () => {
        console.log(cardIds);
    }

    const grouped = useMemo(() => {
        const counts = new Map<CardId, number>();

        if (isLoading || !database) return counts;

        cardIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));

        return [...counts.entries()].map(([id, count]) => ({
            cardId: id,
            count,
            card: database[id],
        }));
    }, [cardIds, database]);


    // On page load, get deck if an id exists
    useEffect(() => {
        if (id) {
            const deck = getDeck(id);
            if (deck) {
                setName(deck.name);
                setLeaderCardId(deck.leaderCardId);
                setCardIds([...deck.cardIds]);
                setHasChanges(false);
            }
        }
        else {
            // set default options if no id
            setName('Untitled Deck');
            setLeaderCardId(null);
            setCardIds([]);
            setHasChanges(false);
        }
    }, [id, getDeck]);

    // Deck database still loading
    if (isLoading || !database) return <div>Loading...</div>;

    // User has navigated to a deck that does not exist
    if (id && !getDeck(id)) return <div>Deck not found</div>;

    return (
        <div className="h-full w-full">
            <header>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => handleSetName(e.target.value)}
                    placeholder="Deck name"
                />
                <div className="actions">
                    <button onClick={handleSave} disabled={!hasChanges}>
                        {id ? 'Save Changes' : 'Save Deck'}
                    </button>
                    <button onClick={handleDiscard} disabled={!hasChanges}>
                        Discard Changes
                    </button>
                    {id && <button onClick={handleDelete}>Delete Deck</button>}
                    <button onClick={handleViewDeck}>Print Deck</button>
                </div>
            </header>
            <div className="h-full w-full">
                <CardGrid cards={Object.values(database)} onCardClick={handleAddCard} />
            </div>
        </div>
    );
}