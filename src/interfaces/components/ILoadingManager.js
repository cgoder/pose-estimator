import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 加载管理器接口
 */
export class ILoadingManager extends IBaseModule {
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {Object} options - 选项
     */
    show(message = 'Loading...', options = {}) {
        throw new Error('ILoadingManager.show must be implemented');
    }

    /**
     * 隐藏加载状态
     */
    hide() {
        throw new Error('ILoadingManager.hide must be implemented');
    }

    /**
     * 更新加载消息
     * @param {string} message - 新的加载消息
     */
    updateMessage(message) {
        throw new Error('ILoadingManager.updateMessage must be implemented');
    }

    /**
     * 设置加载进度
     * @param {number} progress - 进度百分比 (0-100)
     */
    setProgress(progress) {
        throw new Error('ILoadingManager.setProgress must be implemented');
    }

    /**
     * 显示进度条
     * @param {boolean} show - 是否显示
     */
    showProgress(show = true) {
        throw new Error('ILoadingManager.showProgress must be implemented');
    }

    /**
     * 检查是否正在加载
     * @returns {boolean} 是否正在加载
     */
    isLoading() {
        throw new Error('ILoadingManager.isLoading must be implemented');
    }

    /**
     * 设置加载类型
     * @param {string} type - 加载类型
     */
    setType(type) {
        throw new Error('ILoadingManager.setType must be implemented');
    }

    /**
     * 添加加载任务
     * @param {string} taskId - 任务ID
     * @param {string} message - 任务消息
     */
    addTask(taskId, message) {
        throw new Error('ILoadingManager.addTask must be implemented');
    }

    /**
     * 完成加载任务
     * @param {string} taskId - 任务ID
     */
    completeTask(taskId) {
        throw new Error('ILoadingManager.completeTask must be implemented');
    }

    /**
     * 获取当前任务数量
     * @returns {number} 任务数量
     */
    getTaskCount() {
        throw new Error('ILoadingManager.getTaskCount must be implemented');
    }
}

export default ILoadingManager;