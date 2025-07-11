const CACHE_NAME = 'pose-estimator-v1.1.0';
const STATIC_CACHE = 'pose-estimator-static-v1.1.0';
const DYNAMIC_CACHE = 'pose-estimator-dynamic-v1.1.0';
const MODEL_CACHE = 'pose-estimator-models-v1.1.0';

// 静态资源缓存列表
const staticAssets = [
  '/main.html',
  '/manifest.json',
  '/src/main.js',
  '/src/utils/eventBus.js',
  '/src/utils/constants.js',
  '/src/utils/errorHandling.js',
  '/src/utils/performance.js',
  '/src/ai/index.js'
];

// 动态加载的TensorFlow.js模块
const tensorflowModules = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.15.0/dist/tf-core.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.15.0/dist/tf-converter.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.15.0/dist/tf-backend-webgl.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.0/dist/pose-detection.min.js'
];

// 缓存策略配置
const cacheStrategies = {
  static: 'cache-first',
  dynamic: 'network-first',
  models: 'cache-first',
  tensorflow: 'stale-while-revalidate'
};

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Service Worker: 缓存静态资源');
          return cache.addAll(staticAssets);
        }),
      // 预缓存TensorFlow.js模块（可选）
      caches.open(MODEL_CACHE)
        .then(cache => {
          console.log('Service Worker: 预缓存TensorFlow.js模块');
          // 只预缓存核心模块，其他按需加载
          return cache.addAll(tensorflowModules.slice(0, 2));
        })
    ])
    .catch(error => {
      console.error('Service Worker: 缓存失败', error);
    })
  );
  
  // 强制激活新的Service Worker
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then(cacheNames => {
        const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, MODEL_CACHE];
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!validCaches.includes(cacheName)) {
              console.log('Service Worker: 删除旧缓存', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim()
    ])
  );
});

// 拦截网络请求 - 智能缓存策略
self.addEventListener('fetch', event => {
  // 跳过非GET请求、chrome-extension请求和特殊协议
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.includes('tfhub.dev')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // 静态资源 - 缓存优先策略
  if (isStaticAsset(event.request.url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }
  
  // TensorFlow.js模块 - 陈旧时重新验证策略
  if (isTensorFlowModule(event.request.url)) {
    event.respondWith(staleWhileRevalidate(event.request, MODEL_CACHE));
    return;
  }
  
  // 应用JS文件 - 网络优先策略
  if (isAppScript(event.request.url)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }
  
  // 其他资源 - 网络优先策略
  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
});

// ==================== 缓存策略实现 ====================

/**
 * 缓存优先策略
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Service Worker: 网络请求失败', error);
    throw error;
  }
}

/**
 * 网络优先策略
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('Service Worker: 使用缓存回退', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * 陈旧时重新验证策略
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // 后台更新缓存
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.warn('Service Worker: 后台更新失败', error);
  });
  
  // 如果有缓存，立即返回；否则等待网络请求
  return cached || fetchPromise;
}

// ==================== 辅助函数 ====================

/**
 * 判断是否为静态资源
 */
function isStaticAsset(url) {
  return staticAssets.some(asset => url.includes(asset)) ||
         url.includes('/manifest.json') ||
         url.includes('.html');
}

/**
 * 判断是否为TensorFlow.js模块
 */
function isTensorFlowModule(url) {
  return tensorflowModules.some(module => url.includes(module)) ||
         url.includes('cdn.jsdelivr.net') && 
         (url.includes('tensorflow') || url.includes('pose-detection'));
}

/**
 * 判断是否为应用脚本
 */
function isAppScript(url) {
  return url.includes('/src/') && url.endsWith('.js') && 
         !url.includes('cdn.jsdelivr.net');
}

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