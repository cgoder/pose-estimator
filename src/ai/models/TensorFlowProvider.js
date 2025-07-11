/**
 * TensorFlow模型提供者
 * 负责TensorFlow.js模型的加载、管理和推理
 */

import { IModelProvider, MODEL_STATUS, MODEL_TYPES } from '../interfaces/IModelProvider.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { ErrorHandler } from '../../utils/errorHandling.js';
import { memoryManager } from '../../utils/MemoryManager.js';
import { performanceMonitor } from '../../utils/performance.js';
import { ModelConfigManager } from '../config/ModelConfigs.js';

/**
 * TensorFlow 模型提供者
 * 统一管理 TensorFlow.js 模型的加载、管理和推理
 * 整合了原 TensorFlowService 的功能
 */
// TensorFlow.js 配置常量
const TENSORFLOW_CONFIG = {
    version: '4.15.0',
    cdnBase: 'https://cdn.jsdelivr.net/npm',
    cacheKey: 'tensorflow_loaded_version',
    
    getUrls() {
        return {
            core: `${this.cdnBase}/@tensorflow/tfjs@${this.version}/dist/tf.min.js`,
            webgl: `${this.cdnBase}/@tensorflow/tfjs-backend-webgl@${this.version}/dist/tf-backend-webgl.min.js`,
            cpu: `${this.cdnBase}/@tensorflow/tfjs-backend-cpu@${this.version}/dist/tf-backend-cpu.min.js`,
            poseDetection: `${this.cdnBase}/@tensorflow-models/pose-detection@2.1.0/dist/pose-detection.min.js`
        };
    }
};

// 性能追踪器
class PerformanceTracker {
    static metrics = {
        loadTime: 0,
        initTime: 0,
        memoryUsage: 0,
        errorCount: 0
    };
    
    static timers = {};
    
    static startTimer(name) {
        this.timers[name] = performance.now();
    }
    
    static endTimer(name) {
        if (this.timers[name]) {
            const duration = performance.now() - this.timers[name];
            this.metrics[name] = duration;
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
            delete this.timers[name];
            return duration;
        }
        return 0;
    }
}

export class TensorFlowProvider extends IModelProvider {
    // 静态实例管理
    static instance = null;
    static isInitializing = false;
    
    static getInstance(options = {}) {
        if (!TensorFlowProvider.instance) {
            TensorFlowProvider.instance = new TensorFlowProvider(options);
        }
        return TensorFlowProvider.instance;
    }
    
    constructor(options = {}) {
        super();
        
        this.options = {
            enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
            enablePerformanceTracking: options.enablePerformanceTracking !== false,
            maxCacheSize: options.maxCacheSize || 5,
            backend: options.backend || 'webgl',
            enableProfiling: options.enableProfiling || false,
            memoryLimit: options.memoryLimit || 512,
            warmupRuns: options.warmupRuns || 3,
            enableOptimization: options.enableOptimization !== false,
            ...options
        };
        
        // 版本检查
        this.checkVersionCompatibility();
        
        // 模型缓存 (整合原有功能)
        this.modelCache = new Map();
        this.cache = new Map(); // 通用缓存，用于脚本加载状态等
        this.loadingPromises = new Map();
        this.loadedModules = new Map();
        
        // 检测器缓存 (从 TensorFlowService 迁移)
        this.loadedDetectors = new Map();
        
        // 原有模型存储
        this.models = new Map();
        this.modelConfigs = new Map();
        this.modelStats = new Map();
        
        // TensorFlow.js实例
        this.tf = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // 状态管理
        this.status = MODEL_STATUS.IDLE;
        
        // 性能统计 (整合)
        this.stats = {
            modelsLoaded: 0,
            totalInferences: 0,
            averageInferenceTime: 0,
            memoryUsage: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalRequests: 0,
            hits: 0,
            misses: 0,
            cacheSize: 0
        };
        
        // 原有性能监控
        this.performanceMonitor = {
            loadTimes: new Map(),
            inferenceTimes: new Map(),
            memoryUsage: new Map(),
            errorCounts: new Map()
        };
        
        // TensorFlow 相关状态
        this.tfStatus = {
            isReady: false,
            loadedModels: [],
            lastError: null
        };
        
        // 进度回调函数
        this.progressCallback = null;
        
        console.log('🤖 TensorFlow Provider 已创建');
    }
    
    /**
     * 版本兼容性检查
     * @private
     */
    checkVersionCompatibility() {
        try {
            const cachedVersion = localStorage.getItem(TENSORFLOW_CONFIG.cacheKey);
            if (cachedVersion && cachedVersion !== TENSORFLOW_CONFIG.version) {
                console.warn(`⚠️ TensorFlow.js版本变更: ${cachedVersion} → ${TENSORFLOW_CONFIG.version}`);
                this.clearOldVersionCache();
            }
            localStorage.setItem(TENSORFLOW_CONFIG.cacheKey, TENSORFLOW_CONFIG.version);
        } catch (error) {
            console.warn('⚠️ 版本检查失败:', error);
        }
    }
    
    /**
     * 清理旧版本缓存
     * @private
     */
    clearOldVersionCache() {
        try {
            // 清理可能存在的旧版本脚本标签
            const oldScripts = document.querySelectorAll('script[src*="@tensorflow"]');
            oldScripts.forEach(script => {
                if (!script.src.includes(TENSORFLOW_CONFIG.version)) {
                    console.log(`🗑️ 移除旧版本脚本: ${script.src}`);
                    script.remove();
                }
            });
        } catch (error) {
            console.warn('⚠️ 清理旧版本缓存失败:', error);
        }
    }
    
