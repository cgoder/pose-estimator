/**
 * 模型管理器
 * 智能模型选择、加载优化、缓存管理和性能监控
 * 基于架构设计文档要求实现
 */

import * as tf from '@tensorflow/tfjs';

/**
 * 模型类型枚举
 */
export const ModelType = {
    POSE_DETECTION: 'pose_detection',
    MOVENET: 'movenet',
    POSENET: 'posenet',
    BLAZEPOSE: 'blazepose',
    CUSTOM: 'custom'
};

/**
 * 模型精度等级
 */
export const ModelAccuracy = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    ULTRA: 'ultra'
};

/**
 * 模型状态枚举
 */
export const ModelStatus = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    READY: 'ready',
    ERROR: 'error',
    DISPOSED: 'disposed'
};

/**
 * 设备性能等级
 */
export const DevicePerformance = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    ULTRA: 'ultra'
};

/**
 * 模型配置接口
 */
class ModelConfig {
    constructor(config = {}) {
        this.type = config.type || ModelType.MOVENET;
        this.accuracy = config.accuracy || ModelAccuracy.MEDIUM;
        this.inputResolution = config.inputResolution || { width: 256, height: 256 };
        this.outputStride = config.outputStride || 16;
        this.multiplier = config.multiplier || 0.75;
        this.quantBytes = config.quantBytes || 2;
        this.modelUrl = config.modelUrl;
        this.enableSmoothing = config.enableSmoothing !== false;
        this.smoothingFactor = config.smoothingFactor || 0.5;
        this.minConfidence = config.minConfidence || 0.3;
        this.maxDetections = config.maxDetections || 1;
        this.flipHorizontal = config.flipHorizontal || false;
    }
}

/**
 * 模型元数据
 */
class ModelMetadata {
    constructor(metadata = {}) {
        this.name = metadata.name || '';
        this.version = metadata.version || '1.0.0';
        this.description = metadata.description || '';
        this.inputShape = metadata.inputShape || [1, 256, 256, 3];
        this.outputShape = metadata.outputShape || [];
        this.modelSize = metadata.modelSize || 0; // MB
        this.inferenceTime = metadata.inferenceTime || 0; // ms
        this.accuracy = metadata.accuracy || 0; // 0-1
        this.supportedDevices = metadata.supportedDevices || ['cpu', 'webgl'];
        this.requiredMemory = metadata.requiredMemory || 0; // MB
        this.createdAt = metadata.createdAt || new Date();
        this.lastUsed = metadata.lastUsed || null;
        this.usageCount = metadata.usageCount || 0;
    }
}

/**
 * 模型实例包装器
 */
class ModelInstance {
    constructor(model, config, metadata) {
        this.model = model;
        this.config = config;
        this.metadata = metadata;
        this.status = ModelStatus.LOADED;
        this.loadTime = Date.now();
        this.lastInferenceTime = 0;
        this.totalInferences = 0;
        this.averageInferenceTime = 0;
        this.memoryUsage = 0;
        this.warmupCompleted = false;
    }
    
    /**
     * 执行推理
     */
    async predict(input) {
        const startTime = performance.now();
        
        try {
            const result = await this.model.estimatePoses(input, this.config);
            
            const inferenceTime = performance.now() - startTime;
            this._updatePerformanceMetrics(inferenceTime);
            
            return result;
        } catch (error) {
            this.status = ModelStatus.ERROR;
            throw error;
        }
    }
    
