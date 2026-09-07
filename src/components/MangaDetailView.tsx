import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Bookmark, 
  Heart,
  Calendar, 
  Star, 
  Eye, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Share2, 
  MessageSquare, 
  BarChart2, 
  Send, 
  ThumbsUp, 
  Check,
  Clock,
  Sparkles,
  Layers,
  ArrowLeft,
  Lock,
  Unlock,
  Coins,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  LogIn
} from 'lucide-react';
import type { Manga, Chapter, UserProfile } from '../types.js';
import { VerifiedBadge } from './VerifiedBadge.js';
import { setMangaSEO, resetDefaultSEO } from '../utils/seo.js';

interface MangaDetailViewProps {
  manga: Manga;
  isFetchingChapters?: boolean;
  onBack: () => void;
  onGoHome: () => void;
  onGoCatalog: () => void;
  onSelectGenre: (genreSlug: string) => void;
  onReadChapter: (chapter: Chapter) => void;
  isBookmarked: boolean;
  onToggleBookmark: (mangaId: number) => void;
  isLiked?: boolean;
  onToggleLike?: (mangaId: number) => void;
  onAddComment?: (comment: { manga_id: number; manga_title: string; chapter_number?: number | string; text: string; user_name?: string; avatar_url?: string }) => void;
  onOpenCoins?: () => void;
  onOpenAuth?: () => void;
  onChapterPurchased?: (newBalance: number, chapterId: number) => void;
  userProfile?: UserProfile | null;
  user: { username: string; isAdmin?: boolean } | null;
}

interface CommentItem {
  id: string;
  username: string;
  avatarText: string;
  avatarUrl?: string;
  text: string;
  date: string;
  likes: number;
  isLiked?: boolean;
}

