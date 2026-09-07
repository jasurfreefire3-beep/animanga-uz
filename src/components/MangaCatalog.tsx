import React, { useState, useMemo, useEffect } from 'react';
import type { Manga, Genre } from '../types.js';

interface MangaCatalogProps {
  mangas: Manga[];
  genres?: Genre[];
  selectedGenre?: string | null;
  onSelectGenre?: (genre: string | null) => void;
  onSelectManga: (manga: Manga) => void;
  initialType?: string | null;
}

export const MangaCatalog: React.FC<MangaCatalogProps> = ({
  mangas,
  onSelectManga,
  initialType,
}) => {
  // Sort state: 'latest' | 'popular' | 'rating' (default: 'latest' like Wiwi.uz)
  const [activeSort, setActiveSort] = useState<'latest' | 'popular' | 'rating'>(() => {
    if (initialType === 'popular') return 'popular';
    if (initialType === 'rating') return 'rating';
    return 'latest';
  });

  // Type filter: 'manga' | 'manhwa' | 'manhua' | null
  const [activeType, setActiveType] = useState<string | null>(() => {
    if (initialType && ['manga', 'manhwa', 'manhua'].includes(initialType)) {
      return initialType;
    }
    return null;
  });

  // Status filter: 'ongoing' | 'completed' | null
  const [activeStatus, setActiveStatus] = useState<'ongoing' | 'completed' | null>(null);

  // Synchronize when initialType changes from navigation (e.g., footer links)
  useEffect(() => {
    if (initialType) {
      if (['popular', 'latest', 'rating'].includes(initialType)) {
        setActiveSort(initialType as any);
      } else if (['manga', 'manhwa', 'manhua'].includes(initialType)) {
        setActiveType(initialType);
      }
    }
  }, [initialType]);

  const toggleType = (type: string) => {
    setActiveType(prev => (prev === type ? null : type));
  };

  const toggleStatus = (status: 'ongoing' | 'completed') => {
    setActiveStatus(prev => (prev === status ? null : status));
  };

  // Filter and sort mangas
  const displayedMangas = useMemo(() => {
    return mangas.filter(m => {
      if (activeType && m.type?.toLowerCase() !== activeType.toLowerCase()) {
        return false;
      }
      if (activeStatus && m.status?.toLowerCase() !== activeStatus.toLowerCase()) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (activeSort === 'popular') {
        return (b.views || 0) - (a.views || 0);
      }
      if (activeSort === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // 'latest' default
      return (b.id || 0) - (a.id || 0);
    });
  }, [mangas, activeType, activeStatus, activeSort]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-left animate-fade-in" id="manga-page-container">
      
      {/* Exact Wiwi.uz Header Title */}
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <svg
          className="inline-block shrink-0 text-[#6c5ce7]"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Barcha Manga</span>
      </h1>

      {/* Wiwi.uz Exact Filter Pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        
        {/* 1. Eng so'nggi */}
        <button
          onClick={() => setActiveSort('latest')}
          className={`btn-ios btn-ios-sm ${activeSort === 'latest' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-latest"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Eng songgi</span>
        </button>

        {/* 2. Mashhur */}
        <button
          onClick={() => setActiveSort('popular')}
          className={`btn-ios btn-ios-sm ${activeSort === 'popular' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-popular"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          <span>Mashhur</span>
        </button>

        {/* 3. Eng yaxshi */}
        <button
          onClick={() => setActiveSort('rating')}
          className={`btn-ios btn-ios-sm ${activeSort === 'rating' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-rating"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Eng yaxshi</span>
        </button>

        {/* 4. Manga */}
        <button
          onClick={() => toggleType('manga')}
          className={`btn-ios btn-ios-sm ${activeType === 'manga' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-manga"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Manga</span>
        </button>

        {/* 5. Manhwa */}
        <button
          onClick={() => toggleType('manhwa')}
          className={`btn-ios btn-ios-sm ${activeType === 'manhwa' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-manhwa"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Manhwa</span>
        </button>

        {/* 6. Manhua */}
        <button
          onClick={() => toggleType('manhua')}
          className={`btn-ios btn-ios-sm ${activeType === 'manhua' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-manhua"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Manhua</span>
        </button>

        {/* 7. Davom etmoqda */}
        <button
          onClick={() => toggleStatus('ongoing')}
          className={`btn-ios btn-ios-sm ${activeStatus === 'ongoing' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-ongoing"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span>Davom etmoqda</span>
        </button>

        {/* 8. Tugallangan */}
        <button
          onClick={() => toggleStatus('completed')}
          className={`btn-ios btn-ios-sm ${activeStatus === 'completed' ? 'btn-ios-solid' : ''}`}
          id="btn-filter-completed"
        >
          <svg
            className="inline-block shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Tugallangan</span>
        </button>

      </div>

      {/* Wiwi.uz Exact Manga Grid */}
      {displayedMangas.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedMangas.map((manga) => (
            <div
              key={manga.id}
              onClick={() => onSelectManga(manga)}
              className="block cursor-pointer group"
              id={`manga-card-${manga.id}`}
            >
              {/* Cover Card with Aspect Ratio 3 / 4 */}
              <div
                className="group relative overflow-hidden rounded-xl bg-[#0a0a1a]"
                style={{ aspectRatio: '3 / 4' }}
              >
                <img
                  src={manga.cover_image}
                  alt={manga.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-110"
                />
                
                {/* Top Badges (Exact Wiwi.uz HTML) */}
                <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-1.5 md:p-2 pointer-events-none">
                  <span className="text-[7px] md:text-[10px] font-bold px-1 py-0.5 md:px-1.5 md:py-0.5 rounded-[4px] md:rounded-md text-white shadow-lg bg-[#00cec9]/80 uppercase">
                    {manga.type || 'MANHWA'}
                  </span>
                  <span className="text-[7px] md:text-[10px] font-bold px-1 py-0.5 md:px-1.5 md:py-0.5 rounded-[4px] md:rounded-md bg-black/60 text-white/90 shadow-lg backdrop-blur-sm">
                    {manga.release_year || 2024}
                  </span>
                </div>
              </div>

              {/* Title (Exact Wiwi.uz typography) */}
              <h3 className="text-[11px] md:text-sm font-semibold text-white leading-tight line-clamp-2 mt-1 group-hover:text-[#00DC82] transition-colors">
                {manga.title}
              </h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-[#0a0a1a]/60 rounded-2xl border border-[#1e1e3a]/60 max-w-md mx-auto">
          <p className="text-base text-white font-bold mb-1">Manga topilmadi</p>
          <p className="text-xs text-[#a0a0b8]">Tanlangan filtr bo'yicha hozircha asarlar mavjud emas</p>
        </div>
      )}

    </div>
  );
};