    /**
     * 模型预热
     */
    async warmup() {
        if (this.warmupCompleted) return;
        
        try {
            // 创建虚拟输入进行预热
            const dummyInput = tf.zeros([
                this.metadata.inputShape[1],
                this.metadata.inputShape[2],
                this.metadata.inputShape[3]
            ]);
            
            // 执行几次推理进行预热
            for (let i = 0; i < 3; i++) {
                await this.predict(dummyInput);
            }
            
            dummyInput.dispose();
            this.warmupCompleted = true;
            this.status = ModelStatus.READY;
            
        } catch (error) {
            console.error('模型预热失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新性能指标
     */
    _updatePerformanceMetrics(inferenceTime) {
        this.lastInferenceTime = inferenceTime;
        this.totalInferences++;
        this.metadata.usageCount++;
        this.metadata.lastUsed = new Date();
        
        // 计算平均推理时间
        this.averageInferenceTime = (
            (this.averageInferenceTime * (this.totalInferences - 1) + inferenceTime) /
            this.totalInferences
        );
        
        // 更新元数据中的推理时间
        this.metadata.inferenceTime = this.averageInferenceTime;
    }
    
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if (this.model && this.model.getMemoryInfo) {
            const memInfo = this.model.getMemoryInfo();
            this.memoryUsage = memInfo.numBytes / (1024 * 1024); // MB
        }
        return this.memoryUsage;
    }
    
    /**
     * 清理模型
     */
    dispose() {
        if (this.model && this.model.dispose) {
            this.model.dispose();
        }
        this.status = ModelStatus.DISPOSED;
    }
}

/**
 * 设备性能检测器
 */
class DeviceProfiler {
    constructor() {
        this.profile = null;
        this.benchmarkResults = new Map();
    }
    
    /**
     * 检测设备性能
     */
    async profileDevice() {
        const startTime = performance.now();
        
        try {
            // 检测GPU支持
            const gpuSupport = await this._checkGPUSupport();
            
            // 检测内存
            const memoryInfo = this._getMemoryInfo();
            
            // 执行基准测试
            const benchmarkScore = await this._runBenchmark();
            
            // 检测并发能力
            const concurrencySupport = await this._checkConcurrencySupport();
            
            this.profile = {
                gpu: gpuSupport,
                memory: memoryInfo,
                benchmark: benchmarkScore,
                concurrency: concurrencySupport,
                performance: this._calculatePerformanceLevel(benchmarkScore),
                profiledAt: new Date(),
                profileTime: performance.now() - startTime
            };
            
            return this.profile;
            
        } catch (error) {
            console.error('设备性能检测失败:', error);
            return this._getDefaultProfile();
        }
    }
    
    /**
     * 检测GPU支持
     */
    async _checkGPUSupport() {
        try {
            const backends = tf.getBackend();
            const gpuBackend = 'webgl';
            
            // 尝试设置WebGL后端
            await tf.setBackend(gpuBackend);
            const isWebGLSupported = tf.getBackend() === gpuBackend;
            
            // 检测WebGL版本和特性
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            const gpuInfo = {
                supported: isWebGLSupported,
                backend: tf.getBackend(),
                webglVersion: gl ? (canvas.getContext('webgl2') ? 2 : 1) : 0,
                maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
                maxRenderbufferSize: gl ? gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) : 0,
                vendor: gl ? gl.getParameter(gl.VENDOR) : 'unknown',
                renderer: gl ? gl.getParameter(gl.RENDERER) : 'unknown'
            };
            
            return gpuInfo;
            
        } catch (error) {
            return {
                supported: false,
                backend: 'cpu',
                error: error.message
            };
        }
    }
    
    /**
     * 获取内存信息
     */
    _getMemoryInfo() {
        const memoryInfo = {
            total: 0,
            used: 0,
            available: 0,
            jsHeapSizeLimit: 0,
            usedJSHeapSize: 0,
            totalJSHeapSize: 0
        };
        
        // 检测浏览器内存API
        if (performance.memory) {
            memoryInfo.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit / (1024 * 1024);
            memoryInfo.usedJSHeapSize = performance.memory.usedJSHeapSize / (1024 * 1024);
            memoryInfo.totalJSHeapSize = performance.memory.totalJSHeapSize / (1024 * 1024);
        }
        
        // 估算可用内存
        if (navigator.deviceMemory) {
            memoryInfo.total = navigator.deviceMemory * 1024; // GB to MB
            memoryInfo.available = memoryInfo.total - memoryInfo.usedJSHeapSize;
        }
        
        return memoryInfo;
    }
    
    /**
     * 运行基准测试
     */
    async _runBenchmark() {
        const benchmarks = [];
        
        try {
            // 矩阵乘法基准测试
            const matmulScore = await this._benchmarkMatmul();
            benchmarks.push({ name: 'matmul', score: matmulScore });
            
            // 卷积基准测试
            const convScore = await this._benchmarkConv2d();
            benchmarks.push({ name: 'conv2d', score: convScore });
            
            // 计算综合得分
            const totalScore = benchmarks.reduce((sum, b) => sum + b.score, 0) / benchmarks.length;
            
            return {
                overall: totalScore,
                details: benchmarks
            };
            
        } catch (error) {
            console.error('基准测试失败:', error);
            return { overall: 50, details: [], error: error.message };
        }
    }
    
    /**
     * 矩阵乘法基准测试
     */
    async _benchmarkMatmul() {
        const size = 512;
        const iterations = 10;
        
        const a = tf.randomNormal([size, size]);
        const b = tf.randomNormal([size, size]);
        
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            const result = tf.matMul(a, b);
            await result.data(); // 确保计算完成
            result.dispose();
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        
        a.dispose();
        b.dispose();
        
        // 计算得分 (越快得分越高)
        return Math.max(0, 100 - avgTime);
    }
    
    /**
     * 卷积基准测试
     */
    async _benchmarkConv2d() {
        const batchSize = 1;
        const inputHeight = 224;
        const inputWidth = 224;
        const inputChannels = 3;
        const filterSize = 3;
        const filters = 32;
        const iterations = 5;
        
        const input = tf.randomNormal([batchSize, inputHeight, inputWidth, inputChannels]);
        const filter = tf.randomNormal([filterSize, filterSize, inputChannels, filters]);
        
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            const result = tf.conv2d(input, filter, 1, 'same');
            await result.data(); // 确保计算完成
            result.dispose();
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        
        input.dispose();
        filter.dispose();
        
        // 计算得分 (越快得分越高)
        return Math.max(0, 100 - avgTime / 10);
    }
    
    /**
     * 检测并发支持
     */
    async _checkConcurrencySupport() {
        try {
            const workerSupport = typeof Worker !== 'undefined';
            const sharedArrayBufferSupport = typeof SharedArrayBuffer !== 'undefined';
            const webAssemblySupport = typeof WebAssembly !== 'undefined';
            
            return {
                worker: workerSupport,
                sharedArrayBuffer: sharedArrayBufferSupport,
                webAssembly: webAssemblySupport,
                maxWorkers: navigator.hardwareConcurrency || 4
            };
        } catch (error) {
            return {
                worker: false,
                sharedArrayBuffer: false,
                webAssembly: false,
                maxWorkers: 1,
                error: error.message
            };
        }
    }
    
    /**
     * 计算性能等级
     */
    _calculatePerformanceLevel(benchmarkScore) {
        if (benchmarkScore >= 80) return DevicePerformance.ULTRA;
        if (benchmarkScore >= 60) return DevicePerformance.HIGH;
        if (benchmarkScore >= 40) return DevicePerformance.MEDIUM;
        return DevicePerformance.LOW;
    }
    
    /**
     * 获取默认配置
     */
    _getDefaultProfile() {
        return {
            gpu: { supported: false, backend: 'cpu' },
            memory: { total: 2048, available: 1024 },
            benchmark: { overall: 50, details: [] },
            concurrency: { worker: true, maxWorkers: 2 },
            performance: DevicePerformance.MEDIUM,
            profiledAt: new Date(),
            profileTime: 0
        };
    }
}

/**
 * 智能模型选择器
 */
class ModelSelector {
    constructor(deviceProfiler) {
        this.deviceProfiler = deviceProfiler;
        this.selectionRules = new Map();
        this._initializeSelectionRules();
    }
    