    /**
     * 初始化TensorFlow环境（单例模式，确保只初始化一次）
     * @returns {Promise<void>}
     */
    async initialize() {
        // 如果已经初始化完成，直接返回
        if (this.isInitialized) {
            console.log('✅ TensorFlow环境已初始化，跳过重复初始化');
            return;
        }
        
        // 如果正在初始化，等待完成
        if (this.initializationPromise) {
            console.log('⏳ TensorFlow环境正在初始化，等待完成...');
            return this.initializationPromise;
        }
        
        // 防止多实例同时初始化（全局锁）
        if (TensorFlowProvider.isInitializing) {
            console.log('⏳ 等待其他实例完成TensorFlow初始化...');
            while (TensorFlowProvider.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // 检查是否已经被其他实例初始化
            if (this.isInitialized) {
                return;
            }
        }
        
        TensorFlowProvider.isInitializing = true;
        this.initializationPromise = this._performInitialization();
        
        try {
            await this.initializationPromise;
        } finally {
            TensorFlowProvider.isInitializing = false;
        }
        
        return this.initializationPromise;
    }
    
    /**
     * 执行实际的初始化过程
     * @private
     */
    async _performInitialization() {
        try {
            console.log('🔧 初始化TensorFlow环境...');
            this.status = MODEL_STATUS.LOADING;
            
            // 动态导入TensorFlow.js核心模块
            this.tf = await this.loadTensorFlowCore();
            
            // 设置后端
            await this._setupBackend();
            
            // 配置内存管理
            this._configureMemoryManagement();
            
            // 启用性能分析（如果需要）
            if (this.options.enableProfiling) {
                this.tf.enableProdMode();
            }
            
            // 启动内存监控
            if (this.options.enableMemoryMonitoring) {
                memoryManager.startMemoryMonitoring();
            }
            
            this.isInitialized = true;
            this.status = MODEL_STATUS.READY;
            this.tfStatus.isReady = true;
            
            // 发布初始化完成事件
            eventBus.emit(EVENTS.TENSORFLOW_INITIALIZED, {
                backend: this.options.backend,
                memoryInfo: this.getMemoryUsage()
            });
            
            console.log(`✅ TensorFlow环境初始化完成 (后端: ${this.options.backend})`);
            
        } catch (error) {
            this.status = MODEL_STATUS.ERROR;
            this.tfStatus.lastError = error;
            console.error('❌ TensorFlow环境初始化失败:', error);
            throw ErrorHandler.createError('TensorFlowProvider', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 加载TensorFlow.js核心模块（带渐进式降级和重复注册检查）
     * @returns {Promise<Object>} TensorFlow.js实例
     */
    async loadTensorFlowCore() {
        PerformanceTracker.startTimer('tensorflowLoad');
        this._reportLoadingProgress('TensorFlow Core', 0, '开始加载核心模块');
        
        try {
            // 检查是否已经加载且版本正确
            if (window.tf && this._isTensorFlowVersionValid()) {
                console.log('✅ TensorFlow.js已存在且版本正确，跳过加载');
                this._reportLoadingProgress('TensorFlow Core', 90, '检测到已存在的有效版本');
                
                // 检查重复注册问题
                if (this._checkDuplicateRegistration('tensorflow')) {
                    console.warn('⚠️ 检测到重复注册，尝试清理...');
                    this._cleanupLibraryState('tensorflow');
                }
                
                this._reportLoadingProgress('TensorFlow Core', 100, '加载完成');
                PerformanceTracker.endTimer('tensorflowLoad');
                return window.tf;
            }
            
            // 清理可能存在的不完整状态
            this._cleanupLibraryState('tensorflow');
            this._reportLoadingProgress('TensorFlow Core', 10, '清理完成，准备加载');
            
            console.log('📦 通过CDN加载TensorFlow.js...');
            
            // 渐进式降级策略
            const backends = this.options.backend === 'webgl' ? ['webgl', 'cpu'] : ['cpu'];
            let lastError = null;
            let currentProgress = 20;
            const progressPerBackend = 60 / backends.length;
            
            for (let i = 0; i < backends.length; i++) {
                const backend = backends[i];
                try {
                    console.log(`🔄 尝试加载 ${backend} 后端...`);
                    this._reportLoadingProgress('TensorFlow Core', currentProgress, `尝试加载 ${backend} 后端`);
                    
                    // 检查后端是否已存在
                    if (window.tf && window.tf.getBackend && window.tf.getBackend() === backend) {
                        console.log(`📋 ${backend} 后端已存在，跳过加载`);
                        this._reportLoadingProgress('TensorFlow Core', 100, `${backend} 后端已存在`);
                        PerformanceTracker.endTimer('tensorflowLoad');
                        return window.tf;
                    }
                    
                    this._reportLoadingProgress('TensorFlow Core', currentProgress + progressPerBackend * 0.3, `加载 ${backend} 脚本`);
                    await this._loadWithBackend(backend);
                    console.log(`✅ ${backend} 后端加载成功`);
                    
                    this._reportLoadingProgress('TensorFlow Core', currentProgress + progressPerBackend * 0.6, `等待 ${backend} 就绪`);
                    // 等待全局变量可用
                    const tf = await this._waitForGlobalVariable('tf', 10000);
                    
                    // 验证后端设置
                    if (tf.getBackend && tf.getBackend() !== backend) {
                        console.log(`🔄 设置后端为 ${backend}...`);
                        this._reportLoadingProgress('TensorFlow Core', currentProgress + progressPerBackend * 0.8, `设置 ${backend} 后端`);
                        await tf.setBackend(backend);
                        await tf.ready();
                    }
                    
                    // 最终检查重复注册
                    if (this._checkDuplicateRegistration('tensorflow')) {
                        console.warn('⚠️ 加载后检测到重复注册，这是正常的初始化过程');
                    }
                    
                    console.log('✅ TensorFlow.js已设置为全局变量');
                    this._reportLoadingProgress('TensorFlow Core', 100, `${backend} 后端加载完成`);
                    PerformanceTracker.endTimer('tensorflowLoad');
                    return tf;
                    
                } catch (error) {
                    console.warn(`⚠️ ${backend} 后端加载失败:`, error);
                    this._reportLoadingProgress('TensorFlow Core', currentProgress, `${backend} 后端加载失败: ${error.message}`);
                    lastError = error;
                    PerformanceTracker.metrics.errorCount++;
                    
                    // 清理失败的加载状态
                    this._cleanupLibraryState('tensorflow');
                }
                
                currentProgress += progressPerBackend;
            }
            
            throw new Error(`所有后端加载失败: ${lastError?.message || '未知错误'}`);
            
        } catch (error) {
            console.error('❌ TensorFlow.js核心模块加载失败:', error);
            this._reportLoadingProgress('TensorFlow Core', 0, `加载失败: ${error.message}`);
            PerformanceTracker.endTimer('tensorflowLoad');
            throw error;
        }
    }
    
    /**
     * 检查TensorFlow.js版本是否有效
     * @private
     * @returns {boolean}
     */
    _isTensorFlowVersionValid() {
        try {
            if (!window.tf || !window.tf.version) {
                return false;
            }
            
            // 获取版本信息，处理可能的对象格式
            let currentVersion;
            if (typeof window.tf.version === 'string') {
                currentVersion = window.tf.version;
            } else if (typeof window.tf.version === 'object' && window.tf.version !== null) {
                // 尝试从版本对象中提取版本字符串
                if (window.tf.version.version) {
                    currentVersion = String(window.tf.version.version);
                } else if (window.tf.version.tfjs) {
                    currentVersion = String(window.tf.version.tfjs);
                } else if (window.tf.version.core) {
                    currentVersion = String(window.tf.version.core);
                } else {
                    console.warn('⚠️ 无法从版本对象中提取版本信息:', window.tf.version);
                    return false;
                }
            } else {
                currentVersion = String(window.tf.version);
            }
            
            const expectedMajor = TENSORFLOW_CONFIG.version.split('.')[0];
            
            // 验证版本格式
            if (!currentVersion || !currentVersion.includes('.')) {
                console.warn('⚠️ 版本格式无效:', currentVersion, '原始版本对象:', window.tf.version);
                return false;
            }
            
            const currentMajor = currentVersion.split('.')[0];
            
            console.log(`📋 TensorFlow 版本检查: 当前=${currentVersion}, 期望主版本=${expectedMajor}`);
            
            return currentMajor === expectedMajor;
        } catch (error) {
            console.warn('⚠️ 版本检查失败:', error);
            return false;
        }
    }
    
    /**
     * 使用指定后端加载TensorFlow.js
     * @private
     * @param {string} backend - 后端类型
     */
    async _loadWithBackend(backend) {
        const urls = TENSORFLOW_CONFIG.getUrls();
        
        // 临时抑制TensorFlow.js的重复注册警告
        this._suppressTensorFlowWarnings();
        
        // 加载核心库
        await this._loadScriptFromCDN(urls.core);
        
        // 加载对应后端
        if (backend === 'webgl') {
            await this._loadScriptFromCDN(urls.webgl);
        } else if (backend === 'cpu') {
            await this._loadScriptFromCDN(urls.cpu);
        }
    }
    
    /**
     * 加载检测器模型 (从TensorFlowService迁移)
     * @param {string} detectorType - 检测器类型
     * @param {Object} config - 配置选项
     * @returns {Promise<Object>} 检测器实例
     */
    async loadDetector(detectorType, config = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            // 检查缓存
            if (this.loadedDetectors.has(detectorType)) {
                console.log(`📦 检测器 ${detectorType} 已存在，返回缓存实例`);
                this.stats.cacheHits++;
                return this.loadedDetectors.get(detectorType);
            }
            
            this.stats.cacheMisses++;
            console.log(`📥 开始加载检测器: ${detectorType}`);
            
            let detector;
            const startTime = performance.now();
            
            switch (detectorType) {
                case 'handpose':
                    detector = await this._loadHandposeDetector(config);
                    break;
                case 'facemesh':
                    detector = await this._loadFacemeshDetector(config);
                    break;
                case 'posenet':
                    detector = await this._loadPosenetDetector(config);
                    break;
                case 'blazeface':
                    detector = await this._loadBlazefaceDetector(config);
                    break;
                case 'bodyPix':
                    detector = await this._loadBodyPixDetector(config);
                    break;
                default:
                    throw new Error(`不支持的检测器类型: ${detectorType}`);
            }
            
            const loadTime = performance.now() - startTime;
            
            // 缓存检测器
            this.loadedDetectors.set(detectorType, detector);
            
            // 更新统计
            this.stats.modelsLoaded++;
            
            console.log(`✅ 检测器 ${detectorType} 加载完成，耗时: ${loadTime.toFixed(2)}ms`);
            
            return detector;
            
        } catch (error) {
            console.error(`❌ 检测器 ${detectorType} 加载失败:`, error);
            throw ErrorHandler.createError('TensorFlowProvider', `检测器加载失败: ${error.message}`, error);
        }
    }
    
    /**
     * 执行检测 (从TensorFlowService迁移)
     * @param {string} detectorType - 检测器类型
     * @param {HTMLElement} element - 输入元素
     * @param {Object} options - 检测选项
     * @returns {Promise<Array>} 检测结果
     */
    async detect(detectorType, element, options = {}) {
        const startTime = performance.now();
        
        try {
            // 获取检测器
            const detector = await this.loadDetector(detectorType, options.detectorConfig);
            
            // 执行检测
            let results;
            switch (detectorType) {
                case 'handpose':
                    results = await detector.estimateHands(element, options.flipHorizontal);
                    break;
                case 'facemesh':
                    results = await detector.estimateFaces(element, options.returnTensors, options.flipHorizontal);
                    break;
                case 'posenet':
                    results = await detector.estimatePoses(element, options);
                    break;
                case 'blazeface':
                    results = await detector.estimateFaces(element, options.returnTensors);
                    break;
                case 'bodyPix':
                    if (options.segmentPerson) {
                        results = await detector.segmentPerson(element, options);
                    } else {
                        results = await detector.segmentPersonParts(element, options);
                    }
                    break;
                default:
                    throw new Error(`不支持的检测类型: ${detectorType}`);
            }
            
            // 更新性能统计
            const inferenceTime = performance.now() - startTime;
            this._updateGlobalStats(inferenceTime);
            
            return results;
            
        } catch (error) {
            console.error(`❌ ${detectorType} 检测失败:`, error);
            throw ErrorHandler.createError('TensorFlowProvider', `检测失败: ${error.message}`, error);
        }
    }
    
    /**
      * 获取或创建检测器 (从TensorFlowService迁移的核心方法)
      * @param {string} modelType - 模型类型
      * @param {Object} options - 选项
      * @returns {Promise<Object>} 检测器实例
      */
     async getDetector(modelType, options = {}) {
         // 确保服务已初始化
         await this.initialize();
         
         // 验证模型类型
         if (!ModelConfigManager.isValidModelType(modelType)) {
             throw new Error(`不支持的模型类型: ${modelType}`);
         }
         
         const cacheKey = this._getDetectorCacheKey(modelType, options);
         
         // 检查是否已加载
         if (this.loadedDetectors.has(cacheKey)) {
             console.log(`📦 使用已加载的${modelType}检测器`);
             this.stats.hits++;
             return this.loadedDetectors.get(cacheKey);
         }
         
         try {
             console.log(`🔄 创建${modelType}检测器...`);
             this.stats.misses++;
             
             // 获取模型配置
             const modelConfig = ModelConfigManager.getModelConfig(modelType);
             const createParams = ModelConfigManager.getCreateParams(modelType, options);
             
             // 创建检测器
             const detector = await this._createDetector(modelType, createParams);
             
             // 缓存检测器实例
             this.loadedDetectors.set(cacheKey, detector);
             this.tfStatus.loadedModels.push(modelType);
             this.stats.modelsLoaded++;
             this.stats.cacheSize = this.loadedDetectors.size;
             
             // 发布模型加载事件
             eventBus.emit(EVENTS.MODEL_LOADED, {
                 modelType,
                 cacheKey,
                 memoryUsage: this.getMemoryUsage()
             });
             
             console.log(`✅ ${modelType}检测器创建完成`);
             return detector;
             
         } catch (error) {
             this.tfStatus.lastError = error;
             console.error(`❌ ${modelType}检测器创建失败:`, error);
             throw ErrorHandler.createError('ModelCreation', `${modelType}检测器创建失败: ${error.message}`, error);
         }
     }
     
     /**
      * 创建检测器
      * @private
      * @param {string} modelType - 模型类型
      * @param {Object} params - 创建参数
      * @returns {Promise<Object>} 检测器
      */
     async _createDetector(modelType, params) {
         const poseDetection = await this.loadPoseDetection();
         
         if (modelType === MODEL_TYPES.MOVENET) {
             return await poseDetection.createDetector(
                 poseDetection.SupportedModels.MoveNet,
                 {
                     modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                     ...params
                 }
             );
         } else if (modelType === MODEL_TYPES.POSENET) {
             return await poseDetection.createDetector(
                 poseDetection.SupportedModels.PoseNet,
                 params
             );
         } else {
             throw new Error(`不支持的模型类型: ${modelType}`);
         }
     }
     
     /**
      * 加载姿态检测模块
      * @returns {Promise<Object>} 姿态检测对象
      */
     async loadPoseDetection() {
         const moduleKey = 'poseDetection';
         
         if (this.loadedModules.has(moduleKey)) {
             return this.loadedModules.get(moduleKey);
         }
         
         if (this.loadingPromises.has(moduleKey)) {
             return this.loadingPromises.get(moduleKey);
         }
         
         const loadingPromise = this._loadPoseDetection();
         this.loadingPromises.set(moduleKey, loadingPromise);
         
         try {
             const poseDetection = await loadingPromise;
             this.loadedModules.set(moduleKey, poseDetection);
             return poseDetection;
         } finally {
             this.loadingPromises.delete(moduleKey);
         }
     }
     
     /**
      * 实际加载姿态检测模块（增强版）
      * @private
      */
     async _loadPoseDetection() {
         try {
             this._reportLoadingProgress('Pose Detection', 0, '开始加载姿态检测模块');
             
             // 检查是否已经加载
             if (window.poseDetection) {
                 console.log('✅ PoseDetection已存在，跳过加载');
                 this._reportLoadingProgress('Pose Detection', 100, '检测到已存在的模块');
                 return window.poseDetection;
             }
             
             // 检查缓存状态
             const cacheKey = 'poseDetection_loaded';
             if (this.cache.has(cacheKey)) {
                 console.log('📋 PoseDetection库已在缓存中');
                 this._reportLoadingProgress('Pose Detection', 90, '从缓存中获取模块');
                 if (window.poseDetection) {
                     this._reportLoadingProgress('Pose Detection', 100, '缓存模块加载完成');
                     return window.poseDetection;
                 }
             }
             
             console.log('📦 通过CDN加载姿态检测模块...');
             this._reportLoadingProgress('Pose Detection', 10, '准备从CDN加载');
             
             // 记录加载开始时间
             const startTime = performance.now();
             
             // 通过CDN动态加载PoseDetection
             this._reportLoadingProgress('Pose Detection', 30, '开始下载脚本文件');
             await this._loadScriptFromCDN('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');
             
             this._reportLoadingProgress('Pose Detection', 70, '脚本下载完成，等待初始化');
             // 等待PoseDetection完全加载
             await this._waitForGlobalVariable('poseDetection', 10000);
             
             this._reportLoadingProgress('Pose Detection', 85, '验证库完整性');
             // 验证库的完整性
             if (!window.poseDetection || !window.poseDetection.SupportedModels) {
                 throw new Error('PoseDetection library loaded but incomplete');
             }
             
             this._reportLoadingProgress('Pose Detection', 95, '保存到缓存');
             // 记录到缓存
             this.cache.set(cacheKey, {
                 loaded: true,
                 timestamp: Date.now(),
                 loadTime: performance.now() - startTime
             });
             
             console.log('✅ PoseDetection已设置为全局变量');
             console.log(`✅ 姿态检测模块加载完成 (${(performance.now() - startTime).toFixed(2)}ms)`);
             this._reportLoadingProgress('Pose Detection', 100, `加载完成 (${(performance.now() - startTime).toFixed(2)}ms)`);
             return window.poseDetection;
             
         } catch (error) {
             console.error('❌ 姿态检测模块加载失败:', error);
             this._reportLoadingProgress('Pose Detection', 0, `加载失败: ${error.message}`);
             
             // 清理可能的部分加载状态
             if (window.poseDetection && !window.poseDetection.SupportedModels) {
                 delete window.poseDetection;
             }
             
             throw error;
         }
     }
     
     /**
      * 获取内存使用情况
      * @returns {Object} 内存使用信息
      */
     getMemoryUsage() {
         const memoryUsage = memoryManager.getMemoryUsage();
         this.stats.memoryUsage = memoryUsage;
         return memoryUsage;
     }
     
     /**
      * 生成检测器缓存键
      * @private
      * @param {string} modelType - 模型类型
      * @param {Object} options - 选项
      * @returns {string} 缓存键
      */
     _getDetectorCacheKey(modelType, options) {
         const optionsHash = JSON.stringify(options);
         return `${modelType}-${btoa(optionsHash).slice(0, 8)}`;
     }
     
     /**
      * 从缓存键提取模型类型
      * @private
      * @param {string} cacheKey - 缓存键
      * @returns {string} 模型类型
      */
     _extractModelTypeFromCacheKey(cacheKey) {
         return cacheKey.split('-')[0];
     }
     
     /**
      * 加载模型
      * @param {string} modelId - 模型ID
     * @param {string} modelUrl - 模型URL
     * @param {Object} config - 模型配置
     * @returns {Promise<Object>} 模型信息
     */
    async loadModel(modelId, modelUrl, config = {}) {
        const startTime = performance.now();
        
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            if (this.models.has(modelId)) {
                console.log(`📦 模型 ${modelId} 已存在，跳过加载`);
                return this.getModelInfo(modelId);
            }
            
            console.log(`📥 开始加载模型: ${modelId}`);
            
            // 加载模型
            const model = await this._loadTensorFlowModel(modelUrl, config);
            
            // 存储模型和配置
            this.models.set(modelId, model);
            this.modelConfigs.set(modelId, {
                id: modelId,
                url: modelUrl,
                type: MODEL_TYPES.TENSORFLOW,
                status: MODEL_STATUS.LOADED,
                loadTime: performance.now() - startTime,
                inputShape: this._getModelInputShape(model),
                outputShape: this._getModelOutputShape(model),
                ...config
            });
            
            // 初始化统计信息
            this.modelStats.set(modelId, {
                loadTime: performance.now() - startTime,
                inferenceCount: 0,
                totalInferenceTime: 0,
                averageInferenceTime: 0,
                memoryUsage: this._getModelMemoryUsage(model),
                errorCount: 0
            });
            
            // 预热模型
            if (this.options.warmupRuns > 0) {
                await this._warmupModel(modelId, model);
            }
            
            // 记录性能数据
            const loadTime = performance.now() - startTime;
            this.performanceMonitor.loadTimes.set(modelId, loadTime);
            
            console.log(`✅ 模型 ${modelId} 加载完成，耗时: ${loadTime.toFixed(2)}ms`);
            
            return this.getModelInfo(modelId);
            
        } catch (error) {
            console.error(`❌ 模型 ${modelId} 加载失败:`, error);
            
            // 记录错误
            const errorCount = this.performanceMonitor.errorCounts.get(modelId) || 0;
            this.performanceMonitor.errorCounts.set(modelId, errorCount + 1);
            
            throw ErrorHandler.createError('TensorFlowProvider', `模型加载失败: ${error.message}`, error);
        }
    }
    
    /**
     * 卸载模型
     * @param {string} modelId - 模型ID
     * @returns {Promise<boolean>} 是否成功卸载
     */
    async unloadModel(modelId) {
        try {
            const model = this.models.get(modelId);
            if (!model) {
                console.warn(`⚠️ 模型 ${modelId} 不存在`);
                return false;
            }
            
            // 释放模型内存
            model.dispose();
            
            // 清理存储
            this.models.delete(modelId);
            this.modelConfigs.delete(modelId);
            this.modelStats.delete(modelId);
            
            // 清理性能监控数据
            this.performanceMonitor.loadTimes.delete(modelId);
            this.performanceMonitor.inferenceTimes.delete(modelId);
            this.performanceMonitor.memoryUsage.delete(modelId);
            this.performanceMonitor.errorCounts.delete(modelId);
            
            console.log(`🗑️ 模型 ${modelId} 已卸载`);
            return true;
            
        } catch (error) {
            console.error(`❌ 模型 ${modelId} 卸载失败:`, error);
            return false;
        }
    }
    
    /**
     * 执行推理
     * @param {string} modelId - 模型ID
     * @param {any} inputData - 输入数据
     * @param {Object} options - 推理选项
     * @returns {Promise<any>} 推理结果
     */
    async predict(modelId, inputData, options = {}) {
        const startTime = performance.now();
        
        try {
            const model = this.models.get(modelId);
            if (!model) {
                throw new Error(`模型 ${modelId} 未加载`);
            }
            
            // 预处理输入数据
            const processedInput = await this._preprocessInput(inputData, modelId, options);
            
            // 执行推理
            const prediction = await model.predict(processedInput);
            
            // 后处理输出数据
            const result = await this._postprocessOutput(prediction, modelId, options);
            
            // 更新统计信息
            const inferenceTime = performance.now() - startTime;
            this._updateInferenceStats(modelId, inferenceTime);
            
            return result;
            
        } catch (error) {
            console.error(`❌ 模型 ${modelId} 推理失败:`, error);
            
            // 记录错误
            const stats = this.modelStats.get(modelId);
            if (stats) {
                stats.errorCount++;
            }
            
            throw ErrorHandler.createError('TensorFlowProvider', `推理失败: ${error.message}`, error);
        }
    }
    
    /**
     * 获取模型信息
     * @param {string} modelId - 模型ID
     * @returns {Object|null} 模型信息
     */
    getModelInfo(modelId) {
        const config = this.modelConfigs.get(modelId);
        const stats = this.modelStats.get(modelId);
        
        if (!config) {
            return null;
        }
        
        return {
            ...config,
            stats: stats || {},
            isLoaded: this.models.has(modelId),
            memoryUsage: this._getCurrentMemoryUsage(modelId)
        };
    }
    
    /**
     * 获取所有已加载的模型
     * @returns {Array<Object>} 模型信息列表
     */
    getLoadedModels() {
        return Array.from(this.modelConfigs.keys()).map(modelId => this.getModelInfo(modelId));
    }
    
    /**
     * 预热模型
     * @param {string} modelId - 模型ID
     * @returns {Promise<void>}
     */
    async warmupModel(modelId) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`模型 ${modelId} 未加载`);
        }
        
