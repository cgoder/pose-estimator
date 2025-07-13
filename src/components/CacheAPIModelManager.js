import { CONFIG } from '../utils/constants.js';
import { ErrorHandler } from '../utils/errorHandling.js';

/**
 * 基于 Cache API 的模型缓存管理器
 * 适用于缓存模型文件本身，而不是模型对象
 * 优势：专为网络资源缓存设计，支持版本控制，离线可用
 */
export class CacheAPIModelManager {
    constructor() {
        this.cacheName = `tf-models-v${CONFIG.MODEL.CACHE_VERSION}`;
        this.cache = null;
        this.modelInstances = new Map(); // 内存中的模型实例
    }

    /**
     * 初始化 Cache API
     */
    async init() {
        try {
            this.cache = await caches.open(this.cacheName);
            console.log(`🗄️ Cache API 初始化成功: ${this.cacheName}`);
            
            // 清理旧版本缓存
            await this.cleanupOldCaches();
        } catch (error) {
            console.warn('⚠️ Cache API 不可用，将使用网络加载', error);
        }
    }

    /**
     * 清理旧版本缓存
     */
    async cleanupOldCaches() {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('tf-models-') && name !== this.cacheName
        );

        await Promise.all(
            oldCaches.map(cacheName => {
                console.log(`🗑️ 删除旧缓存: ${cacheName}`);
                return caches.delete(cacheName);
            })
        );
    }

    /**
     * 缓存模型文件
     * @param {string} modelUrl - 模型URL
     * @returns {Promise<Response>}
     */
    async cacheModelFiles(modelUrl) {
        if (!this.cache) {
            throw new Error('Cache API 未初始化');
        }

        // 获取模型的所有相关文件
        const modelFiles = await this.getModelFileUrls(modelUrl);
        
        // 批量缓存所有文件
        await Promise.all(
            modelFiles.map(async (fileUrl) => {
                try {
                    const response = await fetch(fileUrl);
                    if (response.ok) {
                        await this.cache.put(fileUrl, response.clone());
                        console.log(`📦 已缓存模型文件: ${fileUrl}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ 缓存文件失败: ${fileUrl}`, error);
                }
            })
        );
    }

    /**
     * 获取模型的所有文件URL
     * @param {string} modelUrl - 主模型URL
     * @returns {Promise<string[]>}
     */
    async getModelFileUrls(modelUrl) {
        const files = [modelUrl];
        
        try {
            // 获取 model.json 来找到所有权重文件
            const response = await fetch(modelUrl);
            const modelJson = await response.json();
            
            if (modelJson.weightsManifest) {
                const baseUrl = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
                modelJson.weightsManifest.forEach(manifest => {
                    manifest.paths.forEach(path => {
                        files.push(baseUrl + path);
                    });
                });
            }
        } catch (error) {
            console.warn('⚠️ 无法解析模型文件清单', error);
        }
        
        return files;
    }

    /**
     * 从缓存加载模型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<Object>}
     */
    async loadModel(modelUrl, createModelFn) {
        const cacheKey = this.generateCacheKey(modelUrl);
        
        // 检查内存缓存
        if (this.modelInstances.has(cacheKey)) {
            console.log(`🎯 内存缓存命中: ${cacheKey}`);
            return this.modelInstances.get(cacheKey);
        }

        // 检查 Cache API 缓存
        if (this.cache) {
            const cachedResponse = await this.cache.match(modelUrl);
            if (cachedResponse) {
                console.log(`🗄️ Cache API 缓存命中: ${modelUrl}`);
                // 使用缓存的文件创建模型
                const model = await createModelFn();
                this.modelInstances.set(cacheKey, model);
                return model;
            }
        }

        // 缓存未命中，加载并缓存
        console.log(`🔄 加载新模型: ${modelUrl}`);
        const model = await createModelFn();
        
        // 缓存模型文件
        if (this.cache) {
            await this.cacheModelFiles(modelUrl);
        }
        
        // 缓存模型实例
        this.modelInstances.set(cacheKey, model);
        
        return model;
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(modelUrl) {
        return `model_${btoa(modelUrl).slice(0, 16)}`;
    }

    /**
     * 获取缓存统计
     */
    async getStats() {
        const stats = {
            memoryModels: this.modelInstances.size,
            cacheApiAvailable: !!this.cache
        };

        if (this.cache) {
            const requests = await this.cache.keys();
            stats.cachedFiles = requests.length;
            stats.cachedUrls = requests.map(req => req.url);
        }

        return stats;
    }

    /**
     * 清空所有缓存
     */
    async clearAll() {
        this.modelInstances.clear();
        
        if (this.cache) {
            const requests = await this.cache.keys();
            await Promise.all(requests.map(request => this.cache.delete(request)));
            console.log('🗑️ 已清空 Cache API 缓存');
        }
    }
}