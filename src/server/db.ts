import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { initialGenres, initialMangas, initialChapters } from './initialData.js';
import type { Manga, Chapter, Genre, DatabaseStatus, UserProfile, CoinTransaction, ChatMessage } from '../types.js';

const { Pool } = pg;

// Local JSON persistent store directory
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MANGAS_FILE = path.join(DATA_DIR, 'mangas.json');
const CHAPTERS_FILE = path.join(DATA_DIR, 'chapters.json');
const PROFILES_FILE = path.join(DATA_DIR, 'user_profiles.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'coin_transactions.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'manga_comments.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat_messages.json');

export interface MangaComment {
  id: string;
  manga_id: number;
  username: string;
  name: string;
  avatar_url?: string;
  text: string;
  likes: number;
  created_at: string;
}

function loadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`[Data Storage] Failed to read ${filePath}:`, e);
  }
  return fallback;
}

function saveJsonFile<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[Data Storage] Failed to write ${filePath}:`, e);
  }
}

// PostgreSQL credentials
const pgConfig = {
  host: process.env.PGHOST || 'psql.fr-roub1.bengt.wasmernet.com',
  port: parseInt(process.env.PGPORT || '20184', 10),
  database: process.env.PGDATABASE || 'Animanga',
  user: process.env.PGUSER || 'user_a26e3696',
  password: process.env.PGPASSWORD || 'pw_PoNZi6Eepzfw4dMbLWDuBxLyK8fi3YXl',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 7000,
  idleTimeoutMillis: 30000,
};

export const pool = new Pool(pgConfig);

// In-memory persistent cache loaded from local JSON backup
let memoryMangas: Manga[] = loadJsonFile<Manga[]>(MANGAS_FILE, []);
let memoryChapters: Chapter[] = loadJsonFile<Chapter[]>(CHAPTERS_FILE, []);
let memoryGenres: Genre[] = initialGenres.map((g, idx) => ({ id: idx + 1, ...g, manga_count: 0 }));
let memoryUserProfiles: Record<string, UserProfile> = loadJsonFile<Record<string, UserProfile>>(PROFILES_FILE, {
  admin: {
    username: 'admin',
    name: 'Bosh Administrator',
    avatar_url: 'https://files.catbox.moe/g244x0.jpg',
    bio: 'AniManga Uz platformasi asoschisi va bosh muharriri.',
    isAdmin: true,
    coins: 500,
    unlocked_chapters: [],
    created_at: new Date().toISOString().split('T')[0],
    comments: [],
    liked_mangas: [],
    views_history: [],
    bookmarks: [],
  },
});

let memoryCoinTransactions: CoinTransaction[] = loadJsonFile<CoinTransaction[]>(TRANSACTIONS_FILE, []);
let memoryComments: MangaComment[] = loadJsonFile<MangaComment[]>(COMMENTS_FILE, []);

const initialChatMessages: ChatMessage[] = [
  {
    id: 1,
    username: 'admin',
    name: 'Bosh Administrator',
    avatar_url: 'https://files.catbox.moe/g244x0.jpg',
    text: 'Assalomu alaykum! AniManga Uz umumiy chatiga xush kelibsiz! 🎉 Bu yerda barcha manga va manhwa ixlosmandlari bilan erkin suhbatlashishingiz mumkin.',
    is_admin: true,
    likes: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    username: 'animanga_bot',
    name: 'AniManga Bot',
    avatar_url: 'https://files.catbox.moe/8odaud.png',
    text: 'Chatda bir-biringizni hurmat qiling. Istalgan xabarga javob (reply) berish uchun xabar ustiga bosing yoki reply belgisini tanlang! ⚡',
    is_admin: true,
    likes: 3,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  }
];

let memoryChatMessages: ChatMessage[] = loadJsonFile<ChatMessage[]>(CHAT_FILE, initialChatMessages);

let isPgConnected = false;
let lastPgError: string | null = null;

function persistAllToFiles() {
  saveJsonFile(MANGAS_FILE, memoryMangas);
  saveJsonFile(CHAPTERS_FILE, memoryChapters);
  saveJsonFile(PROFILES_FILE, memoryUserProfiles);
  saveJsonFile(TRANSACTIONS_FILE, memoryCoinTransactions);
  saveJsonFile(COMMENTS_FILE, memoryComments);
  saveJsonFile(CHAT_FILE, memoryChatMessages);
}

export async function initDatabase() {
  console.log('[PostgreSQL] Connecting to', pgConfig.host, 'database:', pgConfig.database);
  try {
    const client = await pool.connect();
    isPgConnected = true;
    lastPgError = null;
    console.log('[PostgreSQL] Connected successfully to Wasmer PostgreSQL!');

    // 1. Create genres table
    await client.query(`
      CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        image TEXT,
        manga_count INT DEFAULT 0
      );
    `);

    // 2. Create mangas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mangas (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        alternative_titles VARCHAR(255),
        type VARCHAR(50) DEFAULT 'manhwa',
        status VARCHAR(50) DEFAULT 'ongoing',
        description TEXT,
        cover_image TEXT,
        author VARCHAR(255),
        artist VARCHAR(255),
        rating NUMERIC(3,1) DEFAULT 8.0,
        release_year INT DEFAULT 2024,
        views INT DEFAULT 0,
        tags TEXT,
        age_rating INT DEFAULT 16,
        genres TEXT,
        genre_ids TEXT,
        genre_slugs TEXT,
        is_banner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure is_banner column exists
    await client.query(`ALTER TABLE mangas ADD COLUMN IF NOT EXISTS is_banner BOOLEAN DEFAULT FALSE;`);

    // 3. Create chapters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        manga_id INT REFERENCES mangas(id) ON DELETE CASCADE,
        chapter_number NUMERIC(6,1) NOT NULL,
        title VARCHAR(255),
        release_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pages JSONB DEFAULT '[]'::jsonb,
        views INT DEFAULT 0,
        price_coins INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS price_coins INT DEFAULT 0;`);

    // 4. Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        username VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150),
        avatar_url TEXT,
        bio TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        coins INT DEFAULT 0,
        unlocked_chapters JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        liked_mangas JSONB DEFAULT '[]'::jsonb,
        views_history JSONB DEFAULT '[]'::jsonb,
        bookmarks JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;`);
    await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unlocked_chapters JSONB DEFAULT '[]'::jsonb;`);

    // 5. Create coin_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id SERIAL PRIMARY KEY,
        order_id BIGINT UNIQUE,
        username VARCHAR(100),
        coins INT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        pay_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
      );
    `);

    // 6. Create manga_comments table for real community comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS manga_comments (
        id SERIAL PRIMARY KEY,
        manga_id INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        name VARCHAR(150),
        avatar_url TEXT,
        text TEXT NOT NULL,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Create chat_messages table for community chat
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        avatar_url TEXT,
        text TEXT NOT NULL,
        reply_to_id INT,
        reply_to_name VARCHAR(150),
        reply_to_text TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create media_storage table for permanent database mirror of all uploaded & Catbox images
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_storage (
        id SERIAL PRIMARY KEY,
        file_key VARCHAR(255) UNIQUE NOT NULL,
        original_url TEXT,
        mime_type VARCHAR(100) DEFAULT 'image/jpeg',
        data TEXT NOT NULL,
        file_size INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_media_storage_key ON media_storage (file_key);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_media_storage_url ON media_storage (original_url);`);

    // Check if genres table needs initial categories
    const genreRes = await client.query('SELECT COUNT(*) FROM genres');
    if (parseInt(genreRes.rows[0].count, 10) === 0) {
      console.log('[PostgreSQL] Seeding initial genres...');
      for (const g of initialGenres) {
        await client.query(
          'INSERT INTO genres (name, slug, image, manga_count) VALUES ($1, $2, $3, 0) ON CONFLICT DO NOTHING',
          [g.name, g.slug, g.image]
        );
      }
    }

    // Sync database with memory / file cache
    const pgMangasRes = await client.query('SELECT * FROM mangas ORDER BY id DESC');
    if (pgMangasRes.rows.length > 0) {
      // Postgres has data, sync into memory & disk
      memoryMangas = pgMangasRes.rows.map(row => ({
        ...row,
        rating: Number(row.rating),
        is_banner: Boolean(row.is_banner),
      }));

      const pgChaptersRes = await client.query('SELECT * FROM chapters ORDER BY id DESC');
      memoryChapters = pgChaptersRes.rows.map(row => ({
        ...row,
        chapter_number: Number(row.chapter_number),
        price_coins: Number(row.price_coins || 0),
        pages: typeof row.pages === 'string' ? JSON.parse(row.pages) : row.pages,
      }));

      persistAllToFiles();
      console.log(`[PostgreSQL] Loaded ${memoryMangas.length} mangas and ${memoryChapters.length} chapters successfully.`);
    } else if (memoryMangas.length > 0) {
      // Postgres was empty (e.g. freshly created or cleaned), sync memory to Postgres
      console.log(`[PostgreSQL] Syncing ${memoryMangas.length} mangas from file cache to database...`);
      for (const m of memoryMangas) {
        await client.query(
          `INSERT INTO mangas (id, title, alternative_titles, type, status, description, cover_image, author, artist, rating, release_year, tags, age_rating, genres, genre_ids, genre_slugs, is_banner)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id, m.title, m.alternative_titles || '', m.type || 'manhwa', m.status || 'ongoing',
            m.description || '', m.cover_image || '', m.author || '', m.artist || '',
            m.rating || 8.0, m.release_year || 2024, m.tags || '', m.age_rating || 16,
            m.genres || 'Action', m.genre_ids || '1', m.genre_slugs || 'action', Boolean(m.is_banner)
          ]
        );
      }
      for (const c of memoryChapters) {
        await client.query(
          `INSERT INTO chapters (id, manga_id, chapter_number, title, pages, price_coins)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            c.id, c.manga_id, c.chapter_number, c.title || '',
            JSON.stringify(c.pages || []), c.price_coins || 0
          ]
        );
      }
    }

    // Sync chat messages
    const pgChatRes = await client.query('SELECT * FROM chat_messages ORDER BY id ASC LIMIT 200');
    if (pgChatRes.rows.length > 0) {
      memoryChatMessages = pgChatRes.rows.map(row => ({
        id: Number(row.id),
        username: row.username,
        name: row.name,
        avatar_url: row.avatar_url,
        text: row.text,
        reply_to_id: row.reply_to_id ? Number(row.reply_to_id) : null,
        reply_to_name: row.reply_to_name,
        reply_to_text: row.reply_to_text,
        is_admin: Boolean(row.is_admin),
        likes: Number(row.likes || 0),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
      persistAllToFiles();
    } else if (memoryChatMessages.length > 0) {
      for (const msg of memoryChatMessages) {
        await client.query(
          `INSERT INTO chat_messages (id, username, name, avatar_url, text, reply_to_id, reply_to_name, reply_to_text, is_admin, likes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            msg.id, msg.username, msg.name, msg.avatar_url || '', msg.text,
            msg.reply_to_id || null, msg.reply_to_name || null, msg.reply_to_text || null,
            !!msg.is_admin, msg.likes || 0, msg.created_at || new Date().toISOString()
          ]
        );
      }
    }

    // Always synchronize sequences so new auto-incrementing inserts never conflict with explicitly inserted IDs
    try {
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chat_messages_id_seq') THEN
            PERFORM setval('chat_messages_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM chat_messages), 0), 1));
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mangas_id_seq') THEN
            PERFORM setval('mangas_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM mangas), 0), 1));
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chapters_id_seq') THEN
            PERFORM setval('chapters_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM chapters), 0), 1));
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'genres_id_seq') THEN
            PERFORM setval('genres_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM genres), 0), 1));
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'media_storage_id_seq') THEN
            PERFORM setval('media_storage_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM media_storage), 0), 1));
          END IF;
        END $$;
      `);
    } catch (seqErr) {
      console.warn('[PostgreSQL Sequence Sync Warning]', seqErr);
    }

    client.release();
  } catch (err: any) {
    isPgConnected = false;
    lastPgError = err.message || String(err);
    console.warn('[PostgreSQL Warning] Could not connect directly to external DB:', lastPgError);
    console.warn('[PostgreSQL Warning] Persistent local file cache will maintain full operations seamlessly.');
  }
}

export async function clearAllDatabase() {
  memoryMangas = [];
  memoryChapters = [];
  memoryCoinTransactions = [];
  memoryGenres = initialGenres.map((g, idx) => ({ id: idx + 1, ...g, manga_count: 0 }));
  persistAllToFiles();

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM chapters;');
      await client.query('DELETE FROM mangas;');
      await client.query('DELETE FROM coin_transactions;');
      await client.query('UPDATE genres SET manga_count = 0;');
      await client.query("UPDATE user_profiles SET coins = 0, unlocked_chapters = '[]'::jsonb, comments = '[]'::jsonb, liked_mangas = '[]'::jsonb, views_history = '[]'::jsonb, bookmarks = '[]'::jsonb;");
      client.release();
      return { success: true, message: 'Barcha test ma\'lumotlar tozalandi' };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }
  return { success: true, message: 'Barcha test ma\'lumotlar tozalandi' };
}

export async function getDbStatus(): Promise<DatabaseStatus> {
  const status: DatabaseStatus = {
    connected: isPgConnected,
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
    tables: [
      { name: 'mangas', rowCount: memoryMangas.length },
      { name: 'chapters', rowCount: memoryChapters.length },
      { name: 'genres', rowCount: memoryGenres.length }
    ],
    error: lastPgError
  };

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const mCount = await client.query('SELECT COUNT(*) FROM mangas');
      const cCount = await client.query('SELECT COUNT(*) FROM chapters');
      const gCount = await client.query('SELECT COUNT(*) FROM genres');
      client.release();

      status.tables = [
        { name: 'mangas', rowCount: parseInt(mCount.rows[0].count, 10) },
        { name: 'chapters', rowCount: parseInt(cCount.rows[0].count, 10) },
        { name: 'genres', rowCount: parseInt(gCount.rows[0].count, 10) }
      ];
      status.connected = true;
      status.error = null;
    } catch (err: any) {
      status.connected = false;
      status.error = err.message;
    }
  }

  return status;
}

