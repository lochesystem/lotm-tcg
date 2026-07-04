import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, resetSupabaseClient, type DbProfile } from '../lib/supabase';
import { fetchProfile, fetchProgress, ensureStarterDeck } from '../sync/player-sync';
import { useCollectionStore } from './collectionStore';
import { useGameStore } from './gameStore';
import { setCurrentUserId } from '../lib/sessionContext';
import type { Pathway } from 'game-engine';
import { isPathwayUnlocked } from 'game-engine';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthStore {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  error: string | null;

  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

async function hydratePlayerData(userId: string, profile: DbProfile): Promise<void> {
  setCurrentUserId(userId);
  const progress = await fetchProgress(userId);
  useCollectionStore.getState().hydrateFromCloud(progress);

  let pathway = (profile.preferred_pathway ?? 'fool') as Pathway;
  if (!isPathwayUnlocked(pathway, progress.storyProgress)) {
    pathway = 'fool';
  }
  useGameStore.getState().setPathway(pathway);

  const deck = await ensureStarterDeck(userId, pathway);
  useGameStore.getState().setActiveDeckFromCloud(deck.cards, deck.pathway as Pathway, deck.id);
}

let authListenerAttached = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'unauthenticated',
  session: null,
  user: null,
  profile: null,
  error: null,

  bootstrap: async () => {
    if (!isSupabaseConfigured) {
      set({ status: 'unauthenticated' });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      set({ status: 'unauthenticated' });
      return;
    }

    const { data: { session } } = await sb.auth.getSession();

    if (!session?.user) {
      setCurrentUserId(null);
      set({ status: 'unauthenticated', session: null, user: null, profile: null });
      return;
    }

    try {
      const profile = await fetchProfile(session.user.id);
      if (profile) {
        await hydratePlayerData(session.user.id, profile);
      }
      set({
        status: 'authenticated',
        session,
        user: session.user,
        profile,
        error: null,
      });
    } catch (e) {
      set({
        status: 'unauthenticated',
        error: (e as Error).message,
        session: null,
        user: null,
        profile: null,
      });
    }

    if (!authListenerAttached) {
      authListenerAttached = true;
      sb.auth.onAuthStateChange(async (event, nextSession) => {
        if (event === 'SIGNED_OUT' || !nextSession?.user) {
          setCurrentUserId(null);
          set({ status: 'unauthenticated', session: null, user: null, profile: null });
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const p = await fetchProfile(nextSession.user.id);
          if (p) await hydratePlayerData(nextSession.user.id, p);
          set({
            status: 'authenticated',
            session: nextSession,
            user: nextSession.user,
            profile: p,
            error: null,
          });
        }
      });
    }
  },

  signIn: async (email, password) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado');

    set({ error: null });
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      throw error;
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      if (profile) await hydratePlayerData(data.user.id, profile);
      set({
        status: 'authenticated',
        session: data.session,
        user: data.user,
        profile,
      });
    }
  },

  signUp: async (email, password, username) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado');

    set({ error: null });
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
          preferred_pathway: useGameStore.getState().selectedPathway,
        },
      },
    });
    if (error) {
      set({ error: error.message });
      throw error;
    }

    if (data.user) {
      await new Promise((r) => setTimeout(r, 500));
      const profile = await fetchProfile(data.user.id);
      if (profile) await hydratePlayerData(data.user.id, profile);
      set({
        status: 'authenticated',
        session: data.session,
        user: data.user,
        profile,
      });
    }
  },

  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    resetSupabaseClient();
    setCurrentUserId(null);
    useGameStore.getState().reset();
    set({ status: 'unauthenticated', session: null, user: null, profile: null, error: null });
  },
}));