    /**
     * 根据设备性能和需求选择最佳模型
     */
    selectOptimalModel(requirements = {}) {
        const deviceProfile = this.deviceProfiler.profile;
        if (!deviceProfile) {
            throw new Error('设备性能尚未检测，请先调用 profileDevice()');
        }
        
        const {
            accuracy = ModelAccuracy.MEDIUM,
            maxInferenceTime = 100, // ms
            maxMemoryUsage = 512, // MB
            preferredType = null,
            realtime = true
        } = requirements;
        
        // 获取候选模型
        const candidates = this._getCandidateModels(deviceProfile, requirements);
        
        // 评分和排序
        const scoredCandidates = candidates.map(candidate => ({
            ...candidate,
            score: this._scoreModel(candidate, deviceProfile, requirements)
        }));
        
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        const selectedModel = scoredCandidates[0];
        
        if (!selectedModel) {
            throw new Error('没有找到合适的模型');
        }
        
        return {
            modelConfig: selectedModel.config,
            metadata: selectedModel.metadata,
            score: selectedModel.score,
            reasoning: selectedModel.reasoning,
            alternatives: scoredCandidates.slice(1, 3) // 返回前3个备选
        };
    }
    
    /**
     * 获取候选模型
     */
    _getCandidateModels(deviceProfile, requirements) {
        const candidates = [];
        
        // MoveNet Lightning (快速)
        candidates.push({
            config: new ModelConfig({
                type: ModelType.MOVENET,
                accuracy: ModelAccuracy.MEDIUM,
                inputResolution: { width: 192, height: 192 },
                modelUrl: 'https://tfhub.dev/google/movenet/singlepose/lightning/4'
            }),
            metadata: new ModelMetadata({
                name: 'MoveNet Lightning',
                modelSize: 6.2,
                inferenceTime: 15,
                accuracy: 0.85,
                requiredMemory: 128
            }),
            reasoning: '轻量级模型，适合实时应用'
        });
        
        // MoveNet Thunder (精确)
        candidates.push({
            config: new ModelConfig({
                type: ModelType.MOVENET,
                accuracy: ModelAccuracy.HIGH,
                inputResolution: { width: 256, height: 256 },
                modelUrl: 'https://tfhub.dev/google/movenet/singlepose/thunder/4'
            }),
            metadata: new ModelMetadata({
                name: 'MoveNet Thunder',
                modelSize: 12.6,
                inferenceTime: 35,
                accuracy: 0.92,
                requiredMemory: 256
            }),
            reasoning: '高精度模型，适合质量要求高的场景'
        });
        
        // PoseNet (兼容性好)
        candidates.push({
            config: new ModelConfig({
                type: ModelType.POSENET,
                accuracy: ModelAccuracy.MEDIUM,
                inputResolution: { width: 257, height: 257 },
                outputStride: 16,
                multiplier: 0.75
            }),
            metadata: new ModelMetadata({
                name: 'PoseNet',
                modelSize: 8.5,
                inferenceTime: 25,
                accuracy: 0.80,
                requiredMemory: 180
            }),
            reasoning: '经典模型，兼容性好，适合多种设备'
        });
        
        // 根据设备性能过滤候选模型
        return candidates.filter(candidate => {
            const metadata = candidate.metadata;
            const memoryOk = metadata.requiredMemory <= deviceProfile.memory.available;
            const performanceOk = this._isModelSuitableForDevice(metadata, deviceProfile);
            
            return memoryOk && performanceOk;
        });
    }
    
