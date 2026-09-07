import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { HeroSlider } from './components/HeroSlider.js';
import { MangaCard } from './components/MangaCard.js';
import { GenreSection } from './components/GenreSection.js';
import { LatestChapters } from './components/LatestChapters.js';
import { MangaDetailModal } from './components/MangaDetailModal.js';
import { MangaDetailView } from './components/MangaDetailView.js';
import { ReaderModal } from './components/ReaderModal.js';
import { SearchModal } from './components/SearchModal.js';
import { AuthModal } from './components/AuthModal.js';
import { CoinPurchaseModal } from './components/CoinPurchaseModal.js';
import { AdminGate } from './components/AdminGate.js';
import { MangaCatalog } from './components/MangaCatalog.js';
import { GenresView } from './components/GenresView.js';
import { ProfileView } from './components/ProfileView.js';
import { Footer } from './components/Footer.js';
import { MobileNav } from './components/MobileNav.js';
import { TrendingUp, PlusCircle, Star, ChevronRight } from 'lucide-react';
import type { Manga, Chapter, Genre, UserProfile, UserComment, UserViewHistory } from './types.js';
import { getStoredProfile, persistProfile, DEFAULT_PROFILE } from './lib/profileStorage.js';
import { auth } from './lib/firebase.js';
import { initialMangas, initialGenres, initialChapters } from './server/initialData.js';

