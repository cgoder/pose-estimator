/**
 * 缓存管理器模块
 * 负责模型、数据和资源的缓存管理，提供高效的存储和检索机制
 */

import { Logger } from './Logger.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

export class CacheManager {
    constructor(options = {}) {
        this.logger = new Logger('CacheManager');
        this.performanceMonitor = new PerformanceMonitor();
        
        // 缓存配置
        this.config = {
            // 内存缓存设置
            maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
            maxItems: options.maxItems || 1000,
            
            // TTL设置（毫秒）
            defaultTTL: options.defaultTTL || 30 * 60 * 1000, // 30分钟
            modelTTL: options.modelTTL || 60 * 60 * 1000, // 1小时
            dataTTL: options.dataTTL || 10 * 60 * 1000, // 10分钟
            
            // 清理设置
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5分钟
            enableAutoCleanup: options.enableAutoCleanup !== false,
            
            // 压缩设置
            enableCompression: options.enableCompression !== false,
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            
            // 持久化设置
            enablePersistence: options.enablePersistence !== false,
            persistencePrefix: options.persistencePrefix || 'pose_estimator_cache_',
            
            // 性能设置
            enableMetrics: options.enableMetrics !== false,
            enableLRU: options.enableLRU !== false,
            
            ...options
        };
        
        // 内存缓存存储
        this.memoryCache = new Map();
        
        // LRU访问顺序跟踪
        this.accessOrder = new Map();
        
        // 缓存统计
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            compressions: 0,
            decompressions: 0,
            persistenceWrites: 0,
            persistenceReads: 0,
            totalSize: 0,
            itemCount: 0
        };
        
        // 缓存类型定义
        this.cacheTypes = {
            MODEL: 'model',
            POSE_DATA: 'pose_data',
            FILTER_STATE: 'filter_state',
            ANALYSIS_RESULT: 'analysis_result',
            CONFIG: 'config',
            TEMP: 'temp'
        };
        
        // 清理定时器
        this.cleanupTimer = null;
        