    /**
     * 为模型评分
     */
    _scoreModel(candidate, deviceProfile, requirements) {
        const metadata = candidate.metadata;
        let score = 0;
        
        // 精度评分 (30%)
        const accuracyScore = metadata.accuracy * 100;
        score += accuracyScore * 0.3;
        
        // 性能评分 (40%)
        const maxTime = requirements.maxInferenceTime || 100;
        const timeScore = Math.max(0, 100 - (metadata.inferenceTime / maxTime) * 100);
        score += timeScore * 0.4;
        
        // 内存评分 (20%)
        const maxMemory = requirements.maxMemoryUsage || 512;
        const memoryScore = Math.max(0, 100 - (metadata.requiredMemory / maxMemory) * 100);
        score += memoryScore * 0.2;
        
        // 设备适配评分 (10%)
        const deviceScore = this._getDeviceCompatibilityScore(metadata, deviceProfile);
        score += deviceScore * 0.1;
        
        return Math.round(score);
    }
    
    /**
     * 检查模型是否适合设备
     */
    _isModelSuitableForDevice(metadata, deviceProfile) {
        // 检查内存要求
        if (metadata.requiredMemory > deviceProfile.memory.available) {
            return false;
        }
        
        // 检查性能要求
        const devicePerformance = deviceProfile.performance;
        if (devicePerformance === DevicePerformance.LOW && metadata.modelSize > 10) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取设备兼容性评分
     */
    _getDeviceCompatibilityScore(metadata, deviceProfile) {
        let score = 50; // 基础分
        
        // GPU支持加分
        if (deviceProfile.gpu.supported) {
            score += 20;
        }
        
        // 高性能设备加分
        switch (deviceProfile.performance) {
            case DevicePerformance.ULTRA:
                score += 30;
                break;
            case DevicePerformance.HIGH:
                score += 20;
                break;
            case DevicePerformance.MEDIUM:
                score += 10;
                break;
        }
        
        return Math.min(100, score);
    }
    
    /**
     * 初始化选择规则
     */
    _initializeSelectionRules() {
        // 实时应用规则
        this.selectionRules.set('realtime', {
            maxInferenceTime: 50,
            preferAccuracy: ModelAccuracy.MEDIUM,
            weight: { performance: 0.6, accuracy: 0.4 }
        });
        
        // 高精度应用规则
        this.selectionRules.set('accuracy', {
            maxInferenceTime: 200,
            preferAccuracy: ModelAccuracy.HIGH,
            weight: { performance: 0.3, accuracy: 0.7 }
        });
        
        // 低端设备规则
        this.selectionRules.set('lowend', {
            maxInferenceTime: 100,
            maxMemoryUsage: 256,
            preferAccuracy: ModelAccuracy.LOW,
            weight: { performance: 0.8, accuracy: 0.2 }
        });
    }
}

/**
 * 模型缓存管理器
 */
class ModelCacheManager {
    constructor(config = {}) {
        this.maxCacheSize = config.maxCacheSize || 3; // 最大缓存模型数
        this.maxMemoryUsage = config.maxMemoryUsage || 1024; // MB
        this.cache = new Map();
        this.accessHistory = [];
        this.memoryUsage = 0;
    }
    
