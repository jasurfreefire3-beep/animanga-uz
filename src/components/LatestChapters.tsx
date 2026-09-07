import React from 'react';
import { BookOpen, Clock, ChevronRight, Eye } from 'lucide-react';
import type { Chapter } from '../types.js';

interface LatestChaptersProps {
  chapters: Chapter[];
  onReadChapter: (chapter: Chapter) => void;
  onViewAll?: () => void;
}

export const LatestChapters: React.FC<LatestChaptersProps> = ({
  chapters,
  onReadChapter,
  onViewAll,
}) => {
  return (
    <section className="bg-[#031408] py-10 border-y border-[#1e1e3a]/40" id="latest-chapters-section">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#00cec9]" />
            <span>So'nggi Boblar</span>
          </h2>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-[#fdcb6e] hover:text-[#ffeaa7] transition flex items-center gap-1 font-semibold"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {chapters.length === 0 ? (
          <div className="text-center text-[#a0a0b8] py-10 bg-[#0a0a1a]/40 rounded-xl border border-[#1e1e3a]">
            Hozircha hech qanday bob mavjud emas
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chapters.slice(0, 9).map((ch, idx) => (
              <div
                key={`latest-ch-${ch.id ?? 'item'}-${ch.manga_id ?? 'm'}-${ch.chapter_number ?? idx}-${idx}`}
                onClick={() => onReadChapter(ch)}
                className="cursor-pointer group flex items-center justify-between p-3 rounded-2xl ios-glass-card hover:border-[#00DC82]/50 transition-all duration-200"
                id={`latest-chapter-${ch.id || idx}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#00DC82]/10 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82] font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {ch.chapter_number}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#00DC82] transition-colors truncate">
                      {ch.manga_title || `Manga #${ch.manga_id}`}
                    </h4>
                    <p className="text-xs text-[#a0a0b8] truncate">
                      {ch.title || `${ch.chapter_number}-bob`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[11px] text-[#a0a0b8] flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#00DC82]" />
                    {ch.views || 0}
                  </span>
                  <span className="text-[11px] text-[#a0a0b8] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {new Date(ch.release_date || ch.created_at || Date.now()).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                  </span>
                  {Number(ch.price_coins || 0) > 0 ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 font-black text-xs shadow-sm">
                      <span>🪙</span>
                      <span>{ch.price_coins}</span>
                    </span>
                  ) : (
                    <button className="btn-ios btn-ios-sm py-1 px-2.5 text-xs">
                      O'qish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
