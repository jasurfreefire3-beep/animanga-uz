import React, { useMemo } from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import type { Manga, Genre } from '../types.js';
import { getStandardGenres } from '../lib/genresData.js';
import { GenreCard } from './GenreCard.js';

interface GenreSectionProps {
  genres: Genre[];
  mangas: Manga[];
  onSelectGenre: (genreSlug: string) => void;
  onViewAll?: () => void;
}

export const GenreSection: React.FC<GenreSectionProps> = ({
  genres,
  mangas,
  onSelectGenre,
  onViewAll,
}) => {
  const standardGenres = useMemo(() => {
    return getStandardGenres(mangas, genres);
  }, [mangas, genres]);

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 text-left" id="genres-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
          <Tag className="w-5 h-5 text-[#fdcb6e]" />
          <span>Janrlar bo'yicha toping</span>
        </h2>
        <button
          onClick={() => (onViewAll ? onViewAll() : onSelectGenre(''))}
          className="text-xs md:text-sm text-[#a0a0b8] hover:text-[#00DC82] transition flex items-center gap-1 font-medium"
        >
          <span>Barcha janrlar</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of the exact 10 Genres */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {standardGenres.map((genre) => (
          <GenreCard
            key={genre.slug}
            genre={genre}
            onClick={() => onSelectGenre(genre.slug)}
          />
        ))}
      </div>
    </section>
  );
};
