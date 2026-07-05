export function getCardArtUrl(cardId: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}cards/${cardId}.png`;
}
