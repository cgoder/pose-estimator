import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 面板管理器接口
 */
export class IPanelManager extends IBaseModule {
    /**
     * 初始化面板
     */
    initPanels() {
        throw new Error('IPanelManager.initPanels must be implemented');
    }

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
     * 显示所有面板
     */
    showAllPanels() {
        throw new Error('IPanelManager.showAllPanels must be implemented');
    }

    /**
     * 隐藏所有面板
     */
    hideAllPanels() {
        throw new Error('IPanelManager.hideAllPanels must be implemented');
    }

    /**
     * 更新面板内容
     * @param {string} panelId - 面板ID
     * @param {Object} content - 面板内容
     */
    updatePanelContent(panelId, content) {
        throw new Error('IPanelManager.updatePanelContent must be implemented');
    }

    /**
     * 设置面板位置
     * @param {string} panelId - 面板ID
     * @param {Object} position - 位置信息
     */
    setPanelPosition(panelId, position) {
        throw new Error('IPanelManager.setPanelPosition must be implemented');
    }

    /**
     * 设置面板大小
     * @param {string} panelId - 面板ID
     * @param {Object} size - 大小信息
     */
    setPanelSize(panelId, size) {
        throw new Error('IPanelManager.setPanelSize must be implemented');
    }

    /**
     * 获取面板状态
     * @param {string} panelId - 面板ID
     * @returns {Object} 面板状态
     */
    getPanelState(panelId) {
        throw new Error('IPanelManager.getPanelState must be implemented');
    }

    /**
     * 注册面板
     * @param {string} panelId - 面板ID
     * @param {Object} panelConfig - 面板配置
     */
    registerPanel(panelId, panelConfig) {
        throw new Error('IPanelManager.registerPanel must be implemented');
    }

    /**
     * 注销面板
     * @param {string} panelId - 面板ID
     */
    unregisterPanel(panelId) {
        throw new Error('IPanelManager.unregisterPanel must be implemented');
    }
}

export default IPanelManager;