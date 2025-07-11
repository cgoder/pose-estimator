import { IBaseModule } from './IBaseModule.js';

/**
 * 应用管理器接口
 */
export class IAppManager extends IBaseModule {
    /**
     * 启动应用
     * @param {Object} options - 启动选项
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        throw new Error('IAppManager.start must be implemented');
    }

    /**
     * 停止应用
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error('IAppManager.stop must be implemented');
    }

    /**
     * 重启应用
     * @param {Object} options - 重启选项
     * @returns {Promise<void>}
     */
    async restart(options = {}) {
        throw new Error('IAppManager.restart must be implemented');
    }

    /**
     * 获取应用状态
     * @returns {Object} 应用状态
     */
    getAppState() {
        throw new Error('IAppManager.getAppState must be implemented');
    }

    /**
     * 获取所有管理器
     * @returns {Object} 管理器映射
     */
    getManagers() {
        throw new Error('IAppManager.getManagers must be implemented');
    }

    /**
     * 获取指定管理器
     * @param {string} managerName - 管理器名称
     * @returns {Object} 管理器实例
     */
    getManager(managerName) {
        throw new Error('IAppManager.getManager must be implemented');
    }

    /**
     * 注册管理器
     * @param {string} name - 管理器名称
     * @param {Object} manager - 管理器实例
     */
    registerManager(name, manager) {
        throw new Error('IAppManager.registerManager must be implemented');
    }

    /**
     * 注销管理器
     * @param {string} name - 管理器名称
     */
    unregisterManager(name) {
        throw new Error('IAppManager.unregisterManager must be implemented');
    }

    /**
     * 检查应用是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        throw new Error('IAppManager.isInitialized must be implemented');
    }

    /**
     * 检查应用是否正在运行
     * @returns {boolean} 是否正在运行
     */
    isRunning() {
        throw new Error('IAppManager.isRunning must be implemented');
    }

    /**
     * 获取初始化进度
     * @returns {number} 初始化进度 (0-100)
     */
    getInitializationProgress() {
        throw new Error('IAppManager.getInitializationProgress must be implemented');
    }

    /**
     * 设置配置
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        throw new Error('IAppManager.setConfig must be implemented');
    }

    /**
     * 获取配置
     * @returns {Object} 配置对象
     */
    getConfig() {
        throw new Error('IAppManager.getConfig must be implemented');
    }
}

export default IAppManager;