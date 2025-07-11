/**
 * 依赖注入容器接口
 */
export class IDIContainer {
    /**
     * 注册单例服务
     * @param {string} name - 服务名称
     * @param {Function|Object} serviceOrFactory - 服务实例或工厂函数
     * @param {Object} options - 选项
     */
    singleton(name, serviceOrFactory, options = {}) {
        throw new Error('IDIContainer.singleton must be implemented');
    }

    /**
     * 注册瞬态服务
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     * @param {Object} options - 选项
     */
    transient(name, factory, options = {}) {
        throw new Error('IDIContainer.transient must be implemented');
    }

    /**
     * 解析服务
     * @param {string} name - 服务名称
     * @param {Object} context - 解析上下文
     * @returns {any} 服务实例
     */
    resolve(name, context = {}) {
        throw new Error('IDIContainer.resolve must be implemented');
    }

    /**
     * 检查服务是否已注册
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    has(name) {
        throw new Error('IDIContainer.has must be implemented');
    }
}

export default IDIContainer;