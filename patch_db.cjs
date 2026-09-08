const fs = require('fs');
const content = fs.readFileSync('./src/server/db.ts', 'utf8');

const updateChapterFn = `
export async function updateChapter(id: number, data: { chapter_number: number; title: string; pages?: string[]; price_coins?: number }): Promise<Chapter | null> {
  const price_coins = Number(data.price_coins || 0);
  if (isPgConnected) {
    try {
      const client = await pool.connect();
      const res = await client.query(
        \`UPDATE chapters 
         SET chapter_number = $1, title = $2, pages = $3, price_coins = $4
         WHERE id = $5
         RETURNING *\`,
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
`;

if (!content.includes('export async function updateChapter(id: number, data: {')) {
    const splitIndex = content.indexOf('export async function deleteChapter');
    const newContent = content.slice(0, splitIndex) + updateChapterFn + '\n' + content.slice(splitIndex);
    fs.writeFileSync('./src/server/db.ts', newContent, 'utf8');
    console.log('Added updateChapter');
} else {
    console.log('updateChapter already exists');
}