export async function executeRawQuery(sql: string) {
  if (!isPgConnected) {
    throw new Error('PostgreSQL ulanmagan: ' + (lastPgError || 'Ulanishda xatolik'));
  }
  const client = await pool.connect();
  try {
    const res = await client.query(sql);
    return {
      command: res.command,
      rowCount: res.rowCount,
      rows: res.rows,
      fields: res.fields?.map(f => f.name) || []
    };
  } finally {
    client.release();
  }
}

export async function reseedDatabase() {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('TRUNCATE chapters, mangas, genres CASCADE;');
      client.release();
    } catch (e) {
      console.error(e);
    }
  }
  memoryMangas = JSON.parse(JSON.stringify(initialMangas));
  memoryChapters = JSON.parse(JSON.stringify(initialChapters));
  memoryGenres = initialGenres.map((g, idx) => ({ id: idx + 1, ...g }));
  await initDatabase();
  return { success: true };
}

// Data Queries with fallback
export async function getAllMangas(params?: { search?: string; genre?: string; type?: string; status?: string; sort?: string }): Promise<Manga[]> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      let query = `
        SELECT m.*, 
          (SELECT COUNT(*) FROM chapters c WHERE c.manga_id = m.id)::int as chapter_count
        FROM mangas m
        WHERE 1=1
      `;
      const queryParams: any[] = [];

      if (params?.search) {
        queryParams.push(`%${params.search.toLowerCase()}%`);
        query += ` AND (LOWER(m.title) LIKE $${queryParams.length} OR LOWER(m.alternative_titles) LIKE $${queryParams.length})`;
      }
      if (params?.type && params.type !== 'all') {
        queryParams.push(params.type);
        query += ` AND m.type = $${queryParams.length}`;
      }
      if (params?.status && params.status !== 'all') {
        queryParams.push(params.status);
        query += ` AND m.status = $${queryParams.length}`;
      }
      if (params?.genre) {
        queryParams.push(`%${params.genre.toLowerCase()}%`);
        query += ` AND (LOWER(m.genres) LIKE $${queryParams.length} OR LOWER(m.genre_slugs) LIKE $${queryParams.length})`;
      }

      if (params?.sort === 'popular') {
        query += ` ORDER BY m.views DESC`;
      } else if (params?.sort === 'rating') {
        query += ` ORDER BY m.rating DESC`;
      } else {
        query += ` ORDER BY m.created_at DESC, m.id DESC`;
      }

      const res = await client.query(query, queryParams);
      client.release();
      return res.rows.map(row => ({
        ...row,
        rating: Number(row.rating),
        chapter_count: Number(row.chapter_count || 0)
      }));
    } catch (err) {
      console.error('[PostgreSQL getAllMangas error, using memory]', err);
    }
  }

  // Memory fallback
  let list = [...memoryMangas];
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(m => m.title.toLowerCase().includes(q) || m.alternative_titles?.toLowerCase().includes(q));
  }
  if (params?.type && params.type !== 'all') {
    list = list.filter(m => m.type === params.type);
  }
  if (params?.status && params.status !== 'all') {
    list = list.filter(m => m.status === params.status);
  }
  if (params?.genre) {
    const g = params.genre.toLowerCase();
    list = list.filter(m => m.genres?.toLowerCase().includes(g) || m.genre_slugs?.toLowerCase().includes(g));
  }

  if (params?.sort === 'popular') {
    list.sort((a, b) => b.views - a.views);
  } else if (params?.sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else {
    list.sort((a, b) => b.id - a.id);
  }

  return list.map(m => ({
    ...m,
    chapter_count: memoryChapters.filter(c => c.manga_id === m.id).length
  }));
}