    /**
     * 获取缓存的模型
     */
    get(modelKey) {
        const modelInstance = this.cache.get(modelKey);
        if (modelInstance) {
            this._updateAccessHistory(modelKey);
            return modelInstance;
        }
        return null;
    }
    
    /**
     * 缓存模型
     */
    set(modelKey, modelInstance) {
        // 检查是否需要清理缓存
        this._ensureCacheSpace(modelInstance.getMemoryUsage());
        
        // 添加到缓存
        this.cache.set(modelKey, modelInstance);
        this.memoryUsage += modelInstance.getMemoryUsage();
        this._updateAccessHistory(modelKey);
        
        console.log(`模型已缓存: ${modelKey}, 内存使用: ${this.memoryUsage.toFixed(2)}MB`);
    }
    
    /**
     * 检查模型是否已缓存
     */
    has(modelKey) {
        return this.cache.has(modelKey);
    }
    
    /**
     * 移除缓存的模型
     */
    remove(modelKey) {
        const modelInstance = this.cache.get(modelKey);
        if (modelInstance) {
            this.memoryUsage -= modelInstance.getMemoryUsage();
            modelInstance.dispose();
            this.cache.delete(modelKey);
            
            // 从访问历史中移除
            this.accessHistory = this.accessHistory.filter(key => key !== modelKey);
            
            console.log(`模型已从缓存移除: ${modelKey}`);
        }
    }
    
