/**
 * 智能缓存系统升级
 * 实现高级缓存策略、预测性缓存、自适应优化
 * 基于架构设计文档要求实现
 */

/**
 * 缓存策略枚举
 */
export const CacheStrategy = {
    LRU: 'lru',                    // 最近最少使用
    LFU: 'lfu',                    // 最少使用频率
    FIFO: 'fifo',                  // 先进先出
    TTL: 'ttl',                    // 生存时间
    ADAPTIVE: 'adaptive',          // 自适应
    PREDICTIVE: 'predictive',      // 预测性
    HIERARCHICAL: 'hierarchical',  // 分层
    INTELLIGENT: 'intelligent'     // 智能
};

/**
 * 缓存层级枚举
 */
export const CacheLevel = {
    L1_MEMORY: 'l1_memory',        // L1内存缓存
    L2_WORKER: 'l2_worker',        // L2工作线程缓存
    L3_INDEXEDDB: 'l3_indexeddb',  // L3 IndexedDB缓存
    L4_LOCALSTORAGE: 'l4_localstorage', // L4 LocalStorage缓存
    L5_NETWORK: 'l5_network'       // L5网络缓存
};

/**
 * 数据访问模式枚举
 */
export const AccessPattern = {
    SEQUENTIAL: 'sequential',      // 顺序访问
    RANDOM: 'random',             // 随机访问
    TEMPORAL: 'temporal',         // 时间局部性
    SPATIAL: 'spatial',           // 空间局部性
    BURST: 'burst',               // 突发访问
    PERIODIC: 'periodic'          // 周期性访问
};

/**
 * 缓存项元数据类
 */
class CacheMetadata {
    constructor(key, options = {}) {
        this.key = key;
        this.size = options.size || 0;
        this.priority = options.priority || 1;
        this.accessCount = 0;
        this.hitCount = 0;
        this.missCount = 0;
        this.createdAt = Date.now();
        this.lastAccessTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.expiresAt = options.ttl ? Date.now() + options.ttl : null;
        this.tags = options.tags || [];
        this.dependencies = options.dependencies || [];
        this.accessPattern = AccessPattern.RANDOM;
        this.predictedNextAccess = null;
        this.compressionRatio = 1;
        this.serializationTime = 0;
        this.deserializationTime = 0;
        this.networkLatency = 0;
        this.costScore = 0;
        this.qualityScore = 1;
        this.staleness = 0;
    }
    
    /**
     * 记录访问
     */
    recordAccess(hit = true) {
        this.accessCount++;
        this.lastAccessTime = Date.now();
        
        if (hit) {
            this.hitCount++;
        } else {
            this.missCount++;
        }
        
        this._updateAccessPattern();
        this._predictNextAccess();
    }
    
    /**
     * 获取命中率
     */
    getHitRate() {
        return this.accessCount > 0 ? this.hitCount / this.accessCount : 0;
    }
    
    /**
     * 获取访问频率
     */
    getAccessFrequency() {
        const ageInMs = Date.now() - this.createdAt;
        return ageInMs > 0 ? this.accessCount / ageInMs : 0;
    }
    
    /**
     * 检查是否过期
     */
    isExpired() {
        return this.expiresAt && Date.now() > this.expiresAt;
    }
    
    /**
     * 计算优先级分数
     */
    calculatePriorityScore() {
        const hitRate = this.getHitRate();
        const frequency = this.getAccessFrequency();
        const recency = 1 / (Date.now() - this.lastAccessTime + 1);
        const quality = this.qualityScore;
        const cost = 1 / (this.costScore + 1);
        
        return (hitRate * 0.3 + frequency * 0.25 + recency * 0.2 + quality * 0.15 + cost * 0.1) * this.priority;
    }
    
    /**
     * 更新访问模式
     */
    _updateAccessPattern() {
        // 简化的访问模式检测
        const timeSinceLastAccess = Date.now() - this.lastAccessTime;
        
        if (timeSinceLastAccess < 1000) {
            this.accessPattern = AccessPattern.BURST;
        } else if (this.accessCount > 10) {
            const avgInterval = (Date.now() - this.createdAt) / this.accessCount;
            if (avgInterval < 5000) {
                this.accessPattern = AccessPattern.TEMPORAL;
            } else {
                this.accessPattern = AccessPattern.PERIODIC;
            }
        }
    }
    
