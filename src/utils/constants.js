// 重新导出ConfigManager中的常量和实例
export { configManager, CONFIG, POSE_CONNECTIONS, KEYPOINT_NAMES } from './ConfigManager.js';

// 初始化配置管理器
import { configManager } from './ConfigManager.js';
configManager.init();

// 浏览器兼容性检查已移至 EnvironmentManager
// 为保持向后兼容性，提供简化的兼容性检查
export const BROWSER_SUPPORT = {
    checkWebGL: () => {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    },
    
    checkIndexedDB: () => {
        return 'indexedDB' in window;
    },
    
    checkServiceWorker: () => {
        return 'serviceWorker' in navigator;
    },
    
    checkCamera: () => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
};

// 推荐使用新的环境管理器
export { environmentManager } from './EnvironmentManager.js';