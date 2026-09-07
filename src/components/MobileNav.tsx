import React from 'react';
import { Home, BookOpen, Compass, User } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  user?: { username: string; isAdmin?: boolean } | null;
  onOpenAuth?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onNavigate, user, onOpenAuth }) => {
  const handleProfileClick = () => {
    if (user) {
      onNavigate('profile');
    } else {
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        onNavigate('profile');
      }
    }
  };

  return (
    <div className="fixed bottom-3 left-4 right-4 z-50 md:hidden pointer-events-none">
      <nav className="pointer-events-auto max-w-md mx-auto ios-floating-dock flex items-center justify-around px-3 py-2 shadow-[0_15px_35px_rgba(0,0,0,0.7)]">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl text-[10px] font-bold transition-all active:scale-90 ${
            currentTab === 'home'
              ? 'text-[#00DC82] bg-white/10 shadow-inner border border-[#00DC82]/30'
              : 'text-white/60 hover:text-white'
          }`}
          id="mobile-nav-home"
        >
          <Home className="w-5 h-5" />
          <span>Asosiy</span>
        </button>

        <button
          onClick={() => onNavigate('manga')}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl text-[10px] font-bold transition-all active:scale-90 ${
            currentTab === 'manga'
              ? 'text-[#00DC82] bg-white/10 shadow-inner border border-[#00DC82]/30'
              : 'text-white/60 hover:text-white'
          }`}
          id="mobile-nav-manga"
        >
          <BookOpen className="w-5 h-5" />
          <span>Manga</span>
        </button>

        <button
          onClick={() => onNavigate('genres')}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl text-[10px] font-bold transition-all active:scale-90 ${
            currentTab === 'genres'
              ? 'text-[#00DC82] bg-white/10 shadow-inner border border-[#00DC82]/30'
              : 'text-white/60 hover:text-white'
          }`}
          id="mobile-nav-genres"
        >
          <Compass className="w-5 h-5" />
          <span>Janrlar</span>
        </button>

        <button
          onClick={handleProfileClick}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl text-[10px] font-bold transition-all active:scale-90 ${
            currentTab === 'profile' && user
              ? 'text-[#00DC82] bg-white/10 shadow-inner border border-[#00DC82]/30'
              : 'text-white/60 hover:text-white'
          }`}
          id="mobile-nav-profile"
        >
          <User className="w-5 h-5" />
          <span>{user ? 'Profil' : 'Kirish'}</span>
        </button>
      </nav>
    </div>
  );
};

