/**
 * OneEuroFilterManager 适配器
 * 提供向后兼容性，将旧的接口映射到新的AI模块结构
 */

import { OneEuroFilterManager } from '../ai/filters/OneEuroFilterManager.js';
import { ONE_EURO_PRESETS } from '../ai/filters/OneEuroFilter.js';

/**
 * OneEuroFilterManager 适配器类
 * 保持与原有代码的兼容性
 */
export class OneEuroFilterManagerAdapter {
    constructor(filterParams = {}) {
        // 创建新的 OneEuroFilterManager 实例
        this._manager = new OneEuroFilterManager(filterParams);
        
        console.log('🔄 OneEuroFilterManager适配器已创建');
    }
    
    // 代理所有方法到新的管理器
    filterPose(keypoints, timestamp) {
        return this._manager.filterPose(keypoints, timestamp);
    }
    
    filterMultiplePoses(posesKeypoints, timestamp) {
        return this._manager.filterMultiplePoses(posesKeypoints, timestamp);
    }
    
    updateParameters(newParams) {
        return this._manager.updateParameters(newParams);
    }
    
    resetFilters() {
        return this._manager.resetFilters();
    }
    
    resetToDefaults() {
        return this._manager.resetToDefaults();
    }
    
    setEnabled(enabled) {
        return this._manager.setEnabled(enabled);
    }
    
    getParameters() {
        return this._manager.getParameters();
    }
    
    getStats() {
        return this._manager.getStats();
    }
    
    applyPreset(presetName) {
        return this._manager.applyPreset(presetName);
    }
    
    exportConfig() {
        return this._manager.exportConfig();
    }
    
    importConfig(config) {
        return this._manager.importConfig(config);
    }
    
    destroy() {
        return this._manager.destroy();
    }
    
    // 静态方法代理
    static validateParameters(params) {
        return OneEuroFilterManager.validateParameters(params);
    }
    
    static getRecommendedParameters(scenario) {
        return OneEuroFilterManager.getRecommendedParameters(scenario);
    }
}

// 导出工厂函数（向后兼容）
export function createOneEuroFilterManager(options = {}) {
    return new OneEuroFilterManagerAdapter(options);
}

// 导出预设配置
export { ONE_EURO_PRESETS };

// 默认导出适配器类
export default OneEuroFilterManagerAdapter;