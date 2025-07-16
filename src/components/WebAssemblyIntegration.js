/**
 * WebAssembly集成模块
 * 提升计算密集型任务的性能
 * 基于架构设计文档中期优化目标实现
 */

/**
 * WASM模块类型枚举
 */
export const WASMModuleType = {
    POSE_DETECTION: 'pose_detection',       // 姿态检测
    IMAGE_PROCESSING: 'image_processing',   // 图像处理
    MATH_OPERATIONS: 'math_operations',     // 数学运算
    FILTERING: 'filtering',                 // 滤波处理
    ANALYSIS: 'analysis',                   // 分析算法
    OPTIMIZATION: 'optimization'           // 优化算法
};

/**
 * WASM模块状态枚举
 */
export const WASMModuleStatus = {
    UNLOADED: 'unloaded',                  // 未加载
    LOADING: 'loading',                    // 加载中
    LOADED: 'loaded',                      // 已加载
    READY: 'ready',                        // 就绪
    ERROR: 'error',                        // 错误
    DISPOSED: 'disposed'                   // 已释放
};

/**
 * 数据类型枚举
 */
export const DataType = {
    UINT8: 'uint8',
    INT8: 'int8',
    UINT16: 'uint16',
    INT16: 'int16',
    UINT32: 'uint32',
    INT32: 'int32',
    FLOAT32: 'float32',
    FLOAT64: 'float64'
};

/**
 * WASM模块配置类
 */
class WASMModuleConfig {
    constructor(options = {}) {
        this.name = options.name || '';
        this.type = options.type || WASMModuleType.POSE_DETECTION;
        this.wasmPath = options.wasmPath || '';
        this.jsPath = options.jsPath || '';
        this.memoryPages = options.memoryPages || 256; // 16MB
        this.enableThreads = options.enableThreads || false;
        this.enableSIMD = options.enableSIMD || false;
        this.enableBulkMemory = options.enableBulkMemory || false;
        this.imports = options.imports || {};
        this.exports = options.exports || [];
        this.initData = options.initData || null;
        this.timeout = options.timeout || 30000; // 30秒
        this.retryCount = options.retryCount || 3;
        this.cacheEnabled = options.cacheEnabled !== false;
        this.compressionEnabled = options.compressionEnabled || false;
    }
    
