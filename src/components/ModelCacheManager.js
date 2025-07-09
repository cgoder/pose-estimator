import { CONFIG } from '../utils/constants.js';
import { ErrorHandler } from '../utils/errorHandling.js';
import { performanceMonitor } from '../utils/performance.js';

/**
 * 模型缓存管理器
 * 提供内存缓存和IndexedDB持久化缓存功能
 */
export class ModelCacheManager {
    constructor() {
        this.modelCache = new Map(); // 内存缓存
        this.db = null; // IndexedDB实例
        this.cacheStats = {
            hits: 0,
            misses: 0,
            loads: 0
        };
    }
    
    /**
     * 初始化缓存管理器
     * @returns {Promise<void>}
     */
    async init() {
        await this.initDB();
    }
    
    /**
     * 初始化IndexedDB
     * @returns {Promise<void>}
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.CACHE.DB_NAME, CONFIG.CACHE.DB_VERSION);
            
            request.onerror = () => {
                console.warn('💾 IndexedDB初始化失败，将使用内存缓存');
                resolve(); // 不阻止应用启动
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('💾 IndexedDB初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建模型存储
                if (!db.objectStoreNames.contains(CONFIG.CACHE.STORE_NAME)) {
                    const store = db.createObjectStore(CONFIG.CACHE.STORE_NAME, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('version', 'version', { unique: false });
                }
            };
        });
    }
    
    /**
     * 生成缓存键
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @returns {string} 缓存键
     */
    _generateCacheKey(modelType, modelUrl) {
        return `${modelType}_${CONFIG.MODEL.CACHE_VERSION}_${btoa(modelUrl).slice(0, 16)}`;
    }
    
    /**
     * 检查缓存是否过期
     * @param {number} timestamp - 缓存时间戳
     * @returns {boolean} 是否过期
     */
    _isCacheExpired(timestamp) {
        const now = Date.now();
        const expiry = CONFIG.CACHE.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        return (now - timestamp) > expiry;
    }
    