    /**
     * 预测下次访问时间
     */
    _predictNextAccess() {
        if (this.accessCount < 3) return;
        
        const avgInterval = (Date.now() - this.createdAt) / this.accessCount;
        
        switch (this.accessPattern) {
            case AccessPattern.PERIODIC:
                this.predictedNextAccess = this.lastAccessTime + avgInterval;
                break;
            case AccessPattern.TEMPORAL:
                this.predictedNextAccess = this.lastAccessTime + avgInterval * 0.5;
                break;
            case AccessPattern.BURST:
                this.predictedNextAccess = this.lastAccessTime + 100;
                break;
            default:
                this.predictedNextAccess = this.lastAccessTime + avgInterval * 2;
        }
    }
}

/**
 * 智能缓存项类
 */
class SmartCacheItem {
    constructor(key, value, options = {}) {
        this.key = key;
        this.value = value;
        this.metadata = new CacheMetadata(key, options);
        this.compressed = false;
        this.serialized = false;
        this.originalSize = this._calculateSize(value);
        this.compressedSize = this.originalSize;
        
        // 自动压缩大数据
        if (this.originalSize > (options.compressionThreshold || 10240)) {
            this._compress();
        }
    }
    
    /**
     * 获取值
     */
    getValue() {
        const startTime = performance.now();
        
        let result = this.value;
        
        if (this.compressed) {
            result = this._decompress(result);
        }
        
        if (this.serialized) {
            result = this._deserialize(result);
        }
        
        this.metadata.deserializationTime = performance.now() - startTime;
        this.metadata.recordAccess(true);
        
        return result;
    }
    
    /**
     * 设置值
     */
    setValue(value, options = {}) {
        const startTime = performance.now();
        
        this.value = value;
        this.originalSize = this._calculateSize(value);
        this.compressedSize = this.originalSize;
        this.compressed = false;
        this.serialized = false;
        
        // 更新元数据
        this.metadata.lastUpdateTime = Date.now();
        this.metadata.size = this.originalSize;
        
        // 自动压缩
        if (this.originalSize > (options.compressionThreshold || 10240)) {
            this._compress();
        }
        
        this.metadata.serializationTime = performance.now() - startTime;
    }
    
    /**
     * 获取实际大小
     */
    getSize() {
        return this.compressed ? this.compressedSize : this.originalSize;
    }
    
    /**
     * 检查是否有效
     */
    isValid() {
        return !this.metadata.isExpired() && this.value !== null && this.value !== undefined;
    }
    
    /**
     * 克隆缓存项
     */
    clone() {
        const cloned = new SmartCacheItem(this.key, this.value);
        cloned.metadata = Object.assign(Object.create(Object.getPrototypeOf(this.metadata)), this.metadata);
        cloned.compressed = this.compressed;
        cloned.serialized = this.serialized;
        cloned.originalSize = this.originalSize;
        cloned.compressedSize = this.compressedSize;
        return cloned;
    }
    
    /**
     * 计算数据大小
     */
    _calculateSize(value) {
        if (value === null || value === undefined) return 0;
        
        if (typeof value === 'string') {
            return value.length * 2; // Unicode字符
        }
        
        if (value instanceof ArrayBuffer) {
            return value.byteLength;
        }
        
        if (value instanceof Blob) {
            return value.size;
        }
        
        // 估算对象大小
        try {
            return JSON.stringify(value).length * 2;
        } catch {
            return 1024; // 默认大小
        }
    }
    
    /**
     * 压缩数据
     */
    _compress() {
        try {
            if (typeof this.value === 'string') {
                // 简单的字符串压缩（实际应用中可使用LZ4、Gzip等）
                const compressed = this._simpleCompress(this.value);
                this.compressedSize = compressed.length;
                this.metadata.compressionRatio = this.originalSize / this.compressedSize;
                this.value = compressed;
                this.compressed = true;
            } else if (typeof this.value === 'object') {
                // 对象序列化后压缩
                const serialized = JSON.stringify(this.value);
                const compressed = this._simpleCompress(serialized);
                this.compressedSize = compressed.length;
                this.metadata.compressionRatio = this.originalSize / this.compressedSize;
                this.value = compressed;
                this.compressed = true;
                this.serialized = true;
            }
        } catch (error) {
            console.warn('压缩失败:', error);
        }
    }
    
    /**
     * 解压缩数据
     */
    _decompress(compressedValue) {
        try {
            return this._simpleDecompress(compressedValue);
        } catch (error) {
            console.warn('解压缩失败:', error);
            return compressedValue;
        }
    }
    
