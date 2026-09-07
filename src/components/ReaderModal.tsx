import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize,
  ArrowLeft, 
  List, 
  Smartphone, 
  Monitor, 
  ArrowUp, 
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  User,
  CheckCircle2
} from 'lucide-react';
import type { Manga, Chapter, UserProfile } from '../types.js';

interface ReaderModalProps {
  manga: Manga;
  chapter: Chapter;
  onClose: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  userProfile?: UserProfile | null;
  user?: { username: string; isAdmin?: boolean } | null;
  onOpenCoins?: () => void;
  onOpenAuth?: () => void;
  onChapterPurchased?: (newBalance: number, chapterId: number) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  manga,
  chapter,
  onClose,
  onSelectChapter,
  userProfile,
  user,
  onOpenCoins,
  onOpenAuth,
  onChapterPurchased,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [fitMode, setFitMode] = useState<'full' | 'wide' | 'compact'>('full');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showChapterList, setShowChapterList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Chapter purchase in Reader state
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const chapters = manga.chapters || [];
  // Sort chapters numerically
  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  const currentIndex = sortedChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

  // Access Control: Check if current chapter is unlocked
  const price = Number(chapter.price_coins || 0);
  const isUnlocked = React.useMemo(() => {
    if (price <= 0) return true;
    return Boolean(userProfile?.unlocked_chapters?.includes(chapter.id));
  }, [price, userProfile?.unlocked_chapters, chapter.id]);

  // Check next chapter lock status
  const nextPrice = nextChapter ? Number(nextChapter.price_coins || 0) : 0;
  const isNextUnlocked = nextChapter ? (nextPrice <= 0 || Boolean(userProfile?.unlocked_chapters?.includes(nextChapter.id))) : true;

  // Pages
  const pages = chapter.pages && chapter.pages.length > 0
    ? chapter.pages
    : [manga.cover_image];

  const handlePurchaseChapterInReader = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const username = user.username;
    const userCoins = Number(userProfile?.coins ?? 0);

    if (userCoins < price) {
      if (onOpenCoins) onOpenCoins();
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bobni sotib olishda xatolik yuz berdi');
      }

