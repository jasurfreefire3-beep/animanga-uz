import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Heart,
  Eye,
  MessageSquare,
  Bookmark,
  Edit3,
  Check,
  X,
  Shield,
  LogOut,
  Calendar,
  Sparkles,
  Trash2,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Coins
} from 'lucide-react';
import type { Manga, UserProfile, UserComment, UserViewHistory } from '../types.js';
import { uploadToCatbox } from '../lib/profileStorage.js';
import { MangaCard } from './MangaCard.js';
import { VerifiedBadge } from './VerifiedBadge.js';

interface ProfileViewProps {
  user?: { username: string; isAdmin?: boolean } | null;
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void> | void;
  mangas: Manga[];
  onSelectManga: (manga: Manga) => void;
  onLogout: () => void;
  onNavigate: (tab: string, param?: string) => void;
  onOpenAuth: () => void;
  onOpenCoins?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  onUpdateProfile,
  mangas,
  onSelectManga,
  onLogout,
  onNavigate,
  onOpenAuth,
  onOpenCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history' | 'comments' | 'likes'>('bookmarks');
  
  // Edit mode states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(profile.name || profile.username);
  const [editBio, setEditBio] = useState(profile.bio || '');
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter bookmarked mangas
  const bookmarkedMangas = mangas.filter((m) =>
    (profile.bookmarks || []).includes(m.id)
  );

  // Filter liked mangas
  const likedMangas = mangas.filter((m) =>
    (profile.liked_mangas || []).includes(m.id)
  );

  // Handle avatar upload to Catbox.moe
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Fayl hajmi 15MB dan oshmasligi kerak');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const catboxUrl = await uploadToCatbox(file);
      await onUpdateProfile({ avatar_url: catboxUrl });
      setUploadSuccess('Rasm muvaffaqiyatli yuklandi!');
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setUploadError(err.message || 'Yuklashda xatolik yuz berdi');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Name & Bio edits
  const handleSaveProfileDetails = async () => {
    if (!editName.trim()) return;
    await onUpdateProfile({
      name: editName.trim(),
      bio: editBio.trim(),
    });
    setIsEditingName(false);
  };

  // Delete a user comment
  const handleDeleteComment = async (commentId: string) => {
    const updated = (profile.comments || []).filter((c) => c.id !== commentId);
    await onUpdateProfile({ comments: updated });
  };

