import { CONFIG } from '../utils/constants.js';
import { ErrorHandler } from '../utils/errorHandling.js';

/**
 * 简化的IndexedDB缓存管理器
 * 仅用作混合缓存策略的备用缓存
 */
export class IndexedDBCacheManager {
    constructor() {
        this.modelCache = new Map(); // 内存缓存
        this.db = null;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            loads: 0
        };
    }

    /**
     * 初始化IndexedDB
     */
    async init() {
        try {
            await this.initDB();
            console.log('✅ IndexedDB缓存管理器初始化完成');
        } catch (error) {
            console.warn('⚠️ IndexedDB初始化失败，仅使用内存缓存:', error);
        }
    }

    /**
     * 初始化数据库
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.CACHE.DB_NAME, CONFIG.CACHE.DB_VERSION);
            
            request.onerror = () => {
                console.warn('💾 IndexedDB初始化失败，将仅使用内存缓存');
                resolve(); // 不阻止应用启动
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('💾 IndexedDB连接成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(CONFIG.CACHE.STORE_NAME)) {
                    const store = db.createObjectStore(CONFIG.CACHE.STORE_NAME, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('💾 IndexedDB存储结构创建完成');
                }
            };
        });
    }

    /**
     * 获取或创建模型
     */
    async getOrCreateModel(modelType, modelUrl, createModelFn) {
        const cacheKey = this._generateCacheKey(modelType, modelUrl);
        
        try {
            // 1. 尝试从内存缓存获取
            let cached = this._getFromMemoryCache(cacheKey);
            if (cached) {
                this.cacheStats.hits++;
                return cached.model;
            }

            // 2. 检查IndexedDB中的元数据
            const metadata = await this._getMetadataFromIndexedDB(cacheKey);
            if (metadata) {
                console.log(`📋 发现缓存元数据，需要重新加载模型: ${modelType}`);
            }

            // 3. 加载新模型
            this.cacheStats.misses++;
            this.cacheStats.loads++;
            
            console.log(`🔄 加载模型: ${modelType}`);
            const startTime = performance.now();
            
            const model = await ErrorHandler.retry(() => createModelFn(), 3, 1000);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ 模型加载完成: ${modelType} (${loadTime.toFixed(1)}ms)`);

            // 4. 存储到缓存
            const modelData = { model, modelType, modelUrl };
            this._setToMemoryCache(cacheKey, modelData);
            await this._setMetadataToIndexedDB(cacheKey, { modelType, modelUrl });

            return model;
            
        } catch (error) {
            console.error(`❌ 模型加载失败: ${modelType}`, error);
            throw ErrorHandler.createError('Model', `模型加载失败: ${error.message}`, error);
        }
    }

    /**
     * 生成缓存键
     */
    _generateCacheKey(modelType, modelUrl) {
        const urlHash = btoa(modelUrl).slice(0, 16);
        return `${modelType}_${urlHash}_v${CONFIG.MODEL.CACHE_VERSION}`;
    }

    /**
     * 从内存缓存获取
     */
    _getFromMemoryCache(cacheKey) {
        const cached = this.modelCache.get(cacheKey);
        if (cached && !this._isCacheExpired(cached.timestamp)) {
            console.log(`🎯 内存缓存命中: ${cacheKey}`);
            return cached;
        }
        
        if (cached) {
            this.modelCache.delete(cacheKey);
            console.log(`⏰ 内存缓存过期: ${cacheKey}`);
        }
        
        return null;
    }

    /**
     * 存储到内存缓存
     */
    _setToMemoryCache(cacheKey, modelData) {
        // 检查内存缓存大小限制
        if (this.modelCache.size >= CONFIG.CACHE.MAX_MEMORY_CACHE_SIZE) {
            const oldestKey = this.modelCache.keys().next().value;
            this.modelCache.delete(oldestKey);
            console.log(`🗑️ 内存缓存已满，删除: ${oldestKey}`);
        }
        
        const cacheData = {
            ...modelData,
            timestamp: Date.now(),
            version: CONFIG.MODEL.CACHE_VERSION
        };
        
        this.modelCache.set(cacheKey, cacheData);
        console.log(`💾 存储到内存缓存: ${cacheKey}`);
    }

    /**
     * 从IndexedDB获取元数据
     */
    async _getMetadataFromIndexedDB(cacheKey) {
        if (!this.db) return null;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            const request = store.get(cacheKey);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && !this._isCacheExpired(result.timestamp)) {
                    console.log(`📋 IndexedDB元数据命中: ${cacheKey}`);
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.warn(`⚠️ IndexedDB读取失败: ${cacheKey}`);
                resolve(null);
            };
        });
    }

    /**
     * 存储元数据到IndexedDB
     */
    async _setMetadataToIndexedDB(cacheKey, metadata) {
        if (!this.db) return;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            
            const cacheData = {
                key: cacheKey,
                ...metadata,
                timestamp: Date.now(),
                version: CONFIG.MODEL.CACHE_VERSION
            };
            
            const request = store.put(cacheData);
            
            request.onsuccess = () => {
                console.log(`📋 元数据存储到IndexedDB: ${cacheKey}`);
                resolve();
            };
            
            request.onerror = () => {
                console.warn(`⚠️ IndexedDB存储失败: ${cacheKey}`);
                resolve();
            };
        });
    }

    /**
     * 检查缓存是否过期
     */
    _isCacheExpired(timestamp) {
        const now = Date.now();
        const expiry = CONFIG.CACHE.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        return (now - timestamp) > expiry;
    }

    /**
     * 预加载模型
     */
    async preloadModel(modelType, modelUrl, createModelFn) {
        const cacheKey = this._generateCacheKey(modelType, modelUrl);
        
        // 检查是否已缓存
        if (this._getFromMemoryCache(cacheKey) || await this._getMetadataFromIndexedDB(cacheKey)) {
            console.log(`✅ 模型已缓存，跳过预加载: ${modelType}`);
            return;
        }
        
        try {
            await this.getOrCreateModel(modelType, modelUrl, createModelFn);
            console.log(`✅ 模型预加载完成: ${modelType}`);
        } catch (error) {
            console.warn(`⚠️ 模型预加载失败: ${modelType}`, error);
        }
    }

    /**
     * 清理过期缓存
     */
    async cleanupExpiredCache() {
        // 清理内存缓存
        for (const [key, data] of this.modelCache.entries()) {
            if (this._isCacheExpired(data.timestamp)) {
                this.modelCache.delete(key);
                console.log(`🗑️ 清理过期内存缓存: ${key}`);
            }
        }
        
        // 清理IndexedDB
        if (this.db) {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
                const request = store.openCursor();
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const data = cursor.value;
                        if (this._isCacheExpired(data.timestamp)) {
                            cursor.delete();
                            console.log(`🗑️ 清理过期IndexedDB缓存: ${data.key}`);
                        }
                        cursor.continue();
                    } else {
                        console.log('✅ 过期缓存清理完成');
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    console.warn('⚠️ 清理过期缓存失败');
                    resolve();
                };
            });
        }
    }

    /**
     * 获取缓存统计
     */
    getStats() {
        const memorySize = this.modelCache.size;
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 ? 
            (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(1) : 0;
        
        return {
            type: 'IndexedDB + Memory',
            memoryCache: memorySize,
            metadataCache: 'N/A',
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            loads: this.cacheStats.loads,
            hitRate: `${hitRate}%`,
            note: '模型对象仅存储在内存中，IndexedDB存储元数据'
        };
    }

    /**
     * 清空所有缓存
     */
    async clearAll() {
        // 清空内存缓存
        this.modelCache.clear();
        
        // 清空IndexedDB
        if (this.db) {
            return new Promise((resolve) => {
                const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('🗑️ 所有缓存已清空');
                    resolve();
                };
                
                request.onerror = () => {
                    console.warn('⚠️ 清空缓存失败');
                    resolve();
                };
            });
        }
        
        console.log('🗑️ 内存缓存已清空');
    }
}