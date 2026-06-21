const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12344444';

const DATA_ROOT = process.env.DATA_ROOT || __dirname;
const UPLOADS_DIR = path.join(DATA_ROOT, 'uploads');
const DATA_FILE = path.join(DATA_ROOT, 'data', 'cakes.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error('صيغة الصورة غير مدعومة'), ok);
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true }));

const readCakes = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const writeCakes = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

function requireAuth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة السر غير صحيحة' });
  next();
}

const sseClients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) { try { c.write(msg); } catch {} }
}

app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  sseClients.add(res);
  req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
});

app.get('/api/cakes', (req, res) => res.json(readCakes()));

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'كلمة السر غير صحيحة' });
});

app.post('/api/cakes', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'الصورة مطلوبة' });
  const cakes = readCakes();
  const cake = {
    id: Date.now().toString(),
    name: (req.body.name || '').trim() || 'كيكة',
    description: (req.body.description || '').trim(),
    price: (req.body.price || '').trim(),
    category: (req.body.category || 'كيك').trim(),
    image: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString(),
  };
  cakes.unshift(cake);
  writeCakes(cakes);
  broadcast('add', cake);
  res.json(cake);
});

app.delete('/api/cakes/:id', requireAuth, (req, res) => {
  const cakes = readCakes();
  const idx = cakes.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'غير موجود' });
  const [removed] = cakes.splice(idx, 1);
  const filePath = path.join(DATA_ROOT, removed.image);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeCakes(cakes);
  broadcast('delete', { id: removed.id });
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'خطأ في الخادم' });
});

app.listen(PORT, () => {
  console.log(`\n  Poshe Sweet & More`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → http://localhost:${PORT}/dashboard.html\n`);
});
