import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star } from 'lucide-react';
import type { Manga } from '../types.js';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mangas: Manga[];
  onSelectManga: (manga: Manga) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  mangas,
  onSelectManga,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = trimmedQuery
    ? mangas.filter((m) => {
        const titleMatch = m.title.toLowerCase().includes(trimmedQuery);
        const altMatch = m.alternative_titles?.toLowerCase().includes(trimmedQuery);
        const authorMatch = m.author?.toLowerCase().includes(trimmedQuery);
        const genreMatch = m.genres?.toLowerCase().includes(trimmedQuery);
        return titleMatch || altMatch || authorMatch || genreMatch;
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center pt-16 md:pt-28 px-4 bg-black/80 backdrop-blur-2xl animate-fade-in text-left select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      id="search-modal-backdrop"
    >
      {/* Top right iOS Glass Close Button */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full ios-glass text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl border border-white/20"
        title="Yopish (ESC)"
        id="btn-close-search"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Centered Search Bar Container (iPhone Spotlight Search Style) */}
      <div className="w-full max-w-xl">
        <div className="relative w-full">
          <Search className="w-5 h-5 text-[#00DC82] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Manga yoki manhva nomini qidiring..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full ios-glass rounded-2xl py-4 pl-12 pr-12 text-sm md:text-base text-white placeholder-white/40 outline-none shadow-2xl border border-white/20 focus:border-[#00DC82]/60 transition-all font-medium"
            id="search-input-field"
          />

          {/* Clear button if input is filled */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1 transition"
              title="Tozalash"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Real-time Results Dropdown */}
        {trimmedQuery && (
          <div className="mt-3 ios-glass rounded-[24px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden max-h-[60vh] overflow-y-auto divide-y divide-white/5 animate-fade-in">
            {filtered.length > 0 ? (
              filtered.map((manga) => (
                <div
                  key={manga.id}
                  onClick={() => {
                    onSelectManga(manga);
                    onClose();
                  }}
                  className="flex items-center gap-3.5 p-3 sm:p-3.5 hover:bg-white/10 transition-all cursor-pointer group active:bg-white/15"
                  id={`search-result-${manga.id}`}
                >
                  <img
                    src={manga.cover_image}
                    alt={manga.title}
                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl shrink-0 shadow-md group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white bg-[#229ED9]/30 border border-white/10 uppercase">
                        {manga.type || 'MANHWA'}
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current text-amber-400" />
                        {manga.rating}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-[#00DC82] truncate transition-colors">
                      {manga.title}
                    </h4>
                    {manga.alternative_titles && (
                      <p className="text-[11px] text-white/50 truncate font-sans">
                        {manga.alternative_titles}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/40">
                      <span>{manga.genres || 'Sarguzasht, Fantastika'}</span>
                      <span>&bull;</span>
                      <span>{manga.release_year || '2024'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-white/50 text-sm">
                <p>"{query}" bo'yicha hech qanday manga topilmadi.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
