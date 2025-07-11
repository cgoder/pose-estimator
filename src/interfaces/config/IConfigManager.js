import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 配置管理器接口
 */
export class IConfigManager extends IBaseModule {
    /**
     * 获取配置值
     * @param {string} key - 配置键
     * @param {any} defaultValue - 默认值
     * @returns {any} 配置值
     */
    get(key, defaultValue = null) {
        throw new Error('IConfigManager.get must be implemented');
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键
     * @param {any} value - 配置值
     */
    set(key, value) {
        throw new Error('IConfigManager.set must be implemented');
    }

    /**
     * 获取所有配置
     * @returns {Object} 所有配置
     */
    getAll() {
        throw new Error('IConfigManager.getAll must be implemented');
    }

    /**
     * 批量设置配置
     * @param {Object} config - 配置对象
     */
    setAll(config) {
        throw new Error('IConfigManager.setAll must be implemented');
    }

    /**
     * 重置配置到默认值
     * @param {string} key - 配置键，如果不提供则重置所有
     */
    reset(key = null) {
        throw new Error('IConfigManager.reset must be implemented');
    }

    /**
     * 检查配置键是否存在
     * @param {string} key - 配置键
     * @returns {boolean} 是否存在
     */
    has(key) {
        throw new Error('IConfigManager.has must be implemented');
    }

    /**
     * 删除配置
     * @param {string} key - 配置键
     */
    delete(key) {
        throw new Error('IConfigManager.delete must be implemented');
    }

    /**
     * 保存配置到存储
     * @returns {Promise<void>}
     */
    async save() {
        throw new Error('IConfigManager.save must be implemented');
    }

    /**
     * 从存储加载配置
     * @returns {Promise<void>}
     */
    async load() {
        throw new Error('IConfigManager.load must be implemented');
    }

    /**
     * 验证配置
     * @param {Object} config - 要验证的配置
     * @returns {Object} 验证结果
     */
    validate(config) {
        throw new Error('IConfigManager.validate must be implemented');
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置
     */
    getDefaults() {
        throw new Error('IConfigManager.getDefaults must be implemented');
    }

    /**
     * 合并配置
     * @param {Object} config - 要合并的配置
     * @returns {Object} 合并后的配置
     */
    merge(config) {
        throw new Error('IConfigManager.merge must be implemented');
    }
}

export default IConfigManager;