import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 摄像头管理器接口
 */
export class ICameraManager extends IBaseModule {
    /**
     * 初始化摄像头
     * @param {Object} constraints - 摄像头约束
     * @returns {Promise<void>}
     */
    async initCamera(constraints = {}) {
        throw new Error('ICameraManager.initCamera must be implemented');
    }

    /**
     * 启动摄像头
     * @returns {Promise<MediaStream>}
     */
    async startCamera() {
        throw new Error('ICameraManager.startCamera must be implemented');
    }

    /**
     * 停止摄像头
     * @returns {Promise<void>}
     */
    async stopCamera() {
        throw new Error('ICameraManager.stopCamera must be implemented');
    }

    /**
     * 切换摄像头
     * @param {string} deviceId - 设备ID
     * @returns {Promise<void>}
     */
    async switchCamera(deviceId) {
        throw new Error('ICameraManager.switchCamera must be implemented');
    }

    /**
     * 获取可用摄像头列表
     * @returns {Promise<Array>} 摄像头设备列表
     */
    async getAvailableCameras() {
        throw new Error('ICameraManager.getAvailableCameras must be implemented');
    }

    /**
     * 获取当前摄像头流
     * @returns {MediaStream|null}
     */
    getCurrentStream() {
        throw new Error('ICameraManager.getCurrentStream must be implemented');
    }

    /**
     * 获取摄像头状态
     * @returns {string} 摄像头状态
     */
    getCameraStatus() {
        throw new Error('ICameraManager.getCameraStatus must be implemented');
    }

    /**
     * 设置视频元素
     * @param {HTMLVideoElement} videoElement - 视频元素
     */
    setVideoElement(videoElement) {
        throw new Error('ICameraManager.setVideoElement must be implemented');
    }

    /**
     * 获取摄像头权限
     * @returns {Promise<boolean>} 是否有权限
     */
    async requestPermission() {
        throw new Error('ICameraManager.requestPermission must be implemented');
    }

    /**
     * 检查摄像头支持
     * @returns {boolean} 是否支持摄像头
     */
    isSupported() {
        throw new Error('ICameraManager.isSupported must be implemented');
    }
}

export default ICameraManager;