    /**
     * 清空缓存
     */
    clear() {
        for (const [key, modelInstance] of this.cache) {
            modelInstance.dispose();
        }
        this.cache.clear();
        this.accessHistory = [];
        this.memoryUsage = 0;
        
        console.log('模型缓存已清空');
    }
    
    /**
     * 获取缓存统计信息
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            memoryUsage: this.memoryUsage,
            maxMemoryUsage: this.maxMemoryUsage,
            memoryUtilization: (this.memoryUsage / this.maxMemoryUsage) * 100,
            cachedModels: Array.from(this.cache.keys()),
            accessHistory: [...this.accessHistory]
        };
    }
    
    /**
     * 确保缓存空间
     */
    _ensureCacheSpace(requiredMemory) {
        // 检查内存限制
        while (this.memoryUsage + requiredMemory > this.maxMemoryUsage && this.cache.size > 0) {
            this._evictLeastRecentlyUsed();
        }
        
        // 检查数量限制
        while (this.cache.size >= this.maxCacheSize) {
            this._evictLeastRecentlyUsed();
        }
    }
    
    /**
     * 淘汰最近最少使用的模型
     */
    _evictLeastRecentlyUsed() {
        if (this.accessHistory.length === 0) {
            // 如果没有访问历史，移除第一个
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.remove(firstKey);
            }
        } else {
            // 移除最近最少使用的
            const lruKey = this.accessHistory[0];
            this.remove(lruKey);
        }
    }
    
    /**
     * 更新访问历史
     */
    _updateAccessHistory(modelKey) {
        // 移除旧的记录
        this.accessHistory = this.accessHistory.filter(key => key !== modelKey);
        // 添加到末尾（最近使用）
        this.accessHistory.push(modelKey);
        
        // 限制历史长度
        if (this.accessHistory.length > this.maxCacheSize * 2) {
            this.accessHistory = this.accessHistory.slice(-this.maxCacheSize);
        }
    }
}

/**
 * 模型管理器主类
 */
class ModelManager {
    constructor(config = {}) {
        this.name = 'ModelManager';
        this.config = {
            enableCaching: true,
            enableProfiling: true,
            enablePreloading: true,
            maxCacheSize: 3,
            maxMemoryUsage: 1024, // MB
            warmupOnLoad: true,
            autoOptimization: true,
            ...config
        };
        
        this.deviceProfiler = new DeviceProfiler();
        this.modelSelector = new ModelSelector(this.deviceProfiler);
        this.cacheManager = new ModelCacheManager({
            maxCacheSize: this.config.maxCacheSize,
            maxMemoryUsage: this.config.maxMemoryUsage
        });
        
        this.currentModel = null;
        this.loadingPromises = new Map();
        this.eventListeners = new Map();
        this.isInitialized = false;
        
        // 性能监控
        this.performanceMetrics = {
            totalLoads: 0,
            totalInferences: 0,
            averageLoadTime: 0,
            averageInferenceTime: 0,
            cacheHitRate: 0,
            memoryEfficiency: 0
        };
    }
    
