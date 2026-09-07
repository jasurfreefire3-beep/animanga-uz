import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, AlertTriangle, Clock, ArrowLeft, CheckCircle2, Eye, EyeOff, Sparkles, LogOut } from 'lucide-react';
import { AdminPanel } from './AdminPanel.js';
import type { Manga } from '../types.js';

interface AdminGateProps {
  onBackToSite: () => void;
  mangas: Manga[];
  onRefreshData: () => void;
}

const ADMIN_PASSWORD = '1213234';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour = 3600 seconds
const STORAGE_KEY_ATTEMPTS = 'animanga_admin_attempts';
const STORAGE_KEY_LOCKOUT = 'animanga_admin_lockout_until';
const STORAGE_KEY_AUTH = 'animanga_admin_session_auth';

export const AdminGate: React.FC<AdminGateProps> = ({
  onBackToSite,
  mangas,
  onRefreshData,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? MAX_ATTEMPTS : parsed;
      }
    } catch {
      // ignore
    }
    return MAX_ATTEMPTS;
  });

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOCKOUT);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [remainingTimeSec, setRemainingTimeSec] = useState<number>(0);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  // Countdown timer for 1-hour lockout
  useEffect(() => {
    const checkLockout = () => {
      if (!lockoutUntil) {
        setRemainingTimeSec(0);
        return;
      }

      const now = Date.now();
      const diffMs = lockoutUntil - now;

      if (diffMs <= 0) {
        // Lockout period expired! Reset attempts
        setLockoutUntil(null);
        setRemainingTimeSec(0);
        setAttemptsLeft(MAX_ATTEMPTS);
        setError(null);
        try {
          localStorage.removeItem(STORAGE_KEY_LOCKOUT);
          localStorage.setItem(STORAGE_KEY_ATTEMPTS, MAX_ATTEMPTS.toString());
        } catch {
          // ignore
        }
      } else {
        setRemainingTimeSec(Math.ceil(diffMs / 1000));
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError("Tizim bloklangan. Iltimos, vaqt tugashini kuting!");
      return;
    }

    if (!passwordInput.trim()) {
      setError("Iltimos, admin parolini kiriting.");
      return;
    }

    if (passwordInput === ADMIN_PASSWORD) {
      // Successful Login
      setIsAuthenticated(true);
      setError(null);
      setPasswordInput('');
      setAttemptsLeft(MAX_ATTEMPTS);
      setLockoutUntil(null);
      try {
        sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
        localStorage.removeItem(STORAGE_KEY_LOCKOUT);
        localStorage.setItem(STORAGE_KEY_ATTEMPTS, MAX_ATTEMPTS.toString());
      } catch {
        // ignore
      }
    } else {
      // Incorrect password attempt
      const newAttempts = Math.max(0, attemptsLeft - 1);
      setAttemptsLeft(newAttempts);

      if (newAttempts <= 0) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockUntil);
        setError("5 marta noto'g'ri parol kiritildi! Tizim xavfsizlik maqsadida 1 soatga bloklandi.");
        try {
          localStorage.setItem(STORAGE_KEY_LOCKOUT, lockUntil.toString());
          localStorage.setItem(STORAGE_KEY_ATTEMPTS, '0');
        } catch {
          // ignore
        }
      } else {
        setError(`Noto'g'ri parol! Qolgan imkoniyatlar soni: ${newAttempts} ta`);
        try {
          localStorage.setItem(STORAGE_KEY_ATTEMPTS, newAttempts.toString());
        } catch {
          // ignore
        }
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {
      // ignore
    }
    onBackToSite();
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remMinutes = minutes % 60;
      return `${hours} soat ${remMinutes} daqiqa ${seconds} soniya`;
    }
    return `${minutes} daqiqa ${seconds.toString().padStart(2, '0')} soniya`;
  };

  // If already authenticated, display the full AdminPanel with a logout option
  if (isAuthenticated) {
    return (
      <div className="relative">
        <AdminPanel
          onBackToSite={handleLogout}
          mangas={mangas}
          onRefreshData={onRefreshData}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020d07] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Glow ambient backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#00DC82]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back to site button */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <button
          onClick={onBackToSite}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm text-gray-300 hover:text-white transition-all active:scale-95"
          id="btn-admin-gate-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Saytga qaytish</span>
        </button>

        <span className="text-[11px] text-[#a0a0b8] font-mono">
          /admin xavfsiz hudud
        </span>
      </div>

      {/* Gate Container Card */}
      <div 
        className="w-full max-w-md bg-[#08140c]/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(108,92,231,0.2)] text-left relative overflow-hidden"
        id="admin-security-gate"
      >
        {/* Top Header Badge */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-500 to-purple-400 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0d1222] rounded-[14px] flex items-center justify-center">
              {isLocked ? (
                <Lock className="w-6 h-6 text-rose-400 animate-pulse" />
              ) : (
                <Shield className="w-6 h-6 text-purple-300" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>Admin Panel</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                Himoyalangan
              </span>
            </h1>
            <p className="text-xs text-[#a0a0b8] mt-0.5">
              Boshqaruv tizimiga kirish uchun parolni kiriting
            </p>
          </div>
        </div>

        {/* Lockout Screen */}
        {isLocked ? (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-400 shadow-lg">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Kirish bloklangan!</h3>
              <p className="text-xs text-rose-300/90 mt-1">
                Ketma-ket 5 marta noto'g'ri parol terilgani sababli kirish 1 soatga to'xtatildi.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="py-2.5 px-4 rounded-xl bg-black/60 border border-rose-500/40 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400/80">
                Qolgan kutish vaqti
              </div>
              <div className="text-xl font-mono font-black text-rose-300 mt-0.5">
                {formatCountdown(remainingTimeSec)}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Vaqt tugagach, qayta 5 ta imkoniyat bilan parolni kiritishingiz mumkin bo'ladi.
            </p>
          </div>
        ) : (
          /* Normal Password Entry Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="admin-password-input" className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Admin paroli:</span>
                </label>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  attemptsLeft <= 2 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                    : 'bg-white/5 text-gray-300 border-white/10'
                }`}>
                  Imkoniyatlar: <strong className="text-white">{attemptsLeft} / 5</strong>
                </span>
              </div>

              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="Parolni kiriting..."
                  autoFocus
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-black/60 border border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-white font-mono text-sm outline-none transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all duration-200 active:scale-[0.98]"
              id="btn-admin-gate-submit"
            >
              <Key className="w-4 h-4" />
              <span>Admin panelga kirish</span>
            </button>
          </form>
        )}

        {/* Security Rule Note */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-[#a0a0b8] leading-relaxed">
            🛡️ Ushbu panel faqat ma'murlar uchun. 5 marta noto'g'ri kiritilsa, tizim avtomatik ravishda 1 soatga bloklanadi.
          </p>
        </div>
      </div>
    </div>
  );
};