    /**
     * 反序列化数据
     */
    _deserialize(serializedValue) {
        try {
            return JSON.parse(serializedValue);
        } catch (error) {
            console.warn('反序列化失败:', error);
            return serializedValue;
        }
    }
    
    /**
     * 简单压缩算法（示例）
     */
    _simpleCompress(str) {
        // 简化的RLE压缩
        let compressed = '';
        let count = 1;
        let current = str[0];
        
        for (let i = 1; i < str.length; i++) {
            if (str[i] === current && count < 255) {
                count++;
            } else {
                compressed += count > 1 ? `${count}${current}` : current;
                current = str[i];
                count = 1;
            }
        }
        
        compressed += count > 1 ? `${count}${current}` : current;
        return compressed.length < str.length ? compressed : str;
    }
    
    /**
     * 简单解压缩算法（示例）
     */
    _simpleDecompress(compressed) {
        let decompressed = '';
        let i = 0;
        
        while (i < compressed.length) {
            const char = compressed[i];
            
            if (i + 1 < compressed.length && /\d/.test(char)) {
                const count = parseInt(char);
                const repeatChar = compressed[i + 1];
                decompressed += repeatChar.repeat(count);
                i += 2;
            } else {
                decompressed += char;
                i++;
            }
        }
        
        return decompressed;
    }
}

/**
 * 预测性缓存引擎
 */
class PredictiveCacheEngine {
    constructor(options = {}) {
        this.options = {
            predictionWindow: options.predictionWindow || 60000, // 1分钟
            minConfidence: options.minConfidence || 0.7,
            maxPredictions: options.maxPredictions || 100,
            learningRate: options.learningRate || 0.1,
            ...options
        };
        
        this.accessHistory = [];
        this.patterns = new Map();
        this.predictions = new Map();
        this.confidence = new Map();
        this.isLearning = true;
    }
    
    /**
     * 记录访问
     */
    recordAccess(key, timestamp = Date.now()) {
        this.accessHistory.push({ key, timestamp });
        
        // 保持历史大小
        if (this.accessHistory.length > 1000) {
            this.accessHistory = this.accessHistory.slice(-500);
        }
        
        if (this.isLearning) {
            this._updatePatterns(key, timestamp);
        }
        
        this._generatePredictions();
    }
    
    /**
     * 获取预测
     */
    getPredictions(currentTime = Date.now()) {
        const validPredictions = [];
        
        this.predictions.forEach((prediction, key) => {
            if (prediction.timestamp > currentTime && 
                this.confidence.get(key) >= this.options.minConfidence) {
                validPredictions.push({
                    key,
                    timestamp: prediction.timestamp,
                    confidence: this.confidence.get(key),
                    priority: prediction.priority
                });
            }
        });
        
        return validPredictions.sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * 验证预测
     */
    validatePrediction(key, actualTimestamp) {
        const prediction = this.predictions.get(key);
        if (!prediction) return;
        
        const error = Math.abs(actualTimestamp - prediction.timestamp);
        const accuracy = Math.max(0, 1 - error / this.options.predictionWindow);
        
        // 更新置信度
        const currentConfidence = this.confidence.get(key) || 0.5;
        const newConfidence = currentConfidence + this.options.learningRate * (accuracy - currentConfidence);
        this.confidence.set(key, Math.max(0, Math.min(1, newConfidence)));
    }
    
    /**
     * 更新模式
     */
    _updatePatterns(key, timestamp) {
        const recentAccesses = this.accessHistory
            .filter(access => access.key === key)
            .slice(-10);
        
        if (recentAccesses.length < 2) return;
        
        // 计算访问间隔
        const intervals = [];
        for (let i = 1; i < recentAccesses.length; i++) {
            intervals.push(recentAccesses[i].timestamp - recentAccesses[i - 1].timestamp);
        }
        
        // 更新模式
        const pattern = this.patterns.get(key) || { intervals: [], avgInterval: 0, variance: 0 };
        pattern.intervals = [...pattern.intervals, ...intervals].slice(-20);
        pattern.avgInterval = pattern.intervals.reduce((sum, interval) => sum + interval, 0) / pattern.intervals.length;
        
        // 计算方差
        const variance = pattern.intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - pattern.avgInterval, 2);
        }, 0) / pattern.intervals.length;
        pattern.variance = variance;
        
        this.patterns.set(key, pattern);
    }
    
    /**
     * 生成预测
     */
    _generatePredictions() {
        const currentTime = Date.now();
        
        this.patterns.forEach((pattern, key) => {
            if (pattern.intervals.length < 3) return;
            
            const lastAccess = this.accessHistory
                .filter(access => access.key === key)
                .pop();
            
            if (!lastAccess) return;
            
            // 预测下次访问时间
            const predictedTime = lastAccess.timestamp + pattern.avgInterval;
            
            if (predictedTime > currentTime && predictedTime < currentTime + this.options.predictionWindow) {
                // 计算优先级（基于访问频率和规律性）
                const frequency = pattern.intervals.length / (currentTime - this.accessHistory[0].timestamp);
                const regularity = 1 / (1 + pattern.variance / pattern.avgInterval);
                const priority = frequency * regularity;
                
                this.predictions.set(key, {
                    timestamp: predictedTime,
                    priority,
                    confidence: this.confidence.get(key) || 0.5
                });
            }
        });
        
        // 清理过期预测
        this.predictions.forEach((prediction, key) => {
            if (prediction.timestamp < currentTime) {
                this.predictions.delete(key);
            }
        });
    }
}