export async function getMangaById(id: number): Promise<Manga | null> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      // Increment views
      await client.query('UPDATE mangas SET views = views + 1 WHERE id = $1', [id]);
      const mangaRes = await client.query('SELECT * FROM mangas WHERE id = $1', [id]);
      if (mangaRes.rows.length === 0) {
        client.release();
        return null;
      }
      const chaptersRes = await client.query(
        'SELECT * FROM chapters WHERE manga_id = $1 ORDER BY chapter_number ASC',
        [id]
      );
      client.release();

      const manga = mangaRes.rows[0];
      return {
        ...manga,
        rating: Number(manga.rating),
        chapters: chaptersRes.rows.map(c => ({
          ...c,
          chapter_number: Number(c.chapter_number),
          price_coins: Number(c.price_coins || 0),
          pages: typeof c.pages === 'string' ? JSON.parse(c.pages) : c.pages
        }))
      };
    } catch (err) {
      console.error('[PostgreSQL getMangaById error, using memory]', err);
    }
  }

  const manga = memoryMangas.find(m => m.id === id);
  if (!manga) return null;
  manga.views += 1;
  const chapters = memoryChapters.filter(c => c.manga_id === id);
  return {
    ...manga,
    chapters
  };
}

export async function createManga(data: Partial<Manga>): Promise<Manga> {
  const is_banner = Boolean(data.is_banner);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `INSERT INTO mangas (title, alternative_titles, type, status, description, cover_image, author, artist, rating, release_year, tags, age_rating, genres, genre_ids, genre_slugs, is_banner)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          data.title,
          data.alternative_titles || '',
          data.type || 'manhwa',
          data.status || 'ongoing',
          data.description || '',
          data.cover_image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
          data.author || 'Muallif noma\'lum',
          data.artist || 'Rassom noma\'lum',
          data.rating || 8.5,
          data.release_year || new Date().getFullYear(),
          data.tags || '',
          data.age_rating || 16,
          data.genres || 'Action',
          data.genre_ids || '1',
          data.genre_slugs || 'action',
          is_banner
        ]
      );
      client.release();
      const newManga = {
        ...res.rows[0],
        rating: Number(res.rows[0].rating),
        is_banner: Boolean(res.rows[0].is_banner)
      };
      memoryMangas.unshift(newManga);
      persistAllToFiles();
      return newManga;
    } catch (err) {
      console.error('[PostgreSQL createManga error, using memory]', err);
    }
  }

  const newId = memoryMangas.length > 0 ? Math.max(...memoryMangas.map(m => m.id)) + 1 : 1;
  const created: Manga = {
    id: newId,
    title: data.title || 'Yangi Manga',
    alternative_titles: data.alternative_titles || '',
    type: data.type || 'manhwa',
    status: data.status || 'ongoing',
    description: data.description || '',
    cover_image: data.cover_image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    author: data.author || 'Noma\'lum',
    artist: data.artist || 'Noma\'lum',
    rating: data.rating || 8.0,
    release_year: data.release_year || 2024,
    views: 0,
    tags: data.tags || '',
    age_rating: data.age_rating || 16,
    genres: data.genres || 'Action',
    genre_ids: data.genre_ids || '1',
    genre_slugs: data.genre_slugs || 'action',
    is_banner
  };
  memoryMangas.unshift(created);
  persistAllToFiles();
  return created;
}

export async function updateManga(id: number, data: Partial<Manga>): Promise<Manga | null> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `UPDATE mangas SET
          title = COALESCE($1, title),
          alternative_titles = COALESCE($2, alternative_titles),
          type = COALESCE($3, type),
          status = COALESCE($4, status),
          description = COALESCE($5, description),
          cover_image = COALESCE($6, cover_image),
          author = COALESCE($7, author),
          artist = COALESCE($8, artist),
          rating = COALESCE($9, rating),
          release_year = COALESCE($10, release_year),
          tags = COALESCE($11, tags),
          genres = COALESCE($12, genres),
          genre_slugs = COALESCE($13, genre_slugs),
          is_banner = COALESCE($14, is_banner),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $15
         RETURNING *`,
        [
          data.title, data.alternative_titles, data.type, data.status,
          data.description, data.cover_image, data.author, data.artist,
          data.rating, data.release_year, data.tags, data.genres, data.genre_slugs,
          data.is_banner !== undefined ? Boolean(data.is_banner) : null,
          id
        ]
      );
      client.release();
      if (res.rows.length > 0) {
        const updated = {
          ...res.rows[0],
          rating: Number(res.rows[0].rating),
          is_banner: Boolean(res.rows[0].is_banner)
        };
        const idx = memoryMangas.findIndex(m => m.id === id);
        if (idx !== -1) memoryMangas[idx] = updated;
        persistAllToFiles();
        return updated;
      }
    } catch (err) {
      console.error('[PostgreSQL updateManga error, using memory]', err);
    }
  }

  const idx = memoryMangas.findIndex(m => m.id === id);
  if (idx === -1) return null;
  memoryMangas[idx] = { ...memoryMangas[idx], ...data };
  persistAllToFiles();
  return memoryMangas[idx];
}

export async function toggleMangaBanner(id: number, is_banner?: boolean): Promise<Manga | null> {
  const current = memoryMangas.find(m => m.id === id);
  const nextValue = is_banner !== undefined ? is_banner : !(current?.is_banner);
  return await updateManga(id, { is_banner: nextValue });
}

export async function deleteManga(id: number): Promise<boolean> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM chapters WHERE manga_id = $1', [id]);
      await client.query('DELETE FROM mangas WHERE id = $1', [id]);
      client.release();
    } catch (err) {
      console.error('[PostgreSQL deleteManga error]', err);
    }
  }
  memoryMangas = memoryMangas.filter(m => m.id !== id);
  memoryChapters = memoryChapters.filter(c => c.manga_id !== id);
  persistAllToFiles();
  return true;
}

export async function getAllChapters(mangaId?: number): Promise<Chapter[]> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      let query = `
        SELECT c.*, m.title as manga_title, m.cover_image as manga_cover
        FROM chapters c
        JOIN mangas m ON c.manga_id = m.id
      `;
      const queryParams: any[] = [];
      if (mangaId) {
        queryParams.push(mangaId);
        query += ` WHERE c.manga_id = $1 `;
      }
      query += ` ORDER BY c.manga_id ASC, c.chapter_number ASC LIMIT 1000 `;
      const res = await client.query(query, queryParams);
      client.release();
      return res.rows.map(row => ({
        ...row,
        chapter_number: Number(row.chapter_number),
        price_coins: Number(row.price_coins || 0),
        pages: typeof row.pages === 'string' ? JSON.parse(row.pages) : row.pages
      }));
    } catch (err) {
      console.error('[PostgreSQL getAllChapters error, using memory]', err);
    }
  }

  let list = memoryChapters;
  if (mangaId) {
    list = list.filter(c => c.manga_id === mangaId);
  }
  return list.map(c => {
    const m = memoryMangas.find(item => item.id === c.manga_id);
    return {
      ...c,
      price_coins: Number(c.price_coins || 0),
      manga_title: m?.title || 'Manga #' + c.manga_id
    };
  });
}

export async function createChapter(data: { manga_id: number; chapter_number: number; title: string; pages?: string[]; price_coins?: number }): Promise<Chapter> {
  const price_coins = Number(data.price_coins || 0);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `INSERT INTO chapters (manga_id, chapter_number, title, pages, price_coins)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.manga_id, data.chapter_number, data.title, JSON.stringify(data.pages || []), price_coins]
      );
      client.release();
      const newCh = {
        ...res.rows[0],
        chapter_number: Number(res.rows[0].chapter_number),
        price_coins: Number(res.rows[0].price_coins || 0),
        pages: typeof res.rows[0].pages === 'string' ? JSON.parse(res.rows[0].pages) : res.rows[0].pages
      };
      memoryChapters.unshift(newCh);
      return newCh;
    } catch (err) {
      console.error('[PostgreSQL createChapter error, using memory]', err);
    }
  }

  const newId = memoryChapters.length > 0 ? Math.max(...memoryChapters.map(c => c.id)) + 1 : 1;
  const created: Chapter = {
    id: newId,
    manga_id: Number(data.manga_id),
    chapter_number: Number(data.chapter_number),
    title: data.title,
    release_date: new Date().toISOString(),
    pages: data.pages || [],
    views: 0,
    price_coins
  };
  memoryChapters.unshift(created);
  persistAllToFiles();
  return created;
}

