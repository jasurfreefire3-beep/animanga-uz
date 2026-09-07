import path from 'path';
import fs from 'fs';

export interface TelegramAuthSession {
  code: string;
  telegram_id: number | string;
  first_name: string;
  last_name?: string;
  username: string;
  photo_url?: string;
  createdAt: number;
  expiresAt: number;
}

const BOT_TOKEN = '8978777660:AAG0VED9pZ847QFY6Fmfr7UAVXkoC6AGgt0';
export const BOT_USERNAME = 'Animanga_register_bot';

const activeSessions = new Map<string, TelegramAuthSession>();

// Cleanup expired codes
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(code);
    }
  }
}, 2 * 60 * 1000);

export function verifyTelegramAuthCode(code: string): { ok: boolean; session?: TelegramAuthSession; error?: string } {
  const cleanCode = (code || '').trim();
  if (!cleanCode || cleanCode.length !== 4) {
    return { ok: false, error: "Iltimos, 4 xonali kodni to'liq kiriting" };
  }

  const session = activeSessions.get(cleanCode);
  if (!session) {
    return { ok: false, error: "Kiritilgan 4 xonali kod topilmadi yoki muddati tugagan. Botga /start yuboring." };
  }

  if (session.expiresAt < Date.now()) {
    activeSessions.delete(cleanCode);
    return { ok: false, error: "Kiritilgan kodning muddati tugagan. Botdan yangi kod oling." };
  }

  activeSessions.delete(cleanCode);
  return { ok: true, session };
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram send message error]', err);
    return null;
  }
}

async function fetchTelegramUserProfilePhoto(userId: number | string, username: string): Promise<string> {
  try {
    const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`);
    const photosData: any = await photosRes.json();

    if (photosData.ok && photosData.result && photosData.result.total_count > 0 && photosData.result.photos.length > 0) {
      const sizes = photosData.result.photos[0];
      const largestPhoto = sizes[sizes.length - 1];

      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${largestPhoto.file_id}`);
      const fileData: any = await fileRes.json();

      if (fileData.ok && fileData.result && fileData.result.file_path) {
        const remoteUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
        
        try {
          const imgFetch = await fetch(remoteUrl);
          if (imgFetch.ok) {
            const buffer = Buffer.from(await imgFetch.arrayBuffer());
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const localFileName = `tg_avatar_${userId}.jpg`;
            fs.writeFileSync(path.join(uploadsDir, localFileName), buffer);
            return `/uploads/${localFileName}`;
          }
        } catch (downloadErr) {
          console.warn('[Telegram avatar download warning]', downloadErr);
        }

        return remoteUrl;
      }
    }
  } catch (err) {
    console.warn('[Telegram photo fetch error]', err);
  }

  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || String(userId))}`;
}

let isPolling = false;

export async function initTelegramBot() {
  if (isPolling) return;
  isPolling = true;

  console.log(`[Telegram Bot] Starting polling for @${BOT_USERNAME}...`);

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
  } catch (e) {
    console.warn('[Telegram deleteWebhook warning]', e);
  }

  let offset = 0;

  const poll = async () => {
    while (isPolling) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=15`, {
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const data: any = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = Math.max(offset, update.update_id + 1);

            const msg = update.message || update.edited_message;
            if (!msg || !msg.from) continue;

            const from = msg.from;
            const chatId = msg.chat.id;
            const telegramId = from.id;
            const firstName = from.first_name || '';
            const lastName = from.last_name || '';
            const rawUsername = from.username ? from.username.replace(/^@/, '') : '';
            const username = rawUsername || `tg_${telegramId}`;
            const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;

            const code = Math.floor(1000 + Math.random() * 9000).toString();
            const photoUrl = await fetchTelegramUserProfilePhoto(telegramId, username);

            activeSessions.set(code, {
              code,
              telegram_id: telegramId,
              first_name: firstName,
              last_name: lastName,
              username,
              photo_url: photoUrl,
              createdAt: Date.now(),
              expiresAt: Date.now() + 10 * 60 * 1000,
            });

            const welcomeText = `👋 <b>Assalomu alaykum, ${displayName}!</b>\n\n` +
              `✨ <b>AniManga Uz</b> platformasiga xush kelibsiz!\n\n` +
              `🔐 <b>Sizning 4 xonali tasdiqlash kodingiz:</b>\n\n` +
              `👉 <code>${code}</code> 👈 <i>(nusxalash uchun kod ustiga bosing)</i>\n\n` +
              `📱 Ushbu 4 xonali kodni saytdagi oynaga kiriting va profilingizga bir zumda kiring!\n` +
              `⏳ Kod amal qilish muddati: <b>10 daqiqa</b>.`;

            await sendTelegramMessage(chatId, welcomeText);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'TimeoutError' && err?.name !== 'AbortError') {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  };

  poll().catch((err) => {
    console.error('[Telegram Bot Polling Error]', err);
  });
}
