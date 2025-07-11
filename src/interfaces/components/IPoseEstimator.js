import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 姿态估计器接口
 */
export class IPoseEstimator extends IBaseModule {
    /**
     * 开始姿态检测
     * @returns {Promise<void>}
     */
    async startDetection() {
        throw new Error('IPoseEstimator.startDetection must be implemented');
    }

    /**
     * 停止姿态检测
     * @returns {Promise<void>}
     */
    async stopDetection() {
        throw new Error('IPoseEstimator.stopDetection must be implemented');
    }

    /**
     * 暂停姿态检测
     */
    pauseDetection() {
        throw new Error('IPoseEstimator.pauseDetection must be implemented');
    }

    /**
     * 恢复姿态检测
     */
    resumeDetection() {
        throw new Error('IPoseEstimator.resumeDetection must be implemented');
    }

    /**
     * 设置模型类型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async setModelType(modelType) {
        throw new Error('IPoseEstimator.setModelType must be implemented');
    }

    /**
     * 获取当前模型类型
     * @returns {string} 模型类型
     */
    getCurrentModelType() {
        throw new Error('IPoseEstimator.getCurrentModelType must be implemented');
    }

    /**
     * 设置检测配置
     * @param {Object} config - 检测配置
     */
    setDetectionConfig(config) {
        throw new Error('IPoseEstimator.setDetectionConfig must be implemented');
    }

    /**
     * 获取检测配置
     * @returns {Object} 检测配置
     */
    getDetectionConfig() {
        throw new Error('IPoseEstimator.getDetectionConfig must be implemented');
    }

    /**
     * 处理视频帧
     * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} input - 输入源
     * @returns {Promise<Object>} 检测结果
     */
    async processFrame(input) {
        throw new Error('IPoseEstimator.processFrame must be implemented');
    }

    /**
     * 获取检测状态
     * @returns {string} 检测状态
     */
    getDetectionStatus() {
        throw new Error('IPoseEstimator.getDetectionStatus must be implemented');
    }

    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    getPerformanceMetrics() {
        throw new Error('IPoseEstimator.getPerformanceMetrics must be implemented');
    }

    /**
     * 重置性能指标
     */
    resetPerformanceMetrics() {
        throw new Error('IPoseEstimator.resetPerformanceMetrics must be implemented');
    }

    /**
     * 设置输出画布
     * @param {HTMLCanvasElement} canvas - 输出画布
     */
    setOutputCanvas(canvas) {
        throw new Error('IPoseEstimator.setOutputCanvas must be implemented');
    }

    /**
     * 启用/禁用滤波器
     * @param {boolean} enabled - 是否启用
     */
    setFilterEnabled(enabled) {
        throw new Error('IPoseEstimator.setFilterEnabled must be implemented');
    }

    /**
     * 设置滤波器配置
     * @param {Object} config - 滤波器配置
     */
    setFilterConfig(config) {
        throw new Error('IPoseEstimator.setFilterConfig must be implemented');
    }
}

export default IPoseEstimator;