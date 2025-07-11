import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 控制管理器接口
 */
export class IControlsManager extends IBaseModule {
    /**
     * 初始化控制面板
     */
    initControls() {
        throw new Error('IControlsManager.initControls must be implemented');
    }

    /**
     * 显示控制面板
     */
    showControls() {
        throw new Error('IControlsManager.showControls must be implemented');
    }

    /**
     * 隐藏控制面板
     */
    hideControls() {
        throw new Error('IControlsManager.hideControls must be implemented');
    }

    /**
     * 切换控制面板显示状态
     */
    toggleControls() {
        throw new Error('IControlsManager.toggleControls must be implemented');
    }

    /**
     * 更新控制状态
     * @param {Object} state - 控制状态
     */
    updateControlState(state) {
        throw new Error('IControlsManager.updateControlState must be implemented');
    }

    /**
     * 启用控制
     * @param {string} controlId - 控制ID
     */
    enableControl(controlId) {
        throw new Error('IControlsManager.enableControl must be implemented');
    }

    /**
     * 禁用控制
     * @param {string} controlId - 控制ID
     */
    disableControl(controlId) {
        throw new Error('IControlsManager.disableControl must be implemented');
    }

    /**
     * 设置控制值
     * @param {string} controlId - 控制ID
     * @param {any} value - 控制值
     */
    setControlValue(controlId, value) {
        throw new Error('IControlsManager.setControlValue must be implemented');
    }

    /**
     * 获取控制值
     * @param {string} controlId - 控制ID
     * @returns {any} 控制值
     */
    getControlValue(controlId) {
        throw new Error('IControlsManager.getControlValue must be implemented');
    }

    /**
     * 重置所有控制
     */
    resetControls() {
        throw new Error('IControlsManager.resetControls must be implemented');
    }

    /**
     * 获取控制配置
     * @returns {Object} 控制配置
     */
    getControlsConfig() {
        throw new Error('IControlsManager.getControlsConfig must be implemented');
    }

    /**
     * 设置控制配置
     * @param {Object} config - 控制配置
     */
    setControlsConfig(config) {
        throw new Error('IControlsManager.setControlsConfig must be implemented');
    }
}

export default IControlsManager;