        await this._warmupModel(modelId, model);
    }
    
    /**
     * 清理所有模型
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 开始清理TensorFlow模型...');
            
            // 卸载所有模型
            const modelIds = Array.from(this.models.keys());
            for (const modelId of modelIds) {
                await this.unloadModel(modelId);
            }
            
            // 清理TensorFlow.js内存
            if (this.tf) {
                this.tf.disposeVariables();
            }
            
            // 重置状态
            this.models.clear();
            this.modelConfigs.clear();
            this.modelStats.clear();
            
            // 清理性能监控数据
            Object.values(this.performanceMonitor).forEach(map => {
                if (map instanceof Map) {
                    map.clear();
                }
            });
            
            console.log('✅ TensorFlow模型清理完成');
            
        } catch (error) {
            console.error('❌ TensorFlow模型清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryUsage() {
        if (!this.tf) {
            return { total: 0, models: {} };
        }
        
        const memInfo = this.tf.memory();
        const modelMemory = {};
        
        for (const [modelId, model] of this.models) {
            modelMemory[modelId] = this._getModelMemoryUsage(model);
        }
        
        return {
            total: memInfo.numBytes,
            tensors: memInfo.numTensors,
            models: modelMemory,
            backend: this.options.backend
        };
    }
    
    /**
     * 获取性能统计
     * @returns {Object} 性能统计信息
     */
    getPerformanceStats() {
        const stats = {
            loadTimes: Object.fromEntries(this.performanceMonitor.loadTimes),
            inferenceTimes: Object.fromEntries(this.performanceMonitor.inferenceTimes),
            memoryUsage: Object.fromEntries(this.performanceMonitor.memoryUsage),
            errorCounts: Object.fromEntries(this.performanceMonitor.errorCounts),
            modelStats: {}
        };
        
        // 添加模型统计信息
        for (const [modelId, modelStats] of this.modelStats) {
            stats.modelStats[modelId] = { ...modelStats };
        }
        
        return stats;
    }
    
    /**
     * 设置后端
     * @private
     * @returns {Promise<void>}
     */
    async _setupBackend() {
        try {
            await this.tf.setBackend(this.options.backend);
            await this.tf.ready();
            
            console.log(`🔧 TensorFlow.js后端设置为: ${this.options.backend}`);
            
        } catch (error) {
            console.warn(`⚠️ 后端 ${this.options.backend} 设置失败，回退到默认后端`);
            await this.tf.ready();
        }
    }
    
    /**
     * 配置内存管理
     * @private
     */
    _configureMemoryManagement() {
        if (this.options.memoryLimit && this.tf.env) {
            // 设置内存限制（如果支持）
            try {
                this.tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', this.options.memoryLimit * 1024 * 1024);
            } catch (error) {
                console.warn('⚠️ 内存限制设置失败:', error.message);
            }
        }
    }
    
    /**
     * 加载TensorFlow模型
     * @private
     * @param {string} modelUrl - 模型URL
     * @param {Object} config - 配置
     * @returns {Promise<any>} 加载的模型
     */
    async _loadTensorFlowModel(modelUrl, config) {
        const loadOptions = {
            ...config.loadOptions,
            onProgress: config.onProgress
        };
        
        if (modelUrl.endsWith('.json')) {
            // 加载图模型
            return await this.tf.loadGraphModel(modelUrl, loadOptions);
        } else if (modelUrl.includes('tfhub.dev')) {
            // 加载TensorFlow Hub模型
            return await this.tf.loadGraphModel(modelUrl, loadOptions);
        } else {
            // 尝试加载层模型
            return await this.tf.loadLayersModel(modelUrl, loadOptions);
        }
    }
    
    /**
     * 获取模型输入形状
     * @private
     * @param {any} model - 模型
     * @returns {Array} 输入形状
     */
    _getModelInputShape(model) {
        try {
            if (model.inputs && model.inputs.length > 0) {
                return model.inputs[0].shape;
            }
            
            if (model.inputLayers && model.inputLayers.length > 0) {
                return model.inputLayers[0].batchInputShape;
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ 无法获取模型输入形状:', error.message);
            return null;
        }
    }
    
    /**
     * 获取模型输出形状
     * @private
     * @param {any} model - 模型
     * @returns {Array} 输出形状
     */
    _getModelOutputShape(model) {
        try {
            if (model.outputs && model.outputs.length > 0) {
                return model.outputs[0].shape;
            }
            
            if (model.outputLayers && model.outputLayers.length > 0) {
                return model.outputLayers[0].outputShape;
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ 无法获取模型输出形状:', error.message);
            return null;
        }
    }
    
    /**
     * 预热模型
     * @private
     * @param {string} modelId - 模型ID
     * @param {any} model - 模型
     * @returns {Promise<void>}
     */
    async _warmupModel(modelId, model) {
        try {
            console.log(`🔥 开始预热模型: ${modelId}`);
            
            const inputShape = this._getModelInputShape(model);
            if (!inputShape) {
                console.warn(`⚠️ 无法获取模型 ${modelId} 的输入形状，跳过预热`);
                return;
            }
            
            // 创建虚拟输入数据
            const dummyInput = this.tf.randomNormal(inputShape);
            
            // 执行预热推理
            for (let i = 0; i < this.options.warmupRuns; i++) {
                const prediction = model.predict(dummyInput);
                
                // 确保计算完成
                if (Array.isArray(prediction)) {
                    await Promise.all(prediction.map(p => p.data()));
                    prediction.forEach(p => p.dispose());
                } else {
                    await prediction.data();
                    prediction.dispose();
                }
            }
            
            // 清理虚拟输入
            dummyInput.dispose();
            
            console.log(`✅ 模型 ${modelId} 预热完成`);
            
        } catch (error) {
            console.warn(`⚠️ 模型 ${modelId} 预热失败:`, error.message);
        }
    }
    
    /**
     * 预处理输入数据
     * @private
     * @param {any} inputData - 输入数据
     * @param {string} modelId - 模型ID
     * @param {Object} options - 选项
     * @returns {Promise<any>} 处理后的输入
     */
    async _preprocessInput(inputData, modelId, options) {
        // 如果已经是张量，直接返回
        if (inputData && typeof inputData.dataSync === 'function') {
            return inputData;
        }
        
        // 如果是图像数据
        if (inputData instanceof HTMLImageElement || 
            inputData instanceof HTMLCanvasElement || 
            inputData instanceof HTMLVideoElement) {
            
            const tensor = this.tf.browser.fromPixels(inputData);
            
            // 添加批次维度
            const expanded = tensor.expandDims(0);
            tensor.dispose();
            
            // 归一化到[0,1]
            if (options.normalize !== false) {
                const normalized = expanded.div(255.0);
                expanded.dispose();
                return normalized;
            }
            
            return expanded;
        }
        
        // 如果是数组数据
        if (Array.isArray(inputData)) {
            return this.tf.tensor(inputData);
        }
        
        // 其他情况直接返回
        return inputData;
    }
    
    /**
     * 后处理输出数据
     * @private
     * @param {any} prediction - 预测结果
     * @param {string} modelId - 模型ID
     * @param {Object} options - 选项
     * @returns {Promise<any>} 处理后的输出
     */
    async _postprocessOutput(prediction, modelId, options) {
        try {
            let result;
            
            if (Array.isArray(prediction)) {
                // 多输出模型
                result = await Promise.all(
                    prediction.map(async (tensor) => {
                        const data = await tensor.data();
                        const shape = tensor.shape;
                        tensor.dispose();
                        return { data: Array.from(data), shape };
                    })
                );
            } else {
                // 单输出模型
                const data = await prediction.data();
                const shape = prediction.shape;
                prediction.dispose();
                result = { data: Array.from(data), shape };
            }
            
            return result;
            
        } catch (error) {
            // 确保清理张量
            if (Array.isArray(prediction)) {
                prediction.forEach(tensor => {
                    try { tensor.dispose(); } catch (e) {}
                });
            } else if (prediction && typeof prediction.dispose === 'function') {
                try { prediction.dispose(); } catch (e) {}
            }
            
            throw error;
        }
    }
    
    /**
     * 获取模型内存使用
     * @private
     * @param {any} model - 模型
     * @returns {number} 内存使用量（字节）
     */
    _getModelMemoryUsage(model) {
        try {
            if (model && typeof model.countParams === 'function') {
                return model.countParams() * 4; // 假设每个参数4字节
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * 获取当前内存使用
     * @private
     * @param {string} modelId - 模型ID
     * @returns {number} 内存使用量
     */
    _getCurrentMemoryUsage(modelId) {
        const model = this.models.get(modelId);
        if (!model) {
            return 0;
        }
        
        return this._getModelMemoryUsage(model);
    }
    
    /**
     * 更新推理统计
     * @private
     * @param {string} modelId - 模型ID
     * @param {number} inferenceTime - 推理时间
     */
    _updateInferenceStats(modelId, inferenceTime) {
        const stats = this.modelStats.get(modelId);
        if (!stats) {
            return;
        }
        
        stats.inferenceCount++;
        stats.totalInferenceTime += inferenceTime;
        stats.averageInferenceTime = stats.totalInferenceTime / stats.inferenceCount;
        
        // 更新性能监控
        this.performanceMonitor.inferenceTimes.set(modelId, inferenceTime);
    }
    
    /**
     * 更新全局统计信息
     * @private
     * @param {number} inferenceTime - 推理时间
     */
    _updateGlobalStats(inferenceTime) {
        this.stats.totalInferences++;
        this.stats.totalRequests++;
        
        // 更新平均推理时间
        const totalTime = this.stats.averageInferenceTime * (this.stats.totalInferences - 1) + inferenceTime;
        this.stats.averageInferenceTime = totalTime / this.stats.totalInferences;
    }
    
    /**
     * 批量预加载模型
     * @param {Array<Object>} models - 模型配置数组
     * @returns {Promise<void>}
     */
    async batchPreloadModels(models = []) {
        if (!models || models.length === 0) {
            console.log('📦 没有指定预加载模型，跳过批量预加载');
            return;
        }
        
        console.log(`📦 开始批量预加载${models.length}个模型...`);
        
        const preloadPromises = models.map(async ({ type, options = {} }) => {
            try {
                await this.getDetector(type, options);
                console.log(`✅ ${type}模型预加载完成`);
            } catch (error) {
                console.warn(`⚠️ ${type}模型预加载失败:`, error);
            }
        });
        
        await Promise.allSettled(preloadPromises);
        console.log('✅ 批量模型预加载完成');
    }
    
    /**
     * 清理未使用的模型
     * @param {Array<string>} keepModels - 要保留的模型类型
     */
    cleanupUnusedModels(keepModels = []) {
        console.log('🧹 清理未使用的模型...');
        
        for (const [cacheKey, detector] of this.loadedDetectors.entries()) {
            const modelType = this._extractModelTypeFromCacheKey(cacheKey);
            
            if (!keepModels.includes(modelType)) {
                // 清理检测器资源
                if (detector && typeof detector.dispose === 'function') {
                    try {
                        detector.dispose();
                    } catch (error) {
                        console.warn(`⚠️ 清理检测器失败: ${cacheKey}`, error);
                    }
                }
                
                this.loadedDetectors.delete(cacheKey);
                console.log(`🗑️ 清理未使用的模型: ${modelType}`);
            }
        }
        
        // 清理未使用的模块
        this.cleanupUnusedModules(keepModels);
        
        // 触发内存清理
        if (memoryManager && typeof memoryManager.cleanup === 'function') {
            memoryManager.cleanup();
        }
        
        // 更新状态
        this.tfStatus.loadedModels = keepModels;
        this.stats.cacheSize = this.loadedDetectors.size;
    }
    
    /**
     * 清理未使用的模块
     * @param {Array<string>} keepModels - 要保留的模型类型
     */
    cleanupUnusedModules(keepModels) {
        // 基础模块始终保留
        const keepModules = ['tensorflow', 'poseDetection'];
        
        for (const [moduleKey] of this.loadedModules.entries()) {
            if (!keepModules.includes(moduleKey)) {
                this.loadedModules.delete(moduleKey);
                console.log(`🗑️ 清理未使用的模块: ${moduleKey}`);
            }
        }
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        return {
            ...this.stats,
            hitRate: this.stats.totalRequests > 0 ? 
                (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
        };
    }
    
    /**
     * 获取已加载的模型类型
     * @returns {Array<string>} 模型类型数组
     */
    getLoadedModelTypes() {
        const types = new Set();
        for (const cacheKey of this.loadedDetectors.keys()) {
            types.add(this._extractModelTypeFromCacheKey(cacheKey));
        }
        return Array.from(types);
    }
    
    /**
     * 获取服务状态
     * @returns {Object} 服务状态
     */
    getStatus() {
        return {
            ...this.tfStatus,
            isInitialized: this.isInitialized,
            loadedDetectors: this.loadedDetectors.size,
            loadedModules: this.loadedModules.size,
            cacheStats: this.getCacheStats(),
            memoryStats: memoryManager ? memoryManager.getStats() : null,
            status: this.status
        };
    }
    
    /**
     * 销毁模型提供者
     * @returns {Promise<void>}
     */
    async destroy() {
        console.log('🗑️ 销毁TensorFlow模型提供者...');
        
        // 清理所有检测器
        for (const [cacheKey, detector] of this.loadedDetectors.entries()) {
            if (detector && typeof detector.dispose === 'function') {
                try {
                    detector.dispose();
                } catch (error) {
                    console.warn(`⚠️ 清理检测器失败: ${cacheKey}`, error);
                }
            }
        }
        this.loadedDetectors.clear();
        
        // 清理所有模型
        for (const [modelId, model] of this.models.entries()) {
            try {
                if (model && typeof model.dispose === 'function') {
                    model.dispose();
                }
            } catch (error) {
                console.warn(`⚠️ 模型${modelId}清理失败:`, error);
            }
        }
        
        this.models.clear();
        this.modelConfigs.clear();
        this.loadedModules.clear();
        
        // 停止内存监控
        if (memoryManager && typeof memoryManager.stopMemoryMonitoring === 'function') {
            memoryManager.stopMemoryMonitoring();
        }
        
        // 重置状态
        this.isInitialized = false;
        this.initializationPromise = null;
        this.status = MODEL_STATUS.IDLE;
        this.tf = null;
        this.tfStatus = {
            isReady: false,
            loadedModels: [],
            lastError: null
        };
        
        // 发布销毁事件
        eventBus.emit(EVENTS.TENSORFLOW_DESTROYED, {});
        
        console.log('✅ TensorFlow模型提供者已销毁');
    }
    
    /**
     * 加载Handpose检测器
     * @private
     * @param {Object} config - 配置
     * @returns {Promise<Object>} 检测器
     */
    async _loadHandposeDetector(config) {
        const handpose = await import('@tensorflow-models/handpose');
        return await handpose.load(config);
    }
    
    /**
     * 加载Facemesh检测器
     * @private
     * @param {Object} config - 配置
     * @returns {Promise<Object>} 检测器
     */
    async _loadFacemeshDetector(config) {
        const facemesh = await import('@tensorflow-models/facemesh');
        return await facemesh.load(config);
    }
    
    /**
     * 加载PoseNet检测器
     * @private
     * @param {Object} config - 配置
     * @returns {Promise<Object>} 检测器
     */
    async _loadPosenetDetector(config) {
        const posenet = await import('@tensorflow-models/posenet');
        return await posenet.load(config);
    }
    
    /**
     * 加载BlazeFace检测器
     * @private
     * @param {Object} config - 配置
     * @returns {Promise<Object>} 检测器
     */
    async _loadBlazefaceDetector(config) {
        const blazeface = await import('@tensorflow-models/blazeface');
        return await blazeface.load(config);
    }
    
    /**
     * 加载BodyPix检测器
     * @private
     * @param {Object} config - 配置
     * @returns {Promise<Object>} 检测器
     */
    async _loadBodyPixDetector(config) {
        const bodyPix = await import('@tensorflow-models/body-pix');
        return await bodyPix.load(config);
    }
    
    /**
     * 从CDN加载脚本（增强版）
     * @private
     * @param {string} url - CDN URL
     * @returns {Promise<void>}
     */
    async _loadScriptFromCDN(url) {
        return new Promise((resolve, reject) => {
            // 检查脚本是否已经存在
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                console.log(`📋 脚本已存在，跳过加载: ${url}`);
                resolve();
                return;
            }
            
            // 检查全局变量是否已存在（避免重复初始化）
            if (url.includes('tfjs@') && window.tf && this._isTensorFlowVersionValid()) {
                console.log(`📋 TensorFlow.js已存在且版本正确，跳过加载`);
                resolve();
                return;
            }
            
            if (url.includes('tfjs-backend-webgl') && window.tf && window.tf.getBackend() === 'webgl') {
                console.log(`📋 WebGL后端已存在，跳过加载`);
                resolve();
                return;
            }
            
            if (url.includes('pose-detection') && window.poseDetection) {
                console.log(`📋 PoseDetection已存在，跳过加载`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            // 添加超时处理
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error(`Script load timeout: ${url}`));
            }, 30000); // 30秒超时
            
            script.onload = () => {
                clearTimeout(timeout);
                console.log(`✅ 脚本加载成功: ${url}`);
                
                // 发布加载事件
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit('scriptLoaded', { url, success: true });
                }
                
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeout);
                script.remove();
                console.error(`❌ 脚本加载失败: ${url}`, error);
                
                // 发布加载事件
                if (typeof eventBus !== 'undefined') {
                    eventBus.emit('scriptLoaded', { url, success: false, error });
                }
                
                reject(new Error(`Failed to load script: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 等待全局变量可用（增强版）
     * @private
     * @param {string} variableName - 变量名
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<any>}
     */
    async _waitForGlobalVariable(variableName, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkVariable = () => {
                if (window[variableName]) {
                    console.log(`✅ 全局变量 ${variableName} 已可用`);
                    resolve(window[variableName]);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for global variable: ${variableName} after ${timeout}ms`));
                    return;
                }
                
                setTimeout(checkVariable, 100);
            };
            
            checkVariable();
        });
    }
    
    /**
      * 清理和重置库状态（智能清理）
      * @private
      * @param {string} libraryName - 库名称
      */
     _cleanupLibraryState(libraryName) {
         try {
             switch (libraryName) {
                 case 'tensorflow':
                     if (window.tf) {
                         // 只清理不完整或错误的状态，不影响正常功能
                         try {
                             // 检查TensorFlow.js是否处于错误状态
                             if (!window.tf.engine || !window.tf.engine()) {
                                 console.log('🧹 检测到TensorFlow.js错误状态，清理中...');
                                 delete window.tf;
                                 return;
                             }
                             
                             // 检查后端注册状态
                             const engine = window.tf.engine();
                             if (engine && engine.registry && engine.registry.backends) {
                                 const backends = engine.registry.backends;
                                 const webglBackends = Object.keys(backends).filter(name => name.includes('webgl'));
                                 
                                 // 如果有多个WebGL后端，这是重复注册的迹象
                             if (webglBackends.length > 1) {
                                 console.info(`ℹ️ 检测到${webglBackends.length}个WebGL后端，这是TensorFlow.js正常的初始化过程`);
                                 // 不进行清理，因为这可能是正常的初始化过程
                             }
                             }
                         } catch (cleanupError) {
                             console.warn('⚠️ TensorFlow.js状态检查失败:', cleanupError);
                         }
                     }
                     break;
                     
                 case 'poseDetection':
                     if (window.poseDetection) {
                         // 清理可能的部分加载状态
                         if (!window.poseDetection.SupportedModels) {
                             console.log('🧹 清理不完整的PoseDetection状态');
                             delete window.poseDetection;
                         }
                     }
                     break;
                     
                 default:
                     console.warn(`⚠️ 未知的库名称: ${libraryName}`);
             }
         } catch (error) {
             console.error(`❌ 清理库状态失败 (${libraryName}):`, error);
         }
     }
    
    /**
      * 检查库的重复注册状态
      * @private
      * @param {string} libraryName - 库名称
      * @returns {boolean} 是否存在重复注册
      */
     _checkDuplicateRegistration(libraryName) {
         try {
             switch (libraryName) {
                 case 'tensorflow':
                     if (window.tf && window.tf.engine) {
                         const engine = window.tf.engine();
                         if (engine && engine.registry && engine.registry.backends) {
                             const backends = engine.registry.backends;
                             const webglBackends = Object.keys(backends).filter(name => name.includes('webgl'));
                             
                             // 检查是否有多个WebGL后端
                             if (webglBackends.length > 1) {
                                 console.info(`ℹ️ 检测到${webglBackends.length}个WebGL后端: ${webglBackends.join(', ')}`);
                                 console.info('ℹ️ 这通常是正常的初始化过程，不会影响功能');
                                 return true;
                             }
                             
                             // 检查内核注册
                             const kernels = engine.registry.kernelRegistry;
                             if (kernels) {
                                 const duplicateKernels = new Set();
                                 Object.keys(kernels).forEach(kernelName => {
                                     const implementations = kernels[kernelName];
                                     if (implementations && Object.keys(implementations).length > 1) {
                                         duplicateKernels.add(kernelName);
                                     }
                                 });
                                 
                                 if (duplicateKernels.size > 0) {
                                     console.info(`ℹ️ 检测到${duplicateKernels.size}个内核有多个实现，这是正常的`);
                                 }
                             }
                         }
                     }
                     break;
                     
                 case 'poseDetection':
                     // PoseDetection通常不会有重复注册问题
                     return false;
                     
                 default:
                     return false;
             }
             return false;
         } catch (error) {
             console.error(`❌ 检查重复注册失败 (${libraryName}):`, error);
             return false;
         }
     }
     
     /**
      * 设置进度回调函数
      * @param {Function} callback - 进度回调函数 (progress, message, detail) => void
      */
     setProgressCallback(callback) {
         this.progressCallback = callback;
     }
     
     /**
      * 临时抑制TensorFlow.js的重复注册警告
      * @private
      */
     _suppressTensorFlowWarnings() {
         try {
             // 保存原始的console.warn方法
             if (!this._originalConsoleWarn) {
                 this._originalConsoleWarn = console.warn;
             }
             
             // 临时替换console.warn以过滤TensorFlow.js的重复注册警告
             console.warn = (...args) => {
                 const message = args.join(' ');
                 
                 // 过滤掉已知的TensorFlow.js重复注册警告
                 const suppressedPatterns = [
                     'backend was already registered',
                     'kernel.*is already registered',
                     'The kernel.*is already registered'
                 ];
                 
                 const shouldSuppress = suppressedPatterns.some(pattern => 
                     new RegExp(pattern, 'i').test(message)
                 );
                 
                 if (!shouldSuppress) {
                     this._originalConsoleWarn.apply(console, args);
                 }
             };
             
             // 5秒后恢复原始的console.warn
             setTimeout(() => {
                 if (this._originalConsoleWarn) {
                     console.warn = this._originalConsoleWarn;
                     this._originalConsoleWarn = null;
                 }
             }, 5000);
             
         } catch (error) {
             console.error('❌ 抑制警告设置失败:', error);
         }
     }
     
     /**
      * 提供加载进度反馈
      * @private
      * @param {string} stage - 加载阶段
      * @param {number} progress - 进度百分比 (0-100)
      * @param {string} message - 进度消息
      */
     _reportLoadingProgress(stage, progress, message) {
         try {
             const progressInfo = {
                 stage,
                 progress: Math.min(100, Math.max(0, progress)),
                 message,
                 timestamp: Date.now()
             };
             
             console.log(`📊 ${stage}: ${progress}% - ${message}`);
             
             // 调用进度回调函数
             if (this.progressCallback && typeof this.progressCallback === 'function') {
                 try {
                     this.progressCallback(progressInfo.progress, message, stage);
                 } catch (callbackError) {
                     console.warn('⚠️ 进度回调函数执行失败:', callbackError);
                 }
             }
             
             // 发布进度事件
             if (typeof eventBus !== 'undefined') {
                 eventBus.emit('loadingProgress', progressInfo);
             }
             
             // 更新UI（如果有加载管理器）
             if (typeof window !== 'undefined' && window.loadingManager) {
                 window.loadingManager.updateProgress(progressInfo);
             }
         } catch (error) {
             console.warn('⚠️ 进度报告失败:', error);
         }
     }
     
     /**
      * 获取系统诊断信息
      * @returns {Object} 诊断信息
      */
     getDiagnosticInfo() {
         try {
             const diagnostics = {
                 tensorflow: {
                     loaded: !!window.tf,
                     version: window.tf?.version || 'unknown',
                     backend: window.tf?.getBackend?.() || 'unknown',
                     ready: this.isInitialized
                 },
                 poseDetection: {
                     loaded: !!window.poseDetection,
                     hasModels: !!(window.poseDetection?.SupportedModels)
                 },
                 performance: {
                     ...PerformanceTracker.metrics,
                     cacheStats: {
                         hits: this.stats.hits,
                         misses: this.stats.misses,
                         size: this.loadedDetectors.size
                     }
                 },
                 memory: this.getMemoryUsage(),
                 duplicateRegistrations: {
                     tensorflow: this._checkDuplicateRegistration('tensorflow'),
                     poseDetection: this._checkDuplicateRegistration('poseDetection')
                 }
             };
             
             return diagnostics;
         } catch (error) {
             console.error('❌ 获取诊断信息失败:', error);
             return { error: error.message };
         }
     }
}

// 导出模型状态和类型枚举
export { MODEL_STATUS, MODEL_TYPES };