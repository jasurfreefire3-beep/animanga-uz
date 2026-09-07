import React, { useState } from 'react';
import { X, Star, Eye, Calendar, User, BookOpen, Bookmark, Share2, Play } from 'lucide-react';
import type { Manga, Chapter } from '../types.js';

interface MangaDetailModalProps {
  manga: Manga | null;
  onClose: () => void;
  onReadChapter: (chapter: Chapter) => void;
  isBookmarked: boolean;
  onToggleBookmark: (mangaId: number) => void;
}

export const MangaDetailModal: React.FC<MangaDetailModalProps> = ({
  manga,
  onClose,
  onReadChapter,
  isBookmarked,
  onToggleBookmark,
}) => {
  if (!manga) return null;

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const chapters = manga.chapters || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-[#0a0a1a] border border-[#1e1e3a] rounded-2xl overflow-hidden shadow-2xl my-auto text-left"
        id={`manga-detail-modal-${manga.id}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
          id="close-manga-detail-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner Header */}
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img
            src={manga.cover_image}
            alt={manga.title}
            className="w-full h-full object-cover blur-md scale-105 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/60 to-transparent" />
        </div>

        {/* Main Body */}
        <div className="relative px-6 pb-8 -mt-24 sm:-mt-32">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            
            {/* Cover Card */}
            <div className="w-36 sm:w-48 shrink-0 mx-auto sm:mx-0 shadow-2xl relative">
              <img
                src={manga.cover_image}
                alt={manga.title}
                className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-white/10 shadow-2xl"
              />
              <div className="absolute top-2 left-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00cec9] text-white uppercase shadow">
                  {manga.type}
                </span>
              </div>
            </div>

            {/* Info details */}
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  manga.status === 'dropped'
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                    : manga.status === 'completed'
                    ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
                    : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                }`}>
                  {manga.status === 'dropped' ? 'To\'xtatilgan' : manga.status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
                </span>
                <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current text-[#fdcb6e]" />
                  {manga.rating}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {manga.views} ko'rish
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {manga.title}
              </h1>

              {manga.alternative_titles && (
                <p className="text-xs text-[#a0a0b8] italic mb-3">
                  {manga.alternative_titles}
                </p>
              )}

              {/* Author, Artist, Year */}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#a0a0b8] mb-4 bg-[#141428]/60 p-3 rounded-xl border border-[#1e1e3a]/50">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#00DC82]" />
                  <span>Muallif: <strong className="text-white font-medium">{manga.author || 'Noma\'lum'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00cec9]" />
                  <span>Yil: <strong className="text-white font-medium">{manga.release_year || 2024}</strong></span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                {chapters.length > 0 && (
                  <button
                    onClick={() => onReadChapter(chapters[0])}
                    className="btn-ios btn-ios-solid text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    1-bobni o'qish
                  </button>
                )}

                <button
                  onClick={() => onToggleBookmark(manga.id)}
                  className={`btn-ios text-xs py-2 px-3.5 flex items-center gap-1.5 ${
                    isBookmarked ? 'bg-[#00DC82]/30 text-[#00DC82] border-[#00DC82]' : ''
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? 'Saqlangan' : 'Saqlash'}
                </button>

                <button
                  onClick={handleShare}
                  className="btn-ios text-xs py-2 px-3.5 flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copied ? 'Havola nusxalandi!' : 'Ulashish'}
                </button>
              </div>

              {/* Genres tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(manga.genres || '').split(',').map((genre, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#141428] text-white/80 border border-[#1e1e3a]"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <div>
                <h4 className="text-xs font-bold text-[#a0a0b8] uppercase tracking-wider mb-1">
                  Tavsif
                </h4>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-h-36 overflow-y-auto pr-2">
                  {manga.description}
                </p>
              </div>

            </div>
          </div>

          {/* Chapters List */}
          <div className="mt-8 pt-6 border-t border-[#1e1e3a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00DC82]" />
                <span>Boblar ro'yxati ({chapters.length})</span>
              </h3>
            </div>

            {chapters.length === 0 ? (
              <p className="text-xs text-[#a0a0b8] text-center py-6 bg-[#031408] rounded-xl">
                Ushbu manga uchun hozircha boblar kiritilmagan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {chapters.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => onReadChapter(ch)}
                    className="cursor-pointer p-3 rounded-xl bg-[#141428]/60 border border-[#1e1e3a] hover:border-[#00DC82]/50 hover:bg-[#00DC82]/10 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-[#00DC82] transition-colors">
                        {ch.chapter_number}-bob: {ch.title}
                      </span>
                      <p className="text-[10px] text-[#a0a0b8]">
                        {new Date(ch.release_date || Date.now()).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <button className="btn-ios btn-ios-sm py-1 px-2.5 text-[11px]">
                      O'qish
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
