import React from 'react';
import type { Manga } from '../types.js';

interface MangaCardProps {
  manga: Manga;
  onClick: () => void;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer group block text-left"
      id={`manga-card-${manga.id}`}
    >
      <div 
        className="group relative overflow-hidden rounded-[20px] bg-[#051109] ios-glass-card p-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
        style={{ aspectRatio: '3 / 4.1' }}
      >
        <img
          src={manga.cover_image}
          alt={manga.title}
          loading="lazy"
          className="w-full h-full object-cover rounded-[16px] transition-all duration-500 ease-out md:group-hover:scale-105 filter group-hover:brightness-110"
        />

        {/* Specular overlay on hover */}
        <div className="absolute inset-0 rounded-[16px] bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges (iOS Frosted Glass Pills) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-1">
          <span className="text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-lg ios-glass-pill uppercase tracking-wider bg-[#229ED9]/40 border-white/20">
            {manga.type || 'MANHWA'}
          </span>
          <span className="text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-emerald-300 shadow-lg backdrop-blur-md border border-white/10 font-mono">
            ★ {manga.rating || '4.9'}
          </span>
        </div>

        {/* Bottom Year / Chapters info pill */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="text-[8px] md:text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/70 text-white/90 shadow-md backdrop-blur-md border border-white/10 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00DC82]"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            {manga.views || 0}
          </span>
          <span className="text-[8px] md:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00DC82]/20 text-[#00DC82] border border-[#00DC82]/40 backdrop-blur-md">
            {manga.chapter_count || 1}+ bob
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[12px] md:text-sm font-bold text-white leading-tight line-clamp-2 mt-2 px-0.5 group-hover:text-[#00DC82] transition-colors">
        {manga.title}
      </h3>
    </div>
  );
};
