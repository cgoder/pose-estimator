/**
 * 事件总线接口
 */
export class IEventBus {
    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(eventName, callback, options = {}) {
        throw new Error('IEventBus.on must be implemented');
    }

    /**
     * 订阅一次性事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    once(eventName, callback, options = {}) {
        throw new Error('IEventBus.once must be implemented');
    }

    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(eventName, callback) {
        throw new Error('IEventBus.off must be implemented');
    }

    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     * @returns {boolean} 是否有监听器处理了事件
     */
    emit(eventName, ...args) {
        throw new Error('IEventBus.emit must be implemented');
    }

    /**
     * 异步发布事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     * @returns {Promise<boolean>} 是否有监听器处理了事件
     */
    async emitAsync(eventName, ...args) {
        throw new Error('IEventBus.emitAsync must be implemented');
    }
}

export default IEventBus;