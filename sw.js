const CACHE_NAME = 'pose-estimator-v1.0.1';
const urlsToCache = [
  '/main.html',
  '/main.js',
  '/oneEuroFilter.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection'
];

// 安装事件 - 缓存资源
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存文件');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: 缓存失败', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  // 跳过非GET请求和chrome-extension请求
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 对于JS文件，使用网络优先策略确保获取最新版本
  if (event.request.url.endsWith('.js') && !event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 如果网络请求成功，更新缓存并返回
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
          // 网络失败时回退到缓存
          return caches.match(event.request);
        })
        .catch(() => {
          // 网络完全失败时使用缓存
          return caches.match(event.request);
        })
    );
    return;
  }

  // 对于其他资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，直接返回
        if (response) {
          return response;
        }

        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应，因为响应流只能使用一次
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Service Worker: 网络请求失败', error);
            // 可以返回一个默认的离线页面
            throw error;
          });
      })
  );
});

// 处理消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 处理强制刷新缓存请求
  if (event.data && event.data.type === 'FORCE_REFRESH') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Service Worker: 缓存已清除，正在重新加载...');
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});