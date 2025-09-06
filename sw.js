// Service Worker للتطبيق الترجمة الفورية
const CACHE_NAME = 'voice-translate-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './translate.html',
  './settings.html',
  './welcome.html',
  './login.html',
  './styles.css',
  './script.js',
  './login-script.js',
  './login-styles.css',
  './manifest.json',
  './logo-new.svg',
  // External resources
  'https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;700;900&family=Noto+Sans:wght@400;500;700;900',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim();
    })
  );
});

// استراتيجية Cache First للملفات الثابتة
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // استراتيجية مختلفة للموارد المختلفة
  if (isStaticAsset(request.url)) {
    // Cache First للملفات الثابتة
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request.url)) {
    // Network First لطلبات API
    event.respondWith(networkFirst(request));
  } else {
    // Stale While Revalidate للصفحات
    event.respondWith(staleWhileRevalidate(request));
  }
});

// التحقق من الملفات الثابتة
function isStaticAsset(url) {
  return url.includes('.css') || 
         url.includes('.js') || 
         url.includes('.svg') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.jpeg') || 
         url.includes('.gif') || 
         url.includes('.woff') || 
         url.includes('.woff2') || 
         url.includes('fonts.googleapis.com') ||
         url.includes('cdn.tailwindcss.com');
}

// التحقق من طلبات API
function isAPIRequest(url) {
  return url.includes('/api/') || 
         url.includes('translate.googleapis.com') ||
         url.includes('api.mymemory.translated.net');
}

// استراتيجية Cache First
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache First failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

// استراتيجية Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Service unavailable', { status: 503 });
  }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('Network request failed:', error);
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// معالجة الرسائل من التطبيق الرئيسي
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// إشعارات Push (للمستقبل)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: './logo-new.svg',
            badge: './logo-new.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'فتح التطبيق',
          icon: './logo-new.svg'
        },
        {
          action: 'close',
          title: 'إغلاق'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('تطبيق الترجمة الفورية', options)
    );
  }
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// معالجة التحديثات التلقائية
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // مزامنة البيانات في الخلفية
  console.log('Background sync triggered');
}