export async function updateChapterPrice(id: number, price_coins: number): Promise<boolean> {
  const price = Math.max(0, Math.floor(price_coins || 0));
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('UPDATE chapters SET price_coins = $1 WHERE id = $2', [price, id]);
      client.release();
    } catch (err) {
      console.error('[PostgreSQL updateChapterPrice error]', err);
    }
  }
  const ch = memoryChapters.find(c => c.id === id);
  if (ch) {
    ch.price_coins = price;
  }
  persistAllToFiles();
  return true;
}


export async function updateChapter(id: number, data: { chapter_number: number; title: string; pages?: string[]; price_coins?: number }): Promise<Chapter | null> {
  const price_coins = Number(data.price_coins || 0);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `UPDATE chapters 
         SET chapter_number = $1, title = $2, pages = $3, price_coins = $4
         WHERE id = $5
         RETURNING *`,
        [data.chapter_number, data.title, JSON.stringify(data.pages || []), price_coins, id]
      );
      client.release();
      if (res.rows.length === 0) return null;
      const updatedCh = {
        ...res.rows[0],
        chapter_number: Number(res.rows[0].chapter_number),
        price_coins: Number(res.rows[0].price_coins || 0),
        pages: typeof res.rows[0].pages === 'string' ? JSON.parse(res.rows[0].pages) : res.rows[0].pages
      };
      const memIndex = memoryChapters.findIndex(c => c.id === id);
      if (memIndex !== -1) memoryChapters[memIndex] = updatedCh;
      return updatedCh;
    } catch (err) {
      console.error('[PostgreSQL updateChapter error, using memory]', err);
    }
  }

  const memIndex = memoryChapters.findIndex(c => c.id === id);
  if (memIndex === -1) return null;
  const updated = {
    ...memoryChapters[memIndex],
    chapter_number: Number(data.chapter_number),
    title: data.title,
    pages: data.pages || memoryChapters[memIndex].pages,
    price_coins
  };
  memoryChapters[memIndex] = updated;
  return updated;
}

