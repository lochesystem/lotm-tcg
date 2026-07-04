// ─── Pathways ───────────────────────────────────────────────────────────────

export type Pathway = 'fool' | 'red-priest' | 'tyrant' | 'sun' | 'door' | 'demoness';

export interface PathwayDefinition {
  id: Pathway;
  name: string;
  identity: string;
  powerName: string;
  powerDescription: string;
  powerCost: number;
}

// ─── Cards ──────────────────────────────────────────────────────────────────

export type CardType = 'beyonder' | 'sealed-artifact' | 'ritual' | 'mystical-item';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Keyword =
  | 'stealth'
  | 'provoke'
  | 'corruption'
  | 'divination'
  | 'frenzy'
  | 'haste'
  | 'madness'
  | 'sequence-ascend';

export interface BaseCard {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  rarity: Rarity;
  pathway: Pathway | 'neutral';
  description: string;
  flavorText?: string;
  keywords?: Keyword[];
}

export interface BeyonderCard extends BaseCard {
  type: 'beyonder';
  attack: number;
  health: number;
  madnessValue?: number;
  ascendInto?: string;
  ascendCondition?: string;
  /** Resolved when the minion is played from hand */
  battlecry?: SpellEffect;
}

export interface SealedArtifactCard extends BaseCard {
  type: 'sealed-artifact';
  attack: number;
  durability: number;
}

export interface RitualCard extends BaseCard {
  type: 'ritual';
  effect: SpellEffect;
}

export interface MysticalItemCard extends BaseCard {
  type: 'mystical-item';
  trigger: SecretTrigger;
  effect: SpellEffect;
}

export type Card = BeyonderCard | SealedArtifactCard | RitualCard | MysticalItemCard;

// ─── Effects ────────────────────────────────────────────────────────────────

export type TargetType = 'any' | 'enemy' | 'friendly' | 'hero' | 'enemy-hero' | 'friendly-hero' | 'all-enemies' | 'all-enemy-minions' | 'all-friendlies' | 'all' | 'random-enemy' | 'self' | 'none';

export interface SpellEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'summon' | 'destroy' | 'transform' | 'discover' | 'return' | 'silence' | 'copy';
  value?: number;
  target: TargetType;
  buffAttack?: number;
  buffHealth?: number;
  summonId?: string;
  summonCount?: number;
  condition?: string;
}

export type SecretTrigger =
  | 'on-hero-attacked'
  | 'on-minion-played'
  | 'on-spell-cast'
  | 'on-minion-death'
  | 'on-turn-start';

// ─── Game State ─────────────────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  pathway: Pathway;
  health: number;
  maxHealth: number;
  spirituality: number;
  maxSpirituality: number;
  spiritualityThisTurn: number;
  deck: Card[];
  hand: Card[];
  board: MinionInstance[];
  graveyard: Card[];
  secrets: MysticalItemInstance[];
  weapon: WeaponInstance | null;
  fatigueDamage: number;
  heroPowerUsed: boolean;
  hasFateCoin: boolean;
}

export interface MinionInstance {
  instanceId: string;
  card: BeyonderCard;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  canAttack: boolean;
  attacksThisTurn: number;
  keywords: Set<Keyword>;
  buffs: Buff[];
  exhausted: boolean;
}

export interface WeaponInstance {
  card: SealedArtifactCard;
  currentAttack: number;
  durability: number;
}

export interface MysticalItemInstance {
  instanceId: string;
  card: MysticalItemCard;
}

export interface Buff {
  source: string;
  attackMod: number;
  healthMod: number;
  temporary: boolean;
}

export interface GameState {
  id: string;
  players: [PlayerState, PlayerState];
  currentPlayerIndex: 0 | 1;
  turn: number;
  phase: GamePhase;
  winner: string | null;
  log: GameEvent[];
}

export type GamePhase = 'mulligan' | 'playing' | 'ended';

// ─── Actions ────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'play-card'; handIndex: number; target?: string; boardPosition?: number }
  | { type: 'attack'; attackerInstanceId: string; targetInstanceId: string }
  | { type: 'attack-hero'; attackerInstanceId: string }
  | { type: 'hero-power'; target?: string }
  | { type: 'hero-attack'; targetInstanceId?: string }
  | { type: 'end-turn' }
  | { type: 'mulligan'; indices: number[] }
  | { type: 'use-fate-coin' }
  | { type: 'concede' };

// ─── Events ─────────────────────────────────────────────────────────────────

export interface GameEvent {
  type: string;
  playerId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Deck Validation ────────────────────────────────────────────────────────

export interface DeckValidation {
  valid: boolean;
  errors: string[];
}

export interface Deck {
  pathway: Pathway;
  cards: string[]; // card IDs, 30 cards
}