    /**
     * 初始化模型管理器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('正在初始化模型管理器...');
            
            // 检测设备性能
            if (this.config.enableProfiling) {
                await this.deviceProfiler.profileDevice();
                console.log('设备性能检测完成:', this.deviceProfiler.profile.performance);
            }
            
            // 预加载默认模型
            if (this.config.enablePreloading) {
                await this._preloadDefaultModel();
            }
            
            this.isInitialized = true;
            this._emitEvent('initialized', { manager: this });
            
            console.log('模型管理器初始化完成');
            
        } catch (error) {
            console.error('模型管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载模型
     */
    async loadModel(requirements = {}) {
        try {
            // 选择最佳模型
            const selection = this.modelSelector.selectOptimalModel(requirements);
            const modelKey = this._generateModelKey(selection.modelConfig);
            
            console.log(`选择模型: ${selection.metadata.name}, 评分: ${selection.score}`);
            
            // 检查缓存
            if (this.config.enableCaching && this.cacheManager.has(modelKey)) {
                console.log('从缓存加载模型');
                this.currentModel = this.cacheManager.get(modelKey);
                this._updatePerformanceMetrics('cacheHit');
                return this.currentModel;
            }
            
            // 检查是否正在加载
            if (this.loadingPromises.has(modelKey)) {
                console.log('模型正在加载中，等待完成...');
                return await this.loadingPromises.get(modelKey);
            }
            
            // 开始加载
            const loadingPromise = this._loadModelFromSource(selection);
            this.loadingPromises.set(modelKey, loadingPromise);
            
            try {
                const modelInstance = await loadingPromise;
                
                // 缓存模型
                if (this.config.enableCaching) {
                    this.cacheManager.set(modelKey, modelInstance);
                }
                
                // 预热模型
                if (this.config.warmupOnLoad) {
                    await modelInstance.warmup();
                }
                
                this.currentModel = modelInstance;
                this._updatePerformanceMetrics('load');
                
                this._emitEvent('modelLoaded', {
                    model: modelInstance,
                    selection: selection
                });
                
                return modelInstance;
                
            } finally {
                this.loadingPromises.delete(modelKey);
            }
            
        } catch (error) {
            console.error('模型加载失败:', error);
            this._emitEvent('loadError', { error });
            throw error;
        }
    }
    
    /**
     * 执行推理
     */
    async predict(input) {
        if (!this.currentModel) {
            throw new Error('没有加载的模型');
        }
        
        try {
            const result = await this.currentModel.predict(input);
            this._updatePerformanceMetrics('inference', this.currentModel.lastInferenceTime);
            return result;
        } catch (error) {
            this._emitEvent('inferenceError', { error });
            throw error;
        }
    }
    
    /**
     * 切换模型
     */
    async switchModel(requirements) {
        const oldModel = this.currentModel;
        await this.loadModel(requirements);
        
        this._emitEvent('modelSwitched', {
            oldModel: oldModel,
            newModel: this.currentModel
        });
    }
    
    /**
     * 获取当前模型信息
     */
    getCurrentModelInfo() {
        if (!this.currentModel) {
            return null;
        }
        
        return {
            config: this.currentModel.config,
            metadata: this.currentModel.metadata,
            status: this.currentModel.status,
            performance: {
                averageInferenceTime: this.currentModel.averageInferenceTime,
                totalInferences: this.currentModel.totalInferences,
                memoryUsage: this.currentModel.getMemoryUsage()
            }
        };
    }
    
    /**
     * 获取设备性能信息
     */
    getDeviceProfile() {
        return this.deviceProfiler.profile;
    }
    
    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return this.cacheManager.getStats();
    }
    