export async function deleteChapter(id: number): Promise<boolean> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM chapters WHERE id = $1', [id]);
      client.release();
    } catch (err) {
      console.error('[PostgreSQL deleteChapter error]', err);
    }
  }
  memoryChapters = memoryChapters.filter(c => c.id !== id);
  persistAllToFiles();
  return true;
}

export async function getAllGenres(): Promise<Genre[]> {
  try {
    const currentMangas = await getAllMangas();
    return initialGenres.map((g, idx) => {
      const slugLower = g.slug.toLowerCase();
      const nameLower = g.name.toLowerCase();
      const count = currentMangas.filter((m) => {
        const gSlugs = (m.genre_slugs || '').toLowerCase();
        const gNames = (m.genres || '').toLowerCase();
        return (
          gSlugs.includes(slugLower) ||
          gNames.includes(slugLower) ||
          gNames.includes(nameLower)
        );
      }).length;

      return {
        id: idx + 1,
        name: g.name,
        slug: g.slug,
        image: g.image,
        manga_count: count,
      };
    });
  } catch (err) {
    console.error('[getAllGenres error]', err);
    return initialGenres.map((g, idx) => ({ id: idx + 1, ...g }));
  }
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  const defaultProfile: UserProfile = {
    username,
    name: username === 'admin' ? 'Bosh Administrator' : username,
    avatar_url: username === 'admin' ? 'https://files.catbox.moe/g244x0.jpg' : '',
    bio: username === 'admin' ? 'AniManga Uz platformasi bosh administratori.' : 'AniManga Uz faol foydalanuvchisi',
    isAdmin: username === 'admin',
    coins: username === 'admin' ? 500 : 0,
    unlocked_chapters: [],
    created_at: new Date().toISOString().split('T')[0],
    comments: [],
    liked_mangas: [],
    views_history: [],
    bookmarks: [],
  };

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM user_profiles WHERE LOWER(username) = LOWER($1)', [username]);
      client.release();
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          username: row.username,
          name: row.name || row.username,
          avatar_url: row.avatar_url || '',
          bio: row.bio || '',
          isAdmin: Boolean(row.is_admin),
          coins: Number(row.coins ?? 0),
          unlocked_chapters: Array.isArray(row.unlocked_chapters) ? row.unlocked_chapters : [],
          created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : defaultProfile.created_at,
          comments: Array.isArray(row.comments) ? row.comments : [],
          liked_mangas: Array.isArray(row.liked_mangas) ? row.liked_mangas : [],
          views_history: Array.isArray(row.views_history) ? row.views_history : [],
          bookmarks: Array.isArray(row.bookmarks) ? row.bookmarks : [],
        };
      }
    } catch (err) {
      console.error('[PostgreSQL getUserProfile error]', err);
    }
  }

  const found = memoryUserProfiles[username.toLowerCase()] || memoryUserProfiles[username];
  if (found) {
    if (found.coins === undefined) found.coins = found.isAdmin ? 500 : 0;
    if (!found.unlocked_chapters) found.unlocked_chapters = [];
    return found;
  }

  // Initialize in memory and return
  memoryUserProfiles[username.toLowerCase()] = defaultProfile;
  return defaultProfile;
}

export async function saveUserProfile(profile: Partial<UserProfile> & { username: string }): Promise<UserProfile> {
  const current = await getUserProfile(profile.username);
  const updated: UserProfile = {
    ...current,
    ...profile,
    username: current.username, // username cannot be wiped
    coins: profile.coins !== undefined ? Number(profile.coins) : (current.coins ?? 0),
    unlocked_chapters: profile.unlocked_chapters !== undefined ? profile.unlocked_chapters : (current.unlocked_chapters || []),
  };

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query(`
        INSERT INTO user_profiles (username, name, avatar_url, bio, is_admin, coins, unlocked_chapters, comments, liked_mangas, views_history, bookmarks, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (username) DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          is_admin = EXCLUDED.is_admin,
          coins = EXCLUDED.coins,
          unlocked_chapters = EXCLUDED.unlocked_chapters,
          comments = EXCLUDED.comments,
          liked_mangas = EXCLUDED.liked_mangas,
          views_history = EXCLUDED.views_history,
          bookmarks = EXCLUDED.bookmarks,
          updated_at = CURRENT_TIMESTAMP
      `, [
        updated.username,
        updated.name,
        updated.avatar_url,
        updated.bio,
        Boolean(updated.isAdmin),
        Number(updated.coins || 0),
        JSON.stringify(updated.unlocked_chapters || []),
        JSON.stringify(updated.comments || []),
        JSON.stringify(updated.liked_mangas || []),
        JSON.stringify(updated.views_history || []),
        JSON.stringify(updated.bookmarks || []),
      ]);
      client.release();
    } catch (err) {
      console.error('[PostgreSQL saveUserProfile error]', err);
    }
  }

  memoryUserProfiles[updated.username.toLowerCase()] = updated;
  return updated;
}

