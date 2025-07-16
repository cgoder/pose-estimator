/**
 * 智能缓存管理器
 * 三层混合缓存策略实现
 * 基于架构设计文档要求
 */

/**
 * 缓存类型枚举
 */
export const CacheType = {
    MEMORY: 'memory',
    INDEXEDDB: 'indexeddb',
    LOCALSTORAGE: 'localstorage'
};

/**
 * 缓存策略枚举
 */
export const CacheStrategy = {
    LRU: 'lru',           // 最近最少使用
    LFU: 'lfu',           // 最少使用频率
    FIFO: 'fifo',         // 先进先出
    TTL: 'ttl',           // 生存时间
    ADAPTIVE: 'adaptive'   // 自适应
};

/**
 * 缓存优先级枚举
 */
export const CachePriority = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    CRITICAL: 4
};

/**
 * 数据类型枚举
 */
export const DataType = {
    MODEL: 'model',
    POSE_DATA: 'pose_data',
    ANALYSIS_RESULT: 'analysis_result',
    FRAME_DATA: 'frame_data',
    CONFIG: 'config',
    METADATA: 'metadata',
    TEXTURE: 'texture',
    SHADER: 'shader'
};

/**
 * 缓存项类
 */
class CacheItem {
    constructor(key, data, options = {}) {
        this.key = key;
        this.data = data;
        this.size = this._calculateSize(data);
        this.type = options.type || DataType.POSE_DATA;
        this.priority = options.priority || CachePriority.NORMAL;
        this.ttl = options.ttl || 0; // 0表示永不过期
        this.maxAge = options.maxAge || 0;
        this.createdAt = Date.now();
        this.lastAccessed = this.createdAt;
        this.accessCount = 0;
        this.metadata = options.metadata || {};
        this.compressed = false;
        this.version = options.version || 1;
    }
    
    /**
     * 访问缓存项
     */
    access() {
        this.lastAccessed = Date.now();
        this.accessCount++;
        return this.data;
    }
    
    /**
     * 检查是否过期
     */
    isExpired() {
        if (this.ttl === 0 && this.maxAge === 0) return false;
        
        const now = Date.now();
        if (this.ttl > 0 && (now - this.lastAccessed) > this.ttl) {
            return true;
        }
        if (this.maxAge > 0 && (now - this.createdAt) > this.maxAge) {
            return true;
        }
        return false;
    }
    
    /**
     * 获取年龄（毫秒）
     */
    getAge() {
        return Date.now() - this.createdAt;
    }
    
    /**
     * 获取空闲时间（毫秒）
     */
    getIdleTime() {
        return Date.now() - this.lastAccessed;
    }
    
    /**
     * 计算数据大小
     */
    _calculateSize(data) {
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        if (data instanceof Blob) {
            return data.size;
        }
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        if (data && typeof data === 'object') {
            return new Blob([JSON.stringify(data)]).size;
        }
        return 0;
    }
    
    /**
     * 序列化为存储格式
     */
    serialize() {
        return {
            key: this.key,
            data: this.data,
            size: this.size,
            type: this.type,
            priority: this.priority,
            ttl: this.ttl,
            maxAge: this.maxAge,
            createdAt: this.createdAt,
            lastAccessed: this.lastAccessed,
            accessCount: this.accessCount,
            metadata: this.metadata,
            compressed: this.compressed,
            version: this.version
        };
    }
    
    /**
     * 从序列化数据恢复
     */
    static deserialize(serialized) {
        const item = new CacheItem(serialized.key, serialized.data, {
            type: serialized.type,
            priority: serialized.priority,
            ttl: serialized.ttl,
            maxAge: serialized.maxAge,
            metadata: serialized.metadata,
            version: serialized.version
        });
        
        item.size = serialized.size;
        item.createdAt = serialized.createdAt;
        item.lastAccessed = serialized.lastAccessed;
        item.accessCount = serialized.accessCount;
        item.compressed = serialized.compressed;
        
        return item;
    }
}

/**
 * 内存缓存层
 */
