import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getDbStatus,
  executeRawQuery,
  reseedDatabase,
  clearAllDatabase,
  getAllMangas,
  getMangaById,
  createManga,
  updateManga,
  toggleMangaBanner,
  deleteManga,
  getAllChapters,
  createChapter,
  updateChapterPrice,
  deleteChapter,
  purchaseChapter,
  incrementChapterViews,
  getMangaComments,
  addMangaComment,
  likeMangaComment,
  deleteMangaComment,
  getAllGenres,
  getUserProfile,
  saveUserProfile,
  createCoinTransaction,
  getCoinTransaction,
  markCoinTransactionPaid,
  getUserCoinTransactions,
} from './src/server/db.ts';
import {
  initTelegramBot,
  verifyTelegramAuthCode,
  BOT_USERNAME,
} from './src/server/telegramBot.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static directory for uploaded media
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // XML escaping helper for Sitemap
  function escapeXml(unsafe: string | null | undefined): string {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function getBaseUrl(req: express.Request): string {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${proto}://${host}`;
  }

  // Dynamic Sitemap.xml Generator
  async function generateSitemapXml(baseUrl: string): Promise<string> {
    const mangas = await getAllMangas();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Home
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. Manga Catalog
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/manga</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;

    // 3. Genres
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/genres</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;

    // 4. Each Manga dynamically with Image, Title, Tavsif & Ball (Rating)
    for (const m of mangas) {
      const loc = `${baseUrl}/manga/${m.id}`;
      const rawDate = m.updated_at || m.created_at;
      const lastMod = rawDate ? new Date(rawDate).toISOString().split('T')[0] : today;
      const title = escapeXml(m.title);
      const score = Number(m.rating || 5.0).toFixed(1);
      const desc = escapeXml((m.description || '').replace(/\s+/g, ' ').trim().slice(0, 300));
      const cover = m.cover_image ? escapeXml(m.cover_image) : '';

      xml += `  <url>\n`;
      xml += `    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      if (cover) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${cover}</image:loc>\n`;
        xml += `      <image:title>${title} - O&apos;zbek tilida o&apos;qish (Reyting: ${score}★)</image:title>\n`;
        if (desc) {
          xml += `      <image:caption>${desc}</image:caption>\n`;
        }
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  // Sync to physical file in public/sitemap.xml
  async function syncSitemapFile(customBaseUrl?: string) {
    try {
      const baseUrl = customBaseUrl || 'https://animanga.uz';
      const xml = await generateSitemapXml(baseUrl);
      const publicSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
      fs.writeFileSync(publicSitemap, xml, 'utf-8');

      const distSitemap = path.join(process.cwd(), 'dist', 'sitemap.xml');
      if (fs.existsSync(path.dirname(distSitemap))) {
        fs.writeFileSync(distSitemap, xml, 'utf-8');
      }
    } catch (err) {
      console.warn('[Sitemap sync notice]:', err);
    }
  }

  // Dynamic Sitemap XML Endpoint
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const xml = await generateSitemapXml(baseUrl);
      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.send(xml);
      // Also sync to file asynchronously with this current host
      syncSitemapFile(baseUrl).catch(() => {});
    } catch (err: any) {
      res.status(500).send('Error generating sitemap: ' + err.message);
    }
  });

  // Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  // Health and DB status
  app.get('/api/health', async (_req, res) => {
    const status = await getDbStatus();
    res.json({ status: 'ok', pg: status });
  });

  app.get('/api/db/status', async (_req, res) => {
    const status = await getDbStatus();
    res.json(status);
  });

  app.post('/api/db/query', async (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql) return res.status(400).json({ error: 'SQL so\'rov kiritilmadi' });
      const result = await executeRawQuery(sql);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/seed', async (_req, res) => {
    try {
      await reseedDatabase();
      res.json({ success: true, message: 'Ma\'lumotlar bazasi boshlang\'ich holatga keltirildi' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/clear', async (_req, res) => {
    try {
      const result = await clearAllDatabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manga routes
  app.get('/api/manga', async (req, res) => {
    try {
      const mangas = await getAllMangas({
        search: req.query.search as string,
        genre: req.query.genre as string,
        type: req.query.type as string,
        status: req.query.status as string,
        sort: req.query.sort as string
      });
      res.json(mangas);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/manga/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const manga = await getMangaById(id);
      if (!manga) return res.status(404).json({ error: 'Manga topilmadi' });
      res.json(manga);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/manga', async (req, res) => {
    try {
      const created = await createManga(req.body);
      syncSitemapFile().catch(() => {});
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/manga/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateManga(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Manga topilmadi' });
      syncSitemapFile().catch(() => {});
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/manga/:id/banner', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { is_banner } = req.body || {};
      const updated = await toggleMangaBanner(id, is_banner);
      if (!updated) return res.status(404).json({ error: 'Manga topilmadi' });
      syncSitemapFile().catch(() => {});
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/manga/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteManga(id);
      syncSitemapFile().catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chapters routes
  app.get('/api/chapters', async (req, res) => {
    try {
      const mangaId = req.query.manga_id ? parseInt(req.query.manga_id as string, 10) : undefined;
      const chapters = await getAllChapters(mangaId);
      res.json(chapters);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chapters', async (req, res) => {
    try {
      const created = await createChapter(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/chapters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteChapter(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chapter View Count Increment (Real count tracking)
  app.post('/api/chapters/:id/view', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Noto'g'ri bob ID" });
      }
      const result = await incrementChapterViews(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manga Real Comments routes
  app.get('/api/manga/:id/comments', async (req, res) => {
    try {
      const mangaId = parseInt(req.params.id, 10);
      if (isNaN(mangaId)) {
        return res.status(400).json({ error: "Noto'g'ri manga ID" });
      }
      const comments = await getMangaComments(mangaId);
      res.json(comments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/manga/:id/comments', async (req, res) => {
    try {
      const mangaId = parseInt(req.params.id, 10);
      const { username, name, avatar_url, text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Izoh matni kiritilmadi" });
      }
      const comment = await addMangaComment({
        manga_id: mangaId,
        username: username || 'mehmon',
        name: name || username || 'Foydalanuvchi',
        avatar_url,
        text,
      });
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/comments/:id/like', async (req, res) => {
    try {
      const id = req.params.id;
      const result = await likeMangaComment(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/comments/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const { username, isAdmin } = req.body;
      const result = await deleteMangaComment(id, username || '', Boolean(isAdmin));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Genres routes
  app.get('/api/genres', async (_req, res) => {
    try {
      const genres = await getAllGenres();
      res.json(genres);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Catbox.moe / Avatar file upload route (Multi-tier resilient uploader)
  app.post('/api/upload/catbox', async (req, res) => {
    res.type('application/json');
    try {
      const { base64Data, fileName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'Rasm ma\'lumoti kiritilmadi' });
      }

      // Parse base64
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let mimeType = 'image/jpeg';
      let extension = 'jpg';

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('webp')) extension = 'webp';
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const safeBase = (fileName || `avatar_${Date.now()}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const uploadName = `${safeBase}_${randomSuffix}.${extension}`;

      let uploadedUrl: string | null = null;

      // 1. Try permanent Catbox.moe endpoint first
      try {
        const blob = new Blob([buffer], { type: mimeType });
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        if (process.env.CATBOX_USERHASH) {
          formData.append('userhash', process.env.CATBOX_USERHASH);
        }
        formData.append('fileToUpload', blob, uploadName);

        const catboxRes = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          body: formData,
        });

        const respText = (await catboxRes.text()).trim();
        if (catboxRes.ok && respText.startsWith('http')) {
          uploadedUrl = respText;
          console.log('[Catbox Standard Success]:', uploadedUrl);
        } else {
          console.warn('[Catbox Standard Response]:', respText);
        }
      } catch (err: any) {
        console.warn('[Catbox Standard Warning]:', err?.message || err);
      }

      // 2. If standard Catbox was unreachable, try Litterbox (Catbox.moe temporary API)
      if (!uploadedUrl) {
        try {
          const blob = new Blob([buffer], { type: mimeType });
          const formData = new FormData();
          formData.append('reqtype', 'fileupload');
          formData.append('time', '72h');
          formData.append('fileToUpload', blob, uploadName);

          const litterboxRes = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
            method: 'POST',
            body: formData,
          });

          const respText = (await litterboxRes.text()).trim();
          if (litterboxRes.ok && respText.startsWith('http')) {
            uploadedUrl = respText;
            console.log('[Litterbox Catbox Success]:', uploadedUrl);
          } else {
            console.warn('[Litterbox Catbox Response]:', respText);
          }
        } catch (err: any) {
          console.warn('[Litterbox Catbox Warning]:', err?.message || err);
        }
      }

      // 3. Fallback: Save directly to server static directory so avatar upload NEVER fails!
      if (!uploadedUrl) {
        const localFilePath = path.join(uploadsDir, uploadName);
        fs.writeFileSync(localFilePath, buffer);
        uploadedUrl = `/uploads/${uploadName}`;
        console.log('[Local Storage Fallback]: Saved avatar to', uploadedUrl);
      }

      return res.json({ url: uploadedUrl });
    } catch (err: any) {
      console.error('[Avatar Upload Exception]', err);
      return res.status(500).json({ error: err.message || 'Avatar yuklashda xatolik yuz berdi' });
    }
  });

  // User Profile routes
  app.get('/api/profile/:username', async (req, res) => {
    try {
      const username = req.params.username;
      const profile = await getUserProfile(username);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profile', async (req, res) => {
    try {
      const profileData = req.body;
      if (!profileData || !profileData.username) {
        return res.status(400).json({ error: 'Foydalanuvchi nomi ko\'rsatilmadi' });
      }
      const saved = await saveUserProfile(profileData);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= TEZCHEK & COINS API =================
  const TEZCHEK_API_KEY = process.env.TEZCHEK_API_KEY || '8237d3501a36506d3271f7918fe9bee985f300ed';
  const TEZCHEK_SHOP_ID = process.env.TEZCHEK_SHOP_ID || '118';

  // 1. Create Coin Order via TezChek
  app.post('/api/coins/create-order', async (req, res) => {
    try {
      const { coins, username } = req.body;
      const coinsCount = parseInt(coins, 10);
      const user = username || 'admin';

      if (isNaN(coinsCount) || coinsCount < 10) {
        return res.status(400).json({ error: "Eng kam tanga miqdori: 10 ta tanga (1,000 so'm)" });
      }

      // Calculation: 10 coins = 1,000 UZS -> 1 coin = 100 UZS
      const amount = coinsCount * 100;

      // Call TezChek API to create invoice
      const tezchekResp = await fetch('https://tezchek.uz/api/create_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TEZCHEK_API_KEY,
          amount: amount,
        }),
      });

      const tezchekData: any = await tezchekResp.json();
      console.log('[TezChek create_invoice response]', tezchekData);

      if (!tezchekData || !tezchekData.ok || !tezchekData.order_id) {
        return res.status(502).json({
          error: "TezChek to'lov tizimida hisob yaratib bo'lmadi",
          details: tezchekData,
        });
      }

      // Record transaction
      const tx = await createCoinTransaction({
        order_id: Number(tezchekData.order_id),
        username: user,
        coins: coinsCount,
        amount: amount,
        pay_url: tezchekData.pay_url,
      });

      res.json({
        ok: true,
        order_id: tezchekData.order_id,
        pay_url: tezchekData.pay_url,
        coins: coinsCount,
        amount: amount,
        shop_id: TEZCHEK_SHOP_ID,
        transaction: tx,
      });
    } catch (err: any) {
      console.error('[TezChek create order error]', err);
      res.status(500).json({ error: err.message || "To'lov hisobini yaratishda xatolik yuz berdi" });
    }
  });

  // 2. Check TezChek Invoice Status & Credit Coins
  app.post('/api/coins/check-order/:orderId', async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Order ID noto'g'ri" });
      }

      // Check status from TezChek
      const tezchekResp = await fetch('https://tezchek.uz/api/status_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TEZCHEK_API_KEY,
          order_id: String(orderId),
        }),
      });

      const statusData: any = await tezchekResp.json();
      console.log('[TezChek status_invoice response]', statusData);

      if (!statusData || !statusData.ok || !statusData.payment) {
        return res.status(502).json({
          error: "TezChek holatini tekshirib bo'lmadi",
          details: statusData,
        });
      }

      const payment = statusData.payment;
      const paymentStatus = payment.status; // 'paid', 'pending', 'canceled', etc.

      if (paymentStatus === 'paid') {
        const result = await markCoinTransactionPaid(orderId);
        if (result) {
          return res.json({
            ok: true,
            status: 'paid',
            paid: true,
            coins_added: result.coins_added,
            new_balance: result.new_balance,
            message: `To'lov muvaffaqiyatli qabul qilindi! Hisobingizga ${result.coins_added} tanga qo'shildi.`,
          });
        }
      }

      res.json({
        ok: true,
        status: paymentStatus,
        paid: paymentStatus === 'paid',
        payment,
      });
    } catch (err: any) {
      console.error('[TezChek check order error]', err);
      res.status(500).json({ error: err.message || "To'lov holatini tekshirishda xatolik yuz berdi" });
    }
  });

  // 3. User Coin Transactions History
  app.get('/api/coins/transactions/:username', async (req, res) => {
    try {
      const username = req.params.username;
      const list = await getUserCoinTransactions(username);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Purchase Chapter with Coins
  app.post('/api/chapters/:id/purchase', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id, 10);
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Foydalanuvchi nomi ko'rsatilmadi" });
      }

      const result = await purchaseChapter(chapterId, username);
      if (!result.success) {
        return res.status(400).json({ error: result.message, remaining_coins: result.remaining_coins });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Update Chapter Price (Admin)
  
  app.put('/api/chapters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { updateChapter } = await import('./src/server/db.ts');
      const updated = await updateChapter(id, req.body);
      if (!updated) return res.status(404).json({ error: "Chapter not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.patch('/api/chapters/:id/price', async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id, 10);
      const { price_coins } = req.body;
      await updateChapterPrice(chapterId, Number(price_coins || 0));
      res.json({ success: true, price_coins: Number(price_coins || 0) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TELEGRAM BOT 4-DIGIT CODE AUTHENTICATION
  // ==========================================
  app.get('/api/auth/telegram/bot-info', (_req, res) => {
    res.json({
      botUsername: BOT_USERNAME,
      botLink: `https://t.me/${BOT_USERNAME}`,
      botUrlWithStart: `https://t.me/${BOT_USERNAME}?start=auth`,
    });
  });

  app.post('/api/auth/telegram/verify-code', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Iltimos, 4 xonali tasdiqlash kodini kiriting" });
      }

      const result = verifyTelegramAuthCode(code);
      if (!result.ok || !result.session) {
        return res.status(400).json({
          error: result.error || "Kiritilgan 4 xonali kod noto'g'ri yoki muddati tugagan! Botga /start yuborib yangi kod oling."
        });
      }

      const session = result.session;
      const rawUsername = session.username ? session.username.replace(/^@/, '') : '';
      const username = rawUsername || `tg_${session.telegram_id}`;
      const fullName = [session.first_name, session.last_name].filter(Boolean).join(' ') || username;
      const avatarUrl = session.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      const isAdmin = (username.toLowerCase() === 'admin' || String(session.telegram_id) === '8978777660' || username.toLowerCase() === 'user321admin');

      // Save/Get Postgres Profile
      let existingProfile = await getUserProfile(username);
      if (!existingProfile) {
        existingProfile = await saveUserProfile({
          username,
          name: fullName,
          avatar_url: avatarUrl,
          telegram_id: session.telegram_id,
          isAdmin,
        });
      } else {
        existingProfile = await saveUserProfile({
          ...existingProfile,
          name: fullName,
          avatar_url: avatarUrl || existingProfile.avatar_url,
          telegram_id: session.telegram_id,
          isAdmin: existingProfile.isAdmin || isAdmin,
        });
      }

      res.json({
        ok: true,
        user: {
          id: `tg_${session.telegram_id}`,
          telegram_id: session.telegram_id,
          username,
          name: fullName,
          avatar_url: avatarUrl,
          isAdmin: !!existingProfile?.isAdmin || isAdmin,
          provider: 'telegram',
        },
        profile: existingProfile,
      });
    } catch (err: any) {
      console.error('[Telegram Verify Code Error]', err);
      res.status(500).json({ error: err.message || "Tasdiqlashda xatolik yuz berdi" });
    }
  });

  // Kick off DB connection and Telegram Bot
  initDatabase().then(() => {
    syncSitemapFile().catch(() => {});
  }).catch(err => {
    console.error('[Database init warning]', err);
  });

  initTelegramBot().catch(err => {
    console.error('[Telegram bot startup error]', err);
  });

  // Vite development middleware vs production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
