/**
 * 内存管理器
 * 优化TensorFlow.js模型和滤波器的内存使用
 */
export class MemoryManager {
    constructor() {
        this.memoryPool = new Map();
        this.tensorCache = new Map();
        this.cleanupInterval = null;
        this.memoryThreshold = {
            warning: 200 * 1024 * 1024, // 200MB - 提高警告阈值，适应AI模型内存需求
            critical: 400 * 1024 * 1024, // 400MB - 提高临界阈值
            cleanup: 300 * 1024 * 1024   // 300MB - 提高清理阈值
        };
        this.isMonitoring = false;
        this.cleanupCallbacks = new Set();
        this._lastWarningTime = null; // 用于控制警告频率
    }

    /**
     * 初始化内存管理器
     * @param {Object} options - 配置选项
     */
    init(options = {}) {
        this.memoryThreshold = {
            ...this.memoryThreshold,
            ...options.memoryThreshold
        };

        // 启动内存监控
        this.startMemoryMonitoring();
        
        // 注册全局错误处理
        this._registerGlobalHandlers();
        
        console.log('🧠 内存管理器已初始化');
    }

    /**
     * 启动内存监控
     */
    startMemoryMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.cleanupInterval = setInterval(() => {
            this._checkMemoryUsage();
        }, 5000); // 每5秒检查一次
        
