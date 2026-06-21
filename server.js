const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12344444';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data', 'cakes.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

const readCakes = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const writeCakes = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

function requireAuth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة السر غير صحيحة' });
  next();
}

app.get('/api/cakes', (req, res) => {
  res.json(readCakes());
});

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
  res.json(cake);
});

app.delete('/api/cakes/:id', requireAuth, (req, res) => {
  const cakes = readCakes();
  const idx = cakes.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'غير موجود' });
  const [removed] = cakes.splice(idx, 1);
  const filePath = path.join(__dirname, removed.image);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeCakes(cakes);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'خطأ في الخادم' });
});

app.listen(PORT, () => {
  console.log(`\n  Poshe Sweet & More`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → http://localhost:${PORT}/dashboard.html  (كلمة السر: ${ADMIN_PASSWORD})\n`);
});