    /**
     * 从内存缓存获取模型
     * @param {string} cacheKey - 缓存键
     * @returns {Object|null} 缓存的模型数据
     */
    _getFromMemoryCache(cacheKey) {
        const cached = this.modelCache.get(cacheKey);
        if (cached && !this._isCacheExpired(cached.timestamp)) {
            this.cacheStats.hits++;
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
     * @param {string} cacheKey - 缓存键
     * @param {Object} modelData - 模型数据
     */
    _setToMemoryCache(cacheKey, modelData) {
        // 检查内存缓存大小限制
        if (this.modelCache.size >= CONFIG.CACHE.MAX_MEMORY_CACHE_SIZE) {
            // 删除最旧的缓存项
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
     * 从IndexedDB获取模型
     * @param {string} cacheKey - 缓存键
     * @returns {Promise<Object|null>} 缓存的模型数据
     */
    async _getFromIndexedDB(cacheKey) {
        if (!this.db) return null;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readonly');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            const request = store.get(cacheKey);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && !this._isCacheExpired(result.timestamp)) {
                    this.cacheStats.hits++;
                    console.log(`🎯 IndexedDB缓存命中: ${cacheKey}`);
                    resolve(result);
                } else if (result) {
                    console.log(`⏰ IndexedDB缓存过期: ${cacheKey}`);
                    this._deleteFromIndexedDB(cacheKey);
                    resolve(null);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.warn(`❌ IndexedDB读取失败: ${cacheKey}`);
                resolve(null);
            };
        });
    }
    
    /**
     * 存储到IndexedDB
     * @param {string} cacheKey - 缓存键
     * @param {Object} modelData - 模型数据
     * @returns {Promise<void>}
     */
    async _setToIndexedDB(cacheKey, modelData) {
        if (!this.db) return;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            
            const cacheData = {
                key: cacheKey,
                ...modelData,
                timestamp: Date.now(),
                version: CONFIG.MODEL.CACHE_VERSION
            };
            
            const request = store.put(cacheData);
            
            request.onsuccess = () => {
                console.log(`💾 存储到IndexedDB: ${cacheKey}`);
                resolve();
            };
            
            request.onerror = () => {
                console.warn(`❌ IndexedDB存储失败: ${cacheKey}`);
                resolve();
            };
        });
    }
    
    /**
     * 从IndexedDB删除缓存
     * @param {string} cacheKey - 缓存键
     * @returns {Promise<void>}
     */
    async _deleteFromIndexedDB(cacheKey) {
        if (!this.db) return;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            const request = store.delete(cacheKey);
            
            request.onsuccess = () => {
                console.log(`🗑️ 从IndexedDB删除: ${cacheKey}`);
                resolve();
            };
            
            request.onerror = () => {
                console.warn(`❌ IndexedDB删除失败: ${cacheKey}`);
                resolve();
            };
        });
    }
    
    /**
     * 获取或创建模型
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<Object>} 模型实例
     */
    async getOrCreateModel(modelType, modelUrl, createModelFn) {
        const cacheKey = this._generateCacheKey(modelType, modelUrl);
        
        try {
            // 1. 尝试从内存缓存获取
            let cached = this._getFromMemoryCache(cacheKey);
            if (cached) {
                performanceMonitor.updateCacheHitRate(this.cacheStats.hits, this.cacheStats.hits + this.cacheStats.misses);
                return cached.model;
            }
            
            // 2. 尝试从IndexedDB获取
            cached = await this._getFromIndexedDB(cacheKey);
            if (cached) {
                // 恢复到内存缓存
                this._setToMemoryCache(cacheKey, { model: cached.model });
                performanceMonitor.updateCacheHitRate(this.cacheStats.hits, this.cacheStats.hits + this.cacheStats.misses);
                return cached.model;
            }
            
            // 3. 缓存未命中，创建新模型
            this.cacheStats.misses++;
            this.cacheStats.loads++;
            
            console.log(`🔄 加载新模型: ${modelType}`);
            const startTime = performance.now();
            
            const model = await ErrorHandler.retry(
                () => createModelFn(),
                3,
                1000
            );
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ 模型加载完成: ${modelType} (${loadTime.toFixed(1)}ms)`);
            
            // 4. 存储到缓存
            const modelData = { model, loadTime, modelType };
            this._setToMemoryCache(cacheKey, modelData);
            await this._setToIndexedDB(cacheKey, modelData);
            
            performanceMonitor.updateCacheHitRate(this.cacheStats.hits, this.cacheStats.hits + this.cacheStats.misses);
            return model;
            
        } catch (error) {
            this.cacheStats.misses++;
            throw ErrorHandler.createError('ModelCache', `模型缓存操作失败: ${error.message}`, error);
        }
    }
    
    /**
     * 预加载模型
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<void>}
     */
    async preloadModel(modelType, modelUrl, createModelFn) {
        const cacheKey = this._generateCacheKey(modelType, modelUrl);
        
        // 检查是否已缓存
        if (this._getFromMemoryCache(cacheKey) || await this._getFromIndexedDB(cacheKey)) {
            console.log(`✅ 模型已缓存: ${modelType}`);
            return;
        }
        
        try {
            console.log(`🔄 预加载模型: ${modelType}`);
            await this.getOrCreateModel(modelType, modelUrl, createModelFn);
            console.log(`✅ 模型预加载完成: ${modelType}`);
        } catch (error) {
            console.warn(`⚠️ 模型预加载失败: ${modelType}`, error);
            // 预加载失败不应阻止应用启动
        }
    }
    
    /**
     * 清理过期缓存
     * @returns {Promise<void>}
     */
    async cleanupExpiredCache() {
        // 清理内存缓存
        for (const [key, data] of this.modelCache.entries()) {
            if (this._isCacheExpired(data.timestamp)) {
                this.modelCache.delete(key);
                console.log(`🗑️ 清理过期内存缓存: ${key}`);
            }
        }
        
        // 清理IndexedDB缓存
        if (!this.db) return;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([CONFIG.CACHE.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CONFIG.CACHE.STORE_NAME);
            const index = store.index('timestamp');
            const request = index.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (this._isCacheExpired(cursor.value.timestamp)) {
                        cursor.delete();
                        console.log(`🗑️ 清理过期IndexedDB缓存: ${cursor.value.key}`);
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => {
                console.warn('❌ 清理IndexedDB缓存失败');
                resolve();
            };
        });
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 ?
            (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(1) : 0;
        
        return {
            ...this.cacheStats,
            hitRate: parseFloat(hitRate),
            memoryCacheSize: this.modelCache.size,
            dbConnected: !!this.db
        };
    }
    
    /**
     * 清空所有缓存
     * @returns {Promise<void>}
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
                    console.warn('❌ 清空IndexedDB失败');
                    resolve();
                };
            });
        }
        
        // 重置统计
        this.cacheStats = { hits: 0, misses: 0, loads: 0 };
    }
}

// 导出单例实例
export const modelCacheManager = new ModelCacheManager();