class MemoryCache {
    constructor(options = {}) {
        this.name = 'MemoryCache';
        this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
        this.maxItems = options.maxItems || 1000;
        this.strategy = options.strategy || CacheStrategy.LRU;
        this.items = new Map();
        this.currentSize = 0;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalRequests: 0
        };
    }
    
    /**
     * 获取缓存项
     */
    get(key) {
        this.stats.totalRequests++;
        
        const item = this.items.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        if (item.isExpired()) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }
        
        this.stats.hits++;
        return item.access();
    }
    
    /**
     * 设置缓存项
     */
    set(key, data, options = {}) {
        const item = new CacheItem(key, data, options);
        
        // 检查是否需要清理空间
        this._ensureSpace(item.size);
        
        // 删除旧项（如果存在）
        if (this.items.has(key)) {
            this.delete(key);
        }
        
        // 添加新项
        this.items.set(key, item);
        this.currentSize += item.size;
        
        return true;
    }
    
    /**
     * 删除缓存项
     */
    delete(key) {
        const item = this.items.get(key);
        if (item) {
            this.items.delete(key);
            this.currentSize -= item.size;
            return true;
        }
        return false;
    }
    
    /**
     * 检查是否存在
     */
    has(key) {
        const item = this.items.get(key);
        return item && !item.isExpired();
    }
    
    /**
     * 清空缓存
     */
    clear() {
        this.items.clear();
        this.currentSize = 0;
        this.stats.evictions += this.items.size;
    }
    
    /**
     * 获取所有键
     */
    keys() {
        return Array.from(this.items.keys());
    }
    
    /**
     * 获取缓存大小
     */
    size() {
        return this.items.size;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 ? 
            (this.stats.hits / this.stats.totalRequests) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: hitRate.toFixed(2) + '%',
            currentSize: this.currentSize,
            maxSize: this.maxSize,
            itemCount: this.items.size,
            maxItems: this.maxItems,
            memoryUsage: (this.currentSize / this.maxSize * 100).toFixed(2) + '%'
        };
    }
    
    /**
     * 清理过期项
     */
    cleanup() {
        let cleanedCount = 0;
        for (const [key, item] of this.items) {
            if (item.isExpired()) {
                this.delete(key);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    
    /**
     * 确保有足够空间
     */
    _ensureSpace(requiredSize) {
        // 首先清理过期项
        this.cleanup();
        
        // 检查是否需要驱逐项目
        while ((this.currentSize + requiredSize > this.maxSize || 
                this.items.size >= this.maxItems) && 
               this.items.size > 0) {
            
            const victimKey = this._selectVictim();
            if (victimKey) {
                this.delete(victimKey);
                this.stats.evictions++;
            } else {
                break;
            }
        }
    }
    
    /**
     * 选择驱逐目标
     */
    _selectVictim() {
        if (this.items.size === 0) return null;
        
        switch (this.strategy) {
            case CacheStrategy.LRU:
                return this._selectLRUVictim();
            case CacheStrategy.LFU:
                return this._selectLFUVictim();
            case CacheStrategy.FIFO:
                return this._selectFIFOVictim();
            case CacheStrategy.TTL:
                return this._selectTTLVictim();
            case CacheStrategy.ADAPTIVE:
                return this._selectAdaptiveVictim();
            default:
                return this._selectLRUVictim();
        }
    }
    
    /**
     * LRU驱逐策略
     */
    _selectLRUVictim() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, item] of this.items) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }
        
        return oldestKey;
    }
    
    /**
     * LFU驱逐策略
     */
    _selectLFUVictim() {
        let leastUsedKey = null;
        let leastCount = Infinity;
        
        for (const [key, item] of this.items) {
            if (item.accessCount < leastCount) {
                leastCount = item.accessCount;
                leastUsedKey = key;
            }
        }
        
        return leastUsedKey;
    }
    
    /**
     * FIFO驱逐策略
     */
    _selectFIFOVictim() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, item] of this.items) {
            if (item.createdAt < oldestTime) {
                oldestTime = item.createdAt;
                oldestKey = key;
            }
        }
        
        return oldestKey;
    }
    
    /**
     * TTL驱逐策略
     */
    _selectTTLVictim() {
        // 优先选择即将过期的项
        let nearestExpiryKey = null;
        let nearestExpiryTime = Infinity;
        
        for (const [key, item] of this.items) {
            if (item.ttl > 0) {
                const expiryTime = item.lastAccessed + item.ttl;
                if (expiryTime < nearestExpiryTime) {
                    nearestExpiryTime = expiryTime;
                    nearestExpiryKey = key;
                }
            }
        }
        
        return nearestExpiryKey || this._selectLRUVictim();
    }
    
    /**
     * 自适应驱逐策略
     */
    _selectAdaptiveVictim() {
        // 综合考虑访问频率、最近访问时间、优先级和大小
        let bestKey = null;
        let bestScore = -1;
        
        for (const [key, item] of this.items) {
            const score = this._calculateAdaptiveScore(item);
            if (score > bestScore) {
                bestScore = score;
                bestKey = key;
            }
        }
        
        return bestKey;
    }
    
    /**
     * 计算自适应评分
     */
    _calculateAdaptiveScore(item) {
        const now = Date.now();
        const age = now - item.createdAt;
        const idleTime = now - item.lastAccessed;
        
        // 归一化因子
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        const maxIdleTime = 60 * 60 * 1000; // 1小时
        const maxAccessCount = 100;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // 计算各项评分（0-1）
        const ageScore = Math.min(age / maxAge, 1);
        const idleScore = Math.min(idleTime / maxIdleTime, 1);
        const accessScore = 1 - Math.min(item.accessCount / maxAccessCount, 1);
        const sizeScore = Math.min(item.size / maxSize, 1);
        const priorityScore = 1 - (item.priority / CachePriority.CRITICAL);
        
        // 权重
        const weights = {
            age: 0.2,
            idle: 0.3,
            access: 0.2,
            size: 0.2,
            priority: 0.1
        };
        
        // 综合评分（越高越适合驱逐）
        return ageScore * weights.age +
               idleScore * weights.idle +
               accessScore * weights.access +
               sizeScore * weights.size +
               priorityScore * weights.priority;
    }
}

