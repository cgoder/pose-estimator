import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 输入管理器接口
 */
export class IInputManager extends IBaseModule {
    /**
     * 初始化输入源
     * @param {Object} options - 初始化选项
     * @returns {Promise<void>}
     */
    async initializeInput(options = {}) {
        throw new Error('IInputManager.initializeInput must be implemented');
    }

    /**
     * 设置输入源类型
     * @param {string} inputType - 输入源类型 (camera, video, image)
     * @returns {Promise<void>}
     */
    async setInputType(inputType) {
        throw new Error('IInputManager.setInputType must be implemented');
    }

    /**
     * 获取当前输入源类型
     * @returns {string} 输入源类型
     */
    getCurrentInputType() {
        throw new Error('IInputManager.getCurrentInputType must be implemented');
    }

    /**
     * 获取可用的输入源列表
     * @returns {Array} 输入源列表
     */
    getAvailableInputs() {
        throw new Error('IInputManager.getAvailableInputs must be implemented');
    }

    /**
     * 开始输入流
     * @returns {Promise<void>}
     */
    async startInput() {
        throw new Error('IInputManager.startInput must be implemented');
    }

    /**
     * 停止输入流
     * @returns {Promise<void>}
     */
    async stopInput() {
        throw new Error('IInputManager.stopInput must be implemented');
    }

    /**
     * 暂停输入流
     */
    pauseInput() {
        throw new Error('IInputManager.pauseInput must be implemented');
    }

    /**
     * 恢复输入流
     */
    resumeInput() {
        throw new Error('IInputManager.resumeInput must be implemented');
    }

    /**
     * 获取当前帧
     * @returns {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} 当前帧
     */
    getCurrentFrame() {
        throw new Error('IInputManager.getCurrentFrame must be implemented');
    }

    /**
     * 获取输入流状态
     * @returns {string} 输入流状态
     */
    getInputStatus() {
        throw new Error('IInputManager.getInputStatus must be implemented');
    }

    /**
     * 设置输入分辨率
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @returns {Promise<void>}
     */
    async setResolution(width, height) {
        throw new Error('IInputManager.setResolution must be implemented');
    }

    /**
     * 获取输入分辨率
     * @returns {Object} 分辨率信息
     */
    getResolution() {
        throw new Error('IInputManager.getResolution must be implemented');
    }

    /**
     * 设置帧率
     * @param {number} fps - 帧率
     */
    setFrameRate(fps) {
        throw new Error('IInputManager.setFrameRate must be implemented');
    }

    /**
     * 获取帧率
     * @returns {number} 帧率
     */
    getFrameRate() {
        throw new Error('IInputManager.getFrameRate must be implemented');
    }

    /**
     * 检查输入源是否可用
     * @returns {boolean} 是否可用
     */
    isInputAvailable() {
        throw new Error('IInputManager.isInputAvailable must be implemented');
    }
}

export default IInputManager;