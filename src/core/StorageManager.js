/**
 * 存储管理器模块
 * 负责数据的本地存储、缓存、同步和管理
 */

export class StorageManager {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 存储设置
            prefix: options.prefix || 'pose_estimator_',
            enableLocalStorage: options.enableLocalStorage !== false,
            enableSessionStorage: options.enableSessionStorage !== false,
            enableIndexedDB: options.enableIndexedDB !== false,
            
            // 缓存设置
            enableMemoryCache: options.enableMemoryCache !== false,
            maxMemoryCacheSize: options.maxMemoryCacheSize || 100, // MB
            cacheExpiration: options.cacheExpiration || 3600000, // 1小时
            
            // 压缩设置
            enableCompression: options.enableCompression || false,
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            
            // 同步设置
            enableCloudSync: options.enableCloudSync || false,
            cloudProvider: options.cloudProvider || 'none',
            syncInterval: options.syncInterval || 300000, // 5分钟
            
            // 安全设置
            enableEncryption: options.enableEncryption || false,
            encryptionKey: options.encryptionKey || '',
            
            // 调试设置
            debug: options.debug || false,
            
            // 数据库设置
            dbName: options.dbName || 'PoseEstimatorDB',
            dbVersion: options.dbVersion || 1,
            
            ...options
        };
        
        // 内存缓存
        this.memoryCache = new Map();
        this.cacheMetadata = new Map();
        
        // IndexedDB 实例
        this.db = null;
        
        // 同步状态
        this.syncStatus = {
            enabled: false,
            lastSync: null,
            inProgress: false,
            errors: []
        };
        
        // 存储统计
        this.stats = {
            reads: 0,
            writes: 0,
            deletes: 0,
            cacheHits: 0,
            cacheMisses: 0,
            compressionSaved: 0,
            syncOperations: 0,
            errors: 0
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 同步定时器
        this.syncTimer = null;
        
        // 存储适配器
        this.adapters = new Map();
        
        this.init();
    }
    
    /**
     * 初始化存储管理器
     */
    async init() {
        try {
            // 初始化存储适配器
            this.initAdapters();
            
            // 初始化 IndexedDB
            if (this.options.enableIndexedDB) {
                await this.initIndexedDB();
            }
            
            // 启动云同步
            if (this.options.enableCloudSync) {
                this.startCloudSync();
            }
            
            // 清理过期缓存
            this.cleanExpiredCache();
            
            if (this.options.debug) {
                console.log('StorageManager已初始化', this.options);
            }
            
        } catch (error) {
            console.error('StorageManager初始化失败:', error);
            this.stats.errors++;
        }
    }
    
    /**
     * 初始化存储适配器
     */
    initAdapters() {
        // LocalStorage 适配器
        if (this.options.enableLocalStorage && typeof localStorage !== 'undefined') {
            this.adapters.set('localStorage', {
                get: (key) => localStorage.getItem(this.options.prefix + key),
                set: (key, value) => localStorage.setItem(this.options.prefix + key, value),
                remove: (key) => localStorage.removeItem(this.options.prefix + key),
                clear: () => {
                    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.options.prefix));
                    keys.forEach(key => localStorage.removeItem(key));
                },
                keys: () => Object.keys(localStorage).filter(k => k.startsWith(this.options.prefix))
                    .map(k => k.substring(this.options.prefix.length))
            });
        }
        
        // SessionStorage 适配器
        if (this.options.enableSessionStorage && typeof sessionStorage !== 'undefined') {
            this.adapters.set('sessionStorage', {
                get: (key) => sessionStorage.getItem(this.options.prefix + key),
                set: (key, value) => sessionStorage.setItem(this.options.prefix + key, value),
                remove: (key) => sessionStorage.removeItem(this.options.prefix + key),
                clear: () => {
                    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(this.options.prefix));
                    keys.forEach(key => sessionStorage.removeItem(key));
                },
                keys: () => Object.keys(sessionStorage).filter(k => k.startsWith(this.options.prefix))
                    .map(k => k.substring(this.options.prefix.length))
            });
        }
        
        // 内存缓存适配器
        if (this.options.enableMemoryCache) {
            this.adapters.set('memory', {
                get: (key) => {
                    const item = this.memoryCache.get(key);
                    if (item && this.isExpired(key)) {
                        this.memoryCache.delete(key);
                        this.cacheMetadata.delete(key);
                        return null;
                    }
                    return item;
                },
                set: (key, value) => {
                    this.memoryCache.set(key, value);
                    this.cacheMetadata.set(key, {
                        timestamp: Date.now(),
                        size: this.getDataSize(value),
                        accessCount: 0
                    });
                    this.enforceMemoryLimit();
                },
                remove: (key) => {
                    this.memoryCache.delete(key);
                    this.cacheMetadata.delete(key);
                },
                clear: () => {
                    this.memoryCache.clear();
                    this.cacheMetadata.clear();
                },
                keys: () => Array.from(this.memoryCache.keys())
            });
        }
    }
    
    /**
     * 初始化 IndexedDB
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB 不支持');
                resolve();
                return;
            }
            
            const request = indexedDB.open(this.options.dbName, this.options.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB 打开失败:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                
                // 添加 IndexedDB 适配器
                this.adapters.set('indexedDB', {
                    get: (key) => this.getFromIndexedDB(key),
                    set: (key, value) => this.setToIndexedDB(key, value),
                    remove: (key) => this.removeFromIndexedDB(key),
                    clear: () => this.clearIndexedDB(),
                    keys: () => this.getIndexedDBKeys()
                });
                
                if (this.options.debug) {
                    console.log('IndexedDB 初始化成功');
                }
                
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建对象存储
                if (!db.objectStoreNames.contains('data')) {
                    const store = db.createObjectStore('data', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }
    
    /**
     * 存储数据
     * @param {string} key - 键
     * @param {any} value - 值
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功
     */
    async set(key, value, options = {}) {
        try {
            const {
                storage = 'localStorage',
                compress = this.options.enableCompression,
                encrypt = this.options.enableEncryption,
                ttl = this.options.cacheExpiration,
                metadata = {}
            } = options;
            
            // 准备数据
            let processedValue = value;
            
            // 序列化
            if (typeof processedValue !== 'string') {
                processedValue = JSON.stringify(processedValue);
            }
            
            // 压缩
            if (compress && processedValue.length > this.options.compressionThreshold) {
                const originalSize = processedValue.length;
                processedValue = this.compress(processedValue);
                const compressedSize = processedValue.length;
                this.stats.compressionSaved += originalSize - compressedSize;
                metadata.compressed = true;
            }
            
            // 加密
            if (encrypt && this.options.encryptionKey) {
                processedValue = this.encrypt(processedValue);
                metadata.encrypted = true;
            }
            
            // 创建存储项
            const item = {
                value: processedValue,
                timestamp: Date.now(),
                ttl,
                metadata: {
                    ...metadata,
                    originalType: typeof value,
                    size: this.getDataSize(processedValue)
                }
            };
            
            // 存储到指定适配器
            const adapter = this.adapters.get(storage);
            if (adapter) {
                if (storage === 'indexedDB') {
                    await adapter.set(key, item);
                } else {
                    adapter.set(key, JSON.stringify(item));
                }
            } else {
                throw new Error(`存储适配器不存在: ${storage}`);
            }
            
            // 同时存储到内存缓存
            if (this.options.enableMemoryCache && storage !== 'memory') {
                const memoryAdapter = this.adapters.get('memory');
                if (memoryAdapter) {
                    memoryAdapter.set(key, value);
                }
            }
            
            this.stats.writes++;
            this.emit('set', { key, value, storage, options });
            
            if (this.options.debug) {
                console.log(`数据已存储: ${key}`, { storage, size: item.metadata.size });
            }
            
            return true;
            
        } catch (error) {
            console.error('存储数据失败:', error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 获取数据
     * @param {string} key - 键
     * @param {Object} options - 选项
     * @returns {Promise<any>} 数据值
     */
    async get(key, options = {}) {
        try {
            const {
                storage = 'localStorage',
                useCache = true,
                defaultValue = null
            } = options;
            
            // 先尝试从内存缓存获取
            if (useCache && this.options.enableMemoryCache) {
                const memoryAdapter = this.adapters.get('memory');
                if (memoryAdapter) {
                    const cachedValue = memoryAdapter.get(key);
                    if (cachedValue !== null && cachedValue !== undefined) {
                        this.stats.cacheHits++;
                        this.updateCacheMetadata(key);
                        return cachedValue;
                    }
                }
                this.stats.cacheMisses++;
            }
            
            // 从指定存储获取
            const adapter = this.adapters.get(storage);
            if (!adapter) {
                throw new Error(`存储适配器不存在: ${storage}`);
            }
            
            let rawData;
            if (storage === 'indexedDB') {
                rawData = await adapter.get(key);
            } else {
                rawData = adapter.get(key);
            }
            
            if (!rawData) {
                return defaultValue;
            }
            
            // 解析存储项
            let item;
            if (storage === 'indexedDB') {
                item = rawData;
            } else {
                item = JSON.parse(rawData);
            }
            
            // 检查过期
            if (item.ttl && Date.now() - item.timestamp > item.ttl) {
                await this.remove(key, { storage });
                return defaultValue;
            }
            
            // 处理数据
            let value = item.value;
            
            // 解密
            if (item.metadata.encrypted && this.options.encryptionKey) {
                value = this.decrypt(value);
            }
            
            // 解压缩
            if (item.metadata.compressed) {
                value = this.decompress(value);
            }
            
            // 反序列化
            if (item.metadata.originalType !== 'string') {
                value = JSON.parse(value);
            }
            
            // 更新内存缓存
            if (useCache && this.options.enableMemoryCache && storage !== 'memory') {
                const memoryAdapter = this.adapters.get('memory');
                if (memoryAdapter) {
                    memoryAdapter.set(key, value);
                }
            }
            
            this.stats.reads++;
            this.emit('get', { key, value, storage, options });
            
            return value;
            
        } catch (error) {
            console.error('获取数据失败:', error);
            this.stats.errors++;
            return options.defaultValue || null;
        }
    }
    
    /**
     * 删除数据
     * @param {string} key - 键
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功
     */
    async remove(key, options = {}) {
        try {
            const { storage = 'localStorage' } = options;
            
            // 从指定存储删除
            const adapter = this.adapters.get(storage);
            if (adapter) {
                if (storage === 'indexedDB') {
                    await adapter.remove(key);
                } else {
                    adapter.remove(key);
                }
            }
            
            // 从内存缓存删除
            if (this.options.enableMemoryCache) {
                const memoryAdapter = this.adapters.get('memory');
                if (memoryAdapter) {
                    memoryAdapter.remove(key);
                }
            }
            
            this.stats.deletes++;
            this.emit('remove', { key, storage, options });
            
            if (this.options.debug) {
                console.log(`数据已删除: ${key}`, { storage });
            }
            
            return true;
            
        } catch (error) {
            console.error('删除数据失败:', error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 清空存储
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功
     */
    async clear(options = {}) {
        try {
            const { storage = 'localStorage' } = options;
            
            const adapter = this.adapters.get(storage);
            if (adapter) {
                if (storage === 'indexedDB') {
                    await adapter.clear();
                } else {
                    adapter.clear();
                }
            }
            
            // 清空内存缓存
            if (storage === 'memory' || storage === 'all') {
                const memoryAdapter = this.adapters.get('memory');
                if (memoryAdapter) {
                    memoryAdapter.clear();
                }
            }
            
            this.emit('clear', { storage, options });
            
            if (this.options.debug) {
                console.log(`存储已清空: ${storage}`);
            }
            
            return true;
            
        } catch (error) {
            console.error('清空存储失败:', error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 获取所有键
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 键数组
     */
    async keys(options = {}) {
        try {
            const { storage = 'localStorage' } = options;
            
            const adapter = this.adapters.get(storage);
            if (adapter) {
                if (storage === 'indexedDB') {
                    return await adapter.keys();
                } else {
                    return adapter.keys();
                }
            }
            
            return [];
            
        } catch (error) {
            console.error('获取键列表失败:', error);
            this.stats.errors++;
            return [];
        }
    }
    
    /**
     * 检查键是否存在
     * @param {string} key - 键
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否存在
     */
    async has(key, options = {}) {
        const value = await this.get(key, { ...options, defaultValue: Symbol('not_found') });
        return value !== Symbol('not_found');
    }
    
    /**
     * 获取存储大小
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 大小信息
     */
    async getSize(options = {}) {
        try {
            const { storage = 'localStorage' } = options;
            const sizes = {};
            
            if (storage === 'all' || storage === 'localStorage') {
                sizes.localStorage = this.getLocalStorageSize();
            }
            
            if (storage === 'all' || storage === 'sessionStorage') {
                sizes.sessionStorage = this.getSessionStorageSize();
            }
            
            if (storage === 'all' || storage === 'memory') {
                sizes.memory = this.getMemoryCacheSize();
            }
            
            if (storage === 'all' || storage === 'indexedDB') {
                sizes.indexedDB = await this.getIndexedDBSize();
            }
            
            return storage === 'all' ? sizes : sizes[storage] || 0;
            
        } catch (error) {
            console.error('获取存储大小失败:', error);
            return 0;
        }
    }
    
    /**
     * IndexedDB 操作方法
     */
    async getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async setToIndexedDB(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.put({ key, ...value });
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async removeFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.delete(key);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async clearIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async getIndexedDBKeys() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const request = store.getAllKeys();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    /**
     * 压缩数据（简单实现）
     * @param {string} data - 数据
     * @returns {string} 压缩后的数据
     */
    compress(data) {
        // 这里使用简单的压缩算法，实际项目中可以使用 pako 等库
        try {
            return btoa(unescape(encodeURIComponent(data)));
        } catch (error) {
            console.warn('压缩失败，返回原始数据:', error);
            return data;
        }
    }
    
    /**
     * 解压缩数据
     * @param {string} data - 压缩的数据
     * @returns {string} 解压缩后的数据
     */
    decompress(data) {
        try {
            return decodeURIComponent(escape(atob(data)));
        } catch (error) {
            console.warn('解压缩失败，返回原始数据:', error);
            return data;
        }
    }
    
    /**
     * 加密数据（简单实现）
     * @param {string} data - 数据
     * @returns {string} 加密后的数据
     */
    encrypt(data) {
        // 这里使用简单的加密算法，实际项目中应该使用更安全的加密方法
        try {
            const key = this.options.encryptionKey;
            let encrypted = '';
            for (let i = 0; i < data.length; i++) {
                encrypted += String.fromCharCode(
                    data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return btoa(encrypted);
        } catch (error) {
            console.warn('加密失败，返回原始数据:', error);
            return data;
        }
    }
    
    /**
     * 解密数据
     * @param {string} data - 加密的数据
     * @returns {string} 解密后的数据
     */
    decrypt(data) {
        try {
            const key = this.options.encryptionKey;
            const encrypted = atob(data);
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                decrypted += String.fromCharCode(
                    encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return decrypted;
        } catch (error) {
            console.warn('解密失败，返回原始数据:', error);
            return data;
        }
    }
    
    /**
     * 获取数据大小
     * @param {any} data - 数据
     * @returns {number} 大小（字节）
     */
    getDataSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        return new Blob([JSON.stringify(data)]).size;
    }
    
    /**
     * 检查缓存是否过期
     * @param {string} key - 键
     * @returns {boolean} 是否过期
     */
    isExpired(key) {
        const metadata = this.cacheMetadata.get(key);
        if (!metadata) {
            return true;
        }
        
        return Date.now() - metadata.timestamp > this.options.cacheExpiration;
    }
    
    /**
     * 更新缓存元数据
     * @param {string} key - 键
     */
    updateCacheMetadata(key) {
        const metadata = this.cacheMetadata.get(key);
        if (metadata) {
            metadata.accessCount++;
            metadata.lastAccess = Date.now();
        }
    }
    
    /**
     * 强制执行内存限制
     */
    enforceMemoryLimit() {
        const currentSize = this.getMemoryCacheSize();
        const maxSize = this.options.maxMemoryCacheSize * 1024 * 1024; // 转换为字节
        
        if (currentSize > maxSize) {
            // 按最少使用算法清理缓存
            const entries = Array.from(this.cacheMetadata.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            let removedSize = 0;
            for (const [key] of entries) {
                const metadata = this.cacheMetadata.get(key);
                removedSize += metadata.size;
                
                this.memoryCache.delete(key);
                this.cacheMetadata.delete(key);
                
                if (currentSize - removedSize <= maxSize * 0.8) {
                    break;
                }
            }
            
            if (this.options.debug) {
                console.log(`内存缓存清理完成，释放了 ${removedSize} 字节`);
            }
        }
    }
    
    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        let cleanedCount = 0;
        
        for (const [key] of this.memoryCache.entries()) {
            if (this.isExpired(key)) {
                this.memoryCache.delete(key);
                this.cacheMetadata.delete(key);
                cleanedCount++;
            }
        }
        
        if (this.options.debug && cleanedCount > 0) {
            console.log(`清理了 ${cleanedCount} 个过期缓存项`);
        }
        
        // 定期清理
        setTimeout(() => this.cleanExpiredCache(), 60000); // 1分钟
    }
    
    /**
     * 获取各种存储的大小
     */
    getLocalStorageSize() {
        let size = 0;
        for (const key in localStorage) {
            if (key.startsWith(this.options.prefix)) {
                size += localStorage[key].length;
            }
        }
        return size;
    }
    
    getSessionStorageSize() {
        let size = 0;
        for (const key in sessionStorage) {
            if (key.startsWith(this.options.prefix)) {
                size += sessionStorage[key].length;
            }
        }
        return size;
    }
    
    getMemoryCacheSize() {
        let size = 0;
        for (const metadata of this.cacheMetadata.values()) {
            size += metadata.size;
        }
        return size;
    }
    
    async getIndexedDBSize() {
        if (!this.db) {
            return 0;
        }
        
        // IndexedDB 大小估算（简化实现）
        try {
            const keys = await this.getIndexedDBKeys();
            return keys.length * 1024; // 粗略估算
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * 启动云同步
     */
    startCloudSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncStatus.enabled = true;
        
        this.syncTimer = setInterval(() => {
            this.performCloudSync();
        }, this.options.syncInterval);
        
        if (this.options.debug) {
            console.log('云同步已启动');
        }
    }
    
    /**
     * 停止云同步
     */
    stopCloudSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        
        this.syncStatus.enabled = false;
        
        if (this.options.debug) {
            console.log('云同步已停止');
        }
    }
    
    /**
     * 执行云同步
     */
    async performCloudSync() {
        if (this.syncStatus.inProgress) {
            return;
        }
        
        this.syncStatus.inProgress = true;
        
        try {
            // 这里应该实现具体的云同步逻辑
            // 根据 cloudProvider 选择不同的同步策略
            
            this.syncStatus.lastSync = Date.now();
            this.stats.syncOperations++;
            
            this.emit('syncCompleted', {
                timestamp: this.syncStatus.lastSync,
                provider: this.options.cloudProvider
            });
            
            if (this.options.debug) {
                console.log('云同步完成');
            }
            
        } catch (error) {
            console.error('云同步失败:', error);
            this.syncStatus.errors.push({
                error: error.message,
                timestamp: Date.now()
            });
            
            this.emit('syncError', { error });
        } finally {
            this.syncStatus.inProgress = false;
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            memoryCache: {
                size: this.getMemoryCacheSize(),
                count: this.memoryCache.size,
                hitRate: this.stats.reads > 0 ? 
                    (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100 : 0
            },
            sync: {
                ...this.syncStatus,
                errorCount: this.syncStatus.errors.length
            }
        };
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    off(event, listener) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error('存储事件监听器执行出错:', error);
                }
            }
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopCloudSync();
        
        if (this.db) {
            this.db.close();
        }
        
        this.memoryCache.clear();
        this.cacheMetadata.clear();
        this.adapters.clear();
        this.eventListeners.clear();
        
        if (this.options.debug) {
            console.log('StorageManager资源已清理');
        }
    }
}

export default StorageManager;