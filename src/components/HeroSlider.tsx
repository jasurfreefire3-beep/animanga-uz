import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Sparkles } from 'lucide-react';
import type { Manga } from '../types.js';

interface HeroSliderProps {
  mangas: Manga[];
  onSelectManga: (manga: Manga) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ mangas, onSelectManga }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter mangas selected by admin for the banner
  const bannerMangas = mangas.filter(m => m.is_banner);
  const featured = bannerMangas.length > 0 ? bannerMangas : mangas.slice(0, 5);

  useEffect(() => {
    if (currentIndex >= featured.length) {
      setCurrentIndex(0);
    }
  }, [featured.length, currentIndex]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const current = featured[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? featured.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6" id="hero-slider-section">
      <div className="relative overflow-hidden ios-glass rounded-[28px] sm:rounded-[36px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Slide item */}
        <div 
          onClick={() => onSelectManga(current)}
          className="cursor-pointer block relative aspect-[16/10] sm:aspect-[21/9] md:aspect-[3/1] overflow-hidden rounded-[28px] sm:rounded-[36px] group"
        >
          {/* Blurred Background Image */}
          <img
            src={current.cover_image}
            alt={current.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 transition-transform duration-1000 group-hover:scale-125"
          />

          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020d07]/95 via-[#020d07]/80 to-[#020d07]/30" />

          {/* Content Flex */}
          <div className="absolute inset-0 flex items-center">
            <div className="flex w-full h-full items-center justify-between px-5 sm:px-8 lg:pl-16 lg:pr-14">
              
              {/* Text Info */}
              <div className="max-w-lg ml-0 lg:ml-6 z-10">
                {/* Status badge with iOS glass pill */}
                <div className="mb-2 lg:mb-3">
                  <span className={`text-[10px] md:text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md shadow-md border ${
                    current.status === 'dropped'
                      ? 'text-rose-300 bg-rose-500/20 border-rose-500/40'
                      : current.status === 'completed'
                      ? 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40'
                      : 'text-[#00DC82] bg-[#00DC82]/20 border-[#00DC82]/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {current.status === 'dropped' ? 'To\'xtatilgan' : current.status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 lg:mb-3 leading-tight tracking-tight group-hover:text-[#00DC82] transition-colors">
                  {current.title}
                </h2>

                {/* Synopsis */}
                <p className="text-xs lg:text-sm text-white/70 line-clamp-2 md:line-clamp-3 max-w-md hidden sm:block leading-relaxed font-normal">
                  {current.description}
                </p>

                {/* Badges & Rating */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mt-3 text-xs text-white/80">
                  <span className="text-[10px] md:text-xs font-bold px-3 py-1 rounded-full text-white inline-flex items-center gap-1 ios-glass-pill uppercase shadow-md bg-[#229ED9]/30">
                    {current.type || 'MANHWA'}
                  </span>
                  <span className="flex items-center gap-1 text-amber-300 font-bold px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-amber-400/30 font-mono">
                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                    {current.rating}
                  </span>
                  <span className="text-[11px] text-white/60 hidden sm:inline px-2 py-0.5 rounded-full bg-white/5">
                    {current.release_year} yil
                  </span>
                </div>
              </div>

              {/* Cover Art Floating Card */}
              <div className="flex-shrink-0 relative w-24 sm:w-36 md:w-44 lg:w-56 z-10 transition-transform duration-500 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00DC82]/30 to-[#229ED9]/30 rounded-2xl blur-xl translate-x-2 translate-y-2 opacity-80" />
                <img
                  src={current.cover_image}
                  alt={current.title}
                  className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl ring-1 ring-white/30 relative"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Prev / Next iOS Glass Controls */}
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full ios-glass text-white items-center justify-center hover:scale-105 transition z-20 shadow-xl border border-white/20 active:scale-95"
          title="Oldingi"
          id="hero-prev-btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full ios-glass text-white items-center justify-center hover:scale-105 transition z-20 shadow-xl border border-white/20 active:scale-95"
          title="Keyingi"
          id="hero-next-btn"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicator dots (iOS style bar pills) */}
        <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 px-3 py-1.5 rounded-full ios-glass border border-white/10">
          {featured.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex
                  ? 'bg-[#00DC82] w-6 h-2 shadow-[0_0_8px_#00DC82]'
                  : 'bg-white/30 hover:bg-white/60 w-2 h-2'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
