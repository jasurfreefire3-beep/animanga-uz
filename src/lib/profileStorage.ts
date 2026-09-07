import type { UserProfile, UserComment, UserViewHistory } from '../types.js';

const PROFILE_STORAGE_KEY = 'animanga_user_profile';

export const DEFAULT_PROFILE: UserProfile = {
  username: 'MangaMuxlis',
  name: 'Manga Muxlisi',
  avatar_url: 'https://files.catbox.moe/g244x0.jpg',
  bio: 'Manga va manhvalarni sevib o\'qiyman. Sevimli janrlarim: Harakat, Sarguzasht va Fantastika!',
  isAdmin: false,
  coins: 0,
  unlocked_chapters: [],
  created_at: new Date().toISOString().split('T')[0],
  comments: [
    {
      id: 'c-welcome-1',
      manga_id: 1,
      manga_title: 'Yakkaxon daraja ko\'tarish (Solo Leveling)',
      chapter_number: 1,
      text: 'Bu manhva chindan ham asar! Har bir sahnasi hayajonli.',
      date: new Date().toISOString().split('T')[0],
      likes: 5,
    },
  ],
  liked_mangas: [1, 2],
  views_history: [
    {
      manga_id: 1,
      manga_title: 'Yakkaxon daraja ko\'tarish',
      manga_cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
      chapter_number: 1,
      date: new Date().toISOString().split('T')[0],
    },
  ],
  bookmarks: [1],
};

/**
 * Get the current user profile from localStorage or fallback
 */
export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
        unlocked_chapters: Array.isArray(parsed.unlocked_chapters) ? parsed.unlocked_chapters : [],
        comments: Array.isArray(parsed.comments) ? parsed.comments : DEFAULT_PROFILE.comments,
        liked_mangas: Array.isArray(parsed.liked_mangas) ? parsed.liked_mangas : DEFAULT_PROFILE.liked_mangas,
        views_history: Array.isArray(parsed.views_history) ? parsed.views_history : DEFAULT_PROFILE.views_history,
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : DEFAULT_PROFILE.bookmarks,
      };
    }
  } catch (err) {
    console.warn('[ProfileStorage] get error:', err);
  }
  return DEFAULT_PROFILE;
}

/**
 * Persist user profile to localStorage and sync with server API
 */
export async function persistProfile(profile: UserProfile): Promise<UserProfile> {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[ProfileStorage] localStorage error:', e);
  }

  // Background server sync
  try {
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch((e) => console.warn('[ProfileStorage] Server sync failed (silent):', e));
  } catch {}

  return profile;
}

/**
 * Upload an image file directly to Catbox.moe via server proxy
 * Returns the permanent Catbox.moe file URL (https://files.catbox.moe/xxxxxx.ext)
 */
export async function uploadToCatbox(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Faylni o\'qishda xatolik yuz berdi'));
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload/catbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
          }),
        });

        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
          let errorMsg = 'Rasm yuklab bo\'lmadi';
          if (contentType.includes('application/json')) {
            try {
              const errData = await res.json();
              errorMsg = errData.error || errorMsg;
            } catch {
              errorMsg = `Server xatoligi (${res.status})`;
            }
          } else {
            const rawText = await res.text();
            errorMsg = rawText ? rawText.slice(0, 80) : `Server xatoligi (${res.status})`;
          }
          throw new Error(errorMsg);
        }

        let data: any;
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const rawText = await res.text();
          throw new Error(`Server kutilmagan javob qaytardi: ${rawText.slice(0, 80)}`);
        }

        if (!data?.url || typeof data.url !== 'string') {
          throw new Error('Serverdan noto\'g\'ri havola qaytdi');
        }

        resolve(data.url);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Export full profile JSON to user file download
 */
export function exportProfileToJson(profile: UserProfile) {
  const jsonStr = JSON.stringify(profile, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `animanga_profil_${profile.username}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
