import rawDeck from '@/lib/deck/deck.json';
import rawFacts from '@/lib/deck/facts.json';
import type { Deck, DeckPlay, DeckSlide, Fact, PlayId, SlideId } from '@/lib/deck/types';

export const deck = rawDeck as unknown as Deck;
export const facts = rawFacts as Fact[];

export function getSlide(slideId: SlideId): DeckSlide {
  const slide = deck.slides.find((item) => item.id === slideId);
  if (!slide) {
    throw new Error(`Unknown slide: ${slideId}`);
  }
  return slide;
}

export function getPlay(playId: PlayId): DeckPlay {
  const play = deck.plays.find((item) => item.id === playId);
  if (!play) {
    throw new Error(`Unknown play: ${playId}`);
  }
  return play;
}

export function factsForSlide(slide: DeckSlide): Fact[] {
  return slide.fact_ids
    .map((id) => facts.find((fact) => fact.id === id))
    .filter((fact): fact is Fact => Boolean(fact));
}

export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.+?[.](?=\s|$)/);
  return match ? match[0] : trimmed;
}

export function padSlideNumber(number: number): string {
  return String(number).padStart(2, '0');
}
