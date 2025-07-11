import { IBaseModule } from '../core/IBaseModule.js';

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

    /**
     * 检查WebGL支持
     * @returns {Object} WebGL支持信息
     */
    checkWebGLSupport() {
        throw new Error('IEnvironmentManager.checkWebGLSupport must be implemented');
    }

    /**
     * 检查摄像头支持
     * @returns {Promise<boolean>} 是否支持摄像头
     */
    async checkCameraSupport() {
        throw new Error('IEnvironmentManager.checkCameraSupport must be implemented');
    }

    /**
     * 检查TensorFlow.js支持
     * @returns {Promise<Object>} TensorFlow.js支持信息
     */
    async checkTensorFlowSupport() {
        throw new Error('IEnvironmentManager.checkTensorFlowSupport must be implemented');
    }

    /**
     * 获取性能信息
     * @returns {Object} 性能信息
     */
    getPerformanceInfo() {
        throw new Error('IEnvironmentManager.getPerformanceInfo must be implemented');
    }

    /**
     * 检查内存使用情况
     * @returns {Object} 内存使用信息
     */
    checkMemoryUsage() {
        throw new Error('IEnvironmentManager.checkMemoryUsage must be implemented');
    }

    /**
     * 获取网络信息
     * @returns {Object} 网络信息
     */
    getNetworkInfo() {
        throw new Error('IEnvironmentManager.getNetworkInfo must be implemented');
    }

    /**
     * 检查是否为移动设备
     * @returns {boolean} 是否为移动设备
     */
    isMobileDevice() {
        throw new Error('IEnvironmentManager.isMobileDevice must be implemented');
    }

    /**
     * 获取屏幕信息
     * @returns {Object} 屏幕信息
     */
    getScreenInfo() {
        throw new Error('IEnvironmentManager.getScreenInfo must be implemented');
    }

    /**
     * 检查是否支持硬件加速
     * @returns {boolean} 是否支持硬件加速
     */
    isHardwareAccelerated() {
        throw new Error('IEnvironmentManager.isHardwareAccelerated must be implemented');
    }
}

export default IEnvironmentManager;