export async function purchaseChapter(chapterId: number, username: string): Promise<{ success: boolean; message: string; remaining_coins?: number; already_unlocked?: boolean }> {
  let chapter: Chapter | undefined;
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM chapters WHERE id = $1', [chapterId]);
      client.release();
      if (res.rows.length > 0) {
        chapter = {
          ...res.rows[0],
          chapter_number: Number(res.rows[0].chapter_number),
          price_coins: Number(res.rows[0].price_coins || 0),
        };
      }
    } catch (err) {
      console.error('[PostgreSQL purchaseChapter find error]', err);
    }
  }
  if (!chapter) {
    chapter = memoryChapters.find(c => c.id === chapterId);
  }

  if (!chapter) {
    return { success: false, message: 'Bob topilmadi' };
  }

  const price = Number(chapter.price_coins || 0);
  const profile = await getUserProfile(username);
  const unlocked = new Set<number>(profile.unlocked_chapters || []);

  if (price <= 0 || unlocked.has(chapterId)) {
    return { success: true, message: 'Bob ochiq', remaining_coins: profile.coins || 0, already_unlocked: true };
  }

  const userCoins = Number(profile.coins || 0);
  if (userCoins < price) {
    return {
      success: false,
      message: `Tangalar yetarli emas. Bob narxi: ${price} tanga, balansingiz: ${userCoins} tanga.`,
      remaining_coins: userCoins
    };
  }

  // Deduct coins & unlock
  const newBalance = userCoins - price;
  unlocked.add(chapterId);

  await saveUserProfile({
    username: profile.username,
    coins: newBalance,
    unlocked_chapters: Array.from(unlocked),
  });

  return {
    success: true,
    message: `Bob ${price} tangaga muvaffaqiyatli sotib olindi!`,
    remaining_coins: newBalance
  };
}

export async function createCoinTransaction(tx: { order_id: number; username: string; coins: number; amount: number; pay_url?: string }): Promise<CoinTransaction> {
  const item: CoinTransaction = {
    order_id: tx.order_id,
    username: tx.username,
    coins: tx.coins,
    amount: tx.amount,
    status: 'pending',
    pay_url: tx.pay_url,
    created_at: new Date().toISOString(),
  };

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `INSERT INTO coin_transactions (order_id, username, coins, amount, status, pay_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (order_id) DO UPDATE SET pay_url = EXCLUDED.pay_url
         RETURNING *`,
        [tx.order_id, tx.username, tx.coins, tx.amount, 'pending', tx.pay_url || '']
      );
      client.release();
      if (res.rows.length > 0) {
        const row = res.rows[0];
        item.id = row.id;
      }
    } catch (err) {
      console.error('[PostgreSQL createCoinTransaction error]', err);
    }
  }

  memoryCoinTransactions.unshift(item);
  return item;
}

export async function getCoinTransaction(order_id: number): Promise<CoinTransaction | null> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM coin_transactions WHERE order_id = $1', [order_id]);
      client.release();
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          order_id: Number(r.order_id),
          username: r.username,
          coins: Number(r.coins),
          amount: Number(r.amount),
          status: r.status,
          pay_url: r.pay_url,
          created_at: r.created_at,
          paid_at: r.paid_at,
        };
      }
    } catch (err) {
      console.error('[PostgreSQL getCoinTransaction error]', err);
    }
  }

  return memoryCoinTransactions.find(t => Number(t.order_id) === Number(order_id)) || null;
}

export async function markCoinTransactionPaid(order_id: number): Promise<{ success: boolean; coins_added: number; new_balance: number; username: string } | null> {
  let tx: CoinTransaction | undefined = memoryCoinTransactions.find(t => Number(t.order_id) === Number(order_id));

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM coin_transactions WHERE order_id = $1', [order_id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        tx = {
          id: r.id,
          order_id: Number(r.order_id),
          username: r.username,
          coins: Number(r.coins),
          amount: Number(r.amount),
          status: r.status,
          pay_url: r.pay_url,
          created_at: r.created_at,
          paid_at: r.paid_at,
        };
      }
      client.release();
    } catch (err) {
      console.error('[PostgreSQL markCoinTransactionPaid fetch error]', err);
    }
  }

  if (!tx) return null;

  if (tx.status === 'paid') {
    const currentProfile = await getUserProfile(tx.username);
    return { success: true, coins_added: 0, new_balance: currentProfile.coins || 0, username: tx.username };
  }

  // Update status to paid
  tx.status = 'paid';
  tx.paid_at = new Date().toISOString();

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query('UPDATE coin_transactions SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE order_id = $2', ['paid', order_id]);
      client.release();
    } catch (err) {
      console.error('[PostgreSQL markCoinTransactionPaid update error]', err);
    }
  }

  // Credit coins to user
  const profile = await getUserProfile(tx.username);
  const updatedCoins = (profile.coins || 0) + tx.coins;
  await saveUserProfile({
    username: tx.username,
    coins: updatedCoins,
  });

  return {
    success: true,
    coins_added: tx.coins,
    new_balance: updatedCoins,
    username: tx.username,
  };
}

export async function getUserCoinTransactions(username: string): Promise<CoinTransaction[]> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM coin_transactions WHERE LOWER(username) = LOWER($1) ORDER BY id DESC LIMIT 50', [username]);
      client.release();
      return res.rows.map(r => ({
        id: r.id,
        order_id: Number(r.order_id),
        username: r.username,
        coins: Number(r.coins),
        amount: Number(r.amount),
        status: r.status,
        pay_url: r.pay_url,
        created_at: r.created_at,
        paid_at: r.paid_at,
      }));
    } catch (err) {
      console.error('[PostgreSQL getUserCoinTransactions error]', err);
    }
  }

  return memoryCoinTransactions.filter(t => t.username.toLowerCase() === username.toLowerCase());
}

// Increment Chapter & Manga Views (Real count)
export async function incrementChapterViews(chapterId: number): Promise<{ views: number; manga_views?: number }> {
  let views = 0;
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('UPDATE chapters SET views = views + 1 WHERE id = $1 RETURNING views, manga_id', [chapterId]);
      if (res.rows.length > 0) {
        views = Number(res.rows[0].views || 0);
        const mangaId = res.rows[0].manga_id;
        let manga_views: number | undefined;
        if (mangaId) {
          const mRes = await client.query('UPDATE mangas SET views = views + 1 WHERE id = $1 RETURNING views', [mangaId]);
          if (mRes.rows.length > 0) {
            manga_views = Number(mRes.rows[0].views || 0);
          }
        }
        client.release();

        // Sync in memory
        const memCh = memoryChapters.find(c => c.id === chapterId);
        if (memCh) memCh.views = views;
        if (mangaId) {
          const memM = memoryMangas.find(m => m.id === mangaId);
          if (memM && manga_views !== undefined) memM.views = manga_views;
        }
        persistAllToFiles();
        return { views, manga_views };
      }
      client.release();
    } catch (err) {
      console.error('[PostgreSQL incrementChapterViews error]', err);
    }
  }

  // Memory fallback
  const ch = memoryChapters.find(c => c.id === chapterId);
  let manga_views: number | undefined;
  if (ch) {
    ch.views = (ch.views || 0) + 1;
    views = ch.views;
    const m = memoryMangas.find(item => item.id === ch.manga_id);
    if (m) {
      m.views = (m.views || 0) + 1;
      manga_views = m.views;
    }
    persistAllToFiles();
  }
  return { views, manga_views };
}

