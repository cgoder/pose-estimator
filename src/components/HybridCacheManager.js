import { CONFIG } from '../utils/constants.js';
import { ErrorHandler } from '../utils/errorHandling.js';
import { IndexedDBCacheManager } from './IndexedDBCacheManager.js';

/**
 * 混合缓存管理器
 * 智能选择最佳缓存策略，提供统一的缓存接口
 * 优先级：内存缓存 > IndexedDB 元数据缓存 > 直接加载
 */
export class HybridCacheManager {
    constructor() {
        this.modelInstances = new Map(); // L1: 内存缓存
        this.primaryCache = null;        // L2: 主缓存策略
        this.fallbackCache = null;       // L3: 备用缓存策略
        this.cacheType = 'none';
        this.initialized = false;
        
        // 统计信息
        this.stats = {
            hits: 0,
            misses: 0,
            loads: 0,
            cacheType: 'none'
        };
    }

    /**
     * 初始化混合缓存系统
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔄 初始化混合缓存系统...');
            
            await this.detectBestCacheStrategy();
            
            // 初始化主缓存
            if (this.primaryCache?.init) {
                await this.primaryCache.init();
            }
            
            // 初始化备用缓存
            if (this.fallbackCache?.init && this.fallbackCache !== this.primaryCache) {
                await this.fallbackCache.init();
            }
            
            this.initialized = true;
            console.log(`✅ 混合缓存系统初始化完成，使用策略: ${this.cacheType}`);
            
        } catch (error) {
            console.warn('⚠️ 混合缓存初始化失败，使用基础缓存', error);
            this.cacheType = 'memory-only';
            this.initialized = true;
        }
    }

    /**
     * 检测最佳缓存策略
     */
    async detectBestCacheStrategy() {
        const capabilities = await this.detectBrowserCapabilities();
        
        // 简化策略：只使用 IndexedDB + Memory 缓存
        // 避免 CORS 问题和复杂的文件缓存逻辑
        this.cacheType = 'indexeddb';
        this.primaryCache = new IndexedDBCacheManager();
        this.fallbackCache = this.primaryCache; // 使用同一个实例
        console.log('💾 使用 IndexedDB + Memory 缓存策略');
        
        this.stats.cacheType = this.cacheType;
    }

    /**
     * 检测浏览器缓存能力
     */
    async detectBrowserCapabilities() {
        const capabilities = {
            fileSystemAccess: false,
            cacheAPI: false,
            indexedDB: false,
            webAssembly: false,
            serviceWorker: false
        };

        // 检测 File System Access API
        try {
            capabilities.fileSystemAccess = 'showDirectoryPicker' in window;
        } catch (e) {
            capabilities.fileSystemAccess = false;
        }

        // 检测 Cache API
        try {
            capabilities.cacheAPI = 'caches' in window;
        } catch (e) {
            capabilities.cacheAPI = false;
        }

        // 检测 IndexedDB
        try {
            capabilities.indexedDB = 'indexedDB' in window;
        } catch (e) {
            capabilities.indexedDB = false;
        }

        // 检测 WebAssembly
        try {
            capabilities.webAssembly = 'WebAssembly' in window;
        } catch (e) {
            capabilities.webAssembly = false;
        }

        // 检测 Service Worker
        try {
            capabilities.serviceWorker = 'serviceWorker' in navigator;
        } catch (e) {
            capabilities.serviceWorker = false;
        }

        console.log('🔍 浏览器缓存能力检测:', capabilities);
        return capabilities;
    }

    /**
     * 获取或创建模型（智能缓存策略）
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<Object>} 模型实例
     */
    async getOrCreateModel(modelType, modelUrl, createModelFn) {
        const cacheKey = `${modelType}_${btoa(modelUrl).slice(0, 16)}`;
        
        try {
            console.log(`🔍 检查缓存: ${modelType}`);
            
            // 1. 检查内存缓存（最快）
            if (this.modelInstances.has(cacheKey)) {
                this.stats.hits++;
                console.log(`🎯 内存缓存命中: ${modelType}`);
                return this.modelInstances.get(cacheKey);
            }

            // 2. 尝试 IndexedDB 元数据缓存检查
            let model = null;
            if (this.primaryCache && this.primaryCache.getOrCreateModel) {
                try {
                    console.log(`🔍 检查 IndexedDB 缓存: ${modelType}`);
                    model = await this.primaryCache.getOrCreateModel(modelType, modelUrl, createModelFn);
                    
                    if (model) {
                        console.log(`✅ IndexedDB 缓存命中: ${modelType}`);
                        this.stats.hits++;
                        this.modelInstances.set(cacheKey, model);
                        return model;
                    }
                } catch (error) {
                    console.warn(`⚠️ IndexedDB 缓存失败: ${error.message}`);
                }
            }

            // 3. 所有缓存都未命中，直接加载
            this.stats.misses++;
            this.stats.loads++;
            
            console.log(`🔄 缓存未命中，直接加载: ${modelType}`);
            const startTime = performance.now();
            
            model = await ErrorHandler.retry(() => createModelFn(), 3, 1000);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ 模型加载完成: ${modelType} (${loadTime.toFixed(1)}ms)`);

            // 4. 存储到内存缓存和元数据缓存
            this.modelInstances.set(cacheKey, model);
            
            // 只存储元数据到 IndexedDB，不存储模型文件
            if (this.primaryCache && this.primaryCache._setMetadataToIndexedDB) {
                try {
                    await this.primaryCache._setMetadataToIndexedDB(cacheKey, { 
                        modelType, 
                        modelUrl,
                        loadTime: loadTime.toFixed(1)
                    });
                    console.log(`📋 模型元数据已存储: ${modelType}`);
                } catch (error) {
                    console.warn(`⚠️ 元数据存储失败: ${error.message}`);
                }
            }

            return model;

        } catch (error) {
            this.stats.misses++;
            throw ErrorHandler.createError('HybridCache', `混合缓存操作失败: ${error.message}`, error);
        }
    }

    /**
     * 预加载模型
     */
    async preloadModel(modelType, modelUrl, createModelFn) {
        try {
            console.log(`🔄 预加载模型: ${modelType}`);
            await this.getOrCreateModel(modelType, modelUrl, createModelFn);
            console.log(`✅ 模型预加载完成: ${modelType}`);
        } catch (error) {
            console.warn(`⚠️ 模型预加载失败: ${modelType}`, error);
        }
    }

    /**
     * 获取综合缓存统计
     */
    async getStats() {
        const baseStats = {
            ...this.stats,
            memoryModels: this.modelInstances.size,
            hitRate: this.stats.hits + this.stats.misses > 0 
                ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
                : '0%'
        };

        // 获取各缓存层的统计
        if (this.primaryCache?.getStats) {
            baseStats.primaryCache = await this.primaryCache.getStats();
        }

        return baseStats;
    }

    /**
     * 清空所有缓存
     */
    async clearAll() {
        this.modelInstances.clear();
        
        if (this.primaryCache?.clearAll) {
            await this.primaryCache.clearAll();
        }
        
        // 重置统计
        this.stats = { hits: 0, misses: 0, loads: 0, cacheType: this.cacheType };
        
        console.log('🗑️ 所有缓存已清空');
    }
}

/**
 * 混合缓存管理器实例
 * 全局单例，用于替代原有的ModelCacheManager
 */
export const hybridCacheManager = new HybridCacheManager();

// 为了向后兼容，也导出为modelCacheManager
export const modelCacheManager = hybridCacheManager;

// 默认导出
export default hybridCacheManager;