  // Clear views history
  const handleClearHistory = async () => {
    if (confirm('Barcha ko\'rishlar tarixini tozalashni xohlaysizmi?')) {
      await onUpdateProfile({ views_history: [] });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 text-left animate-fade-in" id="profile-container">
      
      {/* 1. HERO HEADER PROFILE CARD */}
      <div className="relative rounded-[24px] sm:rounded-[32px] overflow-hidden ios-glass border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 sm:mb-8 p-4 sm:p-6 md:p-8">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-[#6c5ce7]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#00DC82]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
          
          {/* Avatar Area with Catbox upload overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden p-1 bg-gradient-to-tr from-[#6c5ce7] via-[#00DC82] to-[#00cec9] shadow-xl">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#0a0a1a] relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://files.catbox.moe/g244x0.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b1b36] to-[#0a0a1a] text-white font-extrabold text-3xl">
                    {(profile.name || profile.username).charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Upload Spinner Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-2">
                    <div className="w-7 h-7 border-2 border-[#00DC82] border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-[10px] text-center text-[#00DC82] font-semibold leading-tight">
                      Yuklanmoqda...
                    </span>
                  </div>
                )}

                {/* Hover Upload Prompt */}
                {!isUploading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                    title="Yangi rasm yuklash (Catbox.moe)"
                  >
                    <Camera className="w-6 h-6 text-[#00DC82] mb-1" />
                    <span className="text-[10px] font-bold text-white tracking-wide">
                      Almashtirish
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Visible Camera button on mobile & desktop */}
            {!isUploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00DC82] border-2 border-[#0a0a1a] flex items-center justify-center text-black shadow-lg active:scale-90 cursor-pointer"
                title="Rasmni almashtirish"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Hidden real file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
            />
          </div>

          {/* User Details & Inline Edit */}
          <div className="flex-1 text-center md:text-left min-w-0 w-full">
            {isEditingName ? (
              <div className="space-y-3 max-w-md mx-auto md:mx-0">
                <div>
                  <label className="text-[11px] font-medium text-white/60 block mb-1">
                    Ism yoki taxallus:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-[#6c5ce7]/60 rounded-xl px-3.5 py-2 text-white text-sm focus:border-[#00DC82] outline-none"
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-white/60 block mb-1">
                    Haqingizda (Bio):
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-[#6c5ce7]/60 rounded-xl px-3.5 py-2 text-white text-xs focus:border-[#00DC82] outline-none resize-none"
                    placeholder="O'zingiz haqingizda biror narsa yozing..."
                  />
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <button
                    onClick={handleSaveProfileDetails}
                    className="btn-ios btn-ios-sm btn-ios-solid text-xs py-1.5 px-4 font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Saqlash</span>
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="btn-ios btn-ios-sm text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bekor qilish</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    <span>{profile.name || profile.username}</span>
                    <VerifiedBadge size="lg" />
                  </h1>
                  
                  {profile.isAdmin ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/40 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#6c5ce7]" />
                      ADMIN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white/80 border border-white/20">
                      Foydalanuvchi
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setEditName(profile.name || profile.username);
                      setEditBio(profile.bio || '');
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                    title="Nom va ma'lumotlarni tahrirlash"
                  >
                    <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-xs text-[#a0a0b8] mb-2 font-mono">
                  <span className="text-white font-semibold">@{profile.username}</span>
                  <VerifiedBadge size="sm" />
                  <span className="text-white/20">&bull;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#00DC82]" />
                    <span>A'zo bo'lgan: {profile.created_at || '2026-01-01'}</span>
                  </span>
                  {profile.phone && (
                    <>
                      <span className="text-white/20">&bull;</span>
                      <span className="text-cyan-400 font-medium flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        📱 {profile.phone}
                      </span>
                    </>
                  )}
                  {profile.telegram_id && (
                    <span className="text-[#229ED9] font-medium flex items-center gap-1 bg-[#229ED9]/10 px-2 py-0.5 rounded-full border border-[#229ED9]/30">
                      Telegram bog'langan
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-white/80 max-w-2xl leading-relaxed">
                  {profile.bio || "Hozircha o'zingiz haqingizda ma'lumot kiritilmagan. Qalamcha tugmasi orqali istalgan ma'lumotni kiritishingiz mumkin."}
                </p>
              </div>
            )}

            {/* Success / Error notification */}
            {uploadSuccess && (
              <div className="mt-3 p-2 rounded-xl bg-[#00DC82]/15 border border-[#00DC82]/30 text-[#00DC82] text-xs flex items-center gap-2 justify-center md:justify-start">
                <Check className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
            {uploadError && (
              <div className="mt-3 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 justify-center md:justify-start">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="flex md:flex-col items-center gap-2 shrink-0">
            {user ? (
              <button
                onClick={onLogout}
                className="btn-ios btn-ios-sm py-2 px-3.5 flex items-center gap-1.5 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                title="Akkuntdan chiqish"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Chiqish</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn-ios btn-ios-solid py-2 px-3.5 flex items-center gap-1.5 text-xs text-black font-bold cursor-pointer"
                title="Tizimga kirish"
              >
                <User className="w-3.5 h-3.5" />
                <span>Kirish</span>
              </button>
            )}
          </div>

        </div>

        {/* 1.5. GOLD COINS BALANCE BANNER */}
        <div className="mt-5 sm:mt-6 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center text-xl sm:text-2xl shadow-md text-black shrink-0">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Tilla tangalar balansi
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  TezChek
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {(profile.coins || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-300">
                  tanga
                </span>
                <span className="text-[11px] sm:text-xs text-gray-400">
                  ({((profile.coins || 0) * 100).toLocaleString()} so'm qiymatida)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {profile.unlocked_chapters && profile.unlocked_chapters.length > 0 && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold hidden lg:inline">
                {profile.unlocked_chapters.length} ta bob ochilgan
              </span>
            )}
            <button
              type="button"
              onClick={onOpenCoins}
              className="w-full sm:w-auto btn-ios btn-ios-solid bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <span>🪙</span>
              <span>Tanga sotib olish (TezChek)</span>
            </button>
          </div>
        </div>

        {/* 2. STATS BAR (Ko'rishlar, Layklar, Fikrlar, Xatcho'plar) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[#2b2752]/70">
          
          <div
            onClick={() => setActiveTab('history')}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#0e0c1f]/80 border border-[#2b2752]/60 hover:border-[#00DC82]/40 cursor-pointer transition text-center group active:scale-95"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#a0a0b8] mb-1">
              <Eye className="w-3.5 h-3.5 text-[#00DC82] group-hover:scale-110 transition-transform" />
              <span>Ko'rishlar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {(profile.views_history || []).length}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('likes')}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#0e0c1f]/80 border border-[#2b2752]/60 hover:border-[#fd79a8]/40 cursor-pointer transition text-center group active:scale-95"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#a0a0b8] mb-1">
              <Heart className="w-3.5 h-3.5 text-[#fd79a8] fill-[#fd79a8]/30 group-hover:scale-110 transition-transform" />
              <span>Layklar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {(profile.liked_mangas || []).length}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('comments')}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#0e0c1f]/80 border border-[#2b2752]/60 hover:border-[#6c5ce7]/40 cursor-pointer transition text-center group active:scale-95"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#a0a0b8] mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#a29bfe] group-hover:scale-110 transition-transform" />
              <span>Fikrlar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {(profile.comments || []).length}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('bookmarks')}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#0e0c1f]/80 border border-[#2b2752]/60 hover:border-[#00cec9]/40 cursor-pointer transition text-center group active:scale-95"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#a0a0b8] mb-1">
              <Bookmark className="w-3.5 h-3.5 text-[#00cec9] group-hover:scale-110 transition-transform" />
              <span>Xatcho'plar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {bookmarkedMangas.length}
            </div>
          </div>

        </div>

      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#1e1e3a] pb-3 mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-[#00DC82] text-black shadow-lg shadow-[#00DC82]/20'
              : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Xatcho'plar ({bookmarkedMangas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'bg-[#00DC82] text-black shadow-lg shadow-[#00DC82]/20'
              : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Ko'rishlar tarixi ({(profile.views_history || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
            activeTab === 'comments'
              ? 'bg-[#00DC82] text-black shadow-lg shadow-[#00DC82]/20'
              : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Mening fikrlarim ({(profile.comments || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('likes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
            activeTab === 'likes'
              ? 'bg-[#00DC82] text-black shadow-lg shadow-[#00DC82]/20'
              : 'text-[#a0a0b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Yoqtirilganlar ({likedMangas.length})</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      
      {/* TAB 1: XATCHO'PLAR */}
      {activeTab === 'bookmarks' && (
        <div className="animate-fade-in">
          {bookmarkedMangas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {bookmarkedMangas.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  onClick={() => onSelectManga(manga)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0a1a]/70 border border-[#1e1e3a] max-w-md mx-auto">
              <Bookmark className="w-12 h-12 text-[#2a2a4a] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Hozircha saqlangan mangalar yo'q
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-5">
                Katalogdagi istalgan asarni ochib "Xatcho'pga qo'shish" tugmasini bosing.
              </p>
              <button
                onClick={() => onNavigate('manga')}
                className="btn-ios btn-ios-solid btn-ios-sm font-bold"
              >
                Katalogni ko'rish
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KO'RISHLAR VA O'QISH TARIXI */}
      {activeTab === 'history' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00DC82]" />
              <span>So'nggi o'qilgan va ko'rilgan asarlar</span>
            </h3>
            {(profile.views_history || []).length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tarixni tozalash</span>
              </button>
            )}
          </div>

          {(profile.views_history || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {profile.views_history.map((hist, index) => {
                const targetManga = mangas.find((m) => m.id === hist.manga_id);
                return (
                  <div
                    key={`${hist.manga_id}-${index}`}
                    onClick={() => {
                      if (targetManga) onSelectManga(targetManga);
                    }}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0f0d22] border border-[#2b2752]/60 hover:border-[#00DC82]/50 cursor-pointer transition group"
                  >
                    <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/5">
                      <img
                        src={hist.manga_cover || targetManga?.cover_image}
                        alt={hist.manga_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00DC82] transition truncate">
                        {hist.manga_title}
                      </h4>
                      <p className="text-xs text-[#a0a0b8] mt-0.5">
                        {hist.chapter_number ? `${hist.chapter_number}-bob mutolaa qilindi` : 'Manga sahifasi ochildi'}
                      </p>
                      <span className="text-[10px] text-[#6c5ce7] font-mono mt-1 block">
                        {hist.date}
                      </span>
                    </div>
                    <div className="text-white/40 group-hover:text-[#00DC82] transition p-2">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0a1a]/70 border border-[#1e1e3a] max-w-md mx-auto">
              <Eye className="w-12 h-12 text-[#2a2a4a] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Ko'rishlar tarixi bo'sh
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-5">
                Siz o'qigan yoki ko'rgan mangalar bu yerda avtomatik saqlanib boradi.
              </p>
              <button
                onClick={() => onNavigate('home')}
                className="btn-ios btn-ios-solid btn-ios-sm font-bold"
              >
                Bosh sahifaga o'tish
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MENING KOMMENTARIYALARIM */}
      {activeTab === 'comments' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#a29bfe]" />
              <span>Yozgan sharh va fikrlaringiz</span>
            </h3>
          </div>

          {(profile.comments || []).length > 0 ? (
            <div className="space-y-3">
              {profile.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-2xl bg-[#0f0d22] border border-[#2b2752]/70 hover:border-[#6c5ce7]/50 transition text-left"
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comment.avatar_url || profile.avatar_url || 'https://files.catbox.moe/g244x0.jpg'}
                        alt={comment.user_name || profile.name || 'User'}
                        className="w-8 h-8 rounded-xl object-cover border border-[#6c5ce7]/40 bg-[#070612] shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://files.catbox.moe/g244x0.jpg';
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs flex items-center gap-1">
                            <span>{comment.user_name || profile.name || profile.username || 'User'}</span>
                            <VerifiedBadge size="sm" />
                          </span>
                          <span className="text-[10px] text-[#a29bfe] font-semibold">
                            &bull; {comment.manga_title}
                          </span>
                          {comment.chapter_number && (
                            <span className="px-1.5 py-0.5 rounded bg-[#6c5ce7]/20 text-[#a29bfe] text-[9px] font-bold">
                              {comment.chapter_number}-bob
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#a0a0b8] font-mono">
                          {comment.date}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                      title="Sharhni o'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs md:text-sm text-white/85 leading-relaxed bg-[#0a0a1a]/50 p-3 rounded-xl border border-white/5">
                    "{comment.text}"
                  </p>

                  <div className="flex items-center gap-3 mt-2.5 text-xs text-[#a0a0b8]">
                    <span className="flex items-center gap-1 text-[#fd79a8]">
                      <Heart className="w-3.5 h-3.5 fill-[#fd79a8]" />
                      <span>{comment.likes || 0} ta layk</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0a1a]/70 border border-[#1e1e3a] max-w-md mx-auto">
              <MessageSquare className="w-12 h-12 text-[#2a2a4a] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Hozircha sharhlar yozilmagan
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-5">
                Istalgan manga sahifasiga kirib o'z fikringizni qoldirishingiz mumkin.
              </p>
              <button
                onClick={() => onNavigate('manga')}
                className="btn-ios btn-ios-solid btn-ios-sm font-bold"
              >
                Mangalarni o'qish
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: YOQTIRILGANLAR (LIKES) */}
      {activeTab === 'likes' && (
        <div className="animate-fade-in">
          {likedMangas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {likedMangas.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  onClick={() => onSelectManga(manga)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0a1a]/70 border border-[#1e1e3a] max-w-md mx-auto">
              <Heart className="w-12 h-12 text-[#2a2a4a] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Yoqtirilgan mangalar yo'q
              </h3>
              <p className="text-xs text-[#a0a0b8] mb-5">
                Manga tafsilotlarida yurakcha belgisini bosib sevimli asarlaringizni belgilang.
              </p>
              <button
                onClick={() => onNavigate('manga')}
                className="btn-ios btn-ios-solid btn-ios-sm font-bold"
              >
                Katalogni kashf qilish
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