// Manga Real Comments Functions
export async function getMangaComments(mangaId: number): Promise<MangaComment[]> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        'SELECT * FROM manga_comments WHERE manga_id = $1 ORDER BY id DESC LIMIT 100',
        [mangaId]
      );
      client.release();
      return res.rows.map(r => ({
        id: String(r.id),
        manga_id: Number(r.manga_id),
        username: r.username,
        name: r.name || r.username,
        avatar_url: r.avatar_url || '',
        text: r.text,
        likes: Number(r.likes || 0),
        created_at: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('[PostgreSQL getMangaComments error]', err);
    }
  }

  return memoryComments
    .filter(c => Number(c.manga_id) === Number(mangaId))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

export async function addMangaComment(data: { manga_id: number; username: string; name: string; avatar_url?: string; text: string }): Promise<MangaComment> {
  const authorName = data.name || data.username || 'Foydalanuvchi';
  const authorAvatar = data.avatar_url || '';
  const cleanText = (data.text || '').trim();

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `INSERT INTO manga_comments (manga_id, username, name, avatar_url, text, likes)
         VALUES ($1, $2, $3, $4, $5, 0)
         RETURNING *`,
        [data.manga_id, data.username, authorName, authorAvatar, cleanText]
      );
      client.release();
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const newComm: MangaComment = {
          id: String(row.id),
          manga_id: Number(row.manga_id),
          username: row.username,
          name: row.name || row.username,
          avatar_url: row.avatar_url,
          text: row.text,
          likes: Number(row.likes || 0),
          created_at: new Date(row.created_at || Date.now()).toISOString().split('T')[0],
        };
        memoryComments.unshift(newComm);
        persistAllToFiles();
        return newComm;
      }
    } catch (err) {
      console.error('[PostgreSQL addMangaComment error]', err);
    }
  }

  const newId = memoryComments.length > 0 ? String(Math.max(...memoryComments.map(c => Number(c.id) || 0)) + 1) : '1';
  const newComm: MangaComment = {
    id: newId,
    manga_id: Number(data.manga_id),
    username: data.username,
    name: authorName,
    avatar_url: authorAvatar,
    text: cleanText,
    likes: 0,
    created_at: new Date().toISOString().split('T')[0],
  };
  memoryComments.unshift(newComm);
  persistAllToFiles();
  return newComm;
}

export async function likeMangaComment(commentId: string | number): Promise<{ success: boolean; likes: number }> {
  const idNum = Number(commentId);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('UPDATE manga_comments SET likes = likes + 1 WHERE id = $1 RETURNING likes', [idNum]);
      client.release();
      if (res.rows.length > 0) {
        const newLikes = Number(res.rows[0].likes || 0);
        const mem = memoryComments.find(c => String(c.id) === String(commentId));
        if (mem) mem.likes = newLikes;
        persistAllToFiles();
        return { success: true, likes: newLikes };
      }
    } catch (err) {
      console.error('[PostgreSQL likeMangaComment error]', err);
    }
  }

  const mem = memoryComments.find(c => String(c.id) === String(commentId));
  if (mem) {
    mem.likes = (mem.likes || 0) + 1;
    persistAllToFiles();
    return { success: true, likes: mem.likes };
  }
  return { success: false, likes: 0 };
}

export async function deleteMangaComment(commentId: string | number, username: string, isAdmin?: boolean): Promise<{ success: boolean }> {
  const idNum = Number(commentId);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      if (isAdmin) {
        await client.query('DELETE FROM manga_comments WHERE id = $1', [idNum]);
      } else {
        await client.query('DELETE FROM manga_comments WHERE id = $1 AND LOWER(username) = LOWER($2)', [idNum, username]);
      }
      client.release();
    } catch (err) {
      console.error('[PostgreSQL deleteMangaComment error]', err);
    }
  }

  memoryComments = memoryComments.filter(c => {
    if (String(c.id) === String(commentId)) {
      if (isAdmin || c.username.toLowerCase() === username.toLowerCase()) {
        return false;
      }
    }
    return true;
  });
  persistAllToFiles();
  return { success: true };
}

// ==========================================
// Community Chat Database Methods
// ==========================================
export async function getChatMessages(limit = 100): Promise<ChatMessage[]> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT * FROM chat_messages ORDER BY id DESC LIMIT $1', [limit]);
      client.release();
      if (res.rows.length > 0) {
        return res.rows.reverse().map(row => ({
          id: Number(row.id),
          username: row.username,
          name: row.name,
          avatar_url: row.avatar_url,
          text: row.text,
          reply_to_id: row.reply_to_id ? Number(row.reply_to_id) : null,
          reply_to_name: row.reply_to_name,
          reply_to_text: row.reply_to_text,
          is_admin: Boolean(row.is_admin),
          likes: Number(row.likes || 0),
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error('[PostgreSQL getChatMessages error]', err);
    }
  }

  return memoryChatMessages.slice(-limit);
}

export async function createChatMessage(data: {
  username: string;
  name: string;
  avatar_url?: string;
  text: string;
  reply_to_id?: number | null;
  reply_to_name?: string | null;
  reply_to_text?: string | null;
  is_admin?: boolean;
}): Promise<ChatMessage> {
  const profile = await getUserProfile(data.username);
  const authorName = data.name || profile.name || data.username;
  const authorAvatar = data.avatar_url || profile.avatar_url || '';
  const isAdmin = Boolean(data.is_admin || profile.isAdmin);
  const cleanText = (data.text || '').trim();

  let insertedId: number | null = null;
  let createdAtStr = new Date().toISOString();

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(
          `INSERT INTO chat_messages (username, name, avatar_url, text, reply_to_id, reply_to_name, reply_to_text, is_admin, likes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
           RETURNING *`,
          [
            data.username,
            authorName,
            authorAvatar,
            cleanText,
            data.reply_to_id || null,
            data.reply_to_name || null,
            data.reply_to_text || null,
            isAdmin,
          ]
        );
        if (res.rows.length > 0) {
          insertedId = Number(res.rows[0].id);
          createdAtStr = res.rows[0].created_at ? new Date(res.rows[0].created_at).toISOString() : createdAtStr;
        }
      } catch (queryErr: any) {
        // If the sequence fell behind due to explicit ID imports, reset sequence and retry immediately
        if (queryErr.code === '23505' || String(queryErr.message).includes('chat_messages_pkey')) {
          console.warn('[PostgreSQL createChatMessage] Resolving chat_messages_pkey collision by synchronizing sequence...');
          await client.query(`
            SELECT setval(pg_get_serial_sequence('chat_messages', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM chat_messages), 0), 1));
          `);
          const retryRes = await client.query(
            `INSERT INTO chat_messages (username, name, avatar_url, text, reply_to_id, reply_to_name, reply_to_text, is_admin, likes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
             RETURNING *`,
            [
              data.username,
              authorName,
              authorAvatar,
              cleanText,
              data.reply_to_id || null,
              data.reply_to_name || null,
              data.reply_to_text || null,
              isAdmin,
            ]
          );
          if (retryRes.rows.length > 0) {
            insertedId = Number(retryRes.rows[0].id);
            createdAtStr = retryRes.rows[0].created_at ? new Date(retryRes.rows[0].created_at).toISOString() : createdAtStr;
          }
        } else {
          throw queryErr;
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[PostgreSQL createChatMessage error]', err);
    }
  }

  const nextId = insertedId || (memoryChatMessages.length > 0 ? Math.max(...memoryChatMessages.map(m => m.id)) + 1 : 1);
  const newMsg: ChatMessage = {
    id: nextId,
    username: data.username,
    name: authorName,
    avatar_url: authorAvatar,
    text: cleanText,
    reply_to_id: data.reply_to_id || null,
    reply_to_name: data.reply_to_name || null,
    reply_to_text: data.reply_to_text || null,
    is_admin: isAdmin,
    likes: 0,
    created_at: createdAtStr,
  };

  memoryChatMessages.push(newMsg);
  if (memoryChatMessages.length > 500) {
    memoryChatMessages = memoryChatMessages.slice(-500);
  }
  persistAllToFiles();
  return newMsg;
}

