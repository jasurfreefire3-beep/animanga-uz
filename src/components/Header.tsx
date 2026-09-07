import React, { useState } from 'react';
import { Search, User, LogIn, LogOut, Shield, Sparkles, BookOpen, Compass, Home, Coins, Bookmark, Clock, Flame, Layers, ChevronDown, X } from 'lucide-react';
import type { UserProfile } from '../types.js';
import { VerifiedBadge } from './VerifiedBadge.js';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenCoins?: () => void;
  onLogout?: () => void;
  user: { username: string; isAdmin?: boolean } | null;
  profile?: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onOpenSearch,
  onOpenAuth,
  onOpenCoins,
  onLogout,
  user,
  profile,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 ios-glass border-b border-white/10 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Logo */}
        <div 
          onClick={() => {
            setIsProfileMenuOpen(false);
            onNavigate('home');
          }} 
          className="cursor-pointer flex items-center group select-none py-1 shrink-0"
          id="logo-brand"
        >
          <img
            src="https://files.catbox.moe/8odaud.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
            alt="AniManga Uz"
            className="h-8 sm:h-11 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_2px_10px_rgba(0,220,130,0.25)]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-1.5" id="desktop-nav">
          <button
            onClick={() => onNavigate('home')}
            className={`relative px-3.5 py-2 text-sm font-semibold transition-all rounded-xl flex items-center gap-2 ${
              currentTab === 'home'
                ? 'text-[#00DC82] bg-[#00DC82]/10 shadow-sm border border-[#00DC82]/20'
                : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
            }`}
            id="nav-home"
          >
            <Home className="w-4 h-4" />
            <span>Asosiy</span>
            {currentTab === 'home' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#00DC82] rounded-full w-1/2" />
            )}
          </button>

          <button
            onClick={() => onNavigate('manga')}
            className={`relative px-3.5 py-2 text-sm font-semibold transition-all rounded-xl flex items-center gap-2 ${
              currentTab === 'manga'
                ? 'text-[#00DC82] bg-[#00DC82]/10 shadow-sm border border-[#00DC82]/20'
                : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
            }`}
            id="nav-manga"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manga</span>
            {currentTab === 'manga' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#00DC82] rounded-full w-1/2" />
            )}
          </button>

          <button
            onClick={() => onNavigate('genres')}
            className={`relative px-3.5 py-2 text-sm font-semibold transition-all rounded-xl flex items-center gap-2 ${
              currentTab === 'genres'
                ? 'text-[#00DC82] bg-[#00DC82]/10 shadow-sm border border-[#00DC82]/20'
                : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
            }`}
            id="nav-genres"
          >
            <Compass className="w-4 h-4" />
            <span>Janrlar</span>
            {currentTab === 'genres' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#00DC82] rounded-full w-1/2" />
            )}
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Gold Coin Balance Pill */}
          <button
            onClick={onOpenCoins}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border border-amber-400/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_18px_rgba(245,158,11,0.35)] group select-none active:scale-95"
            title="Tilla tangalar balansi (Xarid qilish uchun bosing)"
            id="btn-coin-balance-header"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center shadow-sm text-[11px] font-bold text-black group-hover:rotate-12 transition-transform">
              🪙
            </div>
            <span className="font-bold text-xs tracking-tight text-amber-200">
              {(profile?.coins ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-semibold text-amber-400/80 hidden sm:inline">
              tanga
            </span>
            <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-bold ml-0.5 group-hover:bg-amber-400 group-hover:text-black transition-colors">
              +
            </span>
          </button>

          <button
            onClick={onOpenSearch}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0a1a10] border border-[#1e1e3a] flex items-center justify-center text-[#a0a0b8] hover:text-[#00DC82] hover:border-[#00DC82]/40 transition-all duration-200 shadow-sm"
            title="Qidirish"
            id="btn-search-header"
          >
            <Search className="w-4 h-4" />
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0a1a10] border border-[#00DC82]/40 hover:border-[#00DC82] flex items-center justify-center p-0.5 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(0,220,130,0.3)] active:scale-95 group overflow-hidden shrink-0 cursor-pointer"
                title={profile?.name || user.username || 'Profil menyusi'}
                id="btn-user-profile"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name || user.username || 'Profil'}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#00DC82]/30 via-[#00cec9]/20 to-[#6c5ce7]/30 flex items-center justify-center text-xs font-black text-[#00DC82]">
                    {(profile?.name || user.username || 'U')[0]?.toUpperCase()}
                  </div>
                )}
                {/* Online pulse indicator */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00DC82] border-2 border-[#020d07] shadow-sm" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-ios btn-ios-solid py-2 px-3.5 sm:px-4 text-xs font-bold text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,220,130,0.3)] hover:scale-105 transition-transform cursor-pointer"
              id="btn-login-header"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Kirish</span>
            </button>
          )}
        </div>

      </div>

      {/* PROFILE DROPDOWN MENU (Adapted for both Mobile and Desktop) */}
      {isProfileMenuOpen && user && (
        <>
          {/* Click outside to close backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsProfileMenuOpen(false)}
          />

          {/* Profile Card Popup - perfectly sized and positioned for mobile and desktop */}
          <div 
            className="fixed sm:absolute top-16 sm:top-20 right-3 sm:right-4 z-50 w-[calc(100vw-24px)] max-w-[300px] bg-[#0c0d1c] border border-white/15 rounded-[26px] p-3.5 shadow-2xl animate-fade-in"
            id="profile-dropdown-card"
          >
            {/* Top user profile header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#00DC82] via-[#00cec9] to-[#6c5ce7] p-0.5 shrink-0 shadow-md">
                <div className="w-full h-full rounded-[14px] bg-[#0a0a1a] overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-black text-[#00DC82]">
                      {(profile?.name || user.username)[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate max-w-[170px]">
                    {profile?.name || user.username}
                  </span>
                  <VerifiedBadge size="sm" />
                </div>
                <p className="text-xs text-white/50 truncate font-mono mt-0.5">@{user.username}</p>
              </div>
            </div>

            {/* Gold coin balance card with + To'ldirish button */}
            <div className="p-3 rounded-2xl bg-[#14121a] border border-amber-500/30 flex items-center justify-between shadow-inner my-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🪙</span>
                <span className="text-sm font-bold text-white">
                  {(profile?.coins ?? 0).toLocaleString()} tanga
                </span>
              </div>
              {onOpenCoins && (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenCoins();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
                >
                  + To'ldirish
                </button>
              )}
            </div>

            {/* Action buttons matching screenshot */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigate('profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 active:bg-white/15 transition text-left cursor-pointer"
              >
                <User className="w-4 h-4 text-[#00DC82] shrink-0" />
                <span>Mening profilim</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigate('profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 active:bg-white/15 transition text-left cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-[#00cec9] shrink-0" />
                <span>Saqlangan xatcho'plar</span>
              </button>

              {user.isAdmin && (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('admin');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 active:bg-white/15 transition text-left cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#a29bfe] shrink-0" />
                  <span>Admin Panel</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition text-left cursor-pointer mt-1 pt-2.5 border-t border-white/10"
                >
                  <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Chiqish</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};

