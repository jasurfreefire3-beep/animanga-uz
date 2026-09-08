const fs = require('fs');
const content = fs.readFileSync('./server.ts', 'utf8');

const route = `
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
`;

if (!content.includes('app.put(\'/api/chapters/:id\'')) {
    const splitIndex = content.indexOf('app.patch(\'/api/chapters/:id/price\'');
    const newContent = content.slice(0, splitIndex) + route + '\n' + content.slice(splitIndex);
    fs.writeFileSync('./server.ts', newContent, 'utf8');
    console.log('Added PUT /api/chapters/:id route');
} else {
    console.log('Route already exists');
}
