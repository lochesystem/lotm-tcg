import type { Pathway } from 'game-engine';

export interface PathwayPresentation {
  name: { pt: string; en: string };
  artwork: string;
  focalPoint: string;
  accent: string;
}

const artwork = (id: Pathway) => `${import.meta.env.BASE_URL}hub/${id}.png`;

// Art direction and cropping live outside the UI; gameplay remains in game-engine.
export const PATHWAY_PRESENTATION: Record<Pathway, PathwayPresentation> = {
  fool: { name: { pt: 'O Louco', en: 'The Fool' }, artwork: artwork('fool'), focalPoint: '50% 30%', accent: '#b8b5c8' },
  'red-priest': { name: { pt: 'Sacerdote Vermelho', en: 'Red Priest' }, artwork: artwork('red-priest'), focalPoint: '35% 30%', accent: '#dc7959' },
  tyrant: { name: { pt: 'Tirano', en: 'Tyrant' }, artwork: artwork('tyrant'), focalPoint: '65% 28%', accent: '#8db9cf' },
  sun: { name: { pt: 'Sol', en: 'Sun' }, artwork: artwork('sun'), focalPoint: '38% 26%', accent: '#d9b873' },
  door: { name: { pt: 'Porta', en: 'Door' }, artwork: artwork('door'), focalPoint: '65% 30%', accent: '#86b7ae' },
  demoness: { name: { pt: 'Demoness', en: 'Demoness' }, artwork: artwork('demoness'), focalPoint: '35% 30%', accent: '#b19ac5' },
};
