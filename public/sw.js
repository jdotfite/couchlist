const CACHE_NAME = 'flicklog-v3';
const OFFLINE_URL = '/offline';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-flicklog.svg',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/placeholders/place-holder-1.jpg',
  '/placeholders/place-holder-2.jpg',
  '/placeholders/place-holder-3.jpg',
  '/placeholders/place-holder-4.jpg',
  '/placeholders/place-holder-5.jpg',
  '/placeholders/place-holder-6.jpg',
  '/placeholders/place-holder-7.jpg',
  '/placeholders/place-holder-8.jpg',
  '/placeholders/place-holder-9.jpg',
  '/placeholders/place-holder-10.jpg',
  '/placeholders/place-holder-11.jpg',
  '/placeholders/place-holder-12.jpg',
  '/pwa/android/android-launchericon-144-144.png',
  '/pwa/android/android-launchericon-192-192.png',
  '/pwa/android/android-launchericon-48-48.png',
  '/pwa/android/android-launchericon-512-512.png',
  '/pwa/android/android-launchericon-72-72.png',
  '/pwa/android/android-launchericon-96-96.png',
  '/pwa/icons.json',
  '/pwa/ios/100.png',
  '/pwa/ios/1024.png',
  '/pwa/ios/114.png',
  '/pwa/ios/120.png',
  '/pwa/ios/128.png',
  '/pwa/ios/144.png',
  '/pwa/ios/152.png',
  '/pwa/ios/16.png',
  '/pwa/ios/167.png',
  '/pwa/ios/180.png',
  '/pwa/ios/192.png',
  '/pwa/ios/20.png',
  '/pwa/ios/256.png',
  '/pwa/ios/29.png',
  '/pwa/ios/32.png',
  '/pwa/ios/40.png',
  '/pwa/ios/50.png',
  '/pwa/ios/512.png',
  '/pwa/ios/57.png',
  '/pwa/ios/58.png',
  '/pwa/ios/60.png',
  '/pwa/ios/64.png',
  '/pwa/ios/72.png',
  '/pwa/ios/76.png',
  '/pwa/ios/80.png',
  '/pwa/ios/87.png',
  '/pwa/windows11/LargeTile.scale-100.png',
  '/pwa/windows11/LargeTile.scale-125.png',
  '/pwa/windows11/LargeTile.scale-150.png',
  '/pwa/windows11/LargeTile.scale-200.png',
  '/pwa/windows11/LargeTile.scale-400.png',
  '/pwa/windows11/SmallTile.scale-100.png',
  '/pwa/windows11/SmallTile.scale-125.png',
  '/pwa/windows11/SmallTile.scale-150.png',
  '/pwa/windows11/SmallTile.scale-200.png',
  '/pwa/windows11/SmallTile.scale-400.png',
  '/pwa/windows11/SplashScreen.scale-100.png',
  '/pwa/windows11/SplashScreen.scale-125.png',
  '/pwa/windows11/SplashScreen.scale-150.png',
  '/pwa/windows11/SplashScreen.scale-200.png',
  '/pwa/windows11/SplashScreen.scale-400.png',
  '/pwa/windows11/Square150x150Logo.scale-100.png',
  '/pwa/windows11/Square150x150Logo.scale-125.png',
  '/pwa/windows11/Square150x150Logo.scale-150.png',
  '/pwa/windows11/Square150x150Logo.scale-200.png',
  '/pwa/windows11/Square150x150Logo.scale-400.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-16.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-20.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-24.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-256.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-30.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-32.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-36.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-40.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-44.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-48.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-60.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-64.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-72.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-80.png',
  '/pwa/windows11/Square44x44Logo.altform-lightunplated_targetsize-96.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-16.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-20.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-24.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-256.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-30.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-32.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-36.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-40.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-44.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-48.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-60.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-64.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-72.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-80.png',
  '/pwa/windows11/Square44x44Logo.altform-unplated_targetsize-96.png',
  '/pwa/windows11/Square44x44Logo.scale-100.png',
  '/pwa/windows11/Square44x44Logo.scale-125.png',
  '/pwa/windows11/Square44x44Logo.scale-150.png',
  '/pwa/windows11/Square44x44Logo.scale-200.png',
  '/pwa/windows11/Square44x44Logo.scale-400.png',
  '/pwa/windows11/Square44x44Logo.targetsize-16.png',
  '/pwa/windows11/Square44x44Logo.targetsize-20.png',
  '/pwa/windows11/Square44x44Logo.targetsize-24.png',
  '/pwa/windows11/Square44x44Logo.targetsize-256.png',
  '/pwa/windows11/Square44x44Logo.targetsize-30.png',
  '/pwa/windows11/Square44x44Logo.targetsize-32.png',
  '/pwa/windows11/Square44x44Logo.targetsize-36.png',
  '/pwa/windows11/Square44x44Logo.targetsize-40.png',
  '/pwa/windows11/Square44x44Logo.targetsize-44.png',
  '/pwa/windows11/Square44x44Logo.targetsize-48.png',
  '/pwa/windows11/Square44x44Logo.targetsize-60.png',
  '/pwa/windows11/Square44x44Logo.targetsize-64.png',
  '/pwa/windows11/Square44x44Logo.targetsize-72.png',
  '/pwa/windows11/Square44x44Logo.targetsize-80.png',
  '/pwa/windows11/Square44x44Logo.targetsize-96.png',
  '/pwa/windows11/StoreLogo.scale-100.png',
  '/pwa/windows11/StoreLogo.scale-125.png',
  '/pwa/windows11/StoreLogo.scale-150.png',
  '/pwa/windows11/StoreLogo.scale-200.png',
  '/pwa/windows11/StoreLogo.scale-400.png',
  '/pwa/windows11/Wide310x150Logo.scale-100.png',
  '/pwa/windows11/Wide310x150Logo.scale-125.png',
  '/pwa/windows11/Wide310x150Logo.scale-150.png',
  '/pwa/windows11/Wide310x150Logo.scale-200.png',
  '/pwa/windows11/Wide310x150Logo.scale-400.png',
];


// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests - always go to network
  if (event.request.url.includes('/api/')) return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If it's a navigation request, return the cached home page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline', { status: 503 });
        });
      })
  );
});
