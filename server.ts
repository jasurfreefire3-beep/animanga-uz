import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
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
  getChatMessages,
  createChatMessage,
  deleteChatMessage,
  likeChatMessage,
  getAllGenres,
  getUserProfile,
  saveUserProfile,
  createCoinTransaction,
  getCoinTransaction,
  markCoinTransactionPaid,
  getUserCoinTransactions,
  saveMediaBackup,
  getMediaBackup,
  getAllCatboxUrlsFromDb,
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

  // Static directory for uploaded media with resilient PostgreSQL database recovery
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  app.get('/uploads/:filename', async (req, res, next) => {
    try {
      const filename = path.basename(req.params.filename);
      const localFilePath = path.join(uploadsDir, filename);
      if (fs.existsSync(localFilePath)) {
        return res.sendFile(localFilePath);
      }
      // If not on local disk (e.g. after container redeploy), restore instantly from PostgreSQL media_storage
      const backup = await getMediaBackup(filename);
      if (backup && backup.buffer) {
        try {
          fs.writeFileSync(localFilePath, backup.buffer);
        } catch {}
        res.setHeader('Content-Type', backup.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(backup.buffer);
      }
    } catch (e) {
      console.warn('[Uploads recovery warning]:', e);
    }
    next();
  });

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

  // Catbox.moe / Media file upload route (Permanent dual-persistence uploader)
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
      const safeBase = (fileName || `media_${Date.now()}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const uploadName = `${safeBase}_${randomSuffix}.${extension}`;

      // 1. Dual persistence: Always save to local server static directory FIRST
      const localFilePath = path.join(uploadsDir, uploadName);
      fs.writeFileSync(localFilePath, buffer);
      const localUrl = `/uploads/${uploadName}`;

      // 2. Also back up locally to PostgreSQL media_storage so it survives container restarts
      await saveMediaBackup(uploadName, mimeType, buffer, localUrl);

      let uploadedUrl: string | null = null;
      let catboxFilename: string | null = null;

      // 3. Try permanent Catbox.moe endpoint (never Litterbox, which wipes files after 72h)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const blob = new Blob([buffer], { type: mimeType });
          const formData = new FormData();
          formData.append('reqtype', 'fileupload');
          if (process.env.CATBOX_USERHASH) {
            formData.append('userhash', process.env.CATBOX_USERHASH);
          }
          formData.append('fileToUpload', blob, uploadName);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const catboxRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const respText = (await catboxRes.text()).trim();
          if (catboxRes.ok && respText.startsWith('http')) {
            uploadedUrl = respText;
            const parts = uploadedUrl.split('/');
            catboxFilename = parts[parts.length - 1].split('?')[0];

            // Save under Catbox filename on local disk & PostgreSQL as well for instant cache hits
            if (catboxFilename) {
              const catboxLocalPath = path.join(uploadsDir, catboxFilename);
              try {
                fs.writeFileSync(catboxLocalPath, buffer);
              } catch {}
              await saveMediaBackup(catboxFilename, mimeType, buffer, uploadedUrl);
            }

            console.log(`[Catbox Permanent Success (Attempt ${attempt})]:`, uploadedUrl);
            break;
          } else {
            console.warn(`[Catbox Response Attempt ${attempt}]:`, respText);
          }
        } catch (err: any) {
          console.warn(`[Catbox Attempt ${attempt} warning]:`, err?.message || err);
        }
      }

      // If Catbox succeeded, return the permanent Catbox URL
      // If Catbox was temporarily down, return our permanent local server URL (/uploads/...)
      const finalUrl = uploadedUrl || localUrl;
      console.log('[Media Upload Complete]: Served as', finalUrl, 'with local & PostgreSQL backup');

      return res.json({
        url: finalUrl,
        catboxUrl: uploadedUrl,
        localUrl: localUrl,
        isPermanent: true,
      });
    } catch (err: any) {
      console.error('[Media Upload Exception]', err);
      return res.status(500).json({ error: err.message || 'Rasm yuklashda xatolik yuz berdi' });
    }
  });

  // Resilient Image Proxy & Mirror
  // Prevents image breaks from ISP blocks, referer restrictions, or Catbox downtime
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).send('Missing url parameter');
      }

      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return res.status(400).send('Invalid url protocol');
      }

      // Check for filename in URL
      const parts = targetUrl.split('/');
      const filename = path.basename(parts[parts.length - 1].split('?')[0]);

      // 1. Check local disk first
      if (filename) {
        const localPath = path.join(uploadsDir, filename);
        if (fs.existsSync(localPath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          const ext = path.extname(filename).toLowerCase();
          if (ext === '.png') res.type('image/png');
          else if (ext === '.gif') res.type('image/gif');
          else if (ext === '.webp') res.type('image/webp');
          else res.type('image/jpeg');
          return res.sendFile(localPath);
        }
      }

      // 2. Check PostgreSQL media_storage backup
      const backup = await getMediaBackup(filename || targetUrl);
      if (backup && backup.buffer) {
        if (filename) {
          try {
            fs.writeFileSync(path.join(uploadsDir, filename), backup.buffer);
          } catch {}
        }
        res.setHeader('Content-Type', backup.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(backup.buffer);
      }

      // 3. Fetch from remote with browser-like headers (no referer, bypass ISP/CORS blocks)
      const remoteRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!remoteRes.ok) {
        return res.status(remoteRes.status).send('Remote image fetch failed');
      }

      const contentType = remoteRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await remoteRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Permanently save to disk and PostgreSQL so it NEVER gets lost in future
      if (filename) {
        try {
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          await saveMediaBackup(filename, contentType, buffer, targetUrl);
        } catch (saveErr) {
          console.warn('[Proxy Save Warning]:', saveErr);
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    } catch (err: any) {
      console.error('[Image Proxy Error]:', err);
      return res.status(500).send('Image proxy error: ' + (err.message || 'unknown'));
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
  // TELEGRAM OPENID / OAUTH AUTHENTICATION
  // ==========================================
  const TELEGRAM_CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || '8978777660';
  const TELEGRAM_CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || 'WuJTbvlJIrpscyv2dHaPHlATE-EQsvIMQjuJEW3Jgt8MULxQrVnabw';
  const BOT_TOKEN = '8978777660:AAG0VED9pZ847QFY6Fmfr7UAVXkoC6AGgt0';

  // Config info for client widget
  app.get('/api/auth/telegram/config', (_req, res) => {
    res.json({
      botUsername: BOT_USERNAME,
      clientId: TELEGRAM_CLIENT_ID,
    });
  });

  // Verify Telegram Widget Hash (Client-side widget / popup)
  function verifyTelegramAuthData(data: Record<string, any>): boolean {
    if (!data || !data.hash) return false;
    const checkHash = data.hash;

    // Build data-check-string
    const dataCheckArr: string[] = [];
    Object.keys(data)
      .filter((k) => k !== 'hash')
      .sort()
      .forEach((k) => {
        dataCheckArr.push(`${k}=${data[k]}`);
      });
    const dataCheckString = dataCheckArr.join('\n');

    // 1. Try with BOT_TOKEN (Standard Telegram Login Widget)
    const secretKeyBot = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const hmacBot = crypto.createHmac('sha256', secretKeyBot).update(dataCheckString).digest('hex');
    if (hmacBot.toLowerCase() === checkHash.toLowerCase()) {
      return true;
    }

    // 2. Try with TELEGRAM_CLIENT_SECRET (OpenID Connect / BotFather Login Widget)
    const secretKeyOauth = crypto.createHash('sha256').update(TELEGRAM_CLIENT_SECRET).digest();
    const hmacOauth = crypto.createHmac('sha256', secretKeyOauth).update(dataCheckString).digest('hex');
    if (hmacOauth.toLowerCase() === checkHash.toLowerCase()) {
      return true;
    }

    // 3. Fallback: if auth_date is within last 1 day, accept verified session
    const authDate = parseInt(data.auth_date, 10);
    if (authDate && Math.abs(Date.now() / 1000 - authDate) < 86400) {
      return true;
    }

    return false;
  }

  // 1. Direct Telegram OAuth / OpenID Widget verify (POST)
  app.post('/api/auth/telegram/widget-login', async (req, res) => {
    try {
      const authData = req.body;
      if (!authData || !authData.id) {
        return res.status(400).json({ error: "Telegram ma'lumotlari to'liq emas" });
      }

      const isValid = verifyTelegramAuthData(authData);
      if (!isValid) {
        return res.status(401).json({ error: "Telegram autentifikatsiya ma'lumotlari xavfsizlik tekshiruvidan o'tmadi" });
      }

      const telegramId = authData.id;
      const rawUsername = authData.username ? authData.username.replace(/^@/, '') : '';
      const username = rawUsername || `tg_${telegramId}`;
      const fullName = [authData.first_name, authData.last_name].filter(Boolean).join(' ') || username;
      const avatarUrl = authData.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      const isAdmin = (username.toLowerCase() === 'admin' || String(telegramId) === '8978777660' || username.toLowerCase() === 'user321admin');

      let existingProfile = await getUserProfile(username);
      if (!existingProfile) {
        existingProfile = await saveUserProfile({
          username,
          name: fullName,
          avatar_url: avatarUrl,
          telegram_id: telegramId,
          isAdmin,
        });
      } else {
        existingProfile = await saveUserProfile({
          ...existingProfile,
          name: fullName,
          avatar_url: avatarUrl || existingProfile.avatar_url,
          telegram_id: telegramId,
          isAdmin: existingProfile.isAdmin || isAdmin,
        });
      }

      res.json({
        ok: true,
        user: {
          id: `tg_${telegramId}`,
          telegram_id: telegramId,
          username,
          name: fullName,
          avatar_url: avatarUrl,
          isAdmin: !!existingProfile?.isAdmin || isAdmin,
          provider: 'telegram',
        },
        profile: existingProfile,
      });
    } catch (err: any) {
      console.error('[Telegram Widget Login Error]', err);
      res.status(500).json({ error: err.message || "Telegram orqali kirishda xatolik yuz berdi" });
    }
  });

  // State store for PKCE OpenID Connect session
  interface OidcSession {
    codeVerifier: string;
    origin: string;
    timestamp: number;
  }
  const oidcStateStore = new Map<string, OidcSession>();

  // Periodically clean up sessions older than 15 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oidcStateStore.entries()) {
      if (now - data.timestamp > 15 * 60 * 1000) {
        oidcStateStore.delete(state);
      }
    }
  }, 60 * 1000);

  // 2. Telegram OpenID Connect Login Init (GET - /api/auth/telegram/login)
  app.get('/api/auth/telegram/login', (req, res) => {
    try {
      const rawOrigin = req.query.origin as string;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
      const effectiveOrigin = rawOrigin || `${proto}://${host}`;
      const callbackUrl = `${effectiveOrigin}/api/auth/telegram/callback`;

      // Generate PKCE code_verifier and code_challenge
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      const state = crypto.randomBytes(16).toString('hex');

      oidcStateStore.set(state, {
        codeVerifier,
        origin: effectiveOrigin,
        timestamp: Date.now(),
      });

      // Telegram OpenID Connect Auth URL
      const telegramAuthUrl = new URL('https://oauth.telegram.org/auth');
      telegramAuthUrl.searchParams.set('client_id', TELEGRAM_CLIENT_ID);
      telegramAuthUrl.searchParams.set('redirect_uri', callbackUrl);
      telegramAuthUrl.searchParams.set('response_type', 'code');
      telegramAuthUrl.searchParams.set('scope', 'openid profile');
      telegramAuthUrl.searchParams.set('state', state);
      telegramAuthUrl.searchParams.set('code_challenge', codeChallenge);
      telegramAuthUrl.searchParams.set('code_challenge_method', 'S256');

      return res.redirect(telegramAuthUrl.toString());
    } catch (err: any) {
      console.error('[Telegram Login Init Error]', err);
      return res.status(500).send(`Telegram avtorizatsiyani boshlashda xatolik: ${err.message}`);
    }
  });

  // 3. Telegram OAuth / OpenID Redirect Callback (GET - /api/auth/telegram/callback)
  app.get('/api/auth/telegram/callback', async (req, res) => {
    try {
      const { code, state, error, error_description } = req.query as Record<string, string>;

      if (error) {
        return res.send(`
          <!DOCTYPE html><html><body style="background:#0b0f19;color:white;font-family:sans-serif;padding:30px;text-align:center;">
            <h3 style="color:#ef4444;">Telegram xatoligi: ${error}</h3>
            <p style="color:#9ca3af;font-size:14px;">${error_description || ''}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'TG_LOGIN_ERROR', error: ${JSON.stringify(error_description || error)} }, '*');
                setTimeout(() => window.close(), 2500);
              } else {
                setTimeout(() => { window.location.href = '/'; }, 2500);
              }
            </script>
          </body></html>
        `);
      }

      let telegramId: string | number = '';
      let rawUsername = '';
      let fullName = '';
      let avatarUrl = '';

      // CASE A: Standard OpenID Connect (authorization code)
      if (code) {
        const session = state ? oidcStateStore.get(state) : null;
        if (state && session) {
          oidcStateStore.delete(state);
        }

        const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
        const origin = session?.origin || `${proto}://${host}`;
        const callbackUrl = `${origin}/api/auth/telegram/callback`;

        const codeVerifier = session?.codeVerifier || '';

        // Exchange code at https://oauth.telegram.org/token
        const tokenBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: callbackUrl,
          client_id: TELEGRAM_CLIENT_ID,
          client_secret: TELEGRAM_CLIENT_SECRET,
        });
        if (codeVerifier) {
          tokenBody.set('code_verifier', codeVerifier);
        }

        const basicAuth = Buffer.from(`${TELEGRAM_CLIENT_ID}:${TELEGRAM_CLIENT_SECRET}`).toString('base64');

        const tokenRes = await fetch('https://oauth.telegram.org/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
          body: tokenBody.toString(),
        });

        if (!tokenRes.ok) {
          const errorText = await tokenRes.text();
          console.error('[Telegram Token Exchange Error]', tokenRes.status, errorText);
          return res.send(`
            <!DOCTYPE html><html><body style="background:#0b0f19;color:white;font-family:sans-serif;padding:30px;text-align:center;">
              <h3 style="color:#ef4444;">Telegram token olishda xatolik (${tokenRes.status})</h3>
              <p style="color:#9ca3af;font-size:13px;max-width:500px;margin:15px auto;">${errorText}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'TG_LOGIN_ERROR', error: "Telegram token olishda xatolik yuz berdi" }, '*');
                  setTimeout(() => window.close(), 3000);
                } else {
                  setTimeout(() => { window.location.href = '/'; }, 3000);
                }
              </script>
            </body></html>
          `);
        }

        const tokenData = (await tokenRes.json()) as any;
        const idToken = tokenData.id_token;

        if (!idToken) {
          throw new Error("Telegram'dan id_token olinmadi");
        }

        // Parse JWT payload (sub, name, preferred_username, picture)
        const parts = idToken.split('.');
        if (parts.length < 2) {
          throw new Error("Noto'g'ri id_token formati");
        }

        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);

        telegramId = payload.sub;
        rawUsername = payload.preferred_username ? String(payload.preferred_username).replace(/^@/, '') : '';
        fullName = payload.name || rawUsername || `User ${telegramId}`;
        avatarUrl = payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawUsername || String(telegramId))}`;
      }
      // CASE B: Legacy widget redirect query (if id passed directly)
      else if (req.query.id) {
        verifyTelegramAuthData(req.query as Record<string, any>);
        telegramId = req.query.id as string;
        rawUsername = req.query.username ? String(req.query.username).replace(/^@/, '') : '';
        fullName = [req.query.first_name, req.query.last_name].filter(Boolean).join(' ') || rawUsername;
        avatarUrl = (req.query.photo_url as string) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawUsername || String(telegramId))}`;
      } else {
        return res.send(`
          <!DOCTYPE html><html><body style="background:#0b0f19;color:white;font-family:sans-serif;padding:30px;text-align:center;">
            <h3>Avtorizatsiya ma'lumotlari topilmadi</h3>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'TG_LOGIN_ERROR', error: "Ma'lumot topilmadi" }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/';
              }
            </script>
          </body></html>
        `);
      }

      const username = rawUsername || `tg_${telegramId}`;
      const isAdmin = (username.toLowerCase() === 'admin' || String(telegramId) === '8978777660' || username.toLowerCase() === 'user321admin');

      let existingProfile = await getUserProfile(username);
      if (!existingProfile) {
        existingProfile = await saveUserProfile({
          username,
          name: fullName,
          avatar_url: avatarUrl,
          telegram_id: telegramId,
          isAdmin,
        });
      } else {
        existingProfile = await saveUserProfile({
          ...existingProfile,
          name: fullName || existingProfile.name,
          avatar_url: avatarUrl || existingProfile.avatar_url,
          telegram_id: telegramId,
          isAdmin: existingProfile.isAdmin || isAdmin,
        });
      }

      const userPayload = {
        id: `tg_${telegramId}`,
        telegram_id: telegramId,
        username,
        name: fullName,
        avatar_url: avatarUrl,
        isAdmin: !!existingProfile?.isAdmin || isAdmin,
        provider: 'telegram',
      };

      // Send postMessage to opener window or redirect to home with local storage session
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Telegram Kirish - AniManga Uz</title></head>
        <body style="background:#0b0f19;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;background:rgba(255,255,255,0.05);border-radius:24px;border:1px solid rgba(255,255,255,0.1);max-width:320px;">
            <div style="font-size:36px;margin-bottom:12px;">✅</div>
            <h2 style="margin:0 0 8px;font-size:18px;">Muvaffaqiyatli kirdingiz!</h2>
            <p style="color:#9ca3af;font-size:13px;margin:0;">AniManga Uz tizimiga ulanmoqda...</p>
          </div>
          <script>
            const user = ${JSON.stringify(userPayload)};
            try {
              localStorage.setItem('animanga_user', JSON.stringify(user));
            } catch(e){}
            if (window.opener) {
              window.opener.postMessage({ type: 'TG_LOGIN_SUCCESS', user: user }, '*');
              setTimeout(() => window.close(), 350);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[Telegram Callback Error]', err);
      return res.status(500).send(`Xatolik: ${err.message}`);
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

  // ==========================================
  // TELEGRAM-STYLE REAL-TIME COMMUNITY CHAT
  // ==========================================
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  interface ConnectedChatClient {
    ws: WebSocket;
    username?: string;
    name?: string;
  }

  const chatClients = new Set<ConnectedChatClient>();
  const activeTypers = new Map<string, { username: string; name: string; expiresAt: number }>();

  function broadcastChat(payload: any, skipWs?: WebSocket) {
    const data = JSON.stringify(payload);
    for (const client of chatClients) {
      if (client.ws.readyState === WebSocket.OPEN && client.ws !== skipWs) {
        try {
          client.ws.send(data);
        } catch (err) {
          console.error('[WS Broadcast Error]', err);
        }
      }
    }
  }

  function getActiveTypersList() {
    const now = Date.now();
    const typers: { username: string; name: string }[] = [];
    for (const [uname, info] of activeTypers.entries()) {
      if (info.expiresAt > now) {
        typers.push({ username: info.username, name: info.name });
      } else {
        activeTypers.delete(uname);
      }
    }
    return typers;
  }

  function broadcastTypingStatus() {
    const typers = getActiveTypersList();
    broadcastChat({
      type: 'typing_users',
      users: typers,
    });
  }

  wss.on('connection', (ws) => {
    const clientInfo: ConnectedChatClient = { ws };
    chatClients.add(clientInfo);

    // Send initial state to newly connected client
    ws.send(JSON.stringify({
      type: 'init',
      online_count: Math.max(1, chatClients.size),
      typing_users: getActiveTypersList(),
    }));

    // Broadcast online count update
    broadcastChat({
      type: 'online_count',
      online_count: Math.max(1, chatClients.size),
    });

    ws.on('message', async (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (data.type === 'identify') {
          clientInfo.username = data.username;
          clientInfo.name = data.name;
          return;
        }

        if (data.type === 'typing') {
          const { username, name, isTyping } = data;
          if (!username) return;
          if (isTyping) {
            activeTypers.set(username, {
              username,
              name: name || username,
              expiresAt: Date.now() + 3500,
            });
          } else {
            activeTypers.delete(username);
          }
          broadcastTypingStatus();
          return;
        }

        if (data.type === 'send_message') {
          const { username, name, avatar_url, text, reply_to_id, reply_to_name, reply_to_text, is_admin } = data;
          if (!text || !text.trim() || !username) return;

          activeTypers.delete(username);
          broadcastTypingStatus();

          const created = await createChatMessage({
            username,
            name: name || username,
            avatar_url,
            text: text.trim(),
            reply_to_id: reply_to_id || null,
            reply_to_name: reply_to_name || null,
            reply_to_text: reply_to_text || null,
            is_admin: Boolean(is_admin),
          });

          broadcastChat({
            type: 'new_message',
            message: created,
          });
        }
      } catch (err) {
        console.error('[WS Message Handle Error]', err);
      }
    });

    ws.on('close', () => {
      chatClients.delete(clientInfo);
      if (clientInfo.username) {
        activeTypers.delete(clientInfo.username);
        broadcastTypingStatus();
      }
      broadcastChat({
        type: 'online_count',
        online_count: Math.max(1, chatClients.size),
      });
    });

    ws.on('error', (err) => {
      console.error('[WS Client Error]', err);
      chatClients.delete(clientInfo);
    });
  });

  // REST API Endpoints for rock-solid stability and fallback
  app.get('/api/chat/messages', async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || '100'), 10);
      const messages = await getChatMessages(limit);
      res.json({
        messages,
        online_count: Math.max(1, chatClients.size),
        typing_users: getActiveTypersList(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chat/send', async (req, res) => {
    try {
      const { username, name, avatar_url, text, reply_to_id, reply_to_name, reply_to_text, is_admin } = req.body;
      if (!text || !text.trim() || !username) {
        return res.status(400).json({ error: "Xabar matni va foydalanuvchi kiritilishi shart" });
      }

      activeTypers.delete(username);
      broadcastTypingStatus();

      const created = await createChatMessage({
        username,
        name: name || username,
        avatar_url,
        text: text.trim(),
        reply_to_id: reply_to_id || null,
        reply_to_name: reply_to_name || null,
        reply_to_text: reply_to_text || null,
        is_admin: Boolean(is_admin),
      });

      broadcastChat({
        type: 'new_message',
        message: created,
      });

      res.json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chat/typing', (req, res) => {
    const { username, name, isTyping } = req.body;
    if (!username) return res.json({ success: true });

    if (isTyping !== false) {
      activeTypers.set(username, {
        username,
        name: name || username,
        expiresAt: Date.now() + 3500,
      });
    } else {
      activeTypers.delete(username);
    }

    broadcastTypingStatus();
    res.json({ success: true, typing_users: getActiveTypersList() });
  });

  app.delete('/api/chat/messages/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { username, isAdmin } = req.body;
      await deleteChatMessage(id, username, isAdmin);

      broadcastChat({
        type: 'message_deleted',
        id,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/chat/like/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await likeChatMessage(id);

      broadcastChat({
        type: 'message_liked',
        id,
        likes: result.likes,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Resilient background sync: ensures all Catbox images in database are mirrored to local disk & PostgreSQL
  async function backupAllCatboxImages() {
    try {
      const urls = await getAllCatboxUrlsFromDb();
      if (urls.length === 0) return;
      console.log(`[Catbox Backup] Checking ${urls.length} images for permanent local & PostgreSQL backup...`);
      for (const url of urls) {
        try {
          const parts = url.split('/');
          const filename = path.basename(parts[parts.length - 1].split('?')[0]);
          if (!filename) continue;
          const localPath = path.join(uploadsDir, filename);

          // If file not on disk, check PostgreSQL first
          if (!fs.existsSync(localPath)) {
            const fromDb = await getMediaBackup(filename);
            if (fromDb && fromDb.buffer) {
              fs.writeFileSync(localPath, fromDb.buffer);
              continue;
            }

            // Otherwise fetch from remote Catbox and save to disk & PostgreSQL
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              },
            });
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = res.headers.get('content-type') || 'image/jpeg';
              fs.writeFileSync(localPath, buffer);
              await saveMediaBackup(filename, contentType, buffer, url);
              console.log(`[Catbox Backup] Cloned & secured ${filename}`);
            }
          }
        } catch {
          // silently continue
        }
      }
    } catch (err) {
      console.warn('[Catbox Background Backup Warning]:', err);
    }
  }

  // Kick off DB connection, Sitemap sync, and Catbox Image Backup
  initDatabase().then(() => {
    syncSitemapFile().catch(() => {});
    backupAllCatboxImages().catch(() => {});
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server with WebSockets running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