        console.log('📊 内存监控已启动');
    }

    /**
     * 停止内存监控
     */
    stopMemoryMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        console.log('📊 内存监控已停止');
    }

    /**
     * 创建内存池对象
     * @param {string} key - 对象键
     * @param {Function} factory - 工厂函数
     * @param {Object} options - 选项
     * @returns {Object} 池化对象
     */
    createPooledObject(key, factory, options = {}) {
        if (this.memoryPool.has(key)) {
            const pooled = this.memoryPool.get(key);
            pooled.lastUsed = Date.now();
            return pooled.object;
        }

        const object = factory();
        const pooledObject = {
            object,
            created: Date.now(),
            lastUsed: Date.now(),
            size: options.size || 0,
            dispose: options.dispose || (() => {})
        };

        this.memoryPool.set(key, pooledObject);
        console.log(`🏊 创建池化对象: ${key}`);
        
        return object;
    }

    /**
     * 释放池化对象
     * @param {string} key - 对象键
     */
    releasePooledObject(key) {
        const pooled = this.memoryPool.get(key);
        if (pooled) {
            try {
                pooled.dispose();
            } catch (error) {
                console.warn(`⚠️ 释放对象失败: ${key}`, error);
            }
            this.memoryPool.delete(key);
            console.log(`🗑️ 释放池化对象: ${key}`);
        }
    }

    /**
     * 缓存张量
     * @param {string} key - 缓存键
     * @param {tf.Tensor} tensor - 张量
     * @param {number} ttl - 生存时间（毫秒）
     */
    cacheTensor(key, tensor, ttl = 60000) {
        // 清理过期的张量
        this._cleanupExpiredTensors();
        
        // 检查内存使用
        if (this._shouldSkipCaching()) {
            console.warn('⚠️ 内存使用过高，跳过张量缓存');
            return;
        }

        const cached = {
            tensor: tensor.clone(),
            created: Date.now(),
            ttl,
            size: tensor.size * 4 // 假设float32
        };

        this.tensorCache.set(key, cached);
        console.log(`💾 缓存张量: ${key}, 大小: ${cached.size} bytes`);
    }

    /**
     * 获取缓存的张量
     * @param {string} key - 缓存键
     * @returns {tf.Tensor|null} 张量或null
     */
    getCachedTensor(key) {
        const cached = this.tensorCache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.created > cached.ttl) {
            this._disposeCachedTensor(key);
            return null;
        }

        return cached.tensor.clone();
    }

    /**
     * 清理所有缓存的张量
     */
    clearTensorCache() {
        for (const key of this.tensorCache.keys()) {
            this._disposeCachedTensor(key);
        }
        console.log('🧹 张量缓存已清理');
    }

    /**
     * 执行内存清理
     * @param {boolean} force - 是否强制清理
     */
    cleanup(force = false) {
        console.log('🧹 开始内存清理...');
        
        const memoryBefore = this.getMemoryUsage();
        
        // 清理过期的池化对象
        this._cleanupExpiredPooledObjects(force);
        
        // 清理过期的张量
        this._cleanupExpiredTensors(force);
        
        // 清理TensorFlow.js内存
        this._cleanupTensorFlowMemory();
        
        // 触发垃圾回收（如果可用）
        this._triggerGarbageCollection();
        
        const memoryAfter = this.getMemoryUsage();
        const freed = memoryBefore.used - memoryAfter.used;
        
        console.log(`✅ 内存清理完成，释放: ${freed}MB`);
        
        // 通知清理回调
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback({ before: memoryBefore, after: memoryAfter, freed });
            } catch (error) {
                console.warn('⚠️ 清理回调执行失败:', error);
            }
        });
    }

    /**
     * 注册清理回调
     * @param {Function} callback - 回调函数
     */
    onCleanup(callback) {
        this.cleanupCallbacks.add(callback);
    }

    /**
     * 移除清理回调
     * @param {Function} callback - 回调函数
     */
    offCleanup(callback) {
        this.cleanupCallbacks.delete(callback);
    }

    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryUsage() {
        const usage = {
            used: 0,
            total: 0,
            limit: 0,
            tensorflow: null,
            pooled: 0,
            cached: 0
        };

        // 浏览器内存信息
        if (performance.memory) {
            usage.used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            usage.total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            usage.limit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        }

        // TensorFlow.js内存信息
        if (window.tf && window.tf.memory) {
            const tfMemory = window.tf.memory();
            usage.tensorflow = {
                tensors: tfMemory.numTensors,
                dataBuffers: tfMemory.numDataBuffers,
                bytes: Math.round(tfMemory.numBytes / 1024 / 1024)
            };
        }

        // 池化对象内存
        usage.pooled = Array.from(this.memoryPool.values())
            .reduce((total, obj) => total + (obj.size || 0), 0) / 1024 / 1024;

        // 缓存张量内存
        usage.cached = Array.from(this.tensorCache.values())
            .reduce((total, cached) => total + cached.size, 0) / 1024 / 1024;

        return usage;
    }

    /**
     * 获取内存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            memoryUsage: this.getMemoryUsage(),
            pooledObjects: this.memoryPool.size,
            cachedTensors: this.tensorCache.size,
            isMonitoring: this.isMonitoring,
            thresholds: this.memoryThreshold
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 检查内存使用情况
     * @private
     */
    _checkMemoryUsage() {
        const usage = this.getMemoryUsage();
        const usedBytes = usage.used * 1024 * 1024;

        if (usedBytes > this.memoryThreshold.critical) {
            console.warn('🚨 内存使用达到临界值，执行强制清理');
            this.cleanup(true);
        } else if (usedBytes > this.memoryThreshold.cleanup) {
            console.warn('⚠️ 内存使用过高，执行清理');
            this.cleanup(false);
        } else if (usedBytes > this.memoryThreshold.warning) {
            // 减少警告频率，避免在模型加载期间过度警告
            if (!this._lastWarningTime || Date.now() - this._lastWarningTime > 30000) {
                console.warn(`⚠️ 内存使用警告: ${Math.round(usedBytes / 1024 / 1024)}MB / ${Math.round(this.memoryThreshold.warning / 1024 / 1024)}MB`);
                this._lastWarningTime = Date.now();
            }
        }
    }

    /**
     * 清理过期的池化对象
     * @private
     * @param {boolean} force - 是否强制清理
     */
    _cleanupExpiredPooledObjects(force = false) {
        const now = Date.now();
        const maxAge = force ? 0 : 5 * 60 * 1000; // 5分钟
        
        for (const [key, pooled] of this.memoryPool.entries()) {
            if (now - pooled.lastUsed > maxAge) {
                this.releasePooledObject(key);
            }
        }
    }

    /**
     * 清理过期的张量
     * @private
     * @param {boolean} force - 是否强制清理
     */
    _cleanupExpiredTensors(force = false) {
        const now = Date.now();
        
        for (const [key, cached] of this.tensorCache.entries()) {
            if (force || now - cached.created > cached.ttl) {
                this._disposeCachedTensor(key);
            }
        }
    }

    /**
     * 释放缓存的张量
     * @private
     * @param {string} key - 缓存键
     */
    _disposeCachedTensor(key) {
        const cached = this.tensorCache.get(key);
        if (cached) {
            try {
                cached.tensor.dispose();
            } catch (error) {
                console.warn(`⚠️ 释放张量失败: ${key}`, error);
            }
            this.tensorCache.delete(key);
        }
    }

    /**
     * 清理TensorFlow.js内存
     * @private
     */
    _cleanupTensorFlowMemory() {
        if (!window.tf) return;
        
        try {
            // 清理变量
            window.tf.disposeVariables();
            
            // 清理孤立的张量
            const numTensorsBefore = window.tf.memory().numTensors;
            window.tf.tidy(() => {});
            const numTensorsAfter = window.tf.memory().numTensors;
            
            if (numTensorsBefore > numTensorsAfter) {
                console.log(`🧹 清理了 ${numTensorsBefore - numTensorsAfter} 个张量`);
            }
        } catch (error) {
            console.warn('⚠️ TensorFlow.js内存清理失败:', error);
        }
    }

    /**
     * 触发垃圾回收
     * @private
     */
    _triggerGarbageCollection() {
        if (window.gc && typeof window.gc === 'function') {
            try {
                window.gc();
                console.log('🗑️ 手动触发垃圾回收');
            } catch (error) {
                console.warn('⚠️ 垃圾回收失败:', error);
            }
        }
    }

    /**
     * 判断是否应该跳过缓存
     * @private
     * @returns {boolean}
     */
    _shouldSkipCaching() {
        const usage = this.getMemoryUsage();
        return usage.used * 1024 * 1024 > this.memoryThreshold.cleanup;
    }

    /**
     * 注册全局处理器
     * @private
     */
    _registerGlobalHandlers() {
        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
            this.cleanup(true);
            this.stopMemoryMonitoring();
        });

        // 页面隐藏时清理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.cleanup(false);
            }
        });
    }
}

// 创建单例实例
export const memoryManager = new MemoryManager();