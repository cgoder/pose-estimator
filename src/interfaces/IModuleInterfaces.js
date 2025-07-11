/**
 * 模块接口定义
 * 定义各个模块间的标准接口契约，确保模块间通信的一致性
 */

/**
 * 基础模块接口
 * 所有模块都应该实现这个基础接口
 */
export class IBaseModule {
    /**
     * 初始化模块
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async init(config) {
        throw new Error('IBaseModule.init must be implemented');
    }

    /**
     * 销毁模块，清理资源
     * @returns {Promise<void>}
     */
    async destroy() {
        throw new Error('IBaseModule.destroy must be implemented');
    }

    /**
     * 获取模块状态
     * @returns {Object} 模块状态
     */
    getState() {
        throw new Error('IBaseModule.getState must be implemented');
    }

    /**
     * 重置模块到初始状态
     * @returns {Promise<void>}
     */
    async reset() {
        throw new Error('IBaseModule.reset must be implemented');
    }
}

/**
 * 加载管理器接口
 */
export class ILoadingManager extends IBaseModule {
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {Object} options - 选项
     */
    showLoading(message, options = {}) {
        throw new Error('ILoadingManager.showLoading must be implemented');
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        throw new Error('ILoadingManager.hideLoading must be implemented');
    }

    /**
     * 更新加载进度
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 进度消息
     */
    updateProgress(progress, message) {
        throw new Error('ILoadingManager.updateProgress must be implemented');
    }

    /**
     * 检查是否正在加载
     * @returns {boolean}
     */
    isLoading() {
        throw new Error('ILoadingManager.isLoading must be implemented');
    }
}

/**
 * 错误管理器接口
 */
export class IErrorManager extends IBaseModule {
    /**
     * 显示错误消息
     * @param {string|Error} error - 错误信息
     * @param {Object} options - 选项
     */
    showError(error, options = {}) {
        throw new Error('IErrorManager.showError must be implemented');
    }

    /**
     * 显示警告消息
     * @param {string} message - 警告消息
     * @param {Object} options - 选项
     */
    showWarning(message, options = {}) {
        throw new Error('IErrorManager.showWarning must be implemented');
    }

    /**
     * 显示信息消息
     * @param {string} message - 信息消息
     * @param {Object} options - 选项
     */
    showInfo(message, options = {}) {
        throw new Error('IErrorManager.showInfo must be implemented');
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {Object} options - 选项
     */
    showSuccess(message, options = {}) {
        throw new Error('IErrorManager.showSuccess must be implemented');
    }

    /**
     * 隐藏错误消息
     */
    hideError() {
        throw new Error('IErrorManager.hideError must be implemented');
    }

    /**
     * 获取错误历史
     * @returns {Array} 错误历史记录
     */
    getErrorHistory() {
        throw new Error('IErrorManager.getErrorHistory must be implemented');
    }
}

/**
 * 控制管理器接口
 */
export class IControlsManager extends IBaseModule {
    /**
     * 更新控制状态
     * @param {Object} state - 控制状态
     */
    updateState(state) {
        throw new Error('IControlsManager.updateState must be implemented');
    }

    /**
     * 绑定控制事件
     * @param {Object} callbacks - 回调函数映射
     */
    bindEvents(callbacks) {
        throw new Error('IControlsManager.bindEvents must be implemented');
    }

    /**
     * 启用/禁用控制
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        throw new Error('IControlsManager.setEnabled must be implemented');
    }

    /**
     * 获取当前控制值
     * @returns {Object} 控制值
     */
    getValues() {
        throw new Error('IControlsManager.getValues must be implemented');
    }
}

/**
 * 状态管理器接口
 */
export class IStatusManager extends IBaseModule {
    /**
     * 更新状态显示
     * @param {Object} status - 状态信息
     */
    updateStatus(status) {
        throw new Error('IStatusManager.updateStatus must be implemented');
    }

    /**
     * 更新性能指标
     * @param {Object} metrics - 性能指标
     */
    updateMetrics(metrics) {
        throw new Error('IStatusManager.updateMetrics must be implemented');
    }

    /**
     * 设置状态可见性
     * @param {boolean} visible - 是否可见
     */
    setVisible(visible) {
        throw new Error('IStatusManager.setVisible must be implemented');
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态
     */
    getCurrentStatus() {
        throw new Error('IStatusManager.getCurrentStatus must be implemented');
    }
}

/**
 * 面板管理器接口
 */
export class IPanelManager extends IBaseModule {
    /**
     * 显示面板
     * @param {string} panelId - 面板ID
     */
    showPanel(panelId) {
        throw new Error('IPanelManager.showPanel must be implemented');
    }

    /**
     * 隐藏面板
     * @param {string} panelId - 面板ID
     */
    hidePanel(panelId) {
        throw new Error('IPanelManager.hidePanel must be implemented');
    }