/**
 * 自适应缓存策略管理器
 */
class AdaptiveCacheStrategy {
    constructor(options = {}) {
        this.options = {
            adaptationInterval: options.adaptationInterval || 30000, // 30秒
            performanceThreshold: options.performanceThreshold || 0.8,
            strategyChangeThreshold: options.strategyChangeThreshold || 0.1,
            ...options
        };
        
        this.currentStrategy = CacheStrategy.LRU;
        this.strategies = new Map([
            [CacheStrategy.LRU, { weight: 1, performance: 0.5 }],
            [CacheStrategy.LFU, { weight: 1, performance: 0.5 }],
            [CacheStrategy.TTL, { weight: 1, performance: 0.5 }],
            [CacheStrategy.ADAPTIVE, { weight: 1, performance: 0.5 }]
        ]);
        
        this.performanceHistory = [];
        this.lastAdaptation = Date.now();
        this.adaptationTimer = null;
        
        this._startAdaptation();
    }
    
    /**
     * 获取当前策略
     */
    getCurrentStrategy() {
        return this.currentStrategy;
    }
    
    /**
     * 记录性能指标
     */
    recordPerformance(hitRate, latency, memoryUsage) {
        const performance = {
            strategy: this.currentStrategy,
            hitRate,
            latency,
            memoryUsage,
            timestamp: Date.now(),
            score: this._calculatePerformanceScore(hitRate, latency, memoryUsage)
        };
        
        this.performanceHistory.push(performance);
        
        // 保持历史大小
        if (this.performanceHistory.length > 100) {
            this.performanceHistory = this.performanceHistory.slice(-50);
        }
        
        // 更新策略性能
        const strategyInfo = this.strategies.get(this.currentStrategy);
        if (strategyInfo) {
            strategyInfo.performance = performance.score;
        }
    }
    
    /**
     * 强制适应
     */
    adapt() {
        if (this.performanceHistory.length < 10) return;
        
        const currentPerformance = this._getCurrentPerformance();
        const bestStrategy = this._findBestStrategy();
        
        if (bestStrategy !== this.currentStrategy) {
            const improvement = this.strategies.get(bestStrategy).performance - currentPerformance;
            
            if (improvement > this.options.strategyChangeThreshold) {
                console.log(`缓存策略适应: ${this.currentStrategy} -> ${bestStrategy}`);
                this.currentStrategy = bestStrategy;
                this.lastAdaptation = Date.now();
            }
        }
    }
    
    /**
     * 停止适应
     */
    stop() {
        if (this.adaptationTimer) {
            clearInterval(this.adaptationTimer);
            this.adaptationTimer = null;
        }
    }
    
    /**
     * 计算性能分数
     */
    _calculatePerformanceScore(hitRate, latency, memoryUsage) {
        // 归一化指标
        const normalizedHitRate = Math.max(0, Math.min(1, hitRate));
        const normalizedLatency = Math.max(0, Math.min(1, 1 - latency / 1000)); // 假设1秒为最大延迟
        const normalizedMemory = Math.max(0, Math.min(1, 1 - memoryUsage)); // 内存使用率越低越好
        
        // 加权计算
        return normalizedHitRate * 0.5 + normalizedLatency * 0.3 + normalizedMemory * 0.2;
    }
    