/**
 * IndexedDB缓存层
 */
class IndexedDBCache {
    constructor(options = {}) {
        this.name = 'IndexedDBCache';
        this.dbName = options.dbName || 'PoseEstimatorCache';
        this.version = options.version || 1;
        this.storeName = options.storeName || 'cache';
        this.maxSize = options.maxSize || 500 * 1024 * 1024; // 500MB
        this.db = null;
        this.isReady = false;
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            totalRequests: 0
        };
    }
    
    /**
     * 初始化数据库
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建对象存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }
            };
        });
    }
    
    /**
     * 获取缓存项
     */
    async get(key) {
        if (!this.isReady) {
            await this.initialize();
        }
        
        this.stats.totalRequests++;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    this.stats.misses++;
                    resolve(null);
                    return;
                }
                
                const item = CacheItem.deserialize(result);
                if (item.isExpired()) {
                    this.delete(key);
                    this.stats.misses++;
                    resolve(null);
                    return;
                }
                
                // 更新访问时间
                item.access();
                this._updateAccessTime(key, item.lastAccessed, item.accessCount);
                
                this.stats.hits++;
                resolve(item.data);
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to get item from IndexedDB'));
            };
        });
    }
    
    /**
     * 设置缓存项
     */
    async set(key, data, options = {}) {
        if (!this.isReady) {
            await this.initialize();
        }
        
        const item = new CacheItem(key, data, options);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(item.serialize());
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to set item in IndexedDB'));
            };
        });
    }
    
    /**
     * 删除缓存项
     */
    async delete(key) {
        if (!this.isReady) {
            await this.initialize();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to delete item from IndexedDB'));
            };
        });
    }
    
    /**
     * 检查是否存在
     */
    async has(key) {
        const data = await this.get(key);
        return data !== null;
    }
    
    /**
     * 清空缓存
     */
    async clear() {
        if (!this.isReady) {
            await this.initialize();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to clear IndexedDB'));
            };
        });
    }
    
    /**
     * 获取所有键
     */
    async keys() {
        if (!this.isReady) {
            await this.initialize();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to get keys from IndexedDB'));
            };
        });
    }
    
    /**
     * 获取缓存大小
     */
    async size() {
        const keys = await this.keys();
        return keys.length;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 ? 
            (this.stats.hits / this.stats.totalRequests) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: hitRate.toFixed(2) + '%',
            isReady: this.isReady
        };
    }
    
    /**
     * 清理过期项
     */
    async cleanup() {
        if (!this.isReady) {
            await this.initialize();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.openCursor();
            let cleanedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = CacheItem.deserialize(cursor.value);
                    if (item.isExpired()) {
                        cursor.delete();
                        cleanedCount++;
                    }
                    cursor.continue();
                } else {
                    resolve(cleanedCount);
                }
            };
            
            request.onerror = () => {
                this.stats.errors++;
                reject(new Error('Failed to cleanup IndexedDB'));
            };
        });
    }
    
    /**
     * 更新访问时间
     */
    async _updateAccessTime(key, lastAccessed, accessCount) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (item) {
                item.lastAccessed = lastAccessed;
                item.accessCount = accessCount;
                store.put(item);
            }
        };
    }
}