        this.init();
    }
    
    /**
     * 初始化缓存管理器
     */
    init() {
        // 启动自动清理
        if (this.config.enableAutoCleanup) {
            this.startAutoCleanup();
        }
        
        // 从持久化存储恢复缓存
        if (this.config.enablePersistence) {
            this.loadFromPersistence();
        }
        
        // 监听页面卸载事件
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.saveToPersistence();
            });
        }
        
        this.logger.info('缓存管理器已初始化', this.config);
    }
    
    /**
     * 设置缓存项
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {Object} options - 选项
     * @returns {boolean} 是否设置成功
     */
    set(key, value, options = {}) {
        try {
            const startTime = performance.now();
            
            const cacheItem = this.createCacheItem(key, value, options);
            
            // 检查内存限制
            if (!this.checkMemoryLimits(cacheItem)) {
                this.evictItems();
                
                // 再次检查
                if (!this.checkMemoryLimits(cacheItem)) {
                    this.logger.warn('缓存项过大，无法存储', { key, size: cacheItem.size });
                    return false;
                }
            }
            
            // 存储到内存缓存
            this.memoryCache.set(key, cacheItem);
            
            // 更新LRU访问顺序
            if (this.config.enableLRU) {
                this.updateAccessOrder(key);
            }
            
            // 更新统计
            this.stats.sets++;
            this.stats.itemCount = this.memoryCache.size;
            this.updateTotalSize();
            
            // 持久化（如果需要）
            if (this.config.enablePersistence && cacheItem.persistent) {
                this.saveToPersistence(key, cacheItem);
            }
            
            const duration = performance.now() - startTime;
            this.performanceMonitor.recordOperation('cache_set', duration);
            
            this.logger.debug('缓存项已设置', { key, size: cacheItem.size, ttl: cacheItem.ttl });
            return true;
            
        } catch (error) {
            this.logger.error('设置缓存项失败:', error, { key });
            return false;
        }
    }
    
    /**
     * 获取缓存项
     * @param {string} key - 缓存键
     * @returns {*} 缓存值或null
     */
    get(key) {
        try {
            const startTime = performance.now();
            
            const cacheItem = this.memoryCache.get(key);
            
            if (!cacheItem) {
                this.stats.misses++;
                
                // 尝试从持久化存储加载
                if (this.config.enablePersistence) {
                    const persistedItem = this.loadFromPersistence(key);
                    if (persistedItem) {
                        this.memoryCache.set(key, persistedItem);
                        this.stats.hits++;
                        this.stats.persistenceReads++;
                        return this.deserializeValue(persistedItem.value, persistedItem.compressed);
                    }
                }
                
                return null;
            }
            
            // 检查TTL
            if (this.isExpired(cacheItem)) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }
            
            // 更新访问时间和LRU顺序
            cacheItem.lastAccessed = Date.now();
            cacheItem.accessCount++;
            
            if (this.config.enableLRU) {
                this.updateAccessOrder(key);
            }
            
            this.stats.hits++;
            
            const duration = performance.now() - startTime;
            this.performanceMonitor.recordOperation('cache_get', duration);
            
            // 反序列化值
            const value = this.deserializeValue(cacheItem.value, cacheItem.compressed);
            
            this.logger.debug('缓存命中', { key, accessCount: cacheItem.accessCount });
            return value;
            
        } catch (error) {
            this.logger.error('获取缓存项失败:', error, { key });
            this.stats.misses++;
            return null;
        }
    }
    
    /**
     * 删除缓存项
     * @param {string} key - 缓存键
     * @returns {boolean} 是否删除成功
     */
    delete(key) {
        try {
            const deleted = this.memoryCache.delete(key);
            
            if (deleted) {
                this.accessOrder.delete(key);
                this.stats.deletes++;
                this.stats.itemCount = this.memoryCache.size;
                this.updateTotalSize();
                
                // 从持久化存储删除
                if (this.config.enablePersistence) {
                    this.removeFromPersistence(key);
                }
                
                this.logger.debug('缓存项已删除', { key });
            }
            
            return deleted;
            
        } catch (error) {
            this.logger.error('删除缓存项失败:', error, { key });
            return false;
        }
    }
    
    /**
     * 检查缓存项是否存在
     * @param {string} key - 缓存键
     * @returns {boolean} 是否存在
     */
    has(key) {
        const cacheItem = this.memoryCache.get(key);
        return cacheItem && !this.isExpired(cacheItem);
    }
    
    /**
     * 清空缓存
     * @param {string} type - 缓存类型（可选）
     */
    clear(type = null) {
        try {
            if (type) {
                // 清空特定类型的缓存
                const keysToDelete = [];
                for (const [key, item] of this.memoryCache) {
                    if (item.type === type) {
                        keysToDelete.push(key);
                    }
                }
                
                keysToDelete.forEach(key => this.delete(key));
                this.logger.info(`已清空${type}类型缓存`, { count: keysToDelete.length });
                
            } else {
                // 清空所有缓存
                this.memoryCache.clear();
                this.accessOrder.clear();
                
                // 重置统计
                this.stats.itemCount = 0;
                this.stats.totalSize = 0;
                
                // 清空持久化存储
                if (this.config.enablePersistence) {
                    this.clearPersistence();
                }
                
                this.logger.info('已清空所有缓存');
            }
            
        } catch (error) {
            this.logger.error('清空缓存失败:', error);
        }
    }
    
    /**
     * 创建缓存项
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {Object} options - 选项
     * @returns {Object} 缓存项
     */
    createCacheItem(key, value, options) {
        const now = Date.now();
        const type = options.type || this.cacheTypes.TEMP;
        
        // 确定TTL
        let ttl = options.ttl;
        if (!ttl) {
            switch (type) {
                case this.cacheTypes.MODEL:
                    ttl = this.config.modelTTL;
                    break;
                case this.cacheTypes.POSE_DATA:
                case this.cacheTypes.ANALYSIS_RESULT:
                    ttl = this.config.dataTTL;
                    break;
                default:
                    ttl = this.config.defaultTTL;
            }
        }
        
        // 序列化和压缩值
        const { serializedValue, compressed, size } = this.serializeValue(value);
        
        return {
            key,
            value: serializedValue,
            type,
            size,
            compressed,
            persistent: options.persistent !== false,
            priority: options.priority || 0,
            ttl,
            createdAt: now,
            lastAccessed: now,
            expiresAt: ttl > 0 ? now + ttl : null,
            accessCount: 0,
            metadata: options.metadata || {}
        };
    }
    
    /**
     * 序列化值
     * @param {*} value - 原始值
     * @returns {Object} 序列化结果
     */
    serializeValue(value) {
        try {
            let serialized = JSON.stringify(value);
            let compressed = false;
            let size = new Blob([serialized]).size;
            
            // 压缩大数据
            if (this.config.enableCompression && size > this.config.compressionThreshold) {
                // 简单的压缩模拟（实际应用中可使用LZ4、Gzip等）
                serialized = this.compress(serialized);
                compressed = true;
                size = new Blob([serialized]).size;
                this.stats.compressions++;
            }
            
            return { serializedValue: serialized, compressed, size };
            
        } catch (error) {
            this.logger.error('序列化值失败:', error);
            throw error;
        }
    }
    
    /**
     * 反序列化值
     * @param {string} serializedValue - 序列化的值
     * @param {boolean} compressed - 是否压缩
     * @returns {*} 原始值
     */
    deserializeValue(serializedValue, compressed) {
        try {
            let value = serializedValue;
            
            if (compressed) {
                value = this.decompress(value);
                this.stats.decompressions++;
            }
            
            return JSON.parse(value);
            
        } catch (error) {
            this.logger.error('反序列化值失败:', error);
            throw error;
        }
    }
    
    /**
     * 简单压缩（示例实现）
     * @param {string} data - 数据
     * @returns {string} 压缩后的数据
     */
    compress(data) {
        // 这里使用简单的RLE压缩作为示例
        // 实际应用中应使用更高效的压缩算法
        return data.replace(/(.)\1+/g, (match, char) => {
            return char + match.length;
        });
    }
    
    /**
     * 简单解压缩（示例实现）
     * @param {string} data - 压缩的数据
     * @returns {string} 解压缩后的数据
     */
    decompress(data) {
        // 对应compress方法的解压缩
        return data.replace(/(.)\d+/g, (match, char) => {
            const count = parseInt(match.slice(1));
            return char.repeat(count);
        });
    }
    
    /**
     * 检查内存限制
     * @param {Object} newItem - 新缓存项
     * @returns {boolean} 是否在限制内
     */
    checkMemoryLimits(newItem) {
        const currentSize = this.stats.totalSize;
        const currentCount = this.stats.itemCount;
        
        return (currentSize + newItem.size <= this.config.maxMemorySize) &&
               (currentCount + 1 <= this.config.maxItems);
    }
    
    /**
     * 驱逐缓存项
     */
    evictItems() {
        const itemsToEvict = [];
        
        if (this.config.enableLRU) {
            // LRU驱逐策略
            const sortedByAccess = Array.from(this.accessOrder.entries())
                .sort((a, b) => a[1] - b[1])
                .map(([key]) => key);
            
            // 驱逐最少使用的项目
            const evictCount = Math.max(1, Math.floor(this.memoryCache.size * 0.1));
            itemsToEvict.push(...sortedByAccess.slice(0, evictCount));
            
        } else {
            // 基于优先级和过期时间的驱逐策略
            const items = Array.from(this.memoryCache.entries())
                .map(([key, item]) => ({ key, ...item }))
                .sort((a, b) => {
                    // 优先驱逐过期的项目
                    if (this.isExpired(a) && !this.isExpired(b)) return -1;
                    if (!this.isExpired(a) && this.isExpired(b)) return 1;
                    
                    // 然后按优先级排序
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    
                    // 最后按访问时间排序
                    return a.lastAccessed - b.lastAccessed;
                });
            
            const evictCount = Math.max(1, Math.floor(items.length * 0.1));
            itemsToEvict.push(...items.slice(0, evictCount).map(item => item.key));
        }
        
        // 执行驱逐
        itemsToEvict.forEach(key => {
            this.delete(key);
            this.stats.evictions++;
        });
        
        this.logger.debug('已驱逐缓存项', { count: itemsToEvict.length });
    }
    
    /**
     * 检查缓存项是否过期
     * @param {Object} item - 缓存项
     * @returns {boolean} 是否过期
     */
    isExpired(item) {
        return item.expiresAt && Date.now() > item.expiresAt;
    }
    
    /**
     * 更新LRU访问顺序
     * @param {string} key - 缓存键
     */
    updateAccessOrder(key) {
        this.accessOrder.set(key, Date.now());
    }
    
    /**
     * 更新总大小统计
     */
    updateTotalSize() {
        let totalSize = 0;
        for (const item of this.memoryCache.values()) {
            totalSize += item.size;
        }
        this.stats.totalSize = totalSize;
    }
    
    /**
     * 启动自动清理
     */
    startAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        this.logger.debug('自动清理已启动', { interval: this.config.cleanupInterval });
    }
    
    /**
     * 停止自动清理
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            this.logger.debug('自动清理已停止');
        }
    }
    
    /**
     * 清理过期项目
     */
    cleanup() {
        const expiredKeys = [];
        
        for (const [key, item] of this.memoryCache) {
            if (this.isExpired(item)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        if (expiredKeys.length > 0) {
            this.logger.debug('清理过期缓存项', { count: expiredKeys.length });
        }
    }
    
    /**
     * 保存到持久化存储
     * @param {string} key - 缓存键（可选）
     * @param {Object} item - 缓存项（可选）
     */
    saveToPersistence(key = null, item = null) {
        if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            if (key && item) {
                // 保存单个项目
                if (item.persistent) {
                    const storageKey = this.config.persistencePrefix + key;
                    localStorage.setItem(storageKey, JSON.stringify(item));
                    this.stats.persistenceWrites++;
                }
            } else {
                // 保存所有持久化项目
                for (const [cacheKey, cacheItem] of this.memoryCache) {
                    if (cacheItem.persistent) {
                        const storageKey = this.config.persistencePrefix + cacheKey;
                        localStorage.setItem(storageKey, JSON.stringify(cacheItem));
                        this.stats.persistenceWrites++;
                    }
                }
            }
            
        } catch (error) {
            this.logger.error('保存到持久化存储失败:', error);
        }
    }
    
    /**
     * 从持久化存储加载
     * @param {string} key - 缓存键（可选）
     * @returns {Object|null} 缓存项或null
     */
    loadFromPersistence(key = null) {
        if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
            return null;
        }
        
        try {
            if (key) {
                // 加载单个项目
                const storageKey = this.config.persistencePrefix + key;
                const data = localStorage.getItem(storageKey);
                
                if (data) {
                    const item = JSON.parse(data);
                    
                    // 检查是否过期
                    if (!this.isExpired(item)) {
                        this.stats.persistenceReads++;
                        return item;
                    } else {
                        // 删除过期项目
                        localStorage.removeItem(storageKey);
                    }
                }
                
                return null;
                
            } else {
                // 加载所有项目
                const prefix = this.config.persistencePrefix;
                
                for (let i = 0; i < localStorage.length; i++) {
                    const storageKey = localStorage.key(i);
                    
                    if (storageKey && storageKey.startsWith(prefix)) {
                        const cacheKey = storageKey.substring(prefix.length);
                        const data = localStorage.getItem(storageKey);
                        
                        if (data) {
                            try {
                                const item = JSON.parse(data);
                                
                                if (!this.isExpired(item)) {
                                    this.memoryCache.set(cacheKey, item);
                                    this.stats.persistenceReads++;
                                } else {
                                    localStorage.removeItem(storageKey);
                                }
                                
                            } catch (parseError) {
                                this.logger.warn('解析持久化数据失败:', parseError, { key: cacheKey });
                                localStorage.removeItem(storageKey);
                            }
                        }
                    }
                }
                
                this.updateTotalSize();
                this.stats.itemCount = this.memoryCache.size;
            }
            
        } catch (error) {
            this.logger.error('从持久化存储加载失败:', error);
        }
        
        return null;
    }
    
    /**
     * 从持久化存储删除
     * @param {string} key - 缓存键
     */
    removeFromPersistence(key) {
        if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            const storageKey = this.config.persistencePrefix + key;
            localStorage.removeItem(storageKey);
            
        } catch (error) {
            this.logger.error('从持久化存储删除失败:', error, { key });
        }
    }
    
    /**
     * 清空持久化存储
     */
    clearPersistence() {
        if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            const prefix = this.config.persistencePrefix;
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            this.logger.debug('持久化存储已清空', { count: keysToRemove.length });
            
        } catch (error) {
            this.logger.error('清空持久化存储失败:', error);
        }
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ?
            (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            hitRate: parseFloat(hitRate),
            memoryUsage: {
                current: this.stats.totalSize,
                max: this.config.maxMemorySize,
                percentage: (this.stats.totalSize / this.config.maxMemorySize * 100).toFixed(2)
            },
            itemUsage: {
                current: this.stats.itemCount,
                max: this.config.maxItems,
                percentage: (this.stats.itemCount / this.config.maxItems * 100).toFixed(2)
            },
            performanceMetrics: this.performanceMonitor.getMetrics()
        };
    }
    
    /**
     * 获取缓存键列表
     * @param {string} type - 缓存类型（可选）
     * @returns {Array} 键列表
     */
    getKeys(type = null) {
        if (type) {
            return Array.from(this.memoryCache.entries())
                .filter(([key, item]) => item.type === type)
                .map(([key]) => key);
        }
        
        return Array.from(this.memoryCache.keys());
    }
    
    /**
     * 获取缓存大小
     * @returns {number} 缓存项数量
     */
    size() {
        return this.memoryCache.size;
    }
    
    /**
     * 预热缓存
     * @param {Array} items - 预热项目列表
     */
    async warmup(items) {
        this.logger.info('开始缓存预热', { count: items.length });
        
        const promises = items.map(async ({ key, value, options }) => {
            try {
                this.set(key, value, options);
            } catch (error) {
                this.logger.warn('预热项目失败:', error, { key });
            }
        });
        
        await Promise.allSettled(promises);
        this.logger.info('缓存预热完成');
    }
    
    /**
     * 导出缓存数据
     * @param {string} type - 缓存类型（可选）
     * @returns {Object} 导出的数据
     */
    export(type = null) {
        const data = {};
        
        for (const [key, item] of this.memoryCache) {
            if (!type || item.type === type) {
                data[key] = {
                    value: this.deserializeValue(item.value, item.compressed),
                    type: item.type,
                    metadata: item.metadata,
                    createdAt: item.createdAt,
                    lastAccessed: item.lastAccessed
                };
            }
        }
        
        return data;
    }
    
    /**
     * 导入缓存数据
     * @param {Object} data - 导入的数据
     * @param {Object} options - 导入选项
     */
    import(data, options = {}) {
        const { overwrite = false, type = null } = options;
        
        for (const [key, item] of Object.entries(data)) {
            if (type && item.type !== type) continue;
            
            if (!overwrite && this.has(key)) {
                this.logger.debug('跳过已存在的缓存项', { key });
                continue;
            }
            
            this.set(key, item.value, {
                type: item.type,
                metadata: item.metadata,
                ttl: this.config.defaultTTL
            });
        }
        
        this.logger.info('缓存数据导入完成', { count: Object.keys(data).length });
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopAutoCleanup();
        
        if (this.config.enablePersistence) {
            this.saveToPersistence();
        }
        
        this.clear();
        this.performanceMonitor.dispose();
        
        this.logger.info('缓存管理器资源已清理');
    }
}

export default CacheManager;