    /**
     * 获取当前性能
     */
    _getCurrentPerformance() {
        const recentPerformance = this.performanceHistory
            .filter(p => p.strategy === this.currentStrategy)
            .slice(-10);
        
        if (recentPerformance.length === 0) return 0;
        
        return recentPerformance.reduce((sum, p) => sum + p.score, 0) / recentPerformance.length;
    }
    
    /**
     * 找到最佳策略
     */
    _findBestStrategy() {
        let bestStrategy = this.currentStrategy;
        let bestPerformance = this._getCurrentPerformance();
        
        this.strategies.forEach((info, strategy) => {
            if (info.performance > bestPerformance) {
                bestStrategy = strategy;
                bestPerformance = info.performance;
            }
        });
        
        return bestStrategy;
    }
    
    /**
     * 开始适应
     */
    _startAdaptation() {
        this.adaptationTimer = setInterval(() => {
            this.adapt();
        }, this.options.adaptationInterval);
    }
}

/**
 * 智能缓存系统主类
 */
class SmartCacheSystem {
    constructor(options = {}) {
        this.name = 'SmartCacheSystem';
        this.options = {
            maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB
            maxItems: options.maxItems || 10000,
            defaultTTL: options.defaultTTL || 3600000, // 1小时
            compressionThreshold: options.compressionThreshold || 10240, // 10KB
            enablePrediction: options.enablePrediction !== false,
            enableAdaptation: options.enableAdaptation !== false,
            enableCompression: options.enableCompression !== false,
            enableAnalytics: options.enableAnalytics !== false,
            cleanupInterval: options.cleanupInterval || 60000, // 1分钟
            ...options
        };
        
        // 多层缓存存储
        this.caches = new Map([
            [CacheLevel.L1_MEMORY, new Map()],
            [CacheLevel.L2_WORKER, new Map()],
            [CacheLevel.L3_INDEXEDDB, new Map()]
        ]);
        
        // 核心组件
        this.predictiveEngine = this.options.enablePrediction ? 
            new PredictiveCacheEngine() : null;
        this.adaptiveStrategy = this.options.enableAdaptation ? 
            new AdaptiveCacheStrategy() : null;
        
        // 统计信息
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            compressions: 0,
            predictions: 0,
            adaptations: 0,
            totalSize: 0,
            totalItems: 0,
            avgLatency: 0,
            memoryUsage: 0
        };
        
        // 性能监控
        this.performanceMonitor = {
            startTime: Date.now(),
            lastCleanup: Date.now(),
            operationTimes: [],
            hitRates: [],
            memoryUsages: []
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 定时器
        this.cleanupTimer = null;
        this.monitorTimer = null;
        
        this._initialize();
    }
    
    /**
     * 初始化系统
     */
    _initialize() {
        // 启动清理定时器
        this._startCleanup();
        
        // 启动性能监控
        if (this.options.enableAnalytics) {
            this._startMonitoring();
        }
        
        // 预热缓存
        this._warmupCache();
        
        console.log('智能缓存系统初始化完成');
    }
    
    /**
     * 获取缓存项
     */
    async get(key, level = CacheLevel.L1_MEMORY) {
        const startTime = performance.now();
        
        try {
            // 尝试从指定层级获取
            let item = await this._getFromLevel(key, level);
            
            if (item && item.isValid()) {
                this.stats.hits++;
                
                // 记录访问
                if (this.predictiveEngine) {
                    this.predictiveEngine.recordAccess(key);
                }
                
                // 提升到更高层级（缓存提升）
                if (level !== CacheLevel.L1_MEMORY) {
                    await this._promoteItem(key, item, level);
                }
                
                this._recordOperation('get', performance.now() - startTime, true);
                this._emitEvent('hit', { key, level, item });
                
                return item.getValue();
            }
            
            // 尝试从其他层级获取
            for (const [cacheLevel, cache] of this.caches) {
                if (cacheLevel === level) continue;
                
                item = await this._getFromLevel(key, cacheLevel);
                if (item && item.isValid()) {
                    this.stats.hits++;
                    
                    // 提升到请求的层级
                    await this._promoteItem(key, item, cacheLevel);
                    
                    this._recordOperation('get', performance.now() - startTime, true);
                    this._emitEvent('hit', { key, level: cacheLevel, item });
                    
                    return item.getValue();
                }
            }
            
            // 缓存未命中
            this.stats.misses++;
            this._recordOperation('get', performance.now() - startTime, false);
            this._emitEvent('miss', { key, level });
            
            return null;
            
        } catch (error) {
            console.error('缓存获取错误:', error);
            this.stats.misses++;
            this._recordOperation('get', performance.now() - startTime, false);
            return null;
        }
    }
    