/**
 * LocalStorage缓存层
 */
class LocalStorageCache {
    constructor(options = {}) {
        this.name = 'LocalStorageCache';
        this.prefix = options.prefix || 'pose_cache_';
        this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB
        this.compression = options.compression || false;
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            totalRequests: 0
        };
    }
    
    /**
     * 获取缓存项
     */
    get(key) {
        this.stats.totalRequests++;
        
        try {
            const fullKey = this.prefix + key;
            const serialized = localStorage.getItem(fullKey);
            
            if (!serialized) {
                this.stats.misses++;
                return null;
            }
            
            const parsed = JSON.parse(serialized);
            const item = CacheItem.deserialize(parsed);
            
            if (item.isExpired()) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }
            
            // 更新访问信息
            item.access();
            this._updateItem(key, item);
            
            this.stats.hits++;
            return item.data;
            
        } catch (error) {
            this.stats.errors++;
            console.error('LocalStorage get error:', error);
            return null;
        }
    }
    
    /**
     * 设置缓存项
     */
    set(key, data, options = {}) {
        try {
            const item = new CacheItem(key, data, options);
            const serialized = JSON.stringify(item.serialize());
            
            // 检查大小限制
            if (serialized.length > this.maxSize) {
                console.warn('Item too large for LocalStorage:', key);
                return false;
            }
            
            const fullKey = this.prefix + key;
            localStorage.setItem(fullKey, serialized);
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            
            // 如果是存储空间不足，尝试清理
            if (error.name === 'QuotaExceededError') {
                this._cleanup();
                try {
                    const item = new CacheItem(key, data, options);
                    const serialized = JSON.stringify(item.serialize());
                    const fullKey = this.prefix + key;
                    localStorage.setItem(fullKey, serialized);
                    return true;
                } catch (retryError) {
                    console.error('LocalStorage set retry failed:', retryError);
                    return false;
                }
            }
            
            console.error('LocalStorage set error:', error);
            return false;
        }
    }
    
    /**
     * 删除缓存项
     */
    delete(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error('LocalStorage delete error:', error);
            return false;
        }
    }
    
    /**
     * 检查是否存在
     */
    has(key) {
        const fullKey = this.prefix + key;
        return localStorage.getItem(fullKey) !== null;
    }
    
    /**
     * 清空缓存
     */
    clear() {
        try {
            const keys = this.keys();
            keys.forEach(key => {
                const fullKey = this.prefix + key;
                localStorage.removeItem(fullKey);
            });
        } catch (error) {
            this.stats.errors++;
            console.error('LocalStorage clear error:', error);
        }
    }
    
    /**
     * 获取所有键
     */
    keys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }
    
    /**
     * 获取缓存大小
     */
    size() {
        return this.keys().length;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 ? 
            (this.stats.hits / this.stats.totalRequests) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: hitRate.toFixed(2) + '%',
            storageUsed: this._getStorageUsed()
        };
    }
    
    /**
     * 清理过期项
     */
    cleanup() {
        let cleanedCount = 0;
        const keys = this.keys();
        
        keys.forEach(key => {
            try {
                const fullKey = this.prefix + key;
                const serialized = localStorage.getItem(fullKey);
                if (serialized) {
                    const parsed = JSON.parse(serialized);
                    const item = CacheItem.deserialize(parsed);
                    if (item.isExpired()) {
                        localStorage.removeItem(fullKey);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                // 删除损坏的项
                localStorage.removeItem(this.prefix + key);
                cleanedCount++;
            }
        });
        
        return cleanedCount;
    }
    
    /**
     * 更新缓存项
     */
    _updateItem(key, item) {
        try {
            const fullKey = this.prefix + key;
            const serialized = JSON.stringify(item.serialize());
            localStorage.setItem(fullKey, serialized);
        } catch (error) {
            // 忽略更新错误
        }
    }
    
    /**
     * 获取存储使用量
     */
    _getStorageUsed() {
        let used = 0;
        const keys = this.keys();
        
        keys.forEach(key => {
            const fullKey = this.prefix + key;
            const item = localStorage.getItem(fullKey);
            if (item) {
                used += item.length;
            }
        });
        
        return used;
    }
    
    /**
     * 清理存储空间
     */
    _cleanup() {
        // 首先清理过期项
        this.cleanup();
        
        // 如果还是不够，删除最旧的项
        const keys = this.keys();
        const items = [];
        
        keys.forEach(key => {
            try {
                const fullKey = this.prefix + key;
                const serialized = localStorage.getItem(fullKey);
                if (serialized) {
                    const parsed = JSON.parse(serialized);
                    const item = CacheItem.deserialize(parsed);
                    items.push({ key, item });
                }
            } catch (error) {
                // 删除损坏的项
                localStorage.removeItem(this.prefix + key);
            }
        });
        
        // 按最后访问时间排序
        items.sort((a, b) => a.item.lastAccessed - b.item.lastAccessed);
        
        // 删除最旧的25%
        const deleteCount = Math.ceil(items.length * 0.25);
        for (let i = 0; i < deleteCount; i++) {
            this.delete(items[i].key);
        }
    }
}

/**
 * 智能缓存管理器主类
 */
class CacheManager {
    constructor(options = {}) {
        this.name = 'CacheManager';
        this.config = {
            enableMemoryCache: options.enableMemoryCache !== false,
            enableIndexedDBCache: options.enableIndexedDBCache !== false,
            enableLocalStorageCache: options.enableLocalStorageCache !== false,
            memoryFirst: options.memoryFirst !== false,
            autoCleanup: options.autoCleanup !== false,
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5分钟
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            ...options
        };
        
        this.caches = new Map();
        this.isInitialized = false;
        this.cleanupTimer = null;
        
        this.stats = {
            totalRequests: 0,
            totalHits: 0,
            totalMisses: 0,
            totalErrors: 0,
            cacheHitsByType: new Map(),
            performanceMetrics: {
                averageGetTime: 0,
                averageSetTime: 0,
                getTimes: [],
                setTimes: []
            }
        };
        
        this.eventListeners = new Map();
        
        this._initializeCaches();
    }
    
    /**
     * 初始化缓存管理器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('正在初始化缓存管理器...');
            
            // 初始化IndexedDB缓存
            if (this.config.enableIndexedDBCache) {
                const indexedDBCache = this.caches.get(CacheType.INDEXEDDB);
                if (indexedDBCache) {
                    await indexedDBCache.initialize();
                }
            }
            
            // 开始自动清理
            if (this.config.autoCleanup) {
                this._startAutoCleanup();
            }
            
            this.isInitialized = true;
            this._emitEvent('initialized', { manager: this });
            
            console.log('缓存管理器初始化完成');
            
        } catch (error) {
            console.error('缓存管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取缓存项
     */
    async get(key, options = {}) {
        const startTime = performance.now();
        this.stats.totalRequests++;
        
        try {
            const cacheOrder = this._getCacheOrder(options);
            
            for (const cacheType of cacheOrder) {
                const cache = this.caches.get(cacheType);
                if (!cache) continue;
                
                const data = await cache.get(key);
                if (data !== null) {
                    this.stats.totalHits++;
                    this._updateCacheHitStats(cacheType);
                    
                    // 如果从较慢的缓存获取，提升到更快的缓存
                    if (this.config.memoryFirst && cacheType !== CacheType.MEMORY) {
                        this._promoteToFasterCache(key, data, options, cacheType);
                    }
                    
                    this._recordPerformance('get', performance.now() - startTime);
                    this._emitEvent('hit', { key, cacheType, data });
                    
                    return data;
                }
            }
            
            this.stats.totalMisses++;
            this._recordPerformance('get', performance.now() - startTime);
            this._emitEvent('miss', { key });
            
            return null;
            
        } catch (error) {
            this.stats.totalErrors++;
            this._emitEvent('error', { operation: 'get', key, error });
            console.error('Cache get error:', error);
            return null;
        }
    }
    
    /**
     * 设置缓存项
     */
    async set(key, data, options = {}) {
        const startTime = performance.now();
        
        try {
            const cacheOrder = this._getCacheOrder(options);
            const results = [];
            
            for (const cacheType of cacheOrder) {
                const cache = this.caches.get(cacheType);
                if (!cache) continue;
                
                // 根据数据类型和大小选择合适的缓存
                if (this._shouldUseCache(cacheType, data, options)) {
                    const result = await cache.set(key, data, options);
                    results.push({ cacheType, success: result });
                }
            }
            
            this._recordPerformance('set', performance.now() - startTime);
            this._emitEvent('set', { key, data, results });
            
            return results.some(r => r.success);
            
        } catch (error) {
            this.stats.totalErrors++;
            this._emitEvent('error', { operation: 'set', key, error });
            console.error('Cache set error:', error);
            return false;
        }
    }
    
    /**
     * 删除缓存项
     */
    async delete(key) {
        try {
            const results = [];
            
            for (const [cacheType, cache] of this.caches) {
                const result = await cache.delete(key);
                results.push({ cacheType, success: result });
            }
            
            this._emitEvent('delete', { key, results });
            
            return results.some(r => r.success);
            
        } catch (error) {
            this.stats.totalErrors++;
            this._emitEvent('error', { operation: 'delete', key, error });
            console.error('Cache delete error:', error);
            return false;
        }
    }
    
    /**
     * 检查是否存在
     */
    async has(key) {
        try {
            for (const cache of this.caches.values()) {
                if (await cache.has(key)) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Cache has error:', error);
            return false;
        }
    }
    
    /**
     * 清空所有缓存
     */
    async clear() {
        try {
            const results = [];
            
            for (const [cacheType, cache] of this.caches) {
                await cache.clear();
                results.push({ cacheType, success: true });
            }
            
            this._emitEvent('clear', { results });
            
            return true;
            
        } catch (error) {
            this.stats.totalErrors++;
            this._emitEvent('error', { operation: 'clear', error });
            console.error('Cache clear error:', error);
            return false;
        }
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const cacheStats = {};
        for (const [type, cache] of this.caches) {
            cacheStats[type] = cache.getStats();
        }
        
        const totalHitRate = this.stats.totalRequests > 0 ? 
            (this.stats.totalHits / this.stats.totalRequests) * 100 : 0;
        
        return {
            ...this.stats,
            totalHitRate: totalHitRate.toFixed(2) + '%',
            cacheStats,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * 清理过期项
     */
    async cleanup() {
        try {
            const results = {};
            
            for (const [cacheType, cache] of this.caches) {
                const cleanedCount = await cache.cleanup();
                results[cacheType] = cleanedCount;
            }
            
            this._emitEvent('cleanup', { results });
            
            return results;
            
        } catch (error) {
            console.error('Cache cleanup error:', error);
            return {};
        }
    }
    
    /**
     * 预热缓存
     */
    async warmup(data) {
        try {
            const promises = [];
            
            for (const [key, value] of Object.entries(data)) {
                promises.push(this.set(key, value, { priority: CachePriority.HIGH }));
            }
            
            await Promise.all(promises);
            this._emitEvent('warmup', { count: promises.length });
            
            return true;
            
        } catch (error) {
            console.error('Cache warmup error:', error);
            return false;
        }
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 移除事件监听器
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // 停止自动清理
        this._stopAutoCleanup();
        
        // 清理所有缓存
        this.clear();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        this.isInitialized = false;
        console.log('缓存管理器已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 初始化缓存层
     */
    _initializeCaches() {
        if (this.config.enableMemoryCache) {
            this.caches.set(CacheType.MEMORY, new MemoryCache(this.config.memoryCache));
        }
        
        if (this.config.enableIndexedDBCache) {
            this.caches.set(CacheType.INDEXEDDB, new IndexedDBCache(this.config.indexedDBCache));
        }
        
        if (this.config.enableLocalStorageCache) {
            this.caches.set(CacheType.LOCALSTORAGE, new LocalStorageCache(this.config.localStorageCache));
        }
    }
    
    /**
     * 获取缓存顺序
     */
    _getCacheOrder(options) {
        if (options.cacheOrder) {
            return options.cacheOrder;
        }
        
        if (this.config.memoryFirst) {
            return [CacheType.MEMORY, CacheType.INDEXEDDB, CacheType.LOCALSTORAGE];
        }
        
        return [CacheType.INDEXEDDB, CacheType.MEMORY, CacheType.LOCALSTORAGE];
    }
    
    /**
     * 判断是否应该使用特定缓存
     */
    _shouldUseCache(cacheType, data, options) {
        const dataSize = this._calculateDataSize(data);
        
        switch (cacheType) {
            case CacheType.MEMORY:
                // 内存缓存适合小数据和高频访问
                return dataSize < 1024 * 1024 || options.priority >= CachePriority.HIGH;
                
            case CacheType.INDEXEDDB:
                // IndexedDB适合大数据和持久化
                return dataSize >= 1024 || options.persistent;
                
            case CacheType.LOCALSTORAGE:
                // LocalStorage适合配置和小数据
                return dataSize < 1024 * 10 && (options.type === DataType.CONFIG || options.persistent);
                
            default:
                return true;
        }
    }
    
    /**
     * 提升到更快的缓存
     */
    async _promoteToFasterCache(key, data, options, currentCacheType) {
        try {
            const fasterCaches = this._getFasterCaches(currentCacheType);
            
            for (const cacheType of fasterCaches) {
                const cache = this.caches.get(cacheType);
                if (cache && this._shouldUseCache(cacheType, data, options)) {
                    await cache.set(key, data, options);
                    break;
                }
            }
        } catch (error) {
            console.error('Cache promotion error:', error);
        }
    }
    
    /**
     * 获取更快的缓存类型
     */
    _getFasterCaches(currentCacheType) {
        const cacheSpeed = {
            [CacheType.MEMORY]: 3,
            [CacheType.INDEXEDDB]: 2,
            [CacheType.LOCALSTORAGE]: 1
        };
        
        const currentSpeed = cacheSpeed[currentCacheType];
        const fasterCaches = [];
        
        for (const [type, speed] of Object.entries(cacheSpeed)) {
            if (speed > currentSpeed) {
                fasterCaches.push(type);
            }
        }
        
        return fasterCaches.sort((a, b) => cacheSpeed[b] - cacheSpeed[a]);
    }
    
    /**
     * 计算数据大小
     */
    _calculateDataSize(data) {
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        if (data instanceof Blob) {
            return data.size;
        }
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        if (data && typeof data === 'object') {
            return new Blob([JSON.stringify(data)]).size;
        }
        return 0;
    }
    
    /**
     * 更新缓存命中统计
     */
    _updateCacheHitStats(cacheType) {
        if (!this.stats.cacheHitsByType.has(cacheType)) {
            this.stats.cacheHitsByType.set(cacheType, 0);
        }
        this.stats.cacheHitsByType.set(
            cacheType, 
            this.stats.cacheHitsByType.get(cacheType) + 1
        );
    }
    
    /**
     * 记录性能指标
     */
    _recordPerformance(operation, time) {
        const metrics = this.stats.performanceMetrics;
        
        if (operation === 'get') {
            metrics.getTimes.push(time);
            if (metrics.getTimes.length > 100) {
                metrics.getTimes.shift();
            }
            metrics.averageGetTime = metrics.getTimes.reduce((a, b) => a + b, 0) / metrics.getTimes.length;
        } else if (operation === 'set') {
            metrics.setTimes.push(time);
            if (metrics.setTimes.length > 100) {
                metrics.setTimes.shift();
            }
            metrics.averageSetTime = metrics.setTimes.reduce((a, b) => a + b, 0) / metrics.setTimes.length;
        }
    }
    
    /**
     * 开始自动清理
     */
    _startAutoCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    
    /**
     * 停止自动清理
     */
    _stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Cache event callback error (${event}):`, error);
                }
            });
        }
    }
}

export default CacheManager;
export {
    CacheItem,
    MemoryCache,
    IndexedDBCache,
    LocalStorageCache,
    CacheType,
    CacheStrategy,
    CachePriority,
    DataType
};