      setPurchaseSuccess(data.message || 'Bob muvaffaqiyatli ochildi!');
      if (onChapterPurchased && data.remaining_coins !== undefined) {
        onChapterPurchased(data.remaining_coins, chapter.id);
      }
      setTimeout(() => {
        setPurchaseSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPurchaseError(err.message || 'Bobni sotib olishda xatolik yuz berdi');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Scroll to top on chapter change
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    setImageErrors({});
    setCurrentVisiblePage(1);
  }, [chapter.id]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showChapterList) {
          setShowChapterList(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && prevChapter) {
        onSelectChapter(prevChapter);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        onSelectChapter(nextChapter);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === ' ') {
        // Toggle controls
        setShowControls((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, showChapterList, onClose]);

  // Track visible page on scroll
  const handleScroll = () => {
    if (!viewportRef.current) return;
    const scrollTop = viewportRef.current.scrollTop;
    const viewportHeight = viewportRef.current.clientHeight;
    const midPoint = scrollTop + viewportHeight / 2;

    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i];
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.clientHeight;
        if (midPoint >= top && midPoint <= bottom) {
          setCurrentVisiblePage(i + 1);
          break;
        }
      }
    }
  };

  const handleImageRetry = (idx: number) => {
    setImageErrors((prev) => ({ ...prev, [idx]: false }));
  };

  // Determine container width based on fitMode & zoom
  const getMaxWidthClass = () => {
    if (fitMode === 'full') return 'w-full max-w-none';
    if (fitMode === 'wide') return 'w-full max-w-4xl';
    return 'w-full max-w-2xl';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col overflow-hidden select-none animate-fade-in">
      
      {/* Top sticky control bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 bg-[#060814]/95 backdrop-blur-md border-b border-[#1e1e3a]/80 px-3 sm:px-4 py-2.5 transition-transform duration-300 flex items-center justify-between shadow-2xl ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="btn-ios btn-ios-sm py-1.5 px-3 flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10"
            title="Chiqish"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Ortga</span>
          </button>
          
          <div className="min-w-0 pl-1">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {manga.title}
            </h2>
            <button
              onClick={() => setShowChapterList(!showChapterList)}
              className="flex items-center gap-1 text-[11px] sm:text-xs text-[#00DC82] hover:text-[#55ffb0] transition-colors truncate text-left cursor-pointer"
            >
              <span className="font-semibold">{chapter.chapter_number}-bob:</span>
              <span className="text-zinc-300 truncate">{chapter.title || `${chapter.chapter_number}-bob`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showChapterList ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Fit Mode Switcher (Hidden on mobile, only visible on desktop/computer) */}
          <div className="hidden md:flex items-center bg-[#141428] rounded-xl p-0.5 border border-[#1e1e3a]">
            <button
              onClick={() => setFitMode('full')}
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                fitMode === 'full' ? 'bg-[#00DC82] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="To'liq ekran (100% Yopishgan)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[11px]">To'liq</span>
            </button>
            <button
              onClick={() => setFitMode('wide')}
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                fitMode === 'wide' ? 'bg-[#00DC82] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Keng rejim"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="text-[11px]">Keng</span>
            </button>
          </div>

          {/* Chapter selector dropdown toggle */}
          <button
            onClick={() => setShowChapterList(!showChapterList)}
            className="btn-ios btn-ios-sm p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl border border-white/10 cursor-pointer"
            title="Boblar ro'yxati"
          >
            <List className="w-4 h-4 text-[#00DC82]" />
            <span className="hidden sm:inline text-xs font-medium">Boblar</span>
          </button>

          {/* Prev / Next chapter buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={!prevChapter}
              onClick={() => prevChapter && onSelectChapter(prevChapter)}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Oldingi bob"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              disabled={!nextChapter}
              onClick={() => nextChapter && onSelectChapter(nextChapter)}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Keyingi bob"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen toggle button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer hidden sm:flex items-center justify-center"
            title={isFullscreen ? "Ekranni kichraytirish" : "To'liq ekranga olish"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-600 transition-colors ml-0.5 cursor-pointer"
            title="O'qishni yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chapters list drawer modal */}
      {showChapterList && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex justify-end animate-fade-in"
          onClick={() => setShowChapterList(false)}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-[#0a0a1a] h-full border-l border-[#1e1e3a] p-4 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1e1e3a] mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Boblar ro'yxati</h3>
                <p className="text-xs text-zinc-400">Jami {sortedChapters.length} ta bob mavjud</p>
              </div>
              <button
                onClick={() => setShowChapterList(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {sortedChapters.map((ch) => {
                const isCurrent = ch.id === chapter.id;
                const chPrice = Number(ch.price_coins || 0);
                const isChUnlocked = chPrice <= 0 || Boolean(userProfile?.unlocked_chapters?.includes(ch.id));

                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSelectChapter(ch);
                      setShowChapterList(false);
                    }}
                    className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition cursor-pointer border ${
                      isCurrent
                        ? 'bg-[#00DC82]/10 border-[#00DC82]/40 text-[#00DC82] font-bold'
                        : 'bg-[#141428]/60 hover:bg-[#141428] border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{ch.chapter_number}-bob: {ch.title || `${ch.chapter_number}-bob`}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {ch.pages ? `${ch.pages.length} ta rasm` : '1 ta rasm'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chPrice > 0 ? (
                        isChUnlocked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Ochiq</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>🪙 {chPrice}</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-medium text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                          Bepul
                        </span>
                      )}

                      {isCurrent && (
                        <span className="text-[10px] uppercase font-mono tracking-wider bg-[#00DC82] text-black px-2 py-0.5 rounded-md font-bold">
                          Hozirgi
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pages Viewport OR Paywall Screen */}
      {!isUnlocked ? (
        /* LOCKED PAYWALL OVERLAY (No page leakage!) */
        <div 
          className="flex-1 w-full overflow-y-auto bg-black flex items-center justify-center p-4"
          onClick={() => setShowControls((prev) => !prev)}
        >
          <div 
            className="w-full max-w-md bg-[#0a0a1a]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glows */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Lock Coin Icon */}
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-0.5 shadow-xl shadow-amber-500/20 mb-4 flex items-center justify-center">
              <div className="w-full h-full bg-[#0e0c1f] rounded-[22px] flex items-center justify-center text-3xl sm:text-4xl">
                🪙
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              Pullik bob
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5">
              {chapter.chapter_number}-bobni mutolaa qilish
            </h2>
            <p className="text-xs text-zinc-400 mb-5">
              <strong className="text-white">{manga.title}</strong>
              {chapter.title ? ` — "${chapter.title}"` : ''}
            </p>

            {/* Price & Balance Box */}
            <div className="bg-[#141428] border border-white/10 rounded-2xl p-4 mb-5 space-y-2.5 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Bob narxi:</span>
                <span className="text-amber-300 font-extrabold text-sm flex items-center gap-1.5">
                  <span>🪙 {price} tanga</span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    ({(price * 100).toLocaleString()} so'm)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-zinc-400">Sizning balansingiz:</span>
                <span className="text-white font-bold flex items-center gap-1">
                  <span>🪙 {(userProfile?.coins ?? 0).toLocaleString()} tanga</span>
                </span>
              </div>

              {user && (userProfile?.coins ?? 0) < price && (
                <div className="pt-2 text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Balansingizda yana {price - (userProfile?.coins ?? 0)} ta tanga yetishmayapti.
                  </span>
                </div>
              )}
            </div>

            {/* Error or Success banner */}
            {purchaseError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            {purchaseSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {!user ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full min-h-[48px] btn-ios btn-ios-solid bg-[#00DC82] hover:bg-[#00b368] text-black font-extrabold text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-[#00DC82]/20 active:scale-95 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Kirish yoki Ro'yxatdan o'tish</span>
                </button>
              ) : (userProfile?.coins ?? 0) >= price ? (
                <button
                  type="button"
                  onClick={handlePurchaseChapterInReader}
                  disabled={isPurchasing}
                  className="w-full min-h-[48px] btn-ios btn-ios-solid bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                >
                  {isPurchasing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ochilmoqda...</span>
                    </span>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>{price} tangaga ochish va o'qish</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCoins}
                  className="w-full min-h-[48px] btn-ios btn-ios-solid bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                >
                  <span>🪙</span>
                  <span>Tanga xarid qilish (TezChek)</span>
                </button>
              )}

              <div className="flex items-center gap-2 pt-2">
                {prevChapter && (
                  <button
                    type="button"
                    onClick={() => onSelectChapter(prevChapter)}
                    className="flex-1 btn-ios py-2.5 px-3 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{prevChapter.chapter_number}-bobga o'tish</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-ios py-2.5 px-3 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Orqaga qaytish
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pages Viewport (True Seamless Webtoon vertical scroll) */
        <div 
          ref={viewportRef}
          onScroll={handleScroll}
          onClick={() => setShowControls((prev) => !prev)}
          className="flex-1 overflow-y-auto bg-black flex flex-col items-center p-0 m-0 cursor-default scroll-smooth relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div 
            className={`flex flex-col items-center p-0 m-0 gap-0 transition-all duration-200 ${getMaxWidthClass()}`}
            style={{ width: fitMode === 'full' ? '100%' : `${zoomLevel}%` }}
          >
            {pages.map((imgUrl, idx) => (
              <div 
                key={idx} 
                ref={(el) => (pageRefs.current[idx] = el)}
                className="relative w-full p-0 m-0 border-0 leading-none bg-black"
                style={{ lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}
              >
                {imageErrors[idx] ? (
                  <div className="w-full h-64 bg-[#0a0a1a] flex flex-col items-center justify-center p-6 text-center border-b border-[#1e1e3a]">
                    <p className="text-xs text-rose-400 mb-2">{idx + 1}-rasmni yuklab bo'lmadi</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageRetry(idx);
                      }}
                      className="btn-ios btn-ios-sm py-1.5 px-3 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Qayta yuklash</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={imgUrl}
                    alt={`${chapter.chapter_number}-bob: Sahifa ${idx + 1}`}
                    className="w-full h-auto block select-none p-0 m-0 border-0 align-bottom"
                    style={{ display: 'block', margin: 0, padding: 0, border: 'none', verticalAlign: 'bottom' }}
                    loading={idx < 4 ? 'eager' : 'lazy'}
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [idx]: true }));
                    }}
                  />
                )}
              </div>
            ))}

            {/* End of chapter notice & Actions */}
            <div 
              className="w-full py-12 px-4 sm:px-6 my-0 text-center bg-[#070913] border-t border-[#1e1e3a]/60 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00DC82]/10 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82] mb-3">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                {chapter.chapter_number}-bob yakunlandi!
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
                AniManga Uz platformasi orqali maroqli mutolaa qilganingizdan mamnunmiz.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    onClick={() => onSelectChapter(prevChapter)}
                    className="btn-ios py-2.5 px-4 text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Oldingi bob ({prevChapter.chapter_number})</span>
                  </button>
                )}

                {nextChapter ? (
                  <button
                    onClick={() => onSelectChapter(nextChapter)}
                    className={`btn-ios btn-ios-solid py-2.5 px-6 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg cursor-pointer ${
                      !isNextUnlocked
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-amber-500/20'
                        : 'shadow-[#00DC82]/20'
                    }`}
                  >
                    <span>
                      Keyingi bob ({nextChapter.chapter_number}-bob)
                      {!isNextUnlocked && ` 🔒 🪙${nextPrice}`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/30">
                    🎉 Bu hozirgi eng so'nggi bob
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="btn-ios py-2.5 px-4 text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer"
                >
                  Tafsilotlarga qaytish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Page Indicator and Quick Navigation Bar */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 flex items-center gap-2 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-70 hover:opacity-100 translate-y-1'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0a0a1a]/90 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs font-medium text-white">
          <button
            disabled={!prevChapter}
            onClick={() => prevChapter && onSelectChapter(prevChapter)}
            className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Oldingi bob"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] text-zinc-300">
            <span className="text-[#00DC82] font-bold">{currentVisiblePage}</span> / {pages.length}
          </span>

          <button
            disabled={!nextChapter}
            onClick={() => nextChapter && onSelectChapter(nextChapter)}
            className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Keyingi bob"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-3.5 bg-white/10"></div>

          <button
            onClick={() => {
              if (viewportRef.current) {
                viewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="text-zinc-400 hover:text-[#00DC82] transition cursor-pointer flex items-center gap-1"
            title="Eng tepaga qaytish"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};

