/**
 * 模型缓存管理器
 * 提供内存缓存和IndexedDB持久化缓存功能
 */
export declare class ModelCacheManager {
    private modelCache;
    private db;
    private cacheStats;
    constructor();
    /**
     * 初始化缓存管理器
     * @returns {Promise<void>}
     */
    init(): Promise<void>;
    /**
     * 初始化IndexedDB
     * @returns {Promise<void>}
     */
    initDB(): Promise<void>;
    /**
     * 生成缓存键
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @returns {string} 缓存键
     */
    private _generateCacheKey;
    /**
     * 检查缓存是否过期
     * @param {number} timestamp - 缓存时间戳
     * @returns {boolean} 是否过期
     */
    private _isCacheExpired;
    /**
     * 从内存缓存获取模型
     * @param {string} cacheKey - 缓存键
     * @returns {Object|null} 缓存的模型数据
     */
    private _getFromMemoryCache;
    /**
     * 存储到内存缓存
     * @param {string} cacheKey - 缓存键
     * @param {Object} modelData - 模型数据
     */
    private _setToMemoryCache;
    /**
     * 从IndexedDB获取模型
     * @param {string} cacheKey - 缓存键
     * @returns {Promise<Object|null>} 缓存的模型数据
     */
    private _getFromIndexedDB;
    /**
     * 存储到IndexedDB
     * @param {string} cacheKey - 缓存键
     * @param {Object} modelData - 模型数据
     * @returns {Promise<void>}
     */
    private _setToIndexedDB;
    /**
     * 从IndexedDB删除缓存
     * @param {string} cacheKey - 缓存键
     * @returns {Promise<void>}
     */
    private _deleteFromIndexedDB;
    /**
     * 获取或创建模型
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<Object>} 模型实例
     */
    getOrCreateModel(modelType: string, modelUrl: string, createModelFn: () => Promise<any>): Promise<any>;
    /**
     * 预加载模型
     * @param {string} modelType - 模型类型
     * @param {string} modelUrl - 模型URL
     * @param {Function} createModelFn - 创建模型的函数
     * @returns {Promise<void>}
     */
    preloadModel(modelType: string, modelUrl: string, createModelFn: () => Promise<any>): Promise<void>;
    /**
     * 清理过期缓存
     * @returns {Promise<void>}
     */
    cleanupExpiredCache(): Promise<void>;
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getStats(): any;
    /**
     * 清空所有缓存
     * @returns {Promise<void>}
     */
    clearAll(): Promise<void>;
}
export declare const modelCacheManager: ModelCacheManager;
//# sourceMappingURL=ModelCacheManager.d.ts.map