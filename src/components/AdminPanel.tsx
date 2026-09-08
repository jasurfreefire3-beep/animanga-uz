import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Server, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  List, 
  Layers, 
  Terminal, 
  ArrowLeft,
  Search,
  ExternalLink,
  Camera,
  UploadCloud,
  ImageIcon,
  Check,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import type { Manga, Chapter, Genre, DatabaseStatus } from '../types.js';
import { uploadToCatbox } from '../lib/profileStorage.js';

interface AdminPanelProps {
  onBackToSite: () => void;
  mangas: Manga[];
  onRefreshData: () => void;
}

const POPULAR_GENRES = [
  'Action', 'Fantastika', 'Sarguzasht', 'Romantika', 'Drama', 
  'Komediya', 'Horror', 'Isekai', 'Supernatural', 'Tarixiy', 
  'Sehrli olam', 'Psixologik', 'Triller', 'Maktab hayoti'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToSite,
  mangas,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'mangas' | 'chapters' | 'genres' | 'database'>('mangas');
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Manga creation / edit state
  const [showMangaModal, setShowMangaModal] = useState(false);
  const [editingManga, setEditingManga] = useState<Manga | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [mangaForm, setMangaForm] = useState({
    title: '',
    alternative_titles: '',
    type: 'manhwa',
    status: 'ongoing',
    description: '',
    cover_image: '',
    author: '',
    artist: '',
    rating: 8.5,
    release_year: 2024,
    tags: '',
    genres: 'Action, Fantastika',
    genre_slugs: 'action,fantastika',
    is_banner: false,
  });

  // Chapter creation state
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [isUploadingPages, setIsUploadingPages] = useState(false);
  const [pagesUploadProgress, setPagesUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [pagesUploadError, setPagesUploadError] = useState<string | null>(null);
  const chapterPagesInputRef = useRef<HTMLInputElement>(null);

  const [chapterForm, setChapterForm] = useState<{
    id: number | null;
    manga_id: number;
    chapter_number: number;
    title: string;
    pagesText: string;
    price_coins: number;
  }>({
    id: null,
    manga_id: mangas[0]?.id || 16,
    chapter_number: 1,
    title: '',
    pagesText: '',
    price_coins: 0,
  });

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'manga' | 'chapter' | 'seed';
    id?: number;
    title: string;
  } | null>(null);

  // Price adjustment modal state
  const [priceModal, setPriceModal] = useState<{
    isOpen: boolean;
    chapterId: number;
    title: string;
    currentPrice: number;
  } | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);

  // All Chapters state (for real-time editing & management)
  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [selectedMangaFilter, setSelectedMangaFilter] = useState<number | 'all'>('all');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');

  const fetchChapters = async () => {
    setIsLoadingChapters(true);
    try {
      const res = await fetch('/api/chapters');
      if (res.ok) {
        const data = await res.json();
        setChaptersList(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('fetchChapters error:', err);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // SQL Query console state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM mangas LIMIT 5;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Fetch DB status
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchChapters();
  }, []);

  // Filtered chapters for the Chapters tab
  const filteredChapters = chaptersList.filter((ch) => {
    if (selectedMangaFilter !== 'all' && ch.manga_id !== selectedMangaFilter) return false;
    if (chapterSearchQuery.trim()) {
      const q = chapterSearchQuery.toLowerCase();
      const m = mangas.find((item) => item.id === ch.manga_id);
      const titleMatch = (ch.title || '').toLowerCase().includes(q);
      const numMatch = String(ch.chapter_number).includes(q);
      const mangaMatch = (m?.title || ch.manga_title || '').toLowerCase().includes(q);
      if (!titleMatch && !numMatch && !mangaMatch) return false;
    }
    return true;
  });

  // Helper to toggle a genre pill in Manga Form
  const handleToggleGenre = (gName: string) => {
    const currentList = mangaForm.genres
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let nextList: string[];
    if (currentList.some((item) => item.toLowerCase() === gName.toLowerCase())) {
      nextList = currentList.filter((item) => item.toLowerCase() !== gName.toLowerCase());
    } else {
      nextList = [...currentList, gName];
    }
    const genresStr = nextList.join(', ');
    const slugsStr = nextList.map((item) => item.toLowerCase().replace(/[^a-z0-9]/g, '')).join(',');
    setMangaForm({
      ...mangaForm,
      genres: genresStr,
      genre_slugs: slugsStr,
    });
  };

  // Upload cover image to Catbox.moe
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setCoverUploadError(null);
    try {
      const catboxUrl = await uploadToCatbox(file);
      setMangaForm((prev) => ({ ...prev, cover_image: catboxUrl }));
    } catch (err: any) {
      console.error('Cover upload error:', err);
      setCoverUploadError(err.message || 'Catbox.moe ga yuklashda xatolik yuz berdi');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  // Upload multiple chapter page images to Catbox.moe
  const handleChapterPagesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPages(true);
    setPagesUploadError(null);
    setPagesUploadProgress({ current: 0, total: files.length });

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setPagesUploadProgress({ current: i + 1, total: files.length });
        const file = files[i];
        const uploadedUrl = await uploadToCatbox(file);
        newUrls.push(uploadedUrl);
      }

      // Append new URLs to existing pagesText
      setChapterForm((prev) => {
        const existing = prev.pagesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const combined = [...existing, ...newUrls];
        return {
          ...prev,
          pagesText: combined.join('\n'),
        };
      });
    } catch (err: any) {
      console.error('Chapter pages upload error:', err);
      setPagesUploadError(err.message || 'Sahifalarni yuklashda xatolik yuz berdi');
    } finally {
      setIsUploadingPages(false);
      setPagesUploadProgress(null);
      if (chapterPagesInputRef.current) chapterPagesInputRef.current.value = '';
    }
  };

  // Helper to remove a single page URL
  const handleRemovePageUrl = (indexToRemove: number) => {
    const current = chapterForm.pagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = current.filter((_, idx) => idx !== indexToRemove);
    setChapterForm((prev) => ({
      ...prev,
      pagesText: updated.join('\n'),
    }));
  };

  const handleOpenCreateManga = () => {
    setEditingManga(null);
    setCoverUploadError(null);
    setMangaForm({
      title: '',
      alternative_titles: '',
      type: 'manhwa',
      status: 'ongoing',
      description: '',
      cover_image: '',
      author: '',
      artist: '',
      rating: 8.5,
      release_year: 2024,
      tags: '⚔️ Harakat, 🔥 Fantastika',
      genres: 'Action, Fantastika',
      genre_slugs: 'action,fantastika',
      is_banner: false,
    });
    setShowMangaModal(true);
  };

  const handleOpenEditManga = (manga: Manga) => {
    setEditingManga(manga);
    setCoverUploadError(null);
    setMangaForm({
      title: manga.title,
      alternative_titles: manga.alternative_titles || '',
      type: manga.type,
      status: manga.status,
      description: manga.description,
      cover_image: manga.cover_image,
      author: manga.author || '',
      artist: manga.artist || '',
      rating: manga.rating || 8.0,
      release_year: manga.release_year || 2024,
      tags: manga.tags || '',
      genres: manga.genres || 'Action, Fantastika',
      genre_slugs: manga.genre_slugs || 'action,fantastika',
      is_banner: Boolean(manga.is_banner),
    });
    setShowMangaModal(true);
  };

  const handleToggleBannerQuick = async (manga: Manga) => {
    try {
      const nextVal = !manga.is_banner;
      await fetch(`/api/manga/${manga.id}/banner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banner: nextVal }),
      });
      setActionMessage(`"${manga.title}" ${nextVal ? 'bosh sahifa banneriga chiqarildi 🌟' : 'bannerdan olindi'}`);
      onRefreshData();
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  // Open Chapter Modal with auto-calculated next chapter number
  const handleOpenCreateChapter = (mangaId?: number) => {
    const targetId = mangaId || (mangas[0] ? mangas[0].id : 1);
    const mChapters = chaptersList.filter((c) => c.manga_id === targetId);
    let nextNum = 1;
    if (mChapters.length > 0) {
      const maxNum = Math.max(...mChapters.map((c) => Number(c.chapter_number) || 0));
      nextNum = Math.floor(maxNum) + 1;
    }

    setChapterForm({
      id: null,
      manga_id: targetId,
      chapter_number: nextNum,
      title: '',
      pagesText: '',
      price_coins: 0,
    });
    setPagesUploadError(null);
    setPagesUploadProgress(null);
    setShowChapterModal(true);
  };

  const handleOpenEditChapter = (ch: Chapter) => {
    setChapterForm({
      id: ch.id,
      manga_id: ch.manga_id,
      chapter_number: Number(ch.chapter_number),
      title: ch.title || '',
      pagesText: ch.pages ? (Array.isArray(ch.pages) ? ch.pages.join('\n') : String(ch.pages)) : '',
      price_coins: Number(ch.price_coins || 0),
    });
    setPagesUploadError(null);
    setPagesUploadProgress(null);
    setShowChapterModal(true);
  };

  const handleMangaChangeInChapter = (mId: number) => {
    const mChapters = chaptersList.filter((c) => c.manga_id === mId);
    let nextNum = 1;
    if (mChapters.length > 0) {
      const maxNum = Math.max(...mChapters.map((c) => Number(c.chapter_number) || 0));
      nextNum = Math.floor(maxNum) + 1;
    }
    setChapterForm((prev) => ({
      ...prev,
      manga_id: mId,
      chapter_number: nextNum,
    }));
  };

  const handleSaveManga = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingManga) {
        await fetch(`/api/manga/${editingManga.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mangaForm),
        });
        setActionMessage('Manga muvaffaqiyatli tahrirlandi');
      } else {
        await fetch('/api/manga', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mangaForm),
        });
        setActionMessage('Yangi manga PostgreSQL bazasiga qo\'shildi');
      }
      setShowMangaModal(false);
      onRefreshData();
      fetchDbStatus();
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleOpenDeleteManga = (manga: Manga) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'manga',
      id: manga.id,
      title: manga.title,
    });
  };

  const handleExecuteDeleteManga = async (id: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manga/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Mangani o\'chirib bo\'lmadi');
      setActionMessage('Manga PostgreSQL bazasidan muvaffaqiyatli o\'chirildi');
      onRefreshData();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + (err.message || 'Manga o\'chirishda xatolik'));
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const pages = chapterForm.pagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        manga_id: Number(chapterForm.manga_id),
        chapter_number: Number(chapterForm.chapter_number),
        title: chapterForm.title,
        pages: pages.length > 0 ? pages : undefined,
        price_coins: Number(chapterForm.price_coins || 0),
      };

      if (chapterForm.id) {
        await fetch(`/api/chapters/${chapterForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setShowChapterModal(false);
        setActionMessage('Bob muvaffaqiyatli tahrirlandi');
      } else {
        await fetch('/api/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setActionMessage('Yangi bob muvaffaqiyatli qo\'shildi (Keyingisini qo\'shishingiz mumkin)');
        // Keep modal open and auto-increment for faster subsequent additions
        setChapterForm((prev) => ({
          ...prev,
          chapter_number: Number(prev.chapter_number) + 1,
          pagesText: '',
          title: '',
        }));
      }

      onRefreshData();
      fetchChapters();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleOpenPriceModal = (ch: Chapter) => {
    setPriceModal({
      isOpen: true,
      chapterId: ch.id,
      title: `${ch.chapter_number}-bob ${ch.title ? '(' + ch.title + ')' : ''}`,
      currentPrice: ch.price_coins || 0,
    });
    setNewPriceValue(ch.price_coins || 0);
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModal) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chapters/${priceModal.chapterId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_coins: Number(newPriceValue || 0) }),
      });
      if (!res.ok) throw new Error('Bob narxini saqlab bo\'lmadi');
      setActionMessage(`Bob narxi ${newPriceValue} tanga qilib belgilandi!`);
      setPriceModal(null);
      onRefreshData();
      fetchChapters();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleOpenDeleteChapter = (ch: Chapter) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'chapter',
      id: ch.id,
      title: `${ch.chapter_number}-bob ${ch.title ? '(' + ch.title + ')' : ''}`,
    });
  };

  const handleExecuteDeleteChapter = async (chapterId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Bobni o\'chirib bo\'lmadi');
      setActionMessage('Bob muvaffaqiyatli o\'chirildi');
      onRefreshData();
      fetchChapters();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + (err.message || 'Bobni o\'chirishda xatolik'));
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleRunSql = async () => {
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'So\'rovda xatolik yuz berdi');
      setSqlResult(data);
    } catch (err: any) {
      setSqlError(err.message);
    }
  };

  const handleOpenSeed = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'seed',
      title: 'Boshlang\'ich ma\'lumotlar bazasi (Seed)',
    });
  };

  const handleOpenClear = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'clear',
      title: 'Barcha test ma\'lumotlarni tozalash (Hamma narsani o\'chirish)',
    });
  };

  const handleExecuteClear = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Bazani tozalab bo\'lmadi');
      setActionMessage('Barcha test ma\'lumotlar va mangalar muvaffaqiyatli tozalandi! Baza bo\'m-bo\'sh.');
      onRefreshData();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + err.message);
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleExecuteSeed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Bazani to\'ldirib bo\'lmadi');
      setActionMessage('Ma\'lumotlar bazasi muvaffaqiyatli yangilandi!');
      onRefreshData();
      fetchDbStatus();
    } catch (err: any) {
      setActionMessage('Xatolik: ' + err.message);
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#020d07] text-[#e0e0e8] text-left pb-24" id="admin-panel">
      
      {/* Top Header */}
      <header className="bg-[#0a0a1a] border-b border-[#1e1e3a] sticky top-0 z-40 px-4 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToSite}
              className="btn-ios btn-ios-sm py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold"
              id="admin-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Saytga qaytish</span>
            </button>

            <div className="flex items-center gap-2">
              <img
                src="https://files.catbox.moe/adt7bt.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.png';
                }}
                alt="AniManga Uz"
                className="w-8 h-8 rounded-lg object-contain bg-[#0a1f13] border border-[#00DC82]/40 p-0.5"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>AniManga Uz</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/40">
                    PostgreSQL Admin Panel
                  </span>
                </h1>
                <p className="text-[11px] text-[#a0a0b8]">
                  PostgreSQL jadvallari: mangas, chapters, genres
                </p>
              </div>
            </div>
          </div>

          {/* PostgreSQL Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#020d07] border border-[#1e1e3a] text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-zinc-300">
                psql.fr-roub1.bengt.wasmernet.com:20184
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00DC82]/15 text-[#00DC82]">
                Animanga
              </span>
            </div>

            <button
              onClick={() => { fetchDbStatus(); onRefreshData(); }}
              className="w-9 h-9 rounded-xl bg-[#141428] border border-[#1e1e3a] flex items-center justify-center text-zinc-300 hover:text-white hover:border-[#00DC82]/50 transition"
              title="Yangilash"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Action Notification */}
      {actionMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4 animate-fade-in">
          <div className="p-3 rounded-xl bg-[#00DC82]/15 border border-[#00DC82]/40 text-[#00DC82] flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Statistics Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#0a0a1a] border border-[#1e1e3a] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#00DC82]/10 border border-[#00DC82]/20 flex items-center justify-center text-[#00DC82] shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#a0a0b8] font-medium">Jami Mangalar</p>
              <h3 className="text-2xl font-black text-white">{mangas.length}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a0a1a] border border-[#1e1e3a] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#00cec9]/10 border border-[#00cec9]/20 flex items-center justify-center text-[#00cec9] shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#a0a0b8] font-medium">Boblar soni</p>
              <h3 className="text-2xl font-black text-white">
                {dbStatus?.tables.find((t) => t.name === 'chapters')?.rowCount || 0}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a0a1a] border border-[#1e1e3a] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 flex items-center justify-center text-[#6c5ce7] shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#a0a0b8] font-medium">PostgreSQL Holati</p>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Faol / Ulangan
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a0a1a] border border-[#1e1e3a] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#fdcb6e]/10 border border-[#fdcb6e]/20 flex items-center justify-center text-[#fdcb6e] shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#a0a0b8] font-medium">Jami ko'rishlar</p>
              <h3 className="text-2xl font-black text-white">
                {mangas.reduce((acc, m) => acc + (m.views || 0), 0)}
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1e1e3a] pb-3 mb-6">
          <button
            onClick={() => setActiveTab('mangas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'mangas'
                ? 'bg-[#00DC82] text-[#020d07]'
                : 'bg-[#0a0a1a] text-[#a0a0b8] hover:text-white border border-[#1e1e3a]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mangalar boshqaruvi</span>
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'chapters'
                ? 'bg-[#00DC82] text-[#020d07]'
                : 'bg-[#0a0a1a] text-[#a0a0b8] hover:text-white border border-[#1e1e3a]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Boblar boshqaruvi</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'database'
                ? 'bg-[#6c5ce7] text-white'
                : 'bg-[#0a0a1a] text-[#a0a0b8] hover:text-white border border-[#1e1e3a]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>PostgreSQL Jadvallar & SQL</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {activeTab === 'mangas' && (
              <button
                onClick={handleOpenCreateManga}
                className="btn-ios btn-ios-solid text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
                id="btn-add-new-manga"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi Manga qo'shish</span>
              </button>
            )}

            {activeTab === 'chapters' && (
              <button
                onClick={() => handleOpenCreateChapter()}
                className="btn-ios btn-ios-solid text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
                id="btn-add-new-chapter"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi Bob qo'shish</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Mangas Management */}
        {activeTab === 'mangas' && (
          <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e1e3a] bg-[#0d1c12]/70 text-[#a0a0b8] uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Muqova & Nom</th>
                    <th className="p-3.5">Banner</th>
                    <th className="p-3.5">Turi</th>
                    <th className="p-3.5">Holat</th>
                    <th className="p-3.5">Reyting</th>
                    <th className="p-3.5">Boblar</th>
                    <th className="p-3.5">Ko'rishlar</th>
                    <th className="p-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e3a]/60">
                  {mangas.map((m) => (
                    <tr key={m.id} className="hover:bg-[#141428]/50 transition-colors">
                      <td className="p-3.5 font-mono text-zinc-400">#{m.id}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.cover_image}
                            alt={m.title}
                            className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-white text-sm hover:text-[#00DC82] transition-colors">
                              {m.title}
                            </p>
                            <p className="text-[11px] text-[#a0a0b8]">
                              {m.author || 'Noma\'lum muallif'} • {m.release_year}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleBannerQuick(m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all border ${
                            m.is_banner
                              ? 'bg-[#00DC82]/20 text-[#00DC82] border-[#00DC82]/40 shadow-sm hover:bg-[#00DC82]/30'
                              : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white'
                          }`}
                          title="Bosh sahifa banneriga qo'yish / olish"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${m.is_banner ? 'text-[#00DC82]' : 'text-zinc-500'}`} />
                          <span>{m.is_banner ? 'Bannerda' : 'Yo\'q'}</span>
                        </button>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#00cec9]/20 text-[#00cec9]">
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.status === 'dropped'
                            ? 'text-rose-400 bg-rose-500/10'
                            : m.status === 'completed'
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-emerald-400 bg-emerald-500/10'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-amber-300">★ {m.rating}</td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMangaFilter(m.id);
                            setActiveTab('chapters');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#00DC82]/10 hover:bg-[#00DC82]/25 text-[#00DC82] border border-[#00DC82]/30 text-xs font-semibold flex items-center gap-1.5 transition-all group"
                          title="Ushbu manganing barcha boblarini ko'rish va tahrirlash"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#00DC82]" />
                          <span>{chaptersList.filter((c) => c.manga_id === m.id).length || m.chapter_count || 0} ta bob</span>
                          <span className="text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">➔</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-zinc-400">{m.views}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedMangaFilter(m.id);
                              setActiveTab('chapters');
                            }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:text-white hover:bg-blue-500/30"
                            title="Boblarni ko'rish va tahrirlash"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('chapters');
                              handleOpenCreateChapter(m.id);
                            }}
                            className="p-1.5 rounded-lg bg-[#00DC82]/10 text-[#00DC82] hover:text-white hover:bg-[#00DC82]/30"
                            title="Yangi bob qo'shish"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditManga(m)}
                            className="p-1.5 rounded-lg bg-[#141428] text-zinc-300 hover:text-white hover:bg-[#1e1e3a]"
                            title="Tahrirlash"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteManga(m)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Chapters Management */}
        {activeTab === 'chapters' && (
          <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-2xl p-6 shadow-xl space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Boblar boshqaruvi va Tahrirlash</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00DC82] border border-emerald-500/30 font-semibold">
                    {chaptersList.length} ta bob
                  </span>
                </h3>
                <p className="text-xs text-[#a0a0b8] mt-1">
                  Har bir bobning sahifalari, narxi va nomini tahrirlashingiz yoki yangi bob qo'shishingiz mumkin.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => fetchChapters()}
                  disabled={isLoadingChapters}
                  className="btn-ios text-xs py-2 px-3 flex items-center gap-1.5 text-zinc-300 hover:text-white"
                  title="Boblar ro'yxatini yangilash"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChapters ? 'animate-spin text-[#00DC82]' : ''}`} />
                  <span>Yangilash</span>
                </button>
                <button
                  onClick={() => handleOpenCreateChapter(selectedMangaFilter !== 'all' ? selectedMangaFilter : undefined)}
                  className="btn-ios btn-ios-solid text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi Bob qo'shish</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#141428]/60 border border-[#1e1e3a]">
              {/* Manga Selector */}
              <div>
                <label className="text-[11px] font-medium text-[#a0a0b8] block mb-1">Manga bo'yicha filter:</label>
                <select
                  value={selectedMangaFilter}
                  onChange={(e) => setSelectedMangaFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00DC82] font-semibold"
                >
                  <option value="all">Barcha mangalar ({chaptersList.length} ta bob)</option>
                  {mangas.map((m) => {
                    const count = chaptersList.filter((c) => c.manga_id === m.id).length;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.title} ({count} ta bob)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search input */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-medium text-[#a0a0b8] block mb-1">Qidirish (bob raqami yoki nomi):</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={chapterSearchQuery}
                    onChange={(e) => setChapterSearchQuery(e.target.value)}
                    placeholder="Masalan: 1-bob, prolog, yoki manga nomi..."
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-[#00DC82]"
                  />
                  {chapterSearchQuery && (
                    <button
                      onClick={() => setChapterSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                Jami: <b className="text-white">{chaptersList.length}</b> ta bob
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#00DC82]/10 border border-[#00DC82]/20 text-[#00DC82]">
                Ko'rsatilmoqda: <b>{filteredChapters.length}</b> ta
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                🪙 Pullik: <b>{chaptersList.filter((c) => (c.price_coins || 0) > 0).length}</b> ta
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                Bepul: <b>{chaptersList.filter((c) => !c.price_coins).length}</b> ta
              </span>
              {(selectedMangaFilter !== 'all' || chapterSearchQuery) && (
                <button
                  onClick={() => {
                    setSelectedMangaFilter('all');
                    setChapterSearchQuery('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Filterni tozalash</span>
                </button>
              )}
            </div>

            {/* Chapter Items List */}
            {selectedMangaFilter !== 'all' || chapterSearchQuery.trim() ? (
              // Filtered direct list view
              <div className="space-y-3">
                {filteredChapters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredChapters.map((ch) => {
                      const m = mangas.find((item) => item.id === ch.manga_id);
                      const pageCount = Array.isArray(ch.pages)
                        ? ch.pages.length
                        : typeof ch.pages === 'string'
                        ? JSON.parse(ch.pages || '[]').length
                        : 0;

                      return (
                        <div
                          key={ch.id}
                          className="p-3.5 rounded-2xl bg-[#141428]/90 border border-[#1e1e3a] hover:border-[#00DC82]/40 transition-all flex flex-col justify-between gap-3 group"
                        >
                          <div>
                            <div className="flex items-start gap-2.5 mb-2">
                              {m?.cover_image && (
                                <img
                                  src={m.cover_image}
                                  alt={m.title}
                                  className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] text-[#00DC82] font-semibold block truncate">
                                  {m?.title || ch.manga_title || `Manga #${ch.manga_id}`}
                                </span>
                                <h4 className="font-bold text-sm text-white truncate mt-0.5">
                                  {ch.chapter_number}-bob {ch.title ? `(${ch.title})` : ''}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {(ch.price_coins || 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                      <span>🪙</span> {ch.price_coins} tanga
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                                      Bepul
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[#a0a0b8]">
                                    📸 {pageCount} ta rasm
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                            <button
                              onClick={() => handleOpenEditChapter(ch)}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#00DC82]/15 hover:bg-[#00DC82] text-[#00DC82] hover:text-[#020d07] border border-[#00DC82]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Bobni tahrirlash"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Tahrirlash</span>
                            </button>
                            <button
                              onClick={() => handleOpenPriceModal(ch)}
                              className="py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Narxni belgilash"
                            >
                              <span>🪙</span>
                              <span className="hidden sm:inline">Narx</span>
                            </button>
                            <button
                              onClick={() => handleOpenDeleteChapter(ch)}
                              className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs transition-all flex items-center justify-center cursor-pointer"
                              title="Bobni o'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-[#a0a0b8] space-y-2">
                    <p className="text-sm">Qidiruv yoki filter bo'yicha hech qanday bob topilmadi.</p>
                    <button
                      onClick={() => handleOpenCreateChapter(selectedMangaFilter !== 'all' ? selectedMangaFilter : undefined)}
                      className="btn-ios btn-ios-solid text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ushbu mangaga bob qo'shish</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Manga-grouped view (default)
              <div className="space-y-4">
                {mangas.map((m) => {
                  const mChapters = chaptersList
                    .filter((c) => c.manga_id === m.id)
                    .sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number));

                  return (
                    <div key={m.id} className="p-4 rounded-2xl bg-[#141428]/80 border border-[#1e1e3a] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.cover_image}
                            alt={m.title}
                            className="w-12 h-16 object-cover rounded-xl border border-white/10 shadow-sm"
                          />
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-white">{m.title}</h4>
                            <p className="text-xs text-[#00DC82] font-semibold mt-0.5">
                              {mChapters.length} ta bob mavjud
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenCreateChapter(m.id)}
                          className="btn-ios btn-ios-sm py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Yangi bob qo'shish</span>
                        </button>
                      </div>

                      {/* Chapters sub-list */}
                      {mChapters.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2 border-t border-white/5">
                          {mChapters.map((ch) => {
                            const pageCount = Array.isArray(ch.pages)
                              ? ch.pages.length
                              : typeof ch.pages === 'string'
                              ? JSON.parse(ch.pages || '[]').length
                              : 0;

                            return (
                              <div
                                key={ch.id}
                                className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between gap-2 text-xs hover:border-[#00DC82]/40 transition-all"
                              >
                                <div>
                                  <span className="font-bold text-white block truncate">
                                    {ch.chapter_number}-bob {ch.title ? `(${ch.title})` : ''}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {(ch.price_coins || 0) > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                        <span>🪙</span> {ch.price_coins} tanga
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                                        Bepul
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[#a0a0b8]">
                                      📸 {pageCount} rasm
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 shrink-0">
                                  <button
                                    onClick={() => handleOpenEditChapter(ch)}
                                    className="flex-1 py-1 px-2 rounded-lg bg-[#00DC82]/15 hover:bg-[#00DC82] text-[#00DC82] hover:text-[#020d07] border border-[#00DC82]/30 transition-colors cursor-pointer flex items-center justify-center gap-1 font-bold text-[11px]"
                                    title="Bobni tahrirlash"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Tahrirlash</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenPriceModal(ch)}
                                    className="py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                                    title="Narxni o'zgartirish"
                                  >
                                    <span>🪙</span>
                                    <span className="hidden sm:inline">Narx</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteChapter(ch)}
                                    className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-colors cursor-pointer flex items-center justify-center"
                                    title="Bobni o'chirish"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-black/20 text-xs text-[#a0a0b8] flex items-center justify-between">
                          <span className="italic">Ushbu mangada hali boblar kiritilmagan.</span>
                          <button
                            onClick={() => handleOpenCreateChapter(m.id)}
                            className="text-[#00DC82] hover:underline font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Birinchi bobni qo'shish</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: PostgreSQL Database Explorer & Tables */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* Database Credential Card */}
            <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-2xl p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6c5ce7]/20 border border-[#6c5ce7]/40 flex items-center justify-center text-[#6c5ce7]">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">PostgreSQL Ma'lumotlar Bazasi</h3>
                    <p className="text-xs text-[#a0a0b8]">Wasmer PostgreSQL serveriga ulangan</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenClear}
                    className="btn-ios btn-ios-sm text-xs py-1.5 px-3 flex items-center gap-1.5 text-rose-300 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                    title="Barcha test mangalar va boblarni o'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Barcha ma'lumotlarni tozalash</span>
                  </button>
                  <button
                    onClick={handleOpenSeed}
                    className="btn-ios btn-ios-sm text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    title="Boshlang'ich ma'lumotlarni qayta tiklash"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Qayta yuklash</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#020d07] p-4 rounded-xl border border-[#1e1e3a] text-xs font-mono">
                <div>
                  <span className="text-[#a0a0b8] block text-[10px]">HOST:</span>
                  <span className="text-emerald-400 font-bold">psql.fr-roub1.bengt.wasmernet.com</span>
                </div>
                <div>
                  <span className="text-[#a0a0b8] block text-[10px]">PORT:</span>
                  <span className="text-white font-bold">20184</span>
                </div>
                <div>
                  <span className="text-[#a0a0b8] block text-[10px]">DATABASE:</span>
                  <span className="text-white font-bold">Animanga</span>
                </div>
                <div>
                  <span className="text-[#a0a0b8] block text-[10px]">USER:</span>
                  <span className="text-white font-bold">user_a26e3696</span>
                </div>
              </div>

              {/* Tables overview */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-[#a0a0b8] uppercase tracking-wider mb-2">
                  Ochilgan Jadvallar (Tables):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#141428] border border-[#1e1e3a]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-[#00DC82] font-bold">mangas</span>
                      <span className="text-xs bg-[#00DC82]/20 text-[#00DC82] px-2 py-0.5 rounded font-bold">
                        {mangas.length} qator
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      id, title, alternative_titles, type, status, cover_image, rating, views...
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141428] border border-[#1e1e3a]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-[#00cec9] font-bold">chapters</span>
                      <span className="text-xs bg-[#00cec9]/20 text-[#00cec9] px-2 py-0.5 rounded font-bold">
                        {dbStatus?.tables.find((t) => t.name === 'chapters')?.rowCount || 0} qator
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      id, manga_id, chapter_number, title, pages (JSONB), views...
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141428] border border-[#1e1e3a]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-[#fdcb6e] font-bold">genres</span>
                      <span className="text-xs bg-[#fdcb6e]/20 text-[#fdcb6e] px-2 py-0.5 rounded font-bold">
                        10 qator
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      id, name, slug, image, manga_count
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SQL Terminal Tester */}
            <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00DC82]" />
                <span>SQL So'rovlarni bajarish (Live Query)</span>
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-4">
                PostgreSQL bazasiga to'g'ridan-to'g'ri SQL so'rovlarini yuboring (masalan, <code>SELECT * FROM mangas;</code>)
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="flex-1 bg-[#020d07] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-400 outline-none focus:border-[#00DC82]"
                />
                <button
                  onClick={handleRunSql}
                  className="btn-ios btn-ios-solid text-xs py-2 px-4 font-bold"
                >
                  Bajarish
                </button>
              </div>

              {/* Predefined Quick SQL queries */}
              <div className="flex flex-wrap gap-2 mb-4 text-[11px]">
                <button
                  onClick={() => setSqlQuery('SELECT id, title, type, rating, status FROM mangas;')}
                  className="px-2.5 py-1 rounded bg-[#141428] hover:bg-[#1e1e3a] text-zinc-300 font-mono"
                >
                  SELECT mangas
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT id, manga_id, chapter_number, title FROM chapters;')}
                  className="px-2.5 py-1 rounded bg-[#141428] hover:bg-[#1e1e3a] text-zinc-300 font-mono"
                >
                  SELECT chapters
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT id, name, slug FROM genres;')}
                  className="px-2.5 py-1 rounded bg-[#141428] hover:bg-[#1e1e3a] text-zinc-300 font-mono"
                >
                  SELECT genres
                </button>
              </div>

              {sqlError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {sqlError}
                </div>
              )}

              {sqlResult && (
                <div className="mt-3 overflow-x-auto max-h-72 bg-[#020d07] p-3 rounded-xl border border-[#1e1e3a]">
                  <p className="text-[11px] text-[#00DC82] mb-2 font-mono">
                    Natija: {sqlResult.rowCount} ta qator qaytdi
                  </p>
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        {sqlResult.fields?.map((f: string) => (
                          <th key={f} className="p-2">{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {sqlResult.rows?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-900/50">
                          {sqlResult.fields?.map((f: string) => (
                            <td key={f} className="p-2 text-zinc-300 truncate max-w-xs">
                              {typeof row[f] === 'object' ? JSON.stringify(row[f]) : String(row[f])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Modal: Add / Edit Manga */}
      {showMangaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e1612]/95 border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 sm:p-7 my-auto text-left relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00DC82]/15 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingManga ? 'Mangani tahrirlash' : 'Yangi Manga qo\'shish'}
                  </h3>
                  <p className="text-[11px] text-[#a0a0b8]">
                    Qurilmadan muqovani Catbox.moe ga yuklang va ma'lumotlarni to'ldiring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMangaModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManga} className="space-y-4">
              {/* Cover Image Upload (Catbox.moe) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#00DC82]" />
                    <span>Manga Muqova Rasmi * (Catbox.moe)</span>
                  </span>
                  {mangaForm.cover_image && (
                    <span className="text-[11px] text-[#00DC82] flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Rasm tayyor
                    </span>
                  )}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Cover Preview */}
                  <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden bg-white/5 border border-white/15 shrink-0 flex items-center justify-center relative group shadow-lg">
                    {mangaForm.cover_image ? (
                      <img
                        src={mangaForm.cover_image}
                        alt="Muqova"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#a0a0b8]">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        <span className="text-[10px] block">Rasm yo'q</span>
                      </div>
                    )}
                    {isUploadingCover && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold">
                        <Loader2 className="w-6 h-6 animate-spin text-[#00DC82]" />
                        <span>Yuklanmoqda...</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 w-full space-y-2.5">
                    <input
                      type="file"
                      ref={coverFileInputRef}
                      onChange={handleCoverFileUpload}
                      accept="image/*"
                      className="hidden"
                      id="manga-cover-file-input"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={isUploadingCover}
                        className="btn-ios btn-ios-solid py-2 px-4 text-xs font-bold flex items-center gap-2 shadow-sm"
                        id="btn-upload-cover-device"
                      >
                        {isUploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                        <span>Qurilmadan tanlash (Catbox.moe)</span>
                      </button>

                      {mangaForm.cover_image && (
                        <button
                          type="button"
                          onClick={() => setMangaForm({ ...mangaForm, cover_image: '' })}
                          className="btn-ios py-2 px-3 text-xs text-rose-300 hover:text-rose-200"
                        >
                          Tozalash
                        </button>
                      )}
                    </div>

                    {coverUploadError && (
                      <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                        {coverUploadError}
                      </p>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={mangaForm.cover_image}
                        onChange={(e) => setMangaForm({ ...mangaForm, cover_image: e.target.value })}
                        className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#00DC82]"
                        placeholder="Yoki to'g'ridan-to'g'ri rasm havolasi (URL)..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Alternative Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Manga nomi *</label>
                  <input
                    type="text"
                    required
                    value={mangaForm.title}
                    onChange={(e) => setMangaForm({ ...mangaForm, title: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#00DC82]"
                    placeholder="Masalan: Solo Leveling"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Muqobil nom (Inglizcha)</label>
                  <input
                    type="text"
                    value={mangaForm.alternative_titles}
                    onChange={(e) => setMangaForm({ ...mangaForm, alternative_titles: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#00DC82]"
                    placeholder="Masalan: Only I Level Up"
                  />
                </div>
              </div>

              {/* Type, Status, Rating */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Turi</label>
                  <select
                    value={mangaForm.type}
                    onChange={(e) => setMangaForm({ ...mangaForm, type: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="manhwa">Manhwa (Koreya)</option>
                    <option value="manga">Manga (Yaponiya)</option>
                    <option value="manhua">Manhua (Xitoy)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Holati</label>
                  <select
                    value={mangaForm.status}
                    onChange={(e) => setMangaForm({ ...mangaForm, status: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="ongoing">Davom etmoqda</option>
                    <option value="completed">Tugallangan</option>
                    <option value="dropped">To'xtatilgan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Reyting</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={mangaForm.rating}
                    onChange={(e) => setMangaForm({ ...mangaForm, rating: parseFloat(e.target.value) || 8.0 })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Quick Genre Selector */}
              <div>
                <label className="text-xs font-medium text-[#a0a0b8] block mb-1.5">
                  Janrlar (Tezkor tanlash uchun bosing):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_GENRES.map((g) => {
                    const isSelected = mangaForm.genres
                      .toLowerCase()
                      .includes(g.toLowerCase());
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleToggleGenre(g)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all border ${
                          isSelected
                            ? 'bg-[#00DC82] text-black border-[#00DC82] shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {g}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={mangaForm.genres}
                  onChange={(e) =>
                    setMangaForm({
                      ...mangaForm,
                      genres: e.target.value,
                      genre_slugs: e.target.value.toLowerCase().replace(/\s+/g, ''),
                    })
                  }
                  className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00DC82]"
                  placeholder="Action, Fantastika, Sarguzasht"
                />
              </div>

              {/* Author & Synopsis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Muallif</label>
                  <input
                    type="text"
                    value={mangaForm.author}
                    onChange={(e) => setMangaForm({ ...mangaForm, author: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="Muallif ismi"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Chiqarilgan yili</label>
                  <input
                    type="number"
                    value={mangaForm.release_year}
                    onChange={(e) => setMangaForm({ ...mangaForm, release_year: parseInt(e.target.value, 10) || 2024 })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Tavsif (Synopsis)</label>
                <textarea
                  rows={3}
                  value={mangaForm.description}
                  onChange={(e) => setMangaForm({ ...mangaForm, description: e.target.value })}
                  className="w-full bg-[#020d07] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#00DC82]"
                  placeholder="Manga syujeti haqida qisqacha ma'lumot..."
                />
              </div>

              {/* Bosh sahifa banneriga qo'yish (Hero Slider) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#00DC82]/10 to-transparent border border-[#00DC82]/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00DC82]/20 border border-[#00DC82]/40 flex items-center justify-center text-[#00DC82] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Bosh sahifa banneriga chiqarish (Hero Slider)
                    </span>
                    <p className="text-[11px] text-[#a0a0b8]">
                      Manga bosh sahifadagi eng yuqori katta slayd-bannerda aylanib turadi
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMangaForm({ ...mangaForm, is_banner: !mangaForm.is_banner })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                    mangaForm.is_banner ? 'bg-[#00DC82]' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform ${
                      mangaForm.is_banner ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowMangaModal(false)}
                  className="btn-ios text-xs py-2 px-4"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploadingCover}
                  className="btn-ios btn-ios-solid text-xs py-2 px-5 font-bold flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Chapter */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0e1612]/95 border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 sm:p-7 my-auto text-left relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00DC82]/15 border border-[#00DC82]/30 flex items-center justify-center text-[#00DC82]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {chapterForm.id ? "Bobni Tahrirlash" : "Yangi Bob qo'shish"}
                  </h3>
                  <p className="text-[11px] text-[#a0a0b8]">
                    Qurilmadan barcha sahifalarni tanlang (Catbox.moe ga bir zumda yuklanadi)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChapterModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              {/* Manga Select */}
              <div>
                <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Manga tanlang *</label>
                <select
                  value={chapterForm.manga_id}
                  onChange={(e) => handleMangaChangeInChapter(Number(e.target.value))}
                  className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-[#00DC82]"
                >
                  {mangas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.chapters?.length || 0} ta bob mavjud)
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter Number & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Bob raqami *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={chapterForm.chapter_number}
                    onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-[#00DC82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#a0a0b8] block mb-1">Bob nomi (Ixtiyoriy)</label>
                  <input
                    type="text"
                    value={chapterForm.title}
                    onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#00DC82]"
                    placeholder="Masalan: Qahramonning uyg'onishi"
                  />
                </div>
              </div>

              {/* Coin Price Selection */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🪙</span>
                    <span>Bob narxi (Tilla tangalarda)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-300">
                    {chapterForm.price_coins > 0 ? `${chapterForm.price_coins} tanga (${(chapterForm.price_coins * 100).toLocaleString()} so'm)` : 'Bepul (0)'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[0, 5, 10, 20, 50].map((coins) => (
                    <button
                      key={coins}
                      type="button"
                      onClick={() => setChapterForm({ ...chapterForm, price_coins: coins })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        chapterForm.price_coins === coins
                          ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : 'bg-black/40 text-amber-200/80 border-amber-500/30 hover:border-amber-400'
                      }`}
                    >
                      {coins === 0 ? 'Bepul (0)' : `${coins} 🪙`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapter Pages Upload (Catbox.moe) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-[#00DC82]" />
                    <span>Sahifalar rasmlari (Catbox.moe)</span>
                  </label>
                  <span className="text-[11px] text-[#00DC82] font-semibold">
                    {chapterForm.pagesText.split('\n').filter((s) => s.trim()).length} ta sahifa
                  </span>
                </div>

                {/* Hidden Multi-file input */}
                <input
                  type="file"
                  multiple
                  ref={chapterPagesInputRef}
                  onChange={handleChapterPagesFileUpload}
                  accept="image/*"
                  className="hidden"
                  id="chapter-pages-file-input"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => chapterPagesInputRef.current?.click()}
                    disabled={isUploadingPages}
                    className="btn-ios btn-ios-solid py-2.5 px-4 text-xs font-bold flex items-center gap-2"
                    id="btn-upload-chapter-pages"
                  >
                    {isUploadingPages ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>
                      {isUploadingPages ? 'Yuklanmoqda...' : '📸 Qurilmadan barcha sahifalarni tanlash (Galereya)'}
                    </span>
                  </button>

                  {chapterForm.pagesText.trim() && (
                    <button
                      type="button"
                      onClick={() => setChapterForm({ ...chapterForm, pagesText: '' })}
                      className="btn-ios py-2 px-3 text-xs text-rose-300 hover:text-rose-200"
                    >
                      Barchasini tozalash
                    </button>
                  )}
                </div>

                {/* Upload progress indicator */}
                {pagesUploadProgress && (
                  <div className="p-3 rounded-xl bg-[#00DC82]/10 border border-[#00DC82]/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#00DC82] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Catbox.moe ga yuklanmoqda...
                      </span>
                      <span>
                        {pagesUploadProgress.current} / {pagesUploadProgress.total} (
                        {Math.round((pagesUploadProgress.current / pagesUploadProgress.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00DC82] h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${(pagesUploadProgress.current / pagesUploadProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {pagesUploadError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    {pagesUploadError}
                  </p>
                )}

                {/* Thumbnails preview strip */}
                {chapterForm.pagesText.trim() && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#a0a0b8] font-medium">Sahifalar tartibi:</span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-[#020d07] rounded-xl border border-white/5">
                      {chapterForm.pagesText
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-lg overflow-hidden border border-white/10 aspect-[2/3] bg-black/40"
                          >
                            <img
                              src={url}
                              alt={`Sahifa ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold text-white">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePageUrl(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition shadow-sm"
                              title="O'chirish"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Raw URL textarea */}
                <div>
                  <label className="text-[11px] text-[#a0a0b8] block mb-1">
                    Yoki havolalarni matn sifatida kiriting (Har bir qatorga 1 ta URL):
                  </label>
                  <textarea
                    rows={3}
                    value={chapterForm.pagesText}
                    onChange={(e) => setChapterForm({ ...chapterForm, pagesText: e.target.value })}
                    className="w-full bg-[#020d07] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-[#00DC82]"
                    placeholder="https://files.catbox.moe/page1.jpg&#10;https://files.catbox.moe/page2.jpg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="btn-ios text-xs py-2 px-4"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploadingPages}
                  className="btn-ios btn-ios-solid text-xs py-2 px-5 font-bold flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? 'Yuklanmoqda...' : 'Bobni saqlash'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation (In-App Modal) */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0d20] border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-left animate-scale-up">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {deleteConfirm.type === 'manga'
                    ? 'Mangani o\'chirish'
                    : deleteConfirm.type === 'chapter'
                    ? 'Bobni o\'chirish'
                    : deleteConfirm.type === 'clear'
                    ? 'Barcha ma\'lumotlarni tozalash'
                    : 'Boshlang\'ich ma\'lumotlarni tiklash'}
                </h3>
                <p className="text-xs text-rose-300/80">Bu amalni ortga qaytarib bo'lmaydi</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-5 bg-black/40 p-3 rounded-xl border border-white/5">
              Haqiqatan ham <strong className="text-white font-bold">"{deleteConfirm.title}"</strong> ni amalga oshirmoqchimisiz? Barcha test mangalar, boblar va yozuvlar o'chiriladi.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn-ios text-xs py-2 px-4 cursor-pointer"
                disabled={isLoading}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'manga' && deleteConfirm.id) {
                    handleExecuteDeleteManga(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'chapter' && deleteConfirm.id) {
                    handleExecuteDeleteChapter(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'clear') {
                    handleExecuteClear();
                  } else if (deleteConfirm.type === 'seed') {
                    handleExecuteSeed();
                  }
                }}
                disabled={isLoading}
                className="btn-ios py-2 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/50 rounded-xl cursor-pointer"
              >
                {isLoading ? 'Bajarilmoqda...' : 'Ha, tozalansin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Chapter Price in Gold Coins */}
      {priceModal && priceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0d20] border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-left animate-scale-up">
            <div className="flex items-center gap-3 mb-4 text-amber-300">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                🪙
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bob narxini belgilash</h3>
                <p className="text-xs text-amber-300/80 truncate max-w-xs">{priceModal.title}</p>
              </div>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Tilla tangalar miqdori (0 = Bepul / Tekin):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/60 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2.5 pl-9 text-sm text-white font-bold outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-400">
                    {newPriceValue > 0
                      ? `${(newPriceValue * 100).toLocaleString()} so'm`
                      : 'Tekin / Bepul'}
                  </span>
                </div>
              </div>

              {/* Quick price presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 1, 2, 5, 10, 20].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewPriceValue(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      newPriceValue === val
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {val === 0 ? 'Bepul' : `${val} tanga`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPriceModal(null)}
                  className="btn-ios text-xs py-2 px-4 cursor-pointer"
                  disabled={isLoading}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-ios btn-ios-solid py-2 px-5 text-xs font-bold text-black cursor-pointer"
                >
                  {isLoading ? 'Saqlanmoqda...' : 'Narxni saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
