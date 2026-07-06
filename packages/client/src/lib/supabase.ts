import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('your-project') && anonKey !== 'your-anon-key',
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}

export type DbProfile = {
  id: string;
  username: string;
  display_name: string;
  preferred_pathway: string;
  created_at: string;
};

export type DbPlayerProgress = {
  owner_id: string;
  owned_cards: Record<string, number>;
  win_streak: number;
  wins: number;
  losses: number;
  story_progress: number;
  updated_at: string;
};

export type DbDeck = {
  id: string;
  owner_id: string;
  name: string;
  pathway: string;
  cards: string[];
  is_active: boolean;
  slot_index: number | null;
  created_at: string;
  updated_at: string;
};

export type DbMatchHistory = {
  id: string;
  player_id: string;
  opponent_type: 'npc' | 'pvp';
  match_mode: 'story' | 'npc' | 'pvp' | null;
  opponent_label: string | null;
  npc_tier: number | null;
  won: boolean;
  is_draw: boolean;
  duration_turns: number;
  played_at: string;
};

export type MatchMode = 'story' | 'npc' | 'pvp';
