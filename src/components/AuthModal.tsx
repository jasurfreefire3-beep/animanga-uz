import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Loader2, ShieldCheck, ArrowLeft, ExternalLink, Send, CheckCircle2, MessageSquare } from 'lucide-react';
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
const BOT_LINK = `https://t.me/${BOT_USERNAME}?start=auth`;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [view, setView] = useState<'choose' | 'telegram_code'>('choose');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Telegram widget container ref
  const telegramWidgetRef = useRef<HTMLDivElement>(null);

  // 4-digit verification inputs (backup fallback)
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Listen for popup messages from Telegram OpenID OAuth callback
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

  // Set up global Telegram login callback for the script widget
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
      setView('choose');
      setDigits(['', '', '', '']);
      setLoadingTelegram(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      const { firebaseUser, profile } = await signInWithGoogle();
      onLogin({
        username: profile.username || firebaseUser.displayName || 'GoogleUser',
        isAdmin: !!profile.isAdmin,
        name: profile.name || firebaseUser.displayName || undefined,
        avatar_url: profile.avatar_url || firebaseUser.photoURL || undefined,
        email: firebaseUser.email || undefined,
        provider: 'google',
      });
      onClose();
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

  // Telegram OpenID OAuth Pop-up Login
  const handleTelegramOpenIdLogin = () => {
    try {
      setLoadingTelegram(true);
      setError(null);

      // Determine callback URL
      const origin = window.location.origin;
      const callbackUrl = `${origin}/api/auth/telegram/callback`;

      // Telegram OAuth URL
      // If client domain is registered with BotFather /setdomain, oauth.telegram.org handles authentication
      const oauthUrl = `https://oauth.telegram.org/auth?bot_id=8978777660&origin=${encodeURIComponent(origin)}&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`;

      // Calculate center coordinates for popup window
      const width = 540;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        oauthUrl,
        'telegram_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=1`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback to bot code verification if browser blocked popup
        setView('telegram_code');
        setLoadingTelegram(false);
        return;
      }

      // Check if popup was closed by user
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setLoadingTelegram(false);
        }
      }, 1000);
    } catch (err: any) {
      console.error('Telegram OpenID Login error:', err);
      setError("Telegram oynasini ochishda xatolik. Iltimos bot orqali urinib ko'ring.");
      setLoadingTelegram(false);
    }
  };

  // Switch to Telegram Bot flow and open Telegram (fallback)
  const handleStartTelegramFlow = () => {
    setError(null);
    setView('telegram_code');
    window.open(BOT_LINK, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 150);
  };

  // Handle digit change
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, 4).split('');
      if (pastedDigits.length > 0) {
        const newDigits = [...digits];
        pastedDigits.forEach((d, i) => {
          if (i < 4) newDigits[i] = d;
        });
        setDigits(newDigits);
        const focusIdx = Math.min(pastedDigits.length, 3);
        inputRefs[focusIdx].current?.focus();
        
        if (newDigits.every((d) => d !== '')) {
          handleVerifyCode(newDigits.join(''));
        }
        return;
      }
    }

    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (char && index === 3 && newDigits.every((d) => d !== '')) {
      handleVerifyCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 4) {
      setError("Iltimos, bot bergan 4 xonali kodni to'liq kiriting");
      return;
    }

    try {
      setLoadingVerify(true);
      setError(null);

      const res = await fetch('/api/auth/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || "Kod noto'g'ri yoki muddati tugagan");
      }

      const telegramUser = data.user;

      try {
        const authData: TelegramAuthData = {
          id: telegramUser.telegram_id,
          first_name: telegramUser.name || telegramUser.username,
          username: telegramUser.username,
          photo_url: telegramUser.avatar_url,
        };
        await authenticateWithTelegram(authData);
      } catch (fsErr) {
        console.warn('Firestore sync warning:', fsErr);
      }

      onLogin({
        username: telegramUser.username,
        isAdmin: !!telegramUser.isAdmin,
        name: telegramUser.name,
        avatar_url: telegramUser.avatar_url,
        telegram_id: telegramUser.telegram_id,
        provider: 'telegram',
      });

      onClose();
    } catch (err: any) {
      console.error('Verify Telegram Code Error:', err);
      setError(err?.message || "Kiritilgan kod noto'g'ri yoki eskirgan. Qayta urinib ko'ring.");
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in text-left">
      {/* iOS 12 Pro Max Frosted Glass Modal Container */}
      <div 
        className="relative w-full max-w-sm sm:max-w-md ios-glass rounded-[32px] p-7 sm:p-9 text-white overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/20"
        id="auth-modal"
      >
        {/* Ambient Specular Glass Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00DC82]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#229ED9]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls */}
        <div className="flex items-center justify-between mb-4">
          {view === 'telegram_code' ? (
            <button
              onClick={() => {
                setView('choose');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white py-1.5 px-3 rounded-full ios-glass-btn-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ortga</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full ios-glass-btn-sm transition cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEW 1: SELECT LOGIN METHOD */}
        {view === 'choose' && (
          <div className="animate-fade-in">
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

            {/* The Primary iOS Glass Auth Buttons */}
            <div className="space-y-3">
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

              {/* 2. Telegram OpenID One-Click Login Button */}
              <button
                type="button"
                onClick={handleTelegramOpenIdLogin}
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
                <span>Telegram bilan kirish (OpenID)</span>
              </button>

              {/* Bot Code Option (Small Alternative Link) */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleStartTelegramFlow}
                  className="text-xs text-white/50 hover:text-white/80 transition underline decoration-white/30 hover:decoration-white cursor-pointer"
                >
                  yoki Telegram bot (@{BOT_USERNAME}) orqali kirish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TELEGRAM BOT 4-DIGIT VERIFICATION */}
        {view === 'telegram_code' && (
          <div className="animate-fade-in space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 text-[#229ED9] mb-3 shadow-[0_0_20px_rgba(34,158,217,0.3)]">
                <Send className="w-7 h-7 -translate-x-0.5 translate-y-0.5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Telegram Tasdiqlash
              </h3>
              <p className="text-xs text-white/70 mt-1">
                <span className="text-[#229ED9] font-bold">@{BOT_USERNAME}</span> botiga kiring va olingan 4 xonali kodni kiriting
              </p>
            </div>

            {/* Step 1: Open Bot Button */}
            <a
              href={BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 transition group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#229ED9] flex items-center justify-center text-white font-bold text-xs">
                  1
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white group-hover:text-[#229ED9] transition flex items-center gap-1.5">
                    <span>Botga o'tish (@{BOT_USERNAME})</span>
                  </div>
                  <div className="text-[11px] text-white/60">
                    Botda <code className="text-emerald-400 font-mono font-bold">/start</code> tugmasini bosing
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white transition" />
            </a>

            {/* Step 2: 4-Digit Inputs */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2.5 text-center">
                2. Bot bergan 4 xonali kodni kiriting:
              </label>
              
              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={idx === 0 ? 4 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-13 h-14 sm:w-14 sm:h-15 text-center text-2xl sm:text-3xl font-mono font-black text-white rounded-2xl bg-white/10 border-2 border-white/20 focus:border-[#00DC82] focus:bg-white/15 focus:shadow-[0_0_20px_rgba(0,220,130,0.3)] outline-none transition-all duration-200"
                    placeholder="•"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Step 3: Verify Button */}
            <button
              type="button"
              onClick={() => handleVerifyCode()}
              disabled={loadingVerify || digits.some((d) => !d)}
              className="w-full relative flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl ios-glass-btn-primary font-bold text-sm shadow-[0_8px_25px_rgba(0,220,130,0.25)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loadingVerify ? (
                <>
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Tasdiqlash va Kirish</span>
                </>
              )}
            </button>

            {/* Resend / Start again hint */}
            <div className="text-center">
              <a
                href={BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#229ED9] hover:underline"
              >
                Kod kelmadimi? Botga qayta /start yuboring
              </a>
            </div>
          </div>
        )}

        {/* iOS Security & Guarantee Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00DC82]" />
            <span>Xavfsiz Telegram Bot shifrlash va sinxronizatsiya</span>
          </div>
        </div>

      </div>
    </div>
  );
};

