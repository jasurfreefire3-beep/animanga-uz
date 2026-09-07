export interface Manga {
  id: number;
  title: string;
  alternative_titles?: string;
  type: 'manhwa' | 'manga' | 'manhua';
  status: 'ongoing' | 'completed' | 'dropped';
  description: string;
  cover_image: string;
  author: string;
  artist: string;
  rating: number;
  release_year: number;
  views: number;
  created_at?: string;
  updated_at?: string;
  tags?: string;
  age_rating?: number;
  genres: string;
  genre_ids?: string;
  genre_slugs?: string;
  is_banner?: boolean;
  chapter_count?: number;
  chapters?: Chapter[];
}

export interface Chapter {
  id: number;
  manga_id: number;
  chapter_number: number;
  title: string;
  release_date: string;
  pages?: string[];
  views: number;
  created_at?: string;
  manga_title?: string;
  price_coins?: number;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
  image: string;
  manga_count: number;
}

export interface DatabaseStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  tables: {
    name: string;
    rowCount: number;
  }[];
  error?: string | null;
}

export interface UserComment {
  id: string;
  manga_id: number;
  manga_title: string;
  chapter_number?: number | string;
  text: string;
  date: string;
  likes: number;
  user_name?: string;
  avatar_url?: string;
}

export interface UserViewHistory {
  manga_id: number;
  manga_title: string;
  manga_cover: string;
  chapter_number?: number | string;
  date: string;
}

export interface UserProfile {
  username: string;
  name: string;
  avatar_url: string;
  bio: string;
  phone?: string;
  telegram_id?: number | string;
  isAdmin?: boolean;
  coins?: number;
  unlocked_chapters?: number[];
  created_at: string;
  comments: UserComment[];
  liked_mangas: number[];
  views_history: UserViewHistory[];
  bookmarks: number[];
}

export interface CoinTransaction {
  id?: number;
  order_id: number;
  username: string;
  coins: number;
  amount: number;
  status: 'pending' | 'paid' | 'canceled';
  pay_url?: string;
  created_at?: string;
  paid_at?: string;
}