    /**
     * 获取性能指标
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * 优化内存使用
     */
    optimizeMemory() {
        // 清理未使用的张量
        tf.disposeVariables();
        
        // 强制垃圾回收（如果支持）
        if (window.gc) {
            window.gc();
        }
        
        // 更新内存使用统计
        this._updateMemoryStats();
        
        console.log('内存优化完成');
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
    async cleanup() {
        // 清理缓存
        this.cacheManager.clear();
        
        // 清理当前模型
        if (this.currentModel) {
            this.currentModel.dispose();
            this.currentModel = null;
        }
        
        // 清理加载中的Promise
        this.loadingPromises.clear();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        // 优化内存
        this.optimizeMemory();
        
        this.isInitialized = false;
        console.log('模型管理器已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 从源加载模型
     */
    async _loadModelFromSource(selection) {
        const startTime = performance.now();
        const config = selection.modelConfig;
        const metadata = selection.metadata;
        
        try {
            let model;
            
            // 根据模型类型加载
            switch (config.type) {
                case ModelType.MOVENET:
                    model = await this._loadMoveNetModel(config);
                    break;
                case ModelType.POSENET:
                    model = await this._loadPoseNetModel(config);
                    break;
                case ModelType.BLAZEPOSE:
                    model = await this._loadBlazePoseModel(config);
                    break;
                default:
                    throw new Error(`不支持的模型类型: ${config.type}`);
            }
            
            const loadTime = performance.now() - startTime;
            console.log(`模型加载完成，耗时: ${loadTime.toFixed(2)}ms`);
            
            return new ModelInstance(model, config, metadata);
            
        } catch (error) {
            console.error('模型加载失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载MoveNet模型
     */
    async _loadMoveNetModel(config) {
        // 这里需要根据实际的MoveNet加载方式实现
        // 示例代码
        const modelUrl = config.modelUrl || 'https://tfhub.dev/google/movenet/singlepose/lightning/4';
        return await tf.loadLayersModel(modelUrl);
    }
    
    /**
     * 加载PoseNet模型
     */
    async _loadPoseNetModel(config) {
        // 这里需要根据实际的PoseNet加载方式实现
        // 示例代码
        const { PoseNet } = await import('@tensorflow-models/posenet');
        return await PoseNet.load({
            architecture: 'MobileNetV1',
            outputStride: config.outputStride,
            inputResolution: config.inputResolution,
            multiplier: config.multiplier,
            quantBytes: config.quantBytes
        });
    }
    
    /**
     * 加载BlazePose模型
     */
    async _loadBlazePoseModel(config) {
        // 这里需要根据实际的BlazePose加载方式实现
        throw new Error('BlazePose模型加载尚未实现');
    }
    
    /**
     * 预加载默认模型
     */
    async _preloadDefaultModel() {
        try {
            const defaultRequirements = {
                accuracy: ModelAccuracy.MEDIUM,
                maxInferenceTime: 50,
                realtime: true
            };
            
            await this.loadModel(defaultRequirements);
            console.log('默认模型预加载完成');
            
        } catch (error) {
            console.warn('默认模型预加载失败:', error);
        }
    }
    
    /**
     * 生成模型缓存键
     */
    _generateModelKey(config) {
        const keyParts = [
            config.type,
            config.accuracy,
            `${config.inputResolution.width}x${config.inputResolution.height}`,
            config.outputStride || '',
            config.multiplier || '',
            config.quantBytes || ''
        ];
        
        return keyParts.filter(part => part !== '').join('_');
    }
    
    /**
     * 更新性能指标
     */
    _updatePerformanceMetrics(type, value = 0) {
        switch (type) {
            case 'load':
                this.performanceMetrics.totalLoads++;
                break;
            case 'inference':
                this.performanceMetrics.totalInferences++;
                this.performanceMetrics.averageInferenceTime = (
                    (this.performanceMetrics.averageInferenceTime * (this.performanceMetrics.totalInferences - 1) + value) /
                    this.performanceMetrics.totalInferences
                );
                break;
            case 'cacheHit':
                const totalRequests = this.performanceMetrics.totalLoads + 1;
                this.performanceMetrics.cacheHitRate = (
                    (this.performanceMetrics.cacheHitRate * (totalRequests - 1) + 1) / totalRequests
                );
                break;
        }
    }
    
    /**
     * 更新内存统计
     */
    _updateMemoryStats() {
        const memInfo = tf.memory();
        this.performanceMetrics.memoryEfficiency = (
            memInfo.numBytesInGPU / (memInfo.numBytesInGPU + memInfo.numBytes)
        ) * 100;
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
                    console.error(`Event callback error (${event}):`, error);
                }
            });
        }
    }
}

export default ModelManager;
export {
    ModelManager,
    ModelConfig,
    ModelMetadata,
    ModelInstance,
    DeviceProfiler,
    ModelSelector,
    ModelCacheManager
};