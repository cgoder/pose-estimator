import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 滤波器管理器接口
 */
export class IFilterManager extends IBaseModule {
    /**
     * 应用滤波器
     * @param {Array} poses - 姿态数据
     * @param {Object} options - 滤波选项
     * @returns {Array} 滤波后的姿态数据
     */
    applyFilter(poses, options = {}) {
        throw new Error('IFilterManager.applyFilter must be implemented');
    }

    /**
     * 设置滤波器类型
     * @param {string} filterType - 滤波器类型
     */
    setFilterType(filterType) {
        throw new Error('IFilterManager.setFilterType must be implemented');
    }

    /**
     * 获取当前滤波器类型
     * @returns {string} 滤波器类型
     */
    getCurrentFilterType() {
        throw new Error('IFilterManager.getCurrentFilterType must be implemented');
    }

    /**
     * 获取可用的滤波器列表
     * @returns {Array} 滤波器列表
     */
    getAvailableFilters() {
        throw new Error('IFilterManager.getAvailableFilters must be implemented');
    }

    /**
     * 启用滤波器
     */
    enableFilter() {
        throw new Error('IFilterManager.enableFilter must be implemented');
    }

    /**
     * 禁用滤波器
     */
    disableFilter() {
        throw new Error('IFilterManager.disableFilter must be implemented');
    }

    /**
     * 检查滤波器是否启用
     * @returns {boolean} 是否启用
     */
    isFilterEnabled() {
        throw new Error('IFilterManager.isFilterEnabled must be implemented');
    }

    /**
     * 设置滤波器参数
     * @param {Object} params - 滤波器参数
     */
    setFilterParams(params) {
        throw new Error('IFilterManager.setFilterParams must be implemented');
    }

    /**
     * 获取滤波器参数
     * @returns {Object} 滤波器参数
     */
    getFilterParams() {
        throw new Error('IFilterManager.getFilterParams must be implemented');
    }

    /**
     * 重置滤波器
     */
    resetFilter() {
        throw new Error('IFilterManager.resetFilter must be implemented');
    }

    /**
     * 获取滤波器性能指标
     * @returns {Object} 性能指标
     */
    getFilterPerformance() {
        throw new Error('IFilterManager.getFilterPerformance must be implemented');
    }

    /**
     * 设置平滑度
     * @param {number} smoothness - 平滑度 (0-1)
     */
    setSmoothness(smoothness) {
        throw new Error('IFilterManager.setSmoothness must be implemented');
    }

    /**
     * 获取平滑度
     * @returns {number} 平滑度
     */
    getSmoothness() {
        throw new Error('IFilterManager.getSmoothness must be implemented');
    }

    /**
     * 设置置信度阈值
     * @param {number} threshold - 置信度阈值
     */
    setConfidenceThreshold(threshold) {
        throw new Error('IFilterManager.setConfidenceThreshold must be implemented');
    }

    /**
     * 获取置信度阈值
     * @returns {number} 置信度阈值
     */
    getConfidenceThreshold() {
        throw new Error('IFilterManager.getConfidenceThreshold must be implemented');
    }
}

export default IFilterManager;