    /**
     * 切换面板显示状态
     * @param {string} panelId - 面板ID
     */
    togglePanel(panelId) {
        throw new Error('IPanelManager.togglePanel must be implemented');
    }

    /**
     * 检查面板是否可见
     * @param {string} panelId - 面板ID
     * @returns {boolean}
     */
    isPanelVisible(panelId) {
        throw new Error('IPanelManager.isPanelVisible must be implemented');
    }

    /**
     * 获取所有面板状态
     * @returns {Object} 面板状态映射
     */
    getPanelStates() {
        throw new Error('IPanelManager.getPanelStates must be implemented');
    }
}

/**
 * 姿态估计器接口
 */
export class IPoseEstimator extends IBaseModule {
    /**
     * 加载模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async loadModel(modelType) {
        throw new Error('IPoseEstimator.loadModel must be implemented');
    }

    /**
     * 预测姿态
     * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input - 输入元素
     * @returns {Promise<Object>} 预测结果
     */
    async predict(input) {
        throw new Error('IPoseEstimator.predict must be implemented');
    }

    /**
     * 设置置信度阈值
     * @param {number} threshold - 置信度阈值
     */
    setConfidenceThreshold(threshold) {
        throw new Error('IPoseEstimator.setConfidenceThreshold must be implemented');
    }

    /**
     * 获取模型信息
     * @returns {Object} 模型信息
     */
    getModelInfo() {
        throw new Error('IPoseEstimator.getModelInfo must be implemented');
    }

    /**
     * 检查模型是否已加载
     * @returns {boolean}
     */
    isModelLoaded() {
        throw new Error('IPoseEstimator.isModelLoaded must be implemented');
    }
}

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
    get(key, defaultValue) {
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
     * 重置配置到默认值
     * @param {string} [key] - 可选的配置键，如果不提供则重置所有配置
     */
    resetToDefault(key) {
        throw new Error('IConfigManager.resetToDefault must be implemented');
    }

    /**
     * 验证配置
     * @param {Object} config - 要验证的配置
     * @returns {Object} 验证结果
     */
    validate(config) {
        throw new Error('IConfigManager.validate must be implemented');
    }
}

/**
 * 环境管理器接口
 */
export class IEnvironmentManager extends IBaseModule {
    /**
     * 检查浏览器兼容性
     * @returns {Object} 兼容性检查结果
     */
    checkCompatibility() {
        throw new Error('IEnvironmentManager.checkCompatibility must be implemented');
    }

    /**
     * 获取浏览器信息
     * @returns {Object} 浏览器信息
     */
    getBrowserInfo() {
        throw new Error('IEnvironmentManager.getBrowserInfo must be implemented');
    }

    /**
     * 检查特定功能支持
     * @param {string} feature - 功能名称
     * @returns {boolean} 是否支持
     */
    isFeatureSupported(feature) {
        throw new Error('IEnvironmentManager.isFeatureSupported must be implemented');
    }

    /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
    getDeviceInfo() {
        throw new Error('IEnvironmentManager.getDeviceInfo must be implemented');
    }
}

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

// 导出所有接口
export const Interfaces = {
    IBaseModule,
    ILoadingManager,
    IErrorManager,
    IControlsManager,
    IStatusManager,
    IPanelManager,
    IPoseEstimator,
    IConfigManager,
    IEnvironmentManager,
    IEventBus,
    IDIContainer
};

// 接口验证工具
export class InterfaceValidator {
    /**
     * 验证对象是否实现了指定接口
     * @param {Object} obj - 要验证的对象
     * @param {Function} interfaceClass - 接口类
     * @returns {Object} 验证结果
     */
    static validate(obj, interfaceClass) {
        const result = {
            isValid: true,
            missingMethods: [],
            errors: []
        };

        try {
            const interfaceInstance = new interfaceClass();
            const interfaceMethods = Object.getOwnPropertyNames(interfaceClass.prototype)
                .filter(name => name !== 'constructor' && typeof interfaceInstance[name] === 'function');

            for (const methodName of interfaceMethods) {
                if (typeof obj[methodName] !== 'function') {
                    result.isValid = false;
                    result.missingMethods.push(methodName);
                }
            }
        } catch (error) {
            result.isValid = false;
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * 断言对象实现了指定接口
     * @param {Object} obj - 要验证的对象
     * @param {Function} interfaceClass - 接口类
     * @param {string} objectName - 对象名称（用于错误消息）
     */
    static assert(obj, interfaceClass, objectName = 'Object') {
        const result = this.validate(obj, interfaceClass);
        if (!result.isValid) {
            const errorMessage = `${objectName} does not implement ${interfaceClass.name}. Missing methods: ${result.missingMethods.join(', ')}`;
            throw new Error(errorMessage);
        }
    }
}

export default Interfaces;