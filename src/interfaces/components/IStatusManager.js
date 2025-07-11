import { IBaseModule } from '../core/IBaseModule.js';

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
     * 设置FPS显示
     * @param {number} fps - 帧率
     */
    setFPS(fps) {
        throw new Error('IStatusManager.setFPS must be implemented');
    }

    /**
     * 设置模型状态
     * @param {string} modelStatus - 模型状态
     */
    setModelStatus(modelStatus) {
        throw new Error('IStatusManager.setModelStatus must be implemented');
    }

    /**
     * 设置摄像头状态
     * @param {string} cameraStatus - 摄像头状态
     */
    setCameraStatus(cameraStatus) {
        throw new Error('IStatusManager.setCameraStatus must be implemented');
    }

    /**
     * 设置检测状态
     * @param {string} detectionStatus - 检测状态
     */
    setDetectionStatus(detectionStatus) {
        throw new Error('IStatusManager.setDetectionStatus must be implemented');
    }

    /**
     * 更新性能指标
     * @param {Object} metrics - 性能指标
     */
    updatePerformanceMetrics(metrics) {
        throw new Error('IStatusManager.updatePerformanceMetrics must be implemented');
    }

    /**
     * 显示状态面板
     */
    showStatus() {
        throw new Error('IStatusManager.showStatus must be implemented');
    }

    /**
     * 隐藏状态面板
     */
    hideStatus() {
        throw new Error('IStatusManager.hideStatus must be implemented');
    }

    /**
     * 切换状态面板显示
     */
    toggleStatus() {
        throw new Error('IStatusManager.toggleStatus must be implemented');
    }

    /**
     * 重置状态
     */
    resetStatus() {
        throw new Error('IStatusManager.resetStatus must be implemented');
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态
     */
    getCurrentStatus() {
        throw new Error('IStatusManager.getCurrentStatus must be implemented');
    }

    /**
     * 设置状态更新间隔
     * @param {number} interval - 更新间隔（毫秒）
     */
    setUpdateInterval(interval) {
        throw new Error('IStatusManager.setUpdateInterval must be implemented');
    }
}

export default IStatusManager;