export default function App() {
  // Navigation & Routing state
  const getInitialTab = (): string => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') return 'admin';
      if (path.includes('manga')) return 'manga';
      if (path.includes('genre')) return 'genres';
      if (path.includes('profile')) return 'profile';
    }
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [selectedGenreSlug, setSelectedGenreSlug] = useState<string | null>(null);
  const [catalogInitialType, setCatalogInitialType] = useState<string | null>(null);

  // Data states with immediate fallback
  const [mangas, setMangas] = useState<Manga[]>(() => initialMangas);
  const [genres, setGenres] = useState<Genre[]>(() => initialGenres.map((g, idx) => ({ id: idx + 1, ...g })));
  const [chapters, setChapters] = useState<Chapter[]>(() => initialChapters);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Modals & Overlays
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [activeReading, setActiveReading] = useState<{ manga: Manga; chapter: Chapter } | null>(null);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCoinsOpen, setIsCoinsOpen] = useState(false);

  // User & Bookmarks
  const [user, setUser] = useState<{ username: string; isAdmin?: boolean } | null>(() => {
    try {
      const stored = localStorage.getItem('animanga_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // User profile with Catbox avatar, comments, likes, views history
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('animanga_bookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // URL sync handler
  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'profile' && !user) {
      setIsAuthOpen(true);
      return;
    }

    setCurrentTab(tab);
    if (tab !== 'manga-detail') {
      setSelectedManga(null);
    }
    if (tab === 'genres') {
      setSelectedGenreSlug(param || null);
      setCatalogInitialType(null);
    } else if (param) {
      if (['manhwa', 'manga', 'manhua', 'popular', 'latest', 'rating'].includes(param)) {
        setCatalogInitialType(param);
        setSelectedGenreSlug(null);
      } else {
        setSelectedGenreSlug(param);
        setCatalogInitialType(null);
      }
    } else {
      setSelectedGenreSlug(null);
      setCatalogInitialType(null);
    }

    try {
      let newPath = '/';
      if (tab === 'admin') newPath = '/admin';
      else if (tab === 'home') newPath = '/';
      else if (tab === 'genres') newPath = param ? `/genres/${param}` : '/genres';
      else if (tab === 'manga') newPath = param ? `/manga?type=${param}` : '/manga';
      else newPath = `/${tab}`;
      window.history.pushState(null, '', newPath);
    } catch (e) {
      console.warn(e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser back/forward buttons
  useEffect(() => {
    const onPopState = async () => {
      const path = window.location.pathname.toLowerCase();
      const mangaMatch = path.match(/\/manga\/(\d+)/);
      if (mangaMatch && mangaMatch[1]) {
        const mangaId = parseInt(mangaMatch[1], 10);
        try {
          const res = await fetch(`/api/manga/${mangaId}`);
          if (res.ok) {
            const data = await res.json();
            setSelectedManga(data);
            setCurrentTab('manga-detail');
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      setSelectedManga(null);
      if (path.includes('admin') || window.location.hash.includes('admin')) {
        setCurrentTab('admin');
      } else if (path.includes('manga')) {
        setCurrentTab('manga');
      } else if (path.includes('genre')) {
        const genreMatch = path.match(/\/genres\/([a-z0-9-]+)/i);
        setSelectedGenreSlug(genreMatch && genreMatch[1] ? genreMatch[1] : null);
        setCurrentTab('genres');
      } else if (path.includes('profile')) {
        setCurrentTab('profile');
      } else {
        setCurrentTab('home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [mangaRes, genresRes, chaptersRes] = await Promise.all([
        fetch('/api/manga'),
        fetch('/api/genres'),
        fetch('/api/chapters'),
      ]);

      if (mangaRes.ok) {
        const mangaData = await mangaRes.json();
        setMangas(mangaData);
      }
      if (genresRes.ok) {
        const genresData = await genresRes.json();
        setGenres(genresData);
      }
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData);
      }

      // Check if URL directly requested a manga (e.g., /manga/16)
      if (typeof window !== 'undefined') {
        const mangaMatch = window.location.pathname.match(/\/manga\/(\d+)/i);
        if (mangaMatch && mangaMatch[1]) {
          const mId = parseInt(mangaMatch[1], 10);
          try {
            const mRes = await fetch(`/api/manga/${mId}`);
            if (mRes.ok) {
              const fullManga = await mRes.json();
              setSelectedManga(fullManga);
              setCurrentTab('manga-detail');
            }
          } catch (e) {
            console.error('Failed to fetch initial manga by URL:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync profile from server on mount or when user changes
  useEffect(() => {
    const currentUsername = user?.username || profile.username;
    if (currentUsername) {
      fetch(`/api/profile/${currentUsername}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((serverProfile) => {
          if (serverProfile) {
            setProfile((prev) => ({
              ...prev,
              ...serverProfile,
              comments: serverProfile.comments || prev.comments,
              liked_mangas: serverProfile.liked_mangas || prev.liked_mangas,
              views_history: serverProfile.views_history || prev.views_history,
              bookmarks: serverProfile.bookmarks || prev.bookmarks,
            }));
          }
        })
        .catch(() => {});
    }
  }, [user?.username]);

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    const next: UserProfile = {
      ...profile,
      ...updated,
      name: updated.name !== undefined ? updated.name : profile.name,
      avatar_url: updated.avatar_url !== undefined ? updated.avatar_url : profile.avatar_url,
      bio: updated.bio !== undefined ? updated.bio : profile.bio,
    };
    setProfile(next);
    await persistProfile(next);
  };

  const handleToggleLike = async (mangaId: number) => {
    const currentLikes = profile.liked_mangas || [];
    const nextLikes = currentLikes.includes(mangaId)
      ? currentLikes.filter((id) => id !== mangaId)
      : [...currentLikes, mangaId];
    await handleUpdateProfile({ liked_mangas: nextLikes });
  };

  const handleAddUserComment = async (commentData: {
    manga_id: number;
    manga_title: string;
    chapter_number?: number | string;
    text: string;
    user_name?: string;
    avatar_url?: string;
  }) => {
    const newComment: UserComment = {
      id: `c-${Date.now()}`,
      manga_id: commentData.manga_id,
      manga_title: commentData.manga_title,
      chapter_number: commentData.chapter_number,
      text: commentData.text,
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      user_name: commentData.user_name || profile.name || user?.username || 'User',
      avatar_url: commentData.avatar_url || profile.avatar_url || '',
    };
    const updatedComments = [newComment, ...(profile.comments || [])];
    await handleUpdateProfile({ comments: updatedComments });
  };

  const recordMangaView = async (manga: Manga, chapterNumber?: number | string) => {
    const currentHistory = profile.views_history || [];
    const filtered = currentHistory.filter((h) => h.manga_id !== manga.id);
    const newHistory: UserViewHistory[] = [
      {
        manga_id: manga.id,
        manga_title: manga.title,
        manga_cover: manga.cover_image,
        chapter_number: chapterNumber,
        date: new Date().toISOString().split('T')[0],
      },
      ...filtered,
    ].slice(0, 40);
    await handleUpdateProfile({ views_history: newHistory });
  };

  // Open Manga Detail (instant direct manga page experience on single click)
  const handleSelectManga = (manga: Manga) => {
    // 1. Immediately set selected manga and switch to detail view on single click
    setSelectedManga(manga);
    setCurrentTab('manga-detail');
    recordMangaView(manga);
    setIsFetchingChapters(true);

    try {
      window.history.pushState(null, '', `/manga/${manga.id}`);
    } catch (e) {
      console.warn(e);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 2. Fetch full details and fresh chapters asynchronously in background
    fetch(`/api/manga/${manga.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((full) => {
        if (full) {
          setSelectedManga((prev) => (prev?.id === full.id ? full : prev));
        }
      })
      .catch((err) => {
        console.warn('Background manga refresh error:', err);
      })
      .finally(() => {
        setIsFetchingChapters(false);
      });
  };

  // Read chapter
  const handleReadChapter = (chapter: Chapter) => {
    let parentManga = selectedManga?.id === chapter.manga_id ? selectedManga : mangas.find((m) => m.id === chapter.manga_id);
    if (!parentManga) return;

    // Ensure we have some chapters locally if missing
    if (!parentManga.chapters || parentManga.chapters.length === 0) {
      parentManga = { ...parentManga, chapters: chapters.filter((c) => c.manga_id === parentManga?.id) };
      // Fetch full manga in background to get all chapters
      fetch(`/api/manga/${parentManga.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((full) => {
          if (full) {
            setActiveReading((prev) => (prev && prev.manga.id === full.id ? { ...prev, manga: full } : prev));
            if (selectedManga?.id === full.id) setSelectedManga(full);
          }
        })
        .catch((e) => console.error(e));
    }

    // Increment real chapter views in database & state
    fetch(`/api/chapters/${chapter.id}/view`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.views !== undefined) {
          const freshViews = data.views;
          const freshMangaViews = data.manga_views;
          setMangas((prev) =>
            prev.map((m) => {
              if (m.id === parentManga?.id) {
                const updatedChs = (m.chapters || []).map((c) =>
                  c.id === chapter.id ? { ...c, views: freshViews } : c
                );
                return {
                  ...m,
                  views: freshMangaViews !== undefined ? freshMangaViews : m.views,
                  chapters: updatedChs,
                };
              }
              return m;
            })
          );
          setSelectedManga((prev) => {
            if (!prev || prev.id !== parentManga?.id) return prev;
            const updatedChs = (prev.chapters || []).map((c) =>
              c.id === chapter.id ? { ...c, views: freshViews } : c
            );
            return {
              ...prev,
              views: freshMangaViews !== undefined ? freshMangaViews : prev.views,
              chapters: updatedChs,
            };
          });
        }
      })
      .catch((err) => console.warn('Chapter view increment error:', err));

    recordMangaView(parentManga, chapter.chapter_number);

    setActiveReading({
      manga: parentManga,
      chapter: {
        ...chapter,
        views: (chapter.views || 0) + 1,
      },
    });
  };

  // Toggle bookmark
  const handleToggleBookmark = (mangaId: number) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(mangaId)
        ? prev.filter((id) => id !== mangaId)
        : [...prev, mangaId];
      localStorage.setItem('animanga_bookmarks', JSON.stringify(next));
      handleUpdateProfile({ bookmarks: next });
      return next;
    });
  };

  const handleLogin = async (newUser: {
    username: string;
    isAdmin: boolean;
    name?: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    telegram_id?: number | string;
    provider?: 'google' | 'telegram';
  }) => {
    setUser({ username: newUser.username, isAdmin: newUser.isAdmin });
    localStorage.setItem('animanga_user', JSON.stringify({ username: newUser.username, isAdmin: newUser.isAdmin }));

    try {
      const res = await fetch(`/api/profile/${newUser.username}`);
      if (res.ok) {
        const p = await res.json();
        setProfile((prev) => ({
          ...prev,
          ...p,
          username: newUser.username,
          name: newUser.name || p.name || newUser.username,
          avatar_url: newUser.avatar_url || p.avatar_url || prev.avatar_url,
          phone: newUser.phone || p.phone || prev.phone,
          telegram_id: newUser.telegram_id || p.telegram_id || prev.telegram_id,
          isAdmin: newUser.isAdmin,
        }));
      } else {
        handleUpdateProfile({
          username: newUser.username,
          name: newUser.name || newUser.username,
          avatar_url: newUser.avatar_url || profile.avatar_url,
          phone: newUser.phone,
          telegram_id: newUser.telegram_id,
          isAdmin: newUser.isAdmin,
        });
      }
    } catch {
      handleUpdateProfile({
        username: newUser.username,
        name: newUser.name || newUser.username,
        avatar_url: newUser.avatar_url || profile.avatar_url,
        phone: newUser.phone,
        telegram_id: newUser.telegram_id,
        isAdmin: newUser.isAdmin,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
    setUser(null);
    localStorage.removeItem('animanga_user');
    localStorage.removeItem('animanga_user_profile');
    setProfile(DEFAULT_PROFILE);
    handleNavigate('home');
  };

  // Filtered lists for Home sections
  const popularMangas = [...mangas].sort((a, b) => (b.views || 0) - (a.views || 0));
  const latestMangas = [...mangas].sort((a, b) => (b.id || 0) - (a.id || 0));
  const recommendedMangas = [...mangas].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const bookmarkedList = mangas.filter((m) => bookmarkedIds.includes(m.id));

  // If currently in Admin Panel (/admin)
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020d07] text-[#00DC82]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00DC82]/20 border-t-[#00DC82] rounded-full animate-spin"></div>
          <p className="font-bold animate-pulse text-lg tracking-widest uppercase">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (currentTab === 'admin') {
    return (
      <AdminGate
        onBackToSite={() => handleNavigate('home')}
        mangas={mangas}
        onRefreshData={fetchData}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#020d07] text-[#e0e0e8]">
      
      {/* Header */}
      <Header
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCoins={() => setIsCoinsOpen(true)}
        onLogout={handleLogout}
        user={user}
        profile={profile}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-0">
        
        {/* VIEW 0: MANGA DETAIL PAGE (Direct wiwi.uz /manga/16 replica) */}
        {currentTab === 'manga-detail' && selectedManga && (
          <MangaDetailView
            manga={selectedManga}
            isFetchingChapters={isFetchingChapters}
            onBack={() => handleNavigate('home')}
            onGoHome={() => handleNavigate('home')}
            onGoCatalog={() => handleNavigate('manga')}
            onSelectGenre={(slug) => handleNavigate('manga', slug)}
            onReadChapter={handleReadChapter}
            isBookmarked={bookmarkedIds.includes(selectedManga.id)}
            onToggleBookmark={handleToggleBookmark}
            isLiked={(profile.liked_mangas || []).includes(selectedManga.id)}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddUserComment}
            onOpenCoins={() => setIsCoinsOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onChapterPurchased={(newCoins, chId) => {
              setProfile((prev) => ({
                ...prev,
                coins: newCoins,
                unlocked_chapters: [...(prev.unlocked_chapters || []), chId],
              }));
            }}
            userProfile={profile}
            user={user}
          />
        )}

        {/* VIEW 1: HOME PAGE (Direct wiwi.uz clone) */}
        {currentTab === 'home' && (
          <div>
            {/* Empty state banner when database is empty */}
            {mangas.length === 0 ? (
              <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="ios-glass p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400">
                    <PlusCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Ma'lumotlar bazasi tozalandi</h2>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                    Barcha test mangalar o'chirildi. Endi Admin Panel orqali o'zingiz xohlagan yangi mangalar va boblarni qo'shishingiz mumkin.
                  </p>
                  <button
                    onClick={() => handleNavigate('admin')}
                    className="btn-ios btn-ios-solid px-6 py-3 text-sm font-bold shadow-lg"
                  >
                    Manga qo'shish (Admin Panel)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Hero Carousel */}
                <HeroSlider mangas={mangas} onSelectManga={handleSelectManga} />

                {/* Section 1: Eng Mashhurlar (Most Popular) */}
                <section className="max-w-7xl mx-auto px-4 py-8 text-left" id="popular-section">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#fd79a8]" />
                      <span>Eng Mashhurlar</span>
                    </h2>
                    <button
                      onClick={() => handleNavigate('manga', 'popular')}
                      className="text-sm text-[#fdcb6e] hover:text-[#ffeaa7] transition flex items-center gap-1 font-semibold"
                    >
                      <span>Barchasi</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {popularMangas.slice(0, 6).map((m) => (
                      <MangaCard key={m.id} manga={m} onClick={() => handleSelectManga(m)} />
                    ))}
                  </div>
                </section>

                {/* Section 2: So'nggi Qo'shilganlar (Latest Added) */}
                <section className="max-w-7xl mx-auto px-4 py-8 text-left" id="latest-section">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-[#6c5ce7]" />
                      <span>So'nggi Qo'shilganlar</span>
                    </h2>
                    <button
                      onClick={() => handleNavigate('manga', 'latest')}
                      className="text-sm text-[#fdcb6e] hover:text-[#ffeaa7] transition flex items-center gap-1 font-semibold"
                    >
                      <span>Barchasi</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {latestMangas.slice(0, 6).map((m) => (
                      <MangaCard key={m.id} manga={m} onClick={() => handleSelectManga(m)} />
                    ))}
                  </div>
                </section>

                {/* Section 3: So'nggi Boblar (Latest Chapters) */}
                <LatestChapters
                  chapters={chapters}
                  onReadChapter={handleReadChapter}
                  onViewAll={() => handleNavigate('manga')}
                />
              </>
            )}

            {/* Section 4: Janrlar bo'yicha toping (Genres section) */}
            <GenreSection
              genres={genres}
              mangas={mangas}
              onSelectGenre={(slug) => handleNavigate('genres', slug)}
              onViewAll={() => handleNavigate('genres')}
            />

            {/* Section 5: Tavsiya etilgan (Recommended) */}
            <section className="max-w-7xl mx-auto px-4 py-8 text-left" id="recommended-section">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#fdcb6e] fill-current" />
                  <span>Tavsiya etilgan</span>
                </h2>
                <button
                  onClick={() => handleNavigate('manga', 'rating')}
                  className="text-sm text-[#fdcb6e] hover:text-[#ffeaa7] transition flex items-center gap-1 font-semibold"
                >
                  <span>Barchasi</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendedMangas.slice(0, 6).map((m) => (
                  <MangaCard key={m.id} manga={m} onClick={() => handleSelectManga(m)} />
                ))}
              </div>
            </section>

          </div>
        )}

        {/* VIEW 2: MANGA CATALOG */}
        {currentTab === 'manga' && (
          <MangaCatalog
            mangas={mangas}
            genres={genres}
            selectedGenre={selectedGenreSlug}
            onSelectGenre={setSelectedGenreSlug}
            onSelectManga={handleSelectManga}
            initialType={catalogInitialType}
          />
        )}

        {/* VIEW 3: GENRES (Wiwi.uz direct clone) */}
        {currentTab === 'genres' && (
          <GenresView
            genres={genres}
            mangas={mangas}
            selectedGenre={selectedGenreSlug}
            onSelectGenre={(slug) => {
              setSelectedGenreSlug(slug);
              try {
                window.history.pushState(null, '', slug ? `/genres/${slug}` : '/genres');
              } catch (e) {
                console.warn(e);
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectManga={handleSelectManga}
          />
        )}

        {/* VIEW 4: PROFILE & BOOKMARKS */}
        {currentTab === 'profile' && (
          <ProfileView
            user={user}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            mangas={mangas}
            onSelectManga={handleSelectManga}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenCoins={() => setIsCoinsOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Webtoon/Manga Reader Modal */}
      {activeReading && (
        <ReaderModal
          manga={activeReading.manga}
          chapter={activeReading.chapter}
          onClose={() => setActiveReading(null)}
          onSelectChapter={(nextCh) =>
            setActiveReading((prev) => (prev ? { ...prev, chapter: nextCh } : null))
          }
          user={user}
          userProfile={profile}
          onOpenCoins={() => setIsCoinsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onChapterPurchased={(newCoins, chId) => {
            setProfile((prev) => ({
              ...prev,
              coins: newCoins,
              unlocked_chapters: [...(prev.unlocked_chapters || []), chId],
            }));
          }}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        mangas={mangas}
        onSelectManga={handleSelectManga}
      />

      {/* Login / Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
      />

      {/* TezChek Gold Coin Purchase Modal */}
      <CoinPurchaseModal
        isOpen={isCoinsOpen}
        onClose={() => setIsCoinsOpen(false)}
        user={user}
        userProfile={profile}
        onOpenAuth={() => setIsAuthOpen(true)}
        onBalanceUpdated={(newBalance) => {
          setProfile((prev) => ({ ...prev, coins: newBalance }));
        }}
      />

    </div>
  );
}
