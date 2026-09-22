import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { signInWithGoogle, authenticateWithTelegram, type TelegramAuthData } from '../lib/firebase.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: {
    username: string;
    isAdmin: boolean;
    name?: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    telegram_id?: number | string;
    provider?: 'google' | 'telegram';
  }) => void;
}

const BOT_USERNAME = 'Animanga_register_bot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for popup messages from Telegram OAuth callback
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'TG_LOGIN_SUCCESS' && event.data.user) {
        const tgUser = event.data.user;
        try {
          const authData: TelegramAuthData = {
            id: tgUser.telegram_id,
            first_name: tgUser.name || tgUser.username,
            username: tgUser.username,
            photo_url: tgUser.avatar_url,
          };
          await authenticateWithTelegram(authData);
        } catch (fsErr) {
          console.warn('Firestore sync warning:', fsErr);
        }
        onLogin(tgUser);
        onClose();
      } else if (event.data.type === 'TG_LOGIN_ERROR') {
        setError(event.data.error || 'Telegram orqali kirishda xatolik yuz berdi');
        setLoadingTelegram(false);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [onLogin, onClose]);

  // Set up global Telegram callback
  useEffect(() => {
    (window as any).onTelegramAuth = async (user: any) => {
      try {
        setLoadingTelegram(true);
        setError(null);
        const res = await fetch('/api/auth/telegram/widget-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.user) {
          throw new Error(data.error || "Telegram ma'lumotlarini tekshirishda xatolik");
        }

        try {
          const authData: TelegramAuthData = {
            id: data.user.telegram_id,
            first_name: data.user.name || data.user.username,
            username: data.user.username,
            photo_url: data.user.avatar_url,
          };
          await authenticateWithTelegram(authData);
        } catch (fsErr) {
          console.warn('Firestore sync warning:', fsErr);
        }

        onLogin(data.user);
        onClose();
      } catch (err: any) {
        console.error('Telegram Widget Callback Error:', err);
        setError(err.message || 'Telegram orqali kirishda xatolik');
      } finally {
        setLoadingTelegram(false);
      }
    };

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [onLogin, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoadingTelegram(false);
      setLoadingGoogle(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Google Login (Full-screen redirect, with fallback)
  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      const res = await signInWithGoogle();
      if (res && res.firebaseUser) {
        const { firebaseUser, profile } = res;
        onLogin({
          username: profile.username || firebaseUser.displayName || 'GoogleUser',
          isAdmin: !!profile.isAdmin,
          name: profile.name || firebaseUser.displayName || undefined,
          avatar_url: profile.avatar_url || firebaseUser.photoURL || undefined,
          email: firebaseUser.email || undefined,
          provider: 'google',
        });
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError(null);
      } else {
        console.error('Google Sign In Error:', err);
        setError(err?.message || 'Google bilan kirishda xatolik yuz berdi');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  // Telegram Login (Full-screen navigation to Telegram OpenID Connect auth)
  const handleTelegramLoginClick = () => {
    try {
      setLoadingTelegram(true);
      setError(null);

      const origin = window.location.origin;
      const loginUrl = `/api/auth/telegram/login?origin=${encodeURIComponent(origin)}`;

      // Full-screen direct navigation requested by user (instead of popup window)
      window.location.href = loginUrl;
    } catch (err: any) {
      console.error('Telegram Login Error:', err);
      setError("Telegram bilan ulanishda xatolik yuz berdi");
      setLoadingTelegram(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in text-left">
      {/* iOS Frosted Glass Modal Container */}
      <div 
        className="relative w-full max-w-sm sm:max-w-md ios-glass rounded-[32px] p-7 sm:p-9 text-white overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/20"
        id="auth-modal"
      >
        {/* Ambient Specular Glass Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00DC82]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#229ED9]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full ios-glass-btn-sm transition cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3.5">
            <div className="w-18 h-18 rounded-3xl p-1.5 ios-glass-card shadow-2xl flex items-center justify-center border-t-white/30">
              <img
                src="https://files.catbox.moe/adt7bt.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.png';
                }}
                alt="AniManga Uz"
                className="w-14 h-14 rounded-2xl object-contain filter drop-shadow-[0_4px_12px_rgba(0,220,130,0.3)]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tizimga kirish
          </h3>
          <p className="text-xs text-white/60 mt-1.5 max-w-xs mx-auto">
            Profil va ma'lumotlaringizni saqlash uchun qulay usulni tanlang:
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* The 2 Primary Auth Buttons */}
        <div className="space-y-3.5">
          {/* 1. Google Login Button (Apple White Glass) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingTelegram}
            className="w-full relative flex items-center justify-center gap-3.5 py-3.5 px-6 rounded-2xl bg-white/95 hover:bg-white text-gray-900 font-bold text-sm shadow-[0_8px_25px_rgba(255,255,255,0.15)] border border-white/40 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 cursor-pointer"
            id="btn-google-login"
          >
            {loadingGoogle ? (
              <Loader2 className="w-5 h-5 text-gray-900 animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Google bilan kirish</span>
          </button>

          {/* 2. Telegram Login Button (iOS Telegram Glass Blue) */}
          <button
            type="button"
            onClick={handleTelegramLoginClick}
            disabled={loadingTelegram || loadingGoogle}
            className="w-full relative flex items-center justify-center gap-3.5 py-3.5 px-6 rounded-2xl ios-glass-btn-telegram active:scale-[0.97] transition-all duration-200 cursor-pointer shadow-[0_8px_25px_rgba(34,158,217,0.35)]"
            id="btn-telegram-login"
          >
            {loadingTelegram ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.37 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            )}
            <span>Telegram bilan kirish</span>
          </button>
        </div>

        {/* iOS Security & Guarantee Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00DC82]" />
            <span>Xavfsiz va tezkor autentifikatsiya</span>
          </div>
        </div>

      </div>
    </div>
  );
};