    /**
     * 验证配置
     */
    validate() {
        const errors = [];
        
        if (!this.name) errors.push('模块名称不能为空');
        if (!this.wasmPath) errors.push('WASM文件路径不能为空');
        if (this.memoryPages < 1) errors.push('内存页数必须大于0');
        if (this.timeout < 1000) errors.push('超时时间不能少于1秒');
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * WASM模块实例类
 */
class WASMModuleInstance {
    constructor(config) {
        this.config = config;
        this.status = WASMModuleStatus.UNLOADED;
        this.module = null;
        this.instance = null;
        this.memory = null;
        this.exports = {};
        this.imports = {};
        this.loadTime = 0;
        this.lastUsed = 0;
        this.usageCount = 0;
        this.errorCount = 0;
        this.performance = {
            totalCalls: 0,
            totalTime: 0,
            avgTime: 0,
            minTime: Infinity,
            maxTime: 0
        };
        
        this.eventListeners = new Map();
        this.memoryViews = new Map();
        this.dataBuffers = new Map();
    }
    
    /**
     * 加载WASM模块
     */
    async load() {
        if (this.status === WASMModuleStatus.LOADED || this.status === WASMModuleStatus.READY) {
            return true;
        }
        
        this.status = WASMModuleStatus.LOADING;
        this._emitEvent('loading', { module: this.config.name });
        
        const startTime = performance.now();
        
        try {
            // 加载WASM文件
            const wasmBytes = await this._loadWASMFile();
            
            // 编译模块
            this.module = await WebAssembly.compile(wasmBytes);
            
            // 准备导入对象
            this._prepareImports();
            
            // 实例化模块
            this.instance = await WebAssembly.instantiate(this.module, this.imports);
            
            // 设置导出
            this.exports = this.instance.exports;
            
            // 设置内存
            this.memory = this.exports.memory;
            
            // 初始化内存视图
            this._initializeMemoryViews();
            
            // 执行初始化
            await this._initialize();
            
            this.loadTime = performance.now() - startTime;
            this.status = WASMModuleStatus.READY;
            this.lastUsed = Date.now();
            
            this._emitEvent('loaded', { 
                module: this.config.name, 
                loadTime: this.loadTime 
            });
            
            console.log(`WASM模块 ${this.config.name} 加载完成，耗时: ${this.loadTime.toFixed(2)}ms`);
            return true;
            
        } catch (error) {
            this.status = WASMModuleStatus.ERROR;
            this.errorCount++;
            
            this._emitEvent('error', { 
                module: this.config.name, 
                error: error.message 
            });
            
            console.error(`WASM模块 ${this.config.name} 加载失败:`, error);
            return false;
        }
    }
    
    /**
     * 调用WASM函数
     */
    call(functionName, ...args) {
        if (this.status !== WASMModuleStatus.READY) {
            throw new Error(`WASM模块 ${this.config.name} 未就绪`);
        }
        
        if (!this.exports[functionName]) {
            throw new Error(`函数 ${functionName} 不存在`);
        }
        
        const startTime = performance.now();
        
        try {
            const result = this.exports[functionName](...args);
            
            const callTime = performance.now() - startTime;
            this._updatePerformanceStats(callTime);
            this.lastUsed = Date.now();
            this.usageCount++;
            
            return result;
            
        } catch (error) {
            this.errorCount++;
            throw new Error(`WASM函数调用失败 (${functionName}): ${error.message}`);
        }
    }
    
    /**
     * 异步调用WASM函数
     */
    async callAsync(functionName, ...args) {
        return new Promise((resolve, reject) => {
            try {
                const result = this.call(functionName, ...args);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 写入数据到WASM内存
     */
    writeData(data, offset = 0, dataType = DataType.UINT8) {
        if (!this.memory) {
            throw new Error('WASM内存未初始化');
        }
        
        const view = this._getMemoryView(dataType);
        
        if (Array.isArray(data)) {
            view.set(data, offset);
        } else if (data instanceof ArrayBuffer) {
            const sourceView = new Uint8Array(data);
            const targetView = new Uint8Array(this.memory.buffer, offset, sourceView.length);
            targetView.set(sourceView);
        } else {
            throw new Error('不支持的数据类型');
        }
        
        return offset;
    }
    
    /**
     * 从WASM内存读取数据
     */
    readData(offset, length, dataType = DataType.UINT8) {
        if (!this.memory) {
            throw new Error('WASM内存未初始化');
        }
        
        const view = this._getMemoryView(dataType);
        return view.slice(offset, offset + length);
    }
    
    /**
     * 分配内存
     */
    allocateMemory(size) {
        if (!this.exports.malloc) {
            throw new Error('malloc函数不可用');
        }
        
        const pointer = this.exports.malloc(size);
        if (pointer === 0) {
            throw new Error('内存分配失败');
        }
        
        return pointer;
    }
    
    /**
     * 释放内存
     */
    freeMemory(pointer) {
        if (!this.exports.free) {
            throw new Error('free函数不可用');
        }
        
        this.exports.free(pointer);
    }
    
    /**
     * 获取模块信息
     */
    getInfo() {
        return {
            name: this.config.name,
            type: this.config.type,
            status: this.status,
            loadTime: this.loadTime,
            lastUsed: this.lastUsed,
            usageCount: this.usageCount,
            errorCount: this.errorCount,
            performance: { ...this.performance },
            memorySize: this.memory ? this.memory.buffer.byteLength : 0,
            availableFunctions: Object.keys(this.exports).filter(key => 
                typeof this.exports[key] === 'function'
            )
        };
    }
    
    /**
     * 重置性能统计
     */
    resetStats() {
        this.performance = {
            totalCalls: 0,
            totalTime: 0,
            avgTime: 0,
            minTime: Infinity,
            maxTime: 0
        };
        this.usageCount = 0;
        this.errorCount = 0;
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
     * 释放资源
     */
    dispose() {
        if (this.status === WASMModuleStatus.DISPOSED) return;
        
        // 清理内存视图
        this.memoryViews.clear();
        this.dataBuffers.clear();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        // 重置引用
        this.module = null;
        this.instance = null;
        this.memory = null;
        this.exports = {};
        this.imports = {};
        
        this.status = WASMModuleStatus.DISPOSED;
        
        console.log(`WASM模块 ${this.config.name} 已释放`);
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 加载WASM文件
     */
    async _loadWASMFile() {
        const response = await fetch(this.config.wasmPath);
        if (!response.ok) {
            throw new Error(`无法加载WASM文件: ${response.statusText}`);
        }
        
        return await response.arrayBuffer();
    }
    
    /**
     * 准备导入对象
     */
    _prepareImports() {
        this.imports = {
            env: {
                memory: new WebAssembly.Memory({ 
                    initial: this.config.memoryPages,
                    maximum: this.config.memoryPages * 2
                }),
                // 标准C库函数
                abort: () => {
                    throw new Error('WASM模块中止');
                },
                // 数学函数
                sin: Math.sin,
                cos: Math.cos,
                tan: Math.tan,
                sqrt: Math.sqrt,
                pow: Math.pow,
                exp: Math.exp,
                log: Math.log,
                // 调试函数
                console_log: (ptr, len) => {
                    const view = new Uint8Array(this.memory.buffer, ptr, len);
                    const str = new TextDecoder().decode(view);
                    console.log(`[WASM ${this.config.name}]:`, str);
                },
                // 性能计时
                performance_now: () => performance.now(),
                ...this.config.imports
            }
        };
    }
    
    /**
     * 初始化内存视图
     */
    _initializeMemoryViews() {
        if (!this.memory) return;
        
        this.memoryViews.set(DataType.UINT8, new Uint8Array(this.memory.buffer));
        this.memoryViews.set(DataType.INT8, new Int8Array(this.memory.buffer));
        this.memoryViews.set(DataType.UINT16, new Uint16Array(this.memory.buffer));
        this.memoryViews.set(DataType.INT16, new Int16Array(this.memory.buffer));
        this.memoryViews.set(DataType.UINT32, new Uint32Array(this.memory.buffer));
        this.memoryViews.set(DataType.INT32, new Int32Array(this.memory.buffer));
        this.memoryViews.set(DataType.FLOAT32, new Float32Array(this.memory.buffer));
        this.memoryViews.set(DataType.FLOAT64, new Float64Array(this.memory.buffer));
    }
    
    /**
     * 执行初始化
     */
    async _initialize() {
        // 调用初始化函数（如果存在）
        if (this.exports._initialize) {
            this.exports._initialize();
        }
        
        // 设置初始数据（如果有）
        if (this.config.initData) {
            this.writeData(this.config.initData);
        }
    }
    
    /**
     * 获取内存视图
     */
    _getMemoryView(dataType) {
        const view = this.memoryViews.get(dataType);
        if (!view) {
            throw new Error(`不支持的数据类型: ${dataType}`);
        }
        return view;
    }
    
    /**
     * 更新性能统计
     */
    _updatePerformanceStats(callTime) {
        this.performance.totalCalls++;
        this.performance.totalTime += callTime;
        this.performance.avgTime = this.performance.totalTime / this.performance.totalCalls;
        this.performance.minTime = Math.min(this.performance.minTime, callTime);
        this.performance.maxTime = Math.max(this.performance.maxTime, callTime);
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
                    console.error(`WASM事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

/**
 * WASM模块管理器
 */
class WASMModuleManager {
    constructor(options = {}) {
        this.options = {
            maxConcurrentLoads: options.maxConcurrentLoads || 3,
            cacheSize: options.cacheSize || 10,
            autoUnload: options.autoUnload !== false,
            unloadTimeout: options.unloadTimeout || 300000, // 5分钟
            enablePreloading: options.enablePreloading || false,
            ...options
        };
        
        this.modules = new Map();
        this.loadingQueue = [];
        this.activeLoads = 0;
        this.cache = new Map();
        this.preloadedModules = new Set();
        
        this.eventListeners = new Map();
        this.stats = {
            totalLoaded: 0,
            totalUnloaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            loadErrors: 0
        };
        
        // 启动清理定时器
        if (this.options.autoUnload) {
            this._startCleanupTimer();
        }
        
        console.log('WASM模块管理器初始化完成');
    }
    
    /**
     * 注册模块
     */
    registerModule(config) {
        const moduleConfig = config instanceof WASMModuleConfig ? config : new WASMModuleConfig(config);
        
        const validation = moduleConfig.validate();
        if (!validation.isValid) {
            throw new Error(`模块配置无效: ${validation.errors.join(', ')}`);
        }
        
        const instance = new WASMModuleInstance(moduleConfig);
        this.modules.set(moduleConfig.name, instance);
        
        this._emitEvent('moduleRegistered', { name: moduleConfig.name, config: moduleConfig });
        
        console.log(`WASM模块 ${moduleConfig.name} 已注册`);
        return instance;
    }
    
    /**
     * 加载模块
     */
    async loadModule(name) {
        const instance = this.modules.get(name);
        if (!instance) {
            throw new Error(`模块 ${name} 未注册`);
        }
        
        if (instance.status === WASMModuleStatus.READY) {
            this.stats.cacheHits++;
            return instance;
        }
        
        // 检查并发加载限制
        if (this.activeLoads >= this.options.maxConcurrentLoads) {
            await this._waitForLoadSlot();
        }
        
        this.activeLoads++;
        
        try {
            const success = await instance.load();
            if (success) {
                this.stats.totalLoaded++;
                this._emitEvent('moduleLoaded', { name, instance });
            } else {
                this.stats.loadErrors++;
                throw new Error(`模块 ${name} 加载失败`);
            }
            
            return instance;
            
        } finally {
            this.activeLoads--;
            this._processLoadingQueue();
        }
    }
    
    /**
     * 获取模块
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * 卸载模块
     */
    unloadModule(name) {
        const instance = this.modules.get(name);
        if (!instance) return false;
        
        instance.dispose();
        this.stats.totalUnloaded++;
        
        this._emitEvent('moduleUnloaded', { name, instance });
        
        console.log(`WASM模块 ${name} 已卸载`);
        return true;
    }
    
    /**
     * 预加载模块
     */
    async preloadModule(name) {
        if (this.preloadedModules.has(name)) return;
        
        try {
            await this.loadModule(name);
            this.preloadedModules.add(name);
            console.log(`WASM模块 ${name} 预加载完成`);
        } catch (error) {
            console.error(`WASM模块 ${name} 预加载失败:`, error);
        }
    }
    
    /**
     * 批量预加载
     */
    async preloadModules(names) {
        const promises = names.map(name => this.preloadModule(name));
        await Promise.allSettled(promises);
    }
    
    /**
     * 调用模块函数
     */
    async callModuleFunction(moduleName, functionName, ...args) {
        const instance = await this.loadModule(moduleName);
        return instance.call(functionName, ...args);
    }
    
    /**
     * 获取所有模块信息
     */
    getAllModulesInfo() {
        const modulesInfo = [];
        
        this.modules.forEach((instance, name) => {
            modulesInfo.push(instance.getInfo());
        });
        
        return modulesInfo;
    }
    
    /**
     * 获取管理器统计
     */
    getStats() {
        return {
            ...this.stats,
            totalModules: this.modules.size,
            loadedModules: Array.from(this.modules.values()).filter(m => m.status === WASMModuleStatus.READY).length,
            activeLoads: this.activeLoads,
            queueLength: this.loadingQueue.length,
            cacheSize: this.cache.size,
            preloadedCount: this.preloadedModules.size
        };
    }
    
    /**
     * 清理未使用的模块
     */
    cleanup() {
        const now = Date.now();
        const unloadThreshold = now - this.options.unloadTimeout;
        
        this.modules.forEach((instance, name) => {
            if (instance.status === WASMModuleStatus.READY && 
                instance.lastUsed < unloadThreshold &&
                !this.preloadedModules.has(name)) {
                
                this.unloadModule(name);
            }
        });
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
     * 销毁管理器
     */
    destroy() {
        // 卸载所有模块
        this.modules.forEach((instance, name) => {
            this.unloadModule(name);
        });
        
        // 清理资源
        this.modules.clear();
        this.cache.clear();
        this.preloadedModules.clear();
        this.eventListeners.clear();
        this.loadingQueue = [];
        
        console.log('WASM模块管理器已销毁');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 等待加载槽位
     */
    async _waitForLoadSlot() {
        return new Promise(resolve => {
            this.loadingQueue.push(resolve);
        });
    }
    
    /**
     * 处理加载队列
     */
    _processLoadingQueue() {
        if (this.loadingQueue.length > 0 && this.activeLoads < this.options.maxConcurrentLoads) {
            const resolve = this.loadingQueue.shift();
            resolve();
        }
    }
    
    /**
     * 启动清理定时器
     */
    _startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // 每分钟检查一次
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
                    console.error(`WASM管理器事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

/**
 * WebAssembly集成主类
 */
class WebAssemblyIntegration {
    constructor(options = {}) {
        this.name = 'WebAssemblyIntegration';
        this.options = {
            enableSIMD: options.enableSIMD !== false,
            enableThreads: options.enableThreads || false,
            enableBulkMemory: options.enableBulkMemory !== false,
            autoDetectFeatures: options.autoDetectFeatures !== false,
            ...options
        };
        
        this.manager = new WASMModuleManager(options.manager || {});
        this.features = {
            simd: false,
            threads: false,
            bulkMemory: false,
            multiValue: false,
            referenceTypes: false
        };
        
        this.isInitialized = false;
        this.initPromise = null;
        
        console.log('WebAssembly集成初始化完成');
    }
    
    /**
     * 初始化
     */
    async initialize() {
        if (this.isInitialized) return true;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._performInitialization();
        return this.initPromise;
    }
    
    /**
     * 检测WebAssembly特性支持
     */
    async detectFeatures() {
        const features = {
            simd: false,
            threads: false,
            bulkMemory: false,
            multiValue: false,
            referenceTypes: false
        };
        
        try {
            // 检测SIMD支持
            if (typeof WebAssembly.validate === 'function') {
                // SIMD测试字节码
                const simdTest = new Uint8Array([
                    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                    0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
                    0x03, 0x02, 0x01, 0x00,
                    0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0x0b
                ]);
                features.simd = WebAssembly.validate(simdTest);
            }
            
            // 检测线程支持
            features.threads = typeof SharedArrayBuffer !== 'undefined';
            
            // 检测批量内存操作支持
            const bulkMemoryTest = new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
                0x03, 0x02, 0x01, 0x00,
                0x05, 0x03, 0x01, 0x00, 0x01,
                0x0a, 0x09, 0x01, 0x07, 0x00, 0x41, 0x00, 0x41, 0x00, 0xfc, 0x08, 0x00, 0x0b
            ]);
            features.bulkMemory = WebAssembly.validate(bulkMemoryTest);
            
        } catch (error) {
            console.warn('WebAssembly特性检测失败:', error);
        }
        
        this.features = features;
        return features;
    }
    
    /**
     * 注册标准模块
     */
    registerStandardModules() {
        // 姿态检测模块
        this.manager.registerModule(new WASMModuleConfig({
            name: 'pose_detector',
            type: WASMModuleType.POSE_DETECTION,
            wasmPath: '/wasm/pose_detector.wasm',
            memoryPages: 512,
            enableSIMD: this.features.simd,
            exports: ['detect_pose', 'process_keypoints', 'calculate_angles']
        }));
        
        // 图像处理模块
        this.manager.registerModule(new WASMModuleConfig({
            name: 'image_processor',
            type: WASMModuleType.IMAGE_PROCESSING,
            wasmPath: '/wasm/image_processor.wasm',
            memoryPages: 256,
            enableSIMD: this.features.simd,
            exports: ['resize_image', 'apply_filter', 'extract_features']
        }));
        
        // 数学运算模块
        this.manager.registerModule(new WASMModuleConfig({
            name: 'math_ops',
            type: WASMModuleType.MATH_OPERATIONS,
            wasmPath: '/wasm/math_ops.wasm',
            memoryPages: 128,
            enableSIMD: this.features.simd,
            exports: ['matrix_multiply', 'vector_operations', 'statistical_analysis']
        }));
        
        // 滤波处理模块
        this.manager.registerModule(new WASMModuleConfig({
            name: 'filter_processor',
            type: WASMModuleType.FILTERING,
            wasmPath: '/wasm/filter_processor.wasm',
            memoryPages: 128,
            enableSIMD: this.features.simd,
            exports: ['one_euro_filter', 'kalman_filter', 'moving_average']
        }));
    }
    
    /**
     * 获取模块管理器
     */
    getManager() {
        return this.manager;
    }
    
    /**
     * 获取特性支持信息
     */
    getFeatures() {
        return { ...this.features };
    }
    
    /**
     * 获取集成统计
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            features: this.features,
            manager: this.manager.getStats()
        };
    }
    
    /**
     * 销毁集成
     */
    destroy() {
        this.manager.destroy();
        this.isInitialized = false;
        this.initPromise = null;
        
        console.log('WebAssembly集成已销毁');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 执行初始化
     */
    async _performInitialization() {
        try {
            // 检测特性支持
            if (this.options.autoDetectFeatures) {
                await this.detectFeatures();
                console.log('WebAssembly特性检测完成:', this.features);
            }
            
            // 注册标准模块
            this.registerStandardModules();
            
            this.isInitialized = true;
            console.log('WebAssembly集成初始化完成');
            
            return true;
            
        } catch (error) {
            console.error('WebAssembly集成初始化失败:', error);
            throw error;
        }
    }
}

export default WebAssemblyIntegration;
export {
    WASMModuleConfig,
    WASMModuleInstance,
    WASMModuleManager,
    WASMModuleType,
    WASMModuleStatus,
    DataType
};