    /**
     * 设置缓存项
     */
    async set(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            const level = options.level || CacheLevel.L1_MEMORY;
            const ttl = options.ttl || this.options.defaultTTL;
            
            // 创建智能缓存项
            const item = new SmartCacheItem(key, value, {
                ttl,
                priority: options.priority || 1,
                tags: options.tags || [],
                dependencies: options.dependencies || [],
                compressionThreshold: this.options.compressionThreshold
            });
            
            // 检查容量限制
            await this._ensureCapacity(item.getSize(), level);
            
            // 存储到指定层级
            await this._setToLevel(key, item, level);
            
            // 更新统计
            this.stats.totalItems++;
            this.stats.totalSize += item.getSize();
            
            if (item.compressed) {
                this.stats.compressions++;
            }
            
            this._recordOperation('set', performance.now() - startTime, true);
            this._emitEvent('set', { key, level, item });
            
            return true;
            
        } catch (error) {
            console.error('缓存设置错误:', error);
            this._recordOperation('set', performance.now() - startTime, false);
            return false;
        }
    }
    
    /**
     * 删除缓存项
     */
    async delete(key, level = null) {
        const startTime = performance.now();
        let deleted = false;
        
        try {
            if (level) {
                // 从指定层级删除
                deleted = await this._deleteFromLevel(key, level);
            } else {
                // 从所有层级删除
                for (const [cacheLevel] of this.caches) {
                    const result = await this._deleteFromLevel(key, cacheLevel);
                    deleted = deleted || result;
                }
            }
            
            this._recordOperation('delete', performance.now() - startTime, deleted);
            this._emitEvent('delete', { key, level, deleted });
            
            return deleted;
            
        } catch (error) {
            console.error('缓存删除错误:', error);
            this._recordOperation('delete', performance.now() - startTime, false);
            return false;
        }
    }
    
    /**
     * 清空缓存
     */
    async clear(level = null) {
        try {
            if (level) {
                const cache = this.caches.get(level);
                if (cache) {
                    cache.clear();
                }
            } else {
                this.caches.forEach(cache => cache.clear());
            }
            
            // 重置统计
            this.stats.totalItems = 0;
            this.stats.totalSize = 0;
            
            this._emitEvent('clear', { level });
            
        } catch (error) {
            console.error('缓存清空错误:', error);
        }
    }
    
    /**
     * 预热缓存
     */
    async warmup(items) {
        if (!Array.isArray(items)) return;
        
        const promises = items.map(item => {
            return this.set(item.key, item.value, item.options);
        });
        
        await Promise.all(promises);
        this._emitEvent('warmup', { count: items.length });
    }
    
    /**
     * 预取数据
     */
    async prefetch(keys, loader) {
        if (!this.predictiveEngine) return;
        
        const predictions = this.predictiveEngine.getPredictions();
        const prefetchKeys = keys.filter(key => 
            predictions.some(p => p.key === key && p.confidence > 0.7)
        );
        
        const promises = prefetchKeys.map(async key => {
            try {
                const value = await loader(key);
                if (value !== null && value !== undefined) {
                    await this.set(key, value, { level: CacheLevel.L2_WORKER });
                    this.stats.predictions++;
                }
            } catch (error) {
                console.warn(`预取失败 ${key}:`, error);
            }
        });
        
        await Promise.all(promises);
        this._emitEvent('prefetch', { keys: prefetchKeys });
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ? 
            this.stats.hits / (this.stats.hits + this.stats.misses) : 0;
        
        return {
            ...this.stats,
            hitRate,
            uptime: Date.now() - this.performanceMonitor.startTime,
            avgOperationTime: this._getAverageOperationTime(),
            memoryEfficiency: this._calculateMemoryEfficiency(),
            compressionRatio: this._calculateCompressionRatio()
        };
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            stats: this.getStats(),
            currentStrategy: this.adaptiveStrategy ? 
                this.adaptiveStrategy.getCurrentStrategy() : 'static',
            predictions: this.predictiveEngine ? 
                this.predictiveEngine.getPredictions().length : 0,
            cacheDistribution: this._getCacheDistribution(),
            topKeys: this._getTopKeys(),
            performanceHistory: this.performanceMonitor.hitRates.slice(-20)
        };
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
     * 清理资源
     */
    cleanup() {
        // 停止定时器
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
        
        // 停止适应性策略
        if (this.adaptiveStrategy) {
            this.adaptiveStrategy.stop();
        }
        
        // 清空缓存
        this.clear();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        console.log('智能缓存系统已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 从指定层级获取
     */
    async _getFromLevel(key, level) {
        const cache = this.caches.get(level);
        if (!cache) return null;
        
        switch (level) {
            case CacheLevel.L1_MEMORY:
                return cache.get(key);
            
            case CacheLevel.L2_WORKER:
                // 模拟Worker缓存访问
                return cache.get(key);
            
            case CacheLevel.L3_INDEXEDDB:
                // 模拟IndexedDB访问
                return cache.get(key);
            
            default:
                return null;
        }
    }
    
    /**
     * 设置到指定层级
     */
    async _setToLevel(key, item, level) {
        const cache = this.caches.get(level);
        if (!cache) return false;
        
        cache.set(key, item);
        return true;
    }
    
    /**
     * 从指定层级删除
     */
    async _deleteFromLevel(key, level) {
        const cache = this.caches.get(level);
        if (!cache) return false;
        
        const item = cache.get(key);
        if (item) {
            this.stats.totalSize -= item.getSize();
            this.stats.totalItems--;
            cache.delete(key);
            return true;
        }
        
        return false;
    }
    
    /**
     * 提升缓存项
     */
    async _promoteItem(key, item, fromLevel) {
        // 提升到L1内存缓存
        if (fromLevel !== CacheLevel.L1_MEMORY) {
            await this._setToLevel(key, item.clone(), CacheLevel.L1_MEMORY);
        }
    }
    
    /**
     * 确保容量
     */
    async _ensureCapacity(requiredSize, level) {
        const cache = this.caches.get(level);
        if (!cache) return;
        
        // 检查项目数量限制
        if (cache.size >= this.options.maxItems) {
            await this._evictItems(cache, Math.floor(this.options.maxItems * 0.1));
        }
        
        // 检查大小限制
        if (this.stats.totalSize + requiredSize > this.options.maxSize) {
            const targetSize = this.options.maxSize * 0.8;
            await this._evictBySize(cache, this.stats.totalSize - targetSize + requiredSize);
        }
    }
    
    /**
     * 按数量驱逐
     */
    async _evictItems(cache, count) {
        const strategy = this.adaptiveStrategy ? 
            this.adaptiveStrategy.getCurrentStrategy() : CacheStrategy.LRU;
        
        const items = Array.from(cache.entries());
        let toEvict = [];
        
        switch (strategy) {
            case CacheStrategy.LRU:
                toEvict = items
                    .sort((a, b) => a[1].metadata.lastAccessTime - b[1].metadata.lastAccessTime)
                    .slice(0, count);
                break;
            
            case CacheStrategy.LFU:
                toEvict = items
                    .sort((a, b) => a[1].metadata.accessCount - b[1].metadata.accessCount)
                    .slice(0, count);
                break;
            
            case CacheStrategy.TTL:
                toEvict = items
                    .filter(([key, item]) => item.metadata.isExpired())
                    .slice(0, count);
                break;
            
            default:
                toEvict = items
                    .sort((a, b) => a[1].metadata.calculatePriorityScore() - b[1].metadata.calculatePriorityScore())
                    .slice(0, count);
        }
        
        for (const [key, item] of toEvict) {
            cache.delete(key);
            this.stats.totalSize -= item.getSize();
            this.stats.totalItems--;
            this.stats.evictions++;
        }
    }
    
    /**
     * 按大小驱逐
     */
    async _evictBySize(cache, targetSize) {
        const items = Array.from(cache.entries())
            .sort((a, b) => a[1].metadata.calculatePriorityScore() - b[1].metadata.calculatePriorityScore());
        
        let evictedSize = 0;
        
        for (const [key, item] of items) {
            if (evictedSize >= targetSize) break;
            
            cache.delete(key);
            evictedSize += item.getSize();
            this.stats.totalSize -= item.getSize();
            this.stats.totalItems--;
            this.stats.evictions++;
        }
    }
    
    /**
     * 启动清理
     */
    _startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this._performCleanup();
        }, this.options.cleanupInterval);
    }
    
    /**
     * 执行清理
     */
    _performCleanup() {
        this.caches.forEach(cache => {
            const expiredKeys = [];
            
            cache.forEach((item, key) => {
                if (item.metadata.isExpired()) {
                    expiredKeys.push(key);
                }
            });
            
            expiredKeys.forEach(key => {
                const item = cache.get(key);
                if (item) {
                    cache.delete(key);
                    this.stats.totalSize -= item.getSize();
                    this.stats.totalItems--;
                }
            });
        });
        
        this.performanceMonitor.lastCleanup = Date.now();
    }
    
    /**
     * 启动监控
     */
    _startMonitoring() {
        this.monitorTimer = setInterval(() => {
            this._recordPerformanceMetrics();
        }, 5000); // 5秒
    }
    
    /**
     * 记录性能指标
     */
    _recordPerformanceMetrics() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ? 
            this.stats.hits / (this.stats.hits + this.stats.misses) : 0;
        
        this.performanceMonitor.hitRates.push(hitRate);
        this.performanceMonitor.memoryUsages.push(this.stats.totalSize / this.options.maxSize);
        
        // 保持历史大小
        if (this.performanceMonitor.hitRates.length > 100) {
            this.performanceMonitor.hitRates = this.performanceMonitor.hitRates.slice(-50);
            this.performanceMonitor.memoryUsages = this.performanceMonitor.memoryUsages.slice(-50);
        }
        
        // 更新适应性策略
        if (this.adaptiveStrategy) {
            this.adaptiveStrategy.recordPerformance(
                hitRate,
                this._getAverageOperationTime(),
                this.stats.totalSize / this.options.maxSize
            );
        }
    }
    
    /**
     * 记录操作
     */
    _recordOperation(operation, time, success) {
        this.performanceMonitor.operationTimes.push({ operation, time, success, timestamp: Date.now() });
        
        if (this.performanceMonitor.operationTimes.length > 1000) {
            this.performanceMonitor.operationTimes = this.performanceMonitor.operationTimes.slice(-500);
        }
    }
    
    /**
     * 获取平均操作时间
     */
    _getAverageOperationTime() {
        const recentOps = this.performanceMonitor.operationTimes.slice(-100);
        if (recentOps.length === 0) return 0;
        
        return recentOps.reduce((sum, op) => sum + op.time, 0) / recentOps.length;
    }
    
    /**
     * 计算内存效率
     */
    _calculateMemoryEfficiency() {
        if (this.stats.totalItems === 0) return 1;
        
        const avgItemSize = this.stats.totalSize / this.stats.totalItems;
        const efficiency = 1 / (1 + avgItemSize / 1024); // 归一化到KB
        
        return Math.max(0, Math.min(1, efficiency));
    }
    
    /**
     * 计算压缩比
     */
    _calculateCompressionRatio() {
        let totalOriginal = 0;
        let totalCompressed = 0;
        
        this.caches.forEach(cache => {
            cache.forEach(item => {
                totalOriginal += item.originalSize;
                totalCompressed += item.getSize();
            });
        });
        
        return totalOriginal > 0 ? totalOriginal / totalCompressed : 1;
    }
    
    /**
     * 获取缓存分布
     */
    _getCacheDistribution() {
        const distribution = {};
        
        this.caches.forEach((cache, level) => {
            distribution[level] = {
                items: cache.size,
                size: Array.from(cache.values()).reduce((sum, item) => sum + item.getSize(), 0)
            };
        });
        
        return distribution;
    }
    
    /**
     * 获取热门键
     */
    _getTopKeys(limit = 10) {
        const allItems = [];
        
        this.caches.forEach(cache => {
            cache.forEach((item, key) => {
                allItems.push({ key, ...item.metadata.getStats() });
            });
        });
        
        return allItems
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);
    }
    
    /**
     * 预热缓存
     */
    _warmupCache() {
        // 预热常用数据类型的缓存项
        const warmupItems = [
            { key: 'pose_model_metadata', value: { version: '1.0', size: 1024 } },
            { key: 'default_config', value: { fps: 30, quality: 'high' } },
            { key: 'user_preferences', value: { theme: 'light', language: 'zh' } }
        ];
        
        warmupItems.forEach(item => {
            this.set(item.key, item.value, { level: CacheLevel.L1_MEMORY });
        });
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
                    console.error(`缓存事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

export default SmartCacheSystem;
export {
    SmartCacheItem,
    CacheMetadata,
    PredictiveCacheEngine,
    AdaptiveCacheStrategy,
    CacheStrategy,
    CacheLevel,
    AccessPattern
};