export async function deleteChatMessage(id: number, username: string, isAdmin?: boolean): Promise<{ success: boolean }> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      if (isAdmin) {
        await client.query('DELETE FROM chat_messages WHERE id = $1', [id]);
      } else {
        await client.query('DELETE FROM chat_messages WHERE id = $1 AND LOWER(username) = LOWER($2)', [id, username]);
      }
      client.release();
    } catch (err) {
      console.error('[PostgreSQL deleteChatMessage error]', err);
    }
  }

  memoryChatMessages = memoryChatMessages.filter(m => {
    if (m.id === id) {
      if (isAdmin || m.username.toLowerCase() === username.toLowerCase()) {
        return false;
      }
    }
    return true;
  });
  persistAllToFiles();
  return { success: true };
}

export async function likeChatMessage(id: number): Promise<{ success: boolean; likes: number }> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query('UPDATE chat_messages SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
      client.release();
      if (res.rows.length > 0) {
        const newLikes = Number(res.rows[0].likes || 0);
        const mem = memoryChatMessages.find(m => m.id === id);
        if (mem) mem.likes = newLikes;
        persistAllToFiles();
        return { success: true, likes: newLikes };
      }
    } catch (err) {
      console.error('[PostgreSQL likeChatMessage error]', err);
    }
  }

  const mem = memoryChatMessages.find(m => m.id === id);
  if (mem) {
    mem.likes = (mem.likes || 0) + 1;
    persistAllToFiles();
    return { success: true, likes: mem.likes };
  }
  return { success: false, likes: 0 };
}

/**
 * Save an uploaded or proxied image to PostgreSQL media_storage for permanent backup.
 * Even if Catbox deletes the file or is blocked, this database backup guarantees
 * that images never disappear.
 */
export async function saveMediaBackup(
  fileKey: string,
  mimeType: string,
  buffer: Buffer,
  originalUrl?: string
): Promise<boolean> {
  const base64Data = buffer.toString('base64');
  const fileSize = buffer.length;

  if (isPgConnected) {
    try {
      const client = await pool.connect();
      await client.query(
        `INSERT INTO media_storage (file_key, original_url, mime_type, data, file_size)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (file_key) 
         DO UPDATE SET original_url = COALESCE(EXCLUDED.original_url, media_storage.original_url),
                       data = EXCLUDED.data,
                       mime_type = EXCLUDED.mime_type,
                       file_size = EXCLUDED.file_size`,
        [fileKey, originalUrl || null, mimeType, base64Data, fileSize]
      );
      client.release();
      return true;
    } catch (err) {
      console.warn('[PostgreSQL saveMediaBackup warning]:', err);
    }
  }
  return false;
}

/**
 * Retrieve backed up media from PostgreSQL media_storage by file_key or original_url.
 */
export async function getMediaBackup(
  fileKeyOrUrl: string
): Promise<{ mimeType: string; buffer: Buffer } | null> {
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        `SELECT mime_type, data FROM media_storage 
         WHERE file_key = $1 OR original_url = $1 OR original_url LIKE '%' || $1
         LIMIT 1`,
        [fileKeyOrUrl]
      );
      client.release();
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const buffer = Buffer.from(row.data, 'base64');
        return { mimeType: row.mime_type || 'image/jpeg', buffer };
      }
    } catch (err) {
      console.warn('[PostgreSQL getMediaBackup warning]:', err);
    }
  }
  return null;
}

/**
 * Retrieve all Catbox image URLs found in mangas, chapters, and user profiles
 * so they can be pre-cached and permanently backed up in PostgreSQL and disk.
 */
export async function getAllCatboxUrlsFromDb(): Promise<string[]> {
  const catboxUrls = new Set<string>();

  // Check in-memory / file mangas
  for (const m of memoryMangas) {
    if (m.cover_image && m.cover_image.includes('catbox.moe/')) {
      catboxUrls.add(m.cover_image.trim());
    }
  }

  // Check in-memory / file chapters
  for (const c of memoryChapters) {
    if (Array.isArray(c.pages)) {
      for (const p of c.pages) {
        if (typeof p === 'string' && p.includes('catbox.moe/')) {
          catboxUrls.add(p.trim());
        }
      }
    }
  }

  // Check in-memory user profiles
  for (const u of Object.values(memoryUserProfiles)) {
    if (u.avatar_url && u.avatar_url.includes('catbox.moe/')) {
      catboxUrls.add(u.avatar_url.trim());
    }
  }

  // Also query PostgreSQL directly if connected
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const mangaRes = await client.query("SELECT cover_image FROM mangas WHERE cover_image LIKE '%catbox.moe%'");
      for (const row of mangaRes.rows) {
        if (row.cover_image) catboxUrls.add(row.cover_image.trim());
      }

      const chapterRes = await client.query("SELECT pages FROM chapters WHERE pages::text LIKE '%catbox.moe%'");
      for (const row of chapterRes.rows) {
        if (Array.isArray(row.pages)) {
          for (const p of row.pages) {
            if (typeof p === 'string' && p.includes('catbox.moe/')) catboxUrls.add(p.trim());
          }
        }
      }

      const profileRes = await client.query("SELECT avatar_url FROM user_profiles WHERE avatar_url LIKE '%catbox.moe%'");
      for (const row of profileRes.rows) {
        if (row.avatar_url) catboxUrls.add(row.avatar_url.trim());
      }
      client.release();
    } catch (err) {
      console.warn('[getAllCatboxUrlsFromDb warning]:', err);
    }
  }

  return Array.from(catboxUrls);
}
