import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTranslation } from '../i18n';

export function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, signUp, error } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!username.trim()) {
          setLocalError(t('auth.chooseUsername'));
          return;
        }
        await signUp(email.trim(), password, username.trim());
      }
    } catch {
      /* error set in store */
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-void-950">
        <div className="max-w-sm text-center text-void-400 text-sm">
          <p className="mb-2 text-void-200 font-medium">{t('auth.supabaseNotConfiguredTitle')}</p>
          <p>{t('auth.supabaseNotConfiguredHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6 relative overflow-hidden bg-void-950">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-void-950 to-void-950" />

      <motion.form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm bg-void-900/90 border border-void-600 rounded-2xl p-6 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-center text-gold-400 mb-1">{t('auth.title')}</h1>
        <p className="text-center text-xs text-void-400 mb-6">{t('auth.subtitle')}</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-purple-700 text-white' : 'bg-void-800 text-void-400'}`}
          >
            {t('auth.loginTab')}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'register' ? 'bg-purple-700 text-white' : 'bg-void-800 text-void-400'}`}
          >
            {t('auth.registerTab')}
          </button>
        </div>

        {mode === 'register' && (
          <label className="block mb-3">
            <span className="text-xs text-void-400">{t('auth.usernameLabel')}</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-void-800 border border-void-600 text-sm text-void-100"
              autoComplete="username"
            />
          </label>
        )}

        <label className="block mb-3">
          <span className="text-xs text-void-400">{t('auth.emailLabel')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 rounded-lg bg-void-800 border border-void-600 text-sm text-void-100"
            autoComplete="email"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs text-void-400">{t('auth.passwordLabel')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-void-800 border border-void-600 text-sm text-void-100"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {(localError || error) && (
          <p className="text-xs text-red-400 mb-3">{localError || error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {loading ? t('auth.waiting') : mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
        </button>
      </motion.form>
    </div>
  );
}
