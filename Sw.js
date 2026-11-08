/* ============================================================
   نظم‌یار — Service Worker
   کش آفلاین + قابل‌نصب شدن به‌عنوان PWA
   هر بار فایل‌های اپ را تغییر دادی، نسخه (v1 → v2) را بالا ببر.
   ============================================================ */

const CACHE = 'nazmyar-v1';

/* فایل‌هایی که برای باز شدن آفلاین لازم‌اند.
   اگر از SVG استفاده می‌کنی، خط‌های PNG را حذف و خط SVG را نگه دار. */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg'
];

/* ---------- نصب: دانلود و کش فایل‌ها ---------- */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ---------- فعال‌سازی: پاک‌سازی کش نسخه‌های قدیمی ---------- */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- رهگیری درخواست‌ها ---------- */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  /* ۱) فونت‌های گوگل: Stale-While-Revalidate
     اگر در کش هست فوراً بده، همزمان از شبکه هم به‌روز کن. */
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(e.request);
        const fetching = fetch(e.request)
          .then((r) => {
            if (r && r.ok) c.put(e.request, r.clone());
            return r;
          })
          .catch(() => cached);
        return cached || fetching;
      })
    );
    return;
  }

  /* ۲) بقیه‌ی فایل‌ها: Cache-First
     اول کش، بعد شبکه، اگر هیچکدام نبود index.html (تا اپ حداقل باز شود). */
  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
