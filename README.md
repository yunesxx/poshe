# Poshe — Sweet & More

موقع منيو الكيك + لوحة تحكم لرفع الصور.

## التشغيل محلياً

```bash
npm install
npm start
```

ثم افتح: http://localhost:3000

لوحة التحكم: 5 ضغطات على اللوغو (أو رابط مباشر `/dashboard.html`).

## كلمة سر لوحة التحكم

تُضبط من متغيّر بيئة `ADMIN_PASSWORD`. القيمة الافتراضية: `12344444`.

أنشئ ملف `.env` بناءً على `.env.example` وضع كلمة السر فيه.

## النشر على سيرفر حقيقي

### الخيار 1: VPS (Ubuntu / DigitalOcean / Hetzner …)

```bash
# 1) ارفع الملفات إلى السيرفر (مثلاً عبر scp / git)
# 2) نصّب Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3) داخل مجلد المشروع
npm install --omit=dev
export ADMIN_PASSWORD="ضع_كلمة_سر_قوية"
export PORT=3000

# 4) شغّل دائماً عبر PM2
sudo npm install -g pm2
pm2 start server.js --name poshe
pm2 startup && pm2 save
```

ثم اربط دومين عبر Nginx reverse proxy على البورت 3000.

### الخيار 2: Render / Railway / Fly.io (الأسهل)

1. ارفع المجلد إلى GitHub.
2. اربطه بـ Render أو Railway.
3. **Start command:** `node server.js`
4. **Environment variables:** `ADMIN_PASSWORD=...`
5. تأكد أن مجلدات `uploads/` و `data/` على **قرص دائم (persistent disk)** وإلا ستُمسح الصور عند كل نشر.

### الخيار 3: Docker

```bash
docker build -t poshe .
docker run -d -p 3000:3000 \
  -e ADMIN_PASSWORD="ضع_كلمة_سر_قوية" \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/data:/app/data \
  --name poshe poshe
```

## ملاحظات هامة قبل النشر

- **غيّر كلمة السر** من القيمة الافتراضية.
- الصور تُخزّن في `uploads/` والبيانات في `data/cakes.json` — اعملوا نسخة احتياطية دورية.
- لاستخدام **HTTPS** ضعوا Nginx/Caddy أمام التطبيق (Render/Railway تعطيك HTTPS تلقائياً).

## بنية المشروع

```
poshe-sweet/
├── server.js
├── package.json
├── Dockerfile
├── .env.example
├── public/        ← الواجهة (HTML/CSS/JS)
├── uploads/       ← صور الكيك (تحفظ على القرص)
└── data/          ← cakes.json
```
