// cli/index.ts
import { runGame } from "./game";
import { loadDeck } from "./utils";
import * as path from "path";

async function main(): Promise<void> {
  console.log("=== OPTCG Engine CLI ===\n");

  const p1Deck = loadDeck(path.join(__dirname, "decks/test-deck.json"));
  const p2Deck = loadDeck(path.join(__dirname, "decks/test-deck.json"));

  await runGame(p1Deck, p2Deck);
}

main().catch(console.error);