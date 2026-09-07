import React from 'react';
import type { GenreItem } from '../lib/genresData.js';

interface GenreCardProps {
  genre: GenreItem;
  onClick: () => void;
}

export const GenreCard: React.FC<GenreCardProps> = ({ genre, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-5 md:p-6 rounded-xl border border-white/10 transition text-center overflow-hidden group hover:-translate-y-1 hover:shadow-xl duration-300 bg-gradient-to-br ${genre.gradient} cursor-pointer`}
      id={`genre-card-${genre.slug}`}
    >
      {/* Background image */}
      {genre.image && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60"
          style={{ backgroundImage: `url("${genre.image}")` }}
        />
      )}

      {/* Dark overlay for strong contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />

      {/* Text Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[64px]">
        <h3 className="font-bold text-base md:text-lg mb-1 text-white group-hover:text-[#00DC82] transition-colors leading-tight">
          {genre.name}
        </h3>
        <p className="text-xs md:text-sm text-white/75 font-medium">
          {genre.manga_count} ta manga
        </p>
      </div>
    </div>
  );
};