export const MangaDetailView: React.FC<MangaDetailViewProps> = ({
  manga,
  isFetchingChapters,
  onBack,
  onGoHome,
  onGoCatalog,
  onSelectGenre,
  onReadChapter,
  isBookmarked,
  onToggleBookmark,
  isLiked = false,
  onToggleLike,
  onAddComment,
  onOpenCoins,
  onOpenAuth,
  onChapterPurchased,
  userProfile,
  user,
}) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'comments' | 'stats'>('chapters');
  const [sortAsc, setSortAsc] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chapter purchase modal state
  const [purchasingChapter, setPurchasingChapter] = useState<Chapter | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const isChapterUnlocked = (ch: Chapter) => {
    const price = Number(ch.price_coins || 0);
    if (price <= 0) return true;
    return Boolean(userProfile?.unlocked_chapters?.includes(ch.id));
  };

  const handleChapterClick = (ch: Chapter) => {
    if (isChapterUnlocked(ch)) {
      onReadChapter(ch);
    } else {
      setPurchasingChapter(ch);
      setPurchaseError(null);
      setPurchaseSuccessMessage(null);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchasingChapter) return;
    if (!user) {
      setPurchasingChapter(null);
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const username = user.username || userProfile?.username || '';
    const userCoins = Number(userProfile?.coins ?? 0);
    const price = Number(purchasingChapter.price_coins || 0);

    if (userCoins < price) {
      setPurchaseError(`Tangalaringiz yetarli emas (${userCoins} tanga bor, ${price} tanga kerak).`);
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError(null);

    try {
      const resp = await fetch(`/api/chapters/${purchasingChapter.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Bobni sotib olishda xatolik yuz berdi');
      }

      setPurchaseSuccessMessage(data.message || 'Bob muvaffaqiyatli ochildi!');
      if (onChapterPurchased && data.remaining_coins !== undefined) {
        onChapterPurchased(data.remaining_coins, purchasingChapter.id);
      }

      setTimeout(() => {
        const unlockedCh = purchasingChapter;
        setPurchasingChapter(null);
        setPurchaseSuccessMessage(null);
        if (unlockedCh) {
          onReadChapter(unlockedCh);
        }
      }, 1200);
    } catch (err: any) {
      setPurchaseError(err.message || 'Bobni sotib olishda xatolik yuz berdi');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Real comments state, initially populated from userProfile for this manga
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>(() => {
    const userMangaComments: CommentItem[] = (userProfile?.comments || [])
      .filter((c) => c.manga_id === manga.id)
      .map((c) => ({
        id: c.id,
        username: c.user_name || userProfile?.name || user?.username || 'User',
        avatarText: (c.user_name || userProfile?.name || 'U')[0]?.toUpperCase() || 'U',
        avatarUrl: c.avatar_url || userProfile?.avatar_url,
        text: c.text,
        date: c.date,
        likes: c.likes || 0,
      }));
    return userMangaComments;
  });

  // Fetch real comments from server for this manga
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/manga/${manga.id}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const userMangaComments = (userProfile?.comments || [])
            .filter((c) => c.manga_id === manga.id)
            .map((c) => ({
              id: c.id,
              username: c.user_name || userProfile?.name || user?.username || 'User',
              avatarText: (c.user_name || userProfile?.name || 'U')[0]?.toUpperCase() || 'U',
              avatarUrl: c.avatar_url || userProfile?.avatar_url,
              text: c.text,
              date: c.date,
              likes: c.likes || 0,
            }));

          const dbComments: CommentItem[] = data.map((r: any) => ({
            id: String(r.id),
            username: r.name || r.username || 'Foydalanuvchi',
            avatarText: (r.name || r.username || 'F')[0]?.toUpperCase() || 'F',
            avatarUrl: r.avatar_url,
            text: r.text,
            date: r.created_at || new Date().toISOString().split('T')[0],
            likes: Number(r.likes || 0),
          }));

          // Merge without duplicates
          const seenIds = new Set(dbComments.map((c) => String(c.id)));
          const filteredUserComments = userMangaComments.filter((c) => !seenIds.has(String(c.id)));
          setComments([...dbComments, ...filteredUserComments]);
        }
      })
      .catch((err) => console.warn('Failed to load manga comments:', err));

    return () => {
      isMounted = false;
    };
  }, [manga.id, userProfile]);

  // Professional Dynamic SEO (Title, Tavsif, URL, Rating Ball & Schema.org)
  useEffect(() => {
    setMangaSEO(manga, comments.length);
    return () => {
      resetDefaultSEO();
    };
  }, [manga, comments.length]);

  const chapters = manga.chapters || [];

  const sortedChapters = useMemo(() => {
    const list = [...chapters];
    list.sort((a, b) => {
      const numA = Number(a.chapter_number);
      const numB = Number(b.chapter_number);
      return sortAsc ? numA - numB : numB - numA;
    });
    return list;
  }, [chapters, sortAsc]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const cleanText = commentText.trim();
    if (!cleanText) return;

    const authorUsername = user.username || userProfile?.username || 'user';
    const authorName = userProfile?.name || user.username || 'Foydalanuvchi';
    const authorAvatar = userProfile?.avatar_url || '';
    const tempId = Date.now().toString();

    const optimisticComment: CommentItem = {
      id: tempId,
      username: authorName,
      avatarText: authorName[0]?.toUpperCase() || 'U',
      avatarUrl: authorAvatar,
      text: cleanText,
      date: new Date().toISOString().split('T')[0],
      likes: 0,
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setCommentText('');

    if (onAddComment) {
      onAddComment({
        manga_id: manga.id,
        manga_title: manga.title,
        text: cleanText,
        user_name: authorName,
        avatar_url: authorAvatar,
      });
    }

    // Persist real comment to backend
    fetch(`/api/manga/${manga.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authorUsername,
        name: authorName,
        avatar_url: authorAvatar,
        text: cleanText,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((newDbComm) => {
        if (newDbComm) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === tempId
                ? {
                    ...c,
                    id: String(newDbComm.id),
                    username: newDbComm.name || newDbComm.username,
                    avatarUrl: newDbComm.avatar_url,
                  }
                : c
            )
          );
        }
      })
      .catch((err) => console.warn('Save comment error:', err));
  };

  const handleToggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isLiked = !c.isLiked;
          return {
            ...c,
            likes: isLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
            isLiked,
          };
        }
        return c;
      })
    );

    fetch(`/api/comments/${id}/like`, { method: 'POST' }).catch((err) =>
      console.warn('Like comment error:', err)
    );
  };

  const handleDeleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      const username = user?.username || userProfile?.username || '';
      const isAdmin = Boolean(user?.isAdmin || userProfile?.isAdmin);
      await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, isAdmin }),
      });
    } catch (e) {
      console.warn('Delete comment error:', e);
    }
  };

  // Extract genres list
  const genresArray = (manga.genres || 'Action, Fantasy')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const firstChapter = chapters.length > 0 
    ? [...chapters].sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number))[0] 
    : null;

  return (
    <div className="relative text-left animate-fade-in" id="manga-detail-page">
      
      {/* Dynamic Background Banner (Direct Wiwi replica) */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000"
          style={{ backgroundImage: `url("${manga.cover_image}")` }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020d07] via-[#020d07]/90 to-[#020d07]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020d07]/90 via-transparent to-[#020d07]/50" />

        {/* Inner Container */}
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
          
          {/* Breadcrumbs Row */}
          <div className="flex items-center gap-2 text-sm text-[#a0a0b8] mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={onGoHome}
              className="hover:text-[#00DC82] transition flex items-center gap-1.5 shrink-0"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Bosh sahifa</span>
            </button>
            <span className="text-[#2a2a4a]">/</span>
            <button
              onClick={onGoCatalog}
              className="hover:text-[#00DC82] transition whitespace-nowrap shrink-0"
            >
              Katalog
            </button>
            <span className="text-[#2a2a4a]">/</span>
            <span className="text-white/90 font-medium truncate max-w-[240px]">
              {manga.title}
            </span>

            {/* Back button */}
            <button
              onClick={onBack}
              className="ml-auto btn-ios btn-ios-sm py-1 px-3 text-xs flex items-center gap-1 shrink-0"
              title="Orqaga"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Orqaga</span>
            </button>
          </div>

          {/* MOBILE HERO SECTION (screens < md) */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="flex gap-3.5 items-start">
              {/* Poster */}
              <div className="relative w-28 sm:w-32 aspect-[3/4.2] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 shrink-0">
                <img
                  src={manga.cover_image}
                  alt={`${manga.title} o'zbek tilida manga muqovasi (Reyting: ${manga.rating || 5.0}★) - AniManga Uz`}
                  title={`${manga.title} - Reyting: ${manga.rating || 5.0} / 5 ball. AniManga Uz platformasida o'zbek tilida bepul o'qing.`}
                  loading="eager"
                  itemProp="image"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#00cec9] text-white uppercase shadow">
                  {manga.type === 'manhwa' ? 'Manhva' : manga.type === 'manhua' ? 'Manhua' : 'Manga'}
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight line-clamp-2">
                    {manga.title}
                  </h1>
                  {manga.alternative_titles && (
                    <p className="text-[11px] text-[#a0a0b8] italic line-clamp-1 mt-0.5">
                      {manga.alternative_titles}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md text-white flex items-center gap-1 ${
                      manga.status === 'dropped'
                        ? 'bg-red-500/80'
                        : manga.status === 'completed'
                        ? 'bg-blue-500/80'
                        : 'bg-emerald-500/80'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{manga.status === 'dropped' ? "To'xtatilgan" : manga.status === 'completed' ? "Tugallangan" : "Davom etmoqda"}</span>
                    </span>

                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {manga.age_rating || 16}+
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-3 text-xs text-[#a0a0b8] pt-2 border-t border-white/10 mt-2">
                  <span className="flex items-center gap-1 text-[#fdcb6e] font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{manga.rating || 8.5}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#00DC82] font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{manga.views || 0}</span>
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-[#00cec9]" />
                    <span>{manga.release_year || 2024}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex gap-2 w-full pt-1">
              <button
                onClick={() => firstChapter && handleChapterClick(firstChapter)}
                disabled={!firstChapter}
                className="flex-1 min-h-[46px] ios-glass-btn-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 py-3 rounded-2xl shadow-lg active:scale-95 cursor-pointer"
                id="btn-start-reading-mobile"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>O'qish</span>
              </button>

              <button
                onClick={() => onToggleBookmark(manga.id)}
                className={`min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass active:scale-90 cursor-pointer ${
                  isBookmarked ? 'text-[#00DC82] border-[#00DC82]/50 bg-[#00DC82]/20' : 'text-white/60 hover:text-[#00DC82]'
                }`}
                title={isBookmarked ? 'Saqlangan' : 'Saqlash'}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => onToggleLike && onToggleLike(manga.id)}
                className={`min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass active:scale-90 cursor-pointer ${
                  isLiked ? 'text-[#fd79a8] border-[#fd79a8]/50 bg-[#fd79a8]/20' : 'text-white/60 hover:text-[#fd79a8]'
                }`}
                title={isLiked ? 'Yoqtirilgan' : 'Yoqtirish'}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass text-white/60 hover:text-white active:scale-90 cursor-pointer"
                title="Ulashish"
              >
                {copied ? <Check className="w-4 h-4 text-[#00DC82]" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Main Layout: Left Column (Poster) & Right Column (Meta & Content) */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
            
            {/* Left Column: Poster + Read/Bookmark Buttons + Stats (Hidden on mobile, shown on md+) */}
            <div className="hidden md:block w-full max-w-[220px] sm:max-w-[260px] md:w-64 flex-shrink-0 mx-auto md:mx-0">
              
              {/* Cover Card with glow ring */}
              <div className="group relative mx-auto w-40 sm:w-52 md:w-full">
                <img
                  src={manga.cover_image}
                  alt={`${manga.title} o'zbek tilida manga muqovasi (Reyting: ${manga.rating || 5.0}★) - AniManga Uz`}
                  title={`${manga.title} - Reyting: ${manga.rating || 5.0} / 5 ball. AniManga Uz platformasida o'zbek tilida bepul o'qing.`}
                  loading="eager"
                  itemProp="image"
                  className="w-full rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02] aspect-[3/4.2] object-cover"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 group-hover:ring-[#00DC82]/30 transition pointer-events-none" />
                
                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#00cec9] text-white uppercase shadow-md">
                    {manga.type === 'manhwa' ? 'Manhva' : manga.type === 'manhua' ? 'Manhua' : 'Manga'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: O'qish + Bookmark + Like + Share */}
              <div className="flex gap-2 mt-4 sm:mt-5 w-full">
                <button
                  onClick={() => firstChapter && handleChapterClick(firstChapter)}
                  disabled={!firstChapter}
                  className="flex-1 min-h-[46px] ios-glass-btn-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 py-3 rounded-2xl shadow-lg active:scale-95 cursor-pointer"
                  id="btn-start-reading"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>O'qish</span>
                </button>

                <button
                  onClick={() => onToggleBookmark(manga.id)}
                  className={`min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass active:scale-90 cursor-pointer ${
                    isBookmarked 
                      ? 'text-[#00DC82] border-[#00DC82]/50 bg-[#00DC82]/20' 
                      : 'text-white/60 hover:text-[#00DC82]'
                  }`}
                  title={isBookmarked ? 'Saqlangan' : 'Saqlash'}
                  id="btn-toggle-bookmark"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => onToggleLike && onToggleLike(manga.id)}
                  className={`min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass active:scale-90 cursor-pointer ${
                    isLiked 
                      ? 'text-[#fd79a8] border-[#fd79a8]/50 bg-[#fd79a8]/20' 
                      : 'text-white/60 hover:text-[#fd79a8]'
                  }`}
                  title={isLiked ? 'Yoqtirilgan' : 'Yoqtirish'}
                  id="btn-toggle-like"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="min-w-[46px] min-h-[46px] rounded-2xl flex items-center justify-center transition ios-glass text-white/60 hover:text-white active:scale-90 cursor-pointer"
                  title="Ulashish"
                >
                  {copied ? <Check className="w-4 h-4 text-[#00DC82]" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Alternative Title */}
              {manga.alternative_titles && (
                <p className="text-xs text-[#a0a0b8] text-center truncate mt-2.5 italic">
                  {manga.alternative_titles}
                </p>
              )}

              {/* Meta Stats Row (Year | Rating | Views) */}
              <div className="flex items-center justify-around gap-2 text-xs text-[#a0a0b8] mt-3 py-2 px-3 rounded-xl bg-[#0a120c]/70 border border-[#1e1e3a]/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00cec9]" />
                  <span className="font-semibold text-zinc-200">{manga.release_year || 2024}</span>
                </span>

                <span className="w-px h-3.5 bg-[#2a2a4a]" />

                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#fdcb6e] fill-[#fdcb6e]" />
                  <span className="font-semibold text-zinc-200">{manga.rating || 8.5}</span>
                </span>

                <span className="w-px h-3.5 bg-[#2a2a4a]" />

                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#00DC82]" />
                  <span className="font-semibold text-zinc-200">{manga.views || 0}</span>
                </span>
              </div>

            </div>

            {/* Right Column: Title, Badges, Genres, Synopsis, Tabs, Chapters List */}
            <div className="flex-1 w-full min-w-0 pt-0 md:pt-2 text-left">
              
              {/* Manga Title (Hidden on mobile, shown on md+) */}
              <h1 className="hidden md:block text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                {manga.title}
              </h1>

              {/* Badges (Status, Type, Age rating) (Hidden on mobile, shown on md+) */}
              <div className="hidden md:flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3.5">
                
                {/* Status Badge */}
                <span className={`text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg text-white flex items-center gap-1.5 ${
                  manga.status === 'dropped'
                    ? 'bg-red-500/80 shadow-red-500/20'
                    : manga.status === 'completed'
                    ? 'bg-blue-500/80 shadow-blue-500/20'
                    : 'bg-emerald-500/80 shadow-emerald-500/20'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
                  <span>
                    {manga.status === 'dropped' ? "To'xtatilgan" : manga.status === 'completed' ? "Tugallangan" : "Davom etmoqda"}
                  </span>
                </span>

                {/* Type Badge */}
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg text-white flex items-center gap-1.5 shadow-sm bg-[#00cec9]/80">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="capitalize">
                    {manga.type === 'manhwa' ? 'Manhva' : manga.type === 'manhua' ? 'Manhua' : 'Manga'}
                  </span>
                </span>

                {/* Age Rating Badge */}
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 border bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {manga.age_rating || 16}+
                </span>
              </div>

              {/* Genres Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                {genresArray.map((genre, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectGenre(genre.toLowerCase())}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#fdcb6e]/10 text-[#fdcb6e] border border-[#fdcb6e]/20 hover:bg-[#fdcb6e]/20 hover:border-[#fdcb6e]/40 transition font-medium"
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* Author & Artist Row */}
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-[#a0a0b8] mb-5 flex-wrap">
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#141428] flex items-center justify-center text-[#00DC82]">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-white/50">Muallif:</span>
                  <strong className="text-white font-medium">{manga.author || "Noma'lum"}</strong>
                </span>

                {manga.artist && (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#141428] flex items-center justify-center text-[#00cec9]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-white/50">Rassom:</span>
                    <strong className="text-white font-medium">{manga.artist}</strong>
                  </span>
                )}
              </div>

              {/* Synopsis with Expandable "Batafsil / Qisqartirish" */}
              <div className="mb-6">
                <div className="bg-[#141428]/40 border border-[#2a2a4a]/50 rounded-xl p-4 text-center md:text-left">
                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: isDescExpanded ? '1000px' : '80px' }}
                  >
                    <p className="text-sm text-[#a0a0b8] leading-relaxed">
                      {manga.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-sm text-[#00DC82] hover:text-[#00b368] transition mt-2 font-medium inline-flex items-center gap-1"
                  >
                    <span>{isDescExpanded ? 'Qisqartirish' : 'Batafsil'}</span>
                    {isDescExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Navigation: Boblar | Izohlar | Statistika */}
              <div className="flex items-center justify-center md:justify-start gap-1 border-b border-[#2a2a4a] mb-6">
                <button
                  onClick={() => setActiveTab('chapters')}
                  className={`px-5 py-3 text-sm font-medium transition relative rounded-t-xl ${
                    activeTab === 'chapters'
                      ? 'text-[#00DC82] bg-[#00DC82]/5 font-bold'
                      : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Boblar</span>
                  <span className="ml-1.5 text-xs text-[#00DC82]/80">({chapters.length})</span>
                  {activeTab === 'chapters' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00DC82] rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-5 py-3 text-sm font-medium transition relative rounded-t-xl ${
                    activeTab === 'comments'
                      ? 'text-[#00DC82] bg-[#00DC82]/5 font-bold'
                      : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Izohlar</span>
                  <span className="ml-1.5 text-xs text-[#a0a0b8]/80">({comments.length})</span>
                  {activeTab === 'comments' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00DC82] rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-5 py-3 text-sm font-medium transition relative rounded-t-xl ${
                    activeTab === 'stats'
                      ? 'text-[#00DC82] bg-[#00DC82]/5 font-bold'
                      : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Statistika</span>
                  {activeTab === 'stats' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00DC82] rounded-full" />
                  )}
                </button>
              </div>

              {/* TAB 1: BOBLAR (Exact Wiwi chapter item design) */}
              {activeTab === 'chapters' && (
                <div className="text-center md:text-left">
                  
                  {/* Filter & Count Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      className="flex items-center gap-2 text-sm text-[#00DC82] hover:text-white transition px-4 py-2 rounded-xl bg-[#00DC82]/10 border border-[#00DC82]/20 hover:bg-[#00DC82]/20 hover:border-[#00DC82]/40 active:scale-95 font-semibold"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>{sortAsc ? 'Eski' : 'Yangi'}</span>
                    </button>
                    <span className="text-sm text-[#a0a0b8]">
                      {chapters.length} ta bob
                    </span>
                  </div>

                  {/* Chapters List */}
                  {isFetchingChapters ? (
                    <div className="p-8 text-center bg-[#141428]/30 rounded-2xl border border-[#2a2a4a]/40">
                      <div className="w-8 h-8 border-4 border-[#00DC82]/20 border-t-[#00DC82] rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm text-zinc-300 font-semibold mb-1">
                        Boblar yuklanmoqda...
                      </p>
                      <p className="text-xs text-[#a0a0b8]">
                        Iltimos kutib turing.
                      </p>
                    </div>
                  ) : sortedChapters.length === 0 ? (
                    <div className="p-8 text-center bg-[#141428]/30 rounded-2xl border border-[#2a2a4a]/40">
                      <p className="text-sm text-zinc-300 font-semibold mb-1">
                        Hozircha boblar kiritilmagan
                      </p>
                      <p className="text-xs text-[#a0a0b8]">
                        Yaqin kunlarda yangi boblar yuklanadi.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {sortedChapters.map((ch, idx) => {
                        const price = Number(ch.price_coins || 0);
                        const isUnlocked = isChapterUnlocked(ch);

                        return (
                          <div
                            key={`manga-ch-${ch.id ?? 'item'}-${ch.chapter_number ?? idx}-${idx}`}
                            onClick={() => handleChapterClick(ch)}
                            className={`relative flex items-center justify-between px-4 py-3.5 rounded-2xl ios-glass-card transition-all duration-300 group overflow-hidden cursor-pointer active:scale-[0.99] ${
                              !isUnlocked && price > 0
                                ? 'border-l-4 border-l-amber-400 border-white/10'
                                : 'border-l-4 border-l-[#00DC82] border-white/10 hover:border-white/20'
                            }`}
                          >
                            {/* Hover light sheen */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#00DC82]/0 via-[#00DC82]/0 to-[#00DC82]/0 group-hover:from-[#00DC82]/5 transition-all duration-500" />

                            {/* Left: Folded Number Badge + Title */}
                            <div className="flex items-center gap-4 relative z-10">
                              
                              {/* Signature Folded Number Badge */}
                              <span className="relative w-11 h-12 flex items-center justify-center shrink-0">
                                <span 
                                  className={`absolute inset-0 shadow-lg transition-all duration-300 ${
                                    !isUnlocked && price > 0
                                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-amber-500/20 group-hover:shadow-amber-500/40'
                                      : 'bg-gradient-to-b from-[#00DC82] to-[#00b368] shadow-[#00DC82]/20 group-hover:shadow-[#00DC82]/40'
                                  }`}
                                  style={{ borderRadius: '10px 4px' }}
                                />
                                <span className="absolute -top-px -right-px w-0 h-0 border-t-[10px] border-r-[10px] border-t-[#020d07] border-r-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                                <span 
                                  className="relative text-sm font-bold text-[#020d07] drop-shadow-sm"
                                  style={{ fontFeatureSettings: '"tnum"' }}
                                >
                                  {ch.chapter_number}
                                </span>
                              </span>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-white group-hover:text-[#00DC82] transition-colors duration-300">
                                    {ch.chapter_number}-bob {ch.title ? `- ${ch.title}` : ''}
                                  </p>
                                  {price > 0 && (
                                    isUnlocked ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <Unlock className="w-2.5 h-2.5" />
                                        <span>Ochiq</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>🪙 {price} tanga</span>
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-[11px] text-[#a0a0b8] mt-0.5 sm:hidden">
                                  {new Date(ch.release_date || Date.now()).toISOString().split('T')[0]}
                                </p>
                              </div>
                            </div>

                            {/* Right: Views & Date pill */}
                            <div className="flex items-center gap-2 text-xs text-[#a0a0b8] flex-shrink-0 relative z-10">
                              {!isUnlocked && price > 0 ? (
                                <button className="btn-ios btn-ios-solid bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-1 px-3 flex items-center gap-1.5 shadow-md shadow-amber-500/20">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Ochish</span>
                                </button>
                              ) : (
                                <>
                                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141428]/60 border border-[#2a2a4a]/30">
                                    <Eye className="w-3 h-3 opacity-70 text-[#00DC82]" />
                                    <span>{Number(ch.views || 0).toLocaleString()}</span>
                                  </span>
                                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141428]/60 border border-[#2a2a4a]/30">
                                    <Calendar className="w-3 h-3 opacity-70 text-[#00cec9]" />
                                    <span>{new Date(ch.release_date || Date.now()).toISOString().split('T')[0]}</span>
                                  </span>
                                </>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: IZOHLAR (Comments) - Mobile & Desktop Responsive */}
              {activeTab === 'comments' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* If user not logged in, prompt to log in */}
                  {!user ? (
                    <div className="bg-[#141428]/80 border border-[#00DC82]/30 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#00DC82]/15 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82] mx-auto mb-3 shadow-inner">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mb-1.5">
                        Izoh yozish uchun avval tizimga kiring
                      </h4>
                      <p className="text-xs text-[#a0a0b8] max-w-md mx-auto mb-4 leading-relaxed">
                        Ushbu manga haqida fikr bildirish, fikr almashish va boshqa kitobxonlar bilan muloqot qilish uchun hisobingizga kiring yoki ro'yxatdan o'ting.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenAuth) onOpenAuth();
                        }}
                        className="btn-ios btn-ios-solid px-6 py-2.5 text-xs sm:text-sm font-bold text-black inline-flex items-center gap-2 shadow-[0_0_20px_rgba(0,220,130,0.3)] active:scale-95 cursor-pointer"
                        id="btn-comment-login-trigger"
                      >
                        <LogIn className="w-4 h-4 text-black" />
                        <span>Tizimga kirish / Ro'yxatdan o'tish</span>
                      </button>
                    </div>
                  ) : (
                    /* New comment input form */
                    <form onSubmit={handleAddComment} className="bg-[#141428]/60 border border-[#2a2a4a]/60 rounded-2xl p-3.5 sm:p-4 shadow-lg backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                        {userProfile?.avatar_url ? (
                          <img
                            src={userProfile.avatar_url}
                            alt={userProfile.name || user.username}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-[#00DC82]/50 bg-[#070612] shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://files.catbox.moe/g244x0.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00DC82]/20 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82] font-bold text-xs sm:text-sm shrink-0">
                            {(userProfile?.name || user.username || 'U')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                              {userProfile?.name || user.username}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00DC82]/15 text-[#00DC82] border border-[#00DC82]/30 font-semibold shrink-0">
                              Profilingiz
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-[#a0a0b8] truncate">
                            Manga haqida fikringizni yozib qoldiring
                          </span>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Ushbu manga haqida nima deb o'ylaysiz? Fikringizni qoldiring..."
                        className="w-full bg-[#020d07] border border-[#2a2a4a] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#00DC82] transition-colors resize-none leading-relaxed"
                      />

                      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                        <span className="text-[11px] text-[#a0a0b8] inline-flex items-center gap-1">
                          <span className="truncate max-w-[140px] sm:max-w-none">{userProfile?.name || user.username}</span>
                          <VerifiedBadge size="sm" />
                        </span>
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="btn-ios btn-ios-solid text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px] active:scale-95 ml-auto cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Yuborish</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Real Comments list */}
                  {comments.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-[#141428]/30 border border-[#2a2a4a]/40">
                      <div className="w-12 h-12 rounded-2xl bg-[#00DC82]/10 border border-[#00DC82]/20 flex items-center justify-center text-xl mx-auto mb-3">
                        💬
                      </div>
                      <p className="text-sm font-semibold text-zinc-200 mb-1">
                        Hozircha hech qanday izoh qoldirilmagan
                      </p>
                      <p className="text-xs text-[#a0a0b8] max-w-sm mx-auto">
                        Ushbu manga haqida birinchi bo'lib o'z fikringiz va taassurotlaringizni qoldiring!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => {
                        const isAuthor = Boolean(
                          (user?.username && c.username.toLowerCase() === user.username.toLowerCase()) ||
                          (userProfile?.name && c.username.toLowerCase() === userProfile.name.toLowerCase())
                        );
                        const canDelete = isAuthor || user?.isAdmin || userProfile?.isAdmin;

                        return (
                          <div
                            key={c.id}
                            className="p-3.5 sm:p-4 rounded-2xl bg-[#141428]/40 border border-[#2a2a4a]/40 hover:border-[#2a2a4a]/70 transition-all duration-200"
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              {c.avatarUrl ? (
                                <img
                                  src={c.avatarUrl}
                                  alt={c.username}
                                  className="w-9 h-9 rounded-xl object-cover border border-[#00DC82]/40 bg-[#070612] shrink-0 shadow-sm"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://files.catbox.moe/g244x0.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-[#00DC82]/20 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82] font-bold text-xs shrink-0">
                                  {c.avatarText}
                                </div>
                              )}

                              {/* Comment Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1 truncate">
                                      <span>{c.username}</span>
                                      <VerifiedBadge size="sm" />
                                    </p>
                                    {isAuthor && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00DC82]/20 text-[#00DC82] border border-[#00DC82]/30">
                                        Siz
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[#a0a0b8] whitespace-nowrap">
                                      • {c.date}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLike(c.id)}
                                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                                        c.isLiked
                                          ? 'bg-[#00DC82]/20 text-[#00DC82] border-[#00DC82]/40'
                                          : 'bg-[#141428] text-[#a0a0b8] border-[#2a2a4a] hover:text-white'
                                      }`}
                                      title="Yoqdi"
                                    >
                                      <ThumbsUp className={`w-3 h-3 ${c.isLiked ? 'fill-current' : ''}`} />
                                      <span className="font-semibold">{c.likes || 0}</span>
                                    </button>

                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(c.id)}
                                        className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                                        title="O'chirish"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed break-words mt-1">
                                  {c.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STATISTIKA */}
              {activeTab === 'stats' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#141428]/50 border border-[#2a2a4a]/50 text-left">
                    <p className="text-xs text-[#a0a0b8]">Jami o'qishlar soni</p>
                    <h3 className="text-2xl font-black text-[#00DC82] mt-1">{manga.views}</h3>
                    <p className="text-[11px] text-zinc-400 mt-2">Platformadagi umumiy ko'rishlar</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141428]/50 border border-[#2a2a4a]/50 text-left">
                    <p className="text-xs text-[#a0a0b8]">O'quvchilar bahosi</p>
                    <h3 className="text-2xl font-black text-[#fdcb6e] mt-1">★ {manga.rating} / 10</h3>
                    <p className="text-[11px] text-zinc-400 mt-2">Muxlislar ovozi asosida</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141428]/50 border border-[#2a2a4a]/50 text-left">
                    <p className="text-xs text-[#a0a0b8]">Mavjud boblar</p>
                    <h3 className="text-2xl font-black text-[#00cec9] mt-1">{chapters.length} ta</h3>
                    <p className="text-[11px] text-zinc-400 mt-2">O'zbek tiliga tarjima qilingan</p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* Chapter Purchase Confirmation Modal - Fully Mobile Optimized */}
      {purchasingChapter && (
        <div 
          onClick={() => {
            setPurchasingChapter(null);
            setPurchaseError(null);
            setPurchaseSuccessMessage(null);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0a0a1a] border-t sm:border border-amber-500/30 rounded-t-[28px] sm:rounded-3xl p-4 sm:p-6 pb-8 sm:pb-6 shadow-2xl relative overflow-hidden text-left max-h-[92vh] overflow-y-auto my-0 sm:my-auto"
          >
            {/* Mobile drag handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden" />
            
            {/* Background Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setPurchasingChapter(null);
                setPurchaseError(null);
                setPurchaseSuccessMessage(null);
              }}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon */}
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl mb-3 shadow-inner">
              🪙
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              Pullik bobni ochish
            </h3>
            <p className="text-xs text-gray-400 mb-3.5 sm:mb-4 leading-relaxed">
              <span className="font-semibold text-white">{manga.title}</span> —{' '}
              <span className="text-amber-300 font-bold">{purchasingChapter.chapter_number}-bob {purchasingChapter.title ? `(${purchasingChapter.title})` : ''}</span>
            </p>

            {/* Price and Balance Box */}
            <div className="bg-[#141428] border border-white/10 rounded-2xl p-3.5 sm:p-4 mb-3.5 sm:mb-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Bob narxi:</span>
                <span className="text-amber-300 font-extrabold flex items-center gap-1 text-xs sm:text-sm">
                  <span>🪙</span>
                  <span>{purchasingChapter.price_coins} tanga</span>
                  <span className="text-[10px] sm:text-[11px] text-gray-400 font-normal">
                    ({((purchasingChapter.price_coins || 0) * 100).toLocaleString()} so'm)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-gray-400">Sizning balansingiz:</span>
                <span className="text-white font-bold flex items-center gap-1 text-xs sm:text-sm">
                  <span>🪙</span>
                  <span>{userProfile?.coins ?? 0} tanga</span>
                </span>
              </div>

              {(userProfile?.coins ?? 0) < (purchasingChapter.price_coins || 0) && (
                <div className="pt-2 text-[11px] text-rose-400 flex items-center gap-1.5 font-medium border-t border-rose-500/15">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Balansingizda yana {(purchasingChapter.price_coins || 0) - (userProfile?.coins ?? 0)} ta tanga yetishmayapti.
                  </span>
                </div>
              )}
            </div>

            {/* Error & Success Messages */}
            {purchaseError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            {purchaseSuccessMessage && (
              <div className="mb-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{purchaseSuccessMessage}</span>
              </div>
            )}

            {/* Actions - Mobile Ergonomic */}
            <div className="pt-1">
              {!user ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Pullik bobni ochish va profilingizda saqlab qolish uchun avval tizimga kiring.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasingChapter(null);
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="w-full min-h-[48px] btn-ios btn-ios-solid bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs sm:text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    id="btn-login-for-chapter"
                  >
                    <LogIn className="w-4 h-4 text-black" />
                    <span>Tizimga kirish / Ro'yxatdan o'tish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasingChapter(null)}
                    className="w-full min-h-[42px] btn-ios text-xs text-zinc-400 hover:text-white py-2 px-3 active:scale-95 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                </div>
              ) : (userProfile?.coins ?? 0) < (purchasingChapter.price_coins || 0) ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchasingChapter(null);
                      if (onOpenCoins) onOpenCoins();
                    }}
                    className="w-full min-h-[48px] btn-ios btn-ios-solid bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                  >
                    <span>🪙</span>
                    <span>Tanga xarid qilish (TezChek)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasingChapter(null)}
                    className="w-full min-h-[42px] btn-ios text-xs text-zinc-400 hover:text-white py-2 px-3 active:scale-95 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                </div>
              ) : (
                <div className="flex flex-col-reverse sm:flex-row items-stretch gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPurchasingChapter(null)}
                    disabled={purchaseLoading}
                    className="w-full sm:w-auto min-h-[46px] btn-ios text-xs text-zinc-300 hover:text-white py-2.5 px-4 active:scale-95 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPurchase}
                    disabled={purchaseLoading}
                    className="flex-1 min-h-[48px] btn-ios btn-ios-solid bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm py-2.5 px-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                  >
                    {purchaseLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Ochilmoqda...</span>
                      </span>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>{purchasingChapter.price_coins} tangaga ochish</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
