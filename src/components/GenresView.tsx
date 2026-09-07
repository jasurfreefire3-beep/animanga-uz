import React, { useMemo } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Manga, Genre } from '../types.js';
import { MangaCard } from './MangaCard.js';
import { GenreCard } from './GenreCard.js';
import { getStandardGenres } from '../lib/genresData.js';

interface GenresViewProps {
  genres: Genre[];
  mangas: Manga[];
  selectedGenre: string | null;
  onSelectGenre: (slug: string | null) => void;
  onSelectManga: (manga: Manga) => void;
}

export const GenresView: React.FC<GenresViewProps> = ({
  genres,
  mangas,
  selectedGenre,
  onSelectGenre,
  onSelectManga,
}) => {
  // Compute standard genres list with accurate counts matching mangas
  const displayGenres = useMemo(() => {
    return getStandardGenres(mangas, genres);
  }, [mangas, genres]);

  // Mangas filtered by selected genre
  const filteredMangas = useMemo(() => {
    if (!selectedGenre) return [];
    const targetSlug = selectedGenre.toLowerCase();
    return mangas.filter((m) => {
      const gSlugs = (m.genre_slugs || '').toLowerCase();
      const gNames = (m.genres || '').toLowerCase();
      return gSlugs.includes(targetSlug) || gNames.includes(targetSlug);
    });
  }, [mangas, selectedGenre]);

  const activeGenreInfo = useMemo(() => {
    if (!selectedGenre) return null;
    const found = displayGenres.find(
      (g) => g.slug.toLowerCase() === selectedGenre.toLowerCase()
    );
    if (found) return found;

    return {
      id: 0,
      name: selectedGenre,
      slug: selectedGenre,
      manga_count: filteredMangas.length,
      gradient: 'from-[#00DC82]/30 to-[#00DC82]/10 border-[#00DC82]/30',
      image: '',
    };
  }, [displayGenres, selectedGenre, filteredMangas]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-left animate-fade-in" id="genres-page-container">
      
      {/* CASE 1: SPECIFIC GENRE SELECTED -> Show its mangas directly */}
      {selectedGenre && activeGenreInfo ? (
        <div>
          {/* Breadcrumb & Back header */}
          <div className="flex items-center gap-2 text-sm text-[#a0a0b8] mb-6 flex-wrap">
            <button
              onClick={() => onSelectGenre(null)}
              className="hover:text-[#00DC82] transition flex items-center gap-1 font-medium"
            >
              <span>Janrlar</span>
            </button>
            <span className="text-[#2a2a4a]">/</span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span>{activeGenreInfo.name}</span>
            </span>

            <button
              onClick={() => onSelectGenre(null)}
              className="ml-auto btn-ios btn-ios-sm py-1.5 px-3.5 flex items-center gap-1.5 text-xs"
              id="btn-back-to-all-genres"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Barcha janrlar</span>
            </button>
          </div>

          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8 pb-4 border-b border-[#1e1e3a]">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
                <svg
                  className="inline-block shrink-0 text-[#fdcb6e]"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l9.29-9.29a2 2 0 0 0 0-2.83L15.17 2.71A2 2 0 0 0 13.66 2z" />
                  <circle cx="7" cy="7" r="2" />
                </svg>
                <span>{activeGenreInfo.name}</span>
              </h1>
              <p className="text-xs md:text-sm text-[#a0a0b8] mt-1">
                "{activeGenreInfo.name}" janridagi manga va manhvalar to'plami
              </p>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-[#00DC82]/10 border border-[#00DC82]/30 text-[#00DC82] font-semibold w-fit">
              {filteredMangas.length} ta asar
            </span>
          </div>

          {/* Mangas Grid */}
          {filteredMangas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMangas.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  onClick={() => onSelectManga(manga)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#0a0a1a]/60 border border-[#1e1e3a]/60 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#fdcb6e]/10 border border-[#fdcb6e]/20 flex items-center justify-center text-[#fdcb6e] mx-auto mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Hozircha mangalar mavjud emas
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-5">
                "{activeGenreInfo.name}" janriga tez orada yangi mangalar qo'shiladi.
              </p>
              <button
                onClick={() => onSelectGenre(null)}
                className="btn-ios btn-ios-solid text-xs py-2 px-5 font-bold"
              >
                Boshqa janrlarni ko'rish
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CASE 2: ALL GENRES VIEW (Wiwi.uz direct clone) */
        <div>
          {/* Main Title matching Wiwi.uz */}
          <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <svg
              className="inline-block shrink-0 text-[#fdcb6e]"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l9.29-9.29a2 2 0 0 0 0-2.83L15.17 2.71A2 2 0 0 0 13.66 2z" />
              <circle cx="7" cy="7" r="2" />
            </svg>
            <span>Janrlar</span>
          </h1>

          {/* Wiwi.uz Exact 10 Genres Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayGenres.map((genre) => (
              <GenreCard
                key={genre.slug}
                genre={genre}
                onClick={() => onSelectGenre(genre.slug)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
