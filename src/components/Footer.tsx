import React from 'react';
import { Send, Mail, BookOpen, Compass, Shield } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="relative mt-auto overflow-hidden text-left" id="site-footer">
      <div className="absolute inset-0 bg-gradient-to-b from-[#020d07] via-[#031408] to-[#020d07]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DC82]/50 to-transparent" />
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#fdcb6e]/30 to-transparent blur-sm" />

      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
        
        {/* Desktop Grid Layout */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-1">
            <div 
              onClick={() => onNavigate('home')}
              className="cursor-pointer inline-flex items-center mb-4 group select-none"
            >
              <img
                src="https://files.catbox.moe/8odaud.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
                alt="AniManga Uz"
                className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_2px_10px_rgba(0,220,130,0.2)]"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-sm text-[#a0a0b8] leading-relaxed mb-4">
              Eng yaxshi manga, manhwa va manhua sayti. Yangi boblarni birinchi bo'lib o'qing!
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://t.me/Animanga_org"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#141428] border border-[#1e1e3a] flex items-center justify-center text-[#a0a0b8] hover:text-[#0088cc] hover:border-[#0088cc]/50 hover:bg-[#0088cc]/10 transition-all duration-300 group"
                title="Telegram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </a>
              <a
                href="mailto:support@animem.uz"
                className="w-9 h-9 rounded-full bg-[#141428] border border-[#1e1e3a] flex items-center justify-center text-[#a0a0b8] hover:text-[#fd79a8] hover:border-[#fd79a8]/50 hover:bg-[#fd79a8]/10 transition-all duration-300 group"
                title="Email"
              >
                <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Section: Bo'limlar */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#00DC82]" />
              <span>Bo'limlar</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onNavigate('manga')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00DC82] opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen className="w-3.5 h-3.5 text-[#00DC82]" />
                <span>Manga</span>
              </button>
              <button
                onClick={() => onNavigate('manga', 'manhwa')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00cec9] opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen className="w-3.5 h-3.5 text-[#00cec9]" />
                <span>Manhwa</span>
              </button>
              <button
                onClick={() => onNavigate('manga', 'manhua')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#fd79a8] opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen className="w-3.5 h-3.5 text-[#fd79a8]" />
                <span>Manhua</span>
              </button>
              <button
                onClick={() => onNavigate('genres')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#fdcb6e] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Compass className="w-3.5 h-3.5 text-[#fdcb6e]" />
                <span>Janrlar</span>
              </button>
            </div>
          </div>

          {/* Section: Mashhur Janrlar */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#00cec9]" />
              <span>Mashhur Janrlar</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              {[
                { name: 'Harakat', slug: 'action' },
                { name: 'Romantika', slug: 'romance' },
                { name: 'Fantastika', slug: 'fantasy' },
                { name: 'Komediya', slug: 'comedy' },
                { name: 'Triller', slug: 'thriller' },
              ].map((g) => (
                <button
                  key={g.slug}
                  onClick={() => onNavigate('genres', g.slug)}
                  className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#00DC82] transition-colors" />
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Ma'lumot va Saralash */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#fdcb6e]" />
              <span>Saralash & Tizim</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onNavigate('manga', 'popular')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#fdcb6e] transition-colors" />
                <span>Mashhurlar</span>
              </button>
              <button
                onClick={() => onNavigate('manga', 'latest')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#00cec9] transition-colors" />
                <span>Yangi qo'shilganlar</span>
              </button>
              <button
                onClick={() => onNavigate('manga', 'rating')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#6c5ce7] transition-colors" />
                <span>Eng yaxshilar</span>
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className="text-sm text-[#a0a0b8] hover:text-white transition flex items-center gap-2.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#00DC82] transition-colors" />
                <span>Shaxsiy profil</span>
              </button>
            </div>
          </div>

        </div>

        {/* Mobile View */}
        <div className="flex flex-col md:hidden gap-6">
          <div className="text-center">
            <div 
              onClick={() => onNavigate('home')}
              className="cursor-pointer inline-flex items-center mb-3 group select-none"
            >
              <img
                src="https://files.catbox.moe/8odaud.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
                alt="AniManga Uz"
                className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_2px_8px_rgba(0,220,130,0.2)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-xs text-[#a0a0b8] leading-relaxed max-w-xs mx-auto">
              Eng yaxshi manga, manhwa va manhua sayti. Yangi boblarni birinchi bo'lib o'qing!
            </p>
          </div>

          <div className="bg-[#0a0a1a]/60 rounded-2xl border border-[#1e1e3a]/50 p-4">
            <div className="grid grid-cols-3 gap-4 text-left">
              <div>
                <h4 className="text-xs font-semibold text-white/80 mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-3 rounded-full bg-[#00DC82]" />
                  <span>Bo'limlar</span>
                </h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => onNavigate('manga')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Manga</button>
                  <button onClick={() => onNavigate('manga', 'manhwa')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Manhwa</button>
                  <button onClick={() => onNavigate('genres')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Janrlar</button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/80 mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-3 rounded-full bg-[#00cec9]" />
                  <span>Janrlar</span>
                </h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => onNavigate('genres', 'action')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Harakat</button>
                  <button onClick={() => onNavigate('genres', 'romance')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Romantika</button>
                  <button onClick={() => onNavigate('genres', 'fantasy')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Fantastika</button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/80 mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-3 rounded-full bg-[#6c5ce7]" />
                  <span>Tizim</span>
                </h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => onNavigate('manga', 'latest')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Yangi boblar</button>
                  <button onClick={() => onNavigate('manga', 'popular')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Mashhurlar</button>
                  <button onClick={() => onNavigate('profile')} className="text-xs text-[#a0a0b8] hover:text-white text-left">Profil</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & tagline */}
        <div className="relative mt-12 pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e1e3a] to-transparent" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#5a5a7a]">
              © {new Date().getFullYear()} AniManga Uz. Barcha huquqlar himoyalangan.
            </p>
            <p className="text-xs text-[#5a5a7a] flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[#00DC82]/60 inline-block" />
              <span>Sevimli mangalaringiz uchun eng yaxshi platforma</span>
              <span className="w-1 h-1 rounded-full bg-[#fd79a8]/60 inline-block" />
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
};
