/**
 * 基础模块接口
 * 所有模块都应该继承此接口
 */
export class IBaseModule {
    /**
     * 初始化模块
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        throw new Error('IBaseModule.init must be implemented');
    }

    /**
     * 销毁模块
     * @returns {Promise<void>}
     */
    async destroy() {
        throw new Error('IBaseModule.destroy must be implemented');
    }

    /**
     * 获取模块状态
     * @returns {string} 模块状态
     */
    getStatus() {
        throw new Error('IBaseModule.getStatus must be implemented');
    }

    /**
     * 获取模块名称
     * @returns {string} 模块名称
     */
    getName() {
        throw new Error('IBaseModule.getName must be implemented');
    }

    /**
     * 获取模块版本
     * @returns {string} 模块版本
     */
    getVersion() {
        throw new Error('IBaseModule.getVersion must be implemented');
    }
}

export default IBaseModule;