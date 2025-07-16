/**
 * 姿态估计器主入口文件
 * 提供简单的API接口和示例用法
 */

import { PoseEstimator } from './src/PoseEstimator.js';

// 导出主类
export { PoseEstimator };

// 导出各个模块（可选）
export { 
    ModelManager,
    ModelType,
    ModelAccuracy,
    ModelStatus,
    DevicePerformance
} from './src/components/ModelManager.js';
export { OneEuroFilter } from './src/filters/OneEuroFilter.js';
export { KalmanFilter } from './src/filters/KalmanFilter.js';
export { UIManager } from './src/ui/UIManager.js';
export { Renderer } from './src/rendering/Renderer.js';
export { CacheManager } from './src/utils/CacheManager.js';
export { PerformanceMonitor } from './src/utils/PerformanceMonitor.js';
export { Logger } from './src/utils/Logger.js';
export { EventBus } from './src/utils/EventBus.js';
export { ConfigManager } from './src/core/ConfigManager.js';
export { StorageManager } from './src/core/StorageManager.js';
export { DeviceManager } from './src/core/DeviceManager.js';
export { ErrorRecovery } from './src/core/ErrorRecovery.js';
export { BiomechanicsAnalyzer } from './src/analyzers/BiomechanicsAnalyzer.js';
export { TrajectoryAnalyzer } from './src/analyzers/TrajectoryAnalyzer.js';
export { DataExporter } from './src/data/DataExporter.js';
export { DataCollector } from './src/data/DataCollector.js';

/**
 * 创建姿态估计器实例的便捷函数
 * @param {Object} options - 配置选项
 * @returns {PoseEstimator} 姿态估计器实例
 */
export function createPoseEstimator(options = {}) {
    return new PoseEstimator(options);
}

/**
 * 快速启动姿态检测的便捷函数
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {Object} options - 配置选项
 * @returns {Promise<PoseEstimator>} 姿态估计器实例
 */
export async function quickStart(canvas, options = {}) {
    const estimator = new PoseEstimator({
        canvas,
        enableUI: true,
        enablePerformanceMonitoring: true,
        enableDataCollection: true,
        ...options
    });
    
    await estimator.start();
    return estimator;
}

/**
 * 预设配置
 */
export const presets = {
    // 高性能配置
    highPerformance: {
        modelType: 'movenet',
        modelSize: 'lightning',
        enableFiltering: true,
        filterType: 'oneEuro',
        targetFPS: 60,
        showTrajectories: false,
        enableBiomechanics: false,
        enableTrajectoryAnalysis: false
    },
    
    // 高精度配置
    highAccuracy: {
        modelType: 'movenet',
        modelSize: 'thunder',
        enableFiltering: true,
        filterType: 'kalman',
        targetFPS: 30,
        showTrajectories: true,
        enableBiomechanics: true,
        enableTrajectoryAnalysis: true
    },
    
    // 分析配置
    analysis: {
        modelType: 'movenet',
        modelSize: 'thunder',
        enableFiltering: true,
        filterType: 'kalman',
        targetFPS: 30,
        showTrajectories: true,
        enableBiomechanics: true,
        enableTrajectoryAnalysis: true,
        enableDataCollection: true,
        enableDataExport: true
    },
    
    // 演示配置
    demo: {
        modelType: 'movenet',
        modelSize: 'lightning',
        enableFiltering: true,
        filterType: 'oneEuro',
        targetFPS: 30,
        showKeypoints: true,
        showSkeleton: true,
        showTrajectories: true,
        enableUI: true,
        enablePerformanceMonitoring: true
    },
    
    // 调试配置
    debug: {
        modelType: 'movenet',
        modelSize: 'lightning',
        enableFiltering: true,
        filterType: 'oneEuro',
        targetFPS: 30,
        showKeypoints: true,
        showSkeleton: true,
        showTrajectories: true,
        enableUI: true,
        enablePerformanceMonitoring: true,
        enableDataCollection: true,
        debug: true
    }
};

/**
 * 使用预设配置创建姿态估计器
 * @param {string} presetName - 预设名称
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {Object} overrides - 覆盖选项
 * @returns {PoseEstimator} 姿态估计器实例
 */
export function createWithPreset(presetName, canvas, overrides = {}) {
    const preset = presets[presetName];
    if (!preset) {
        throw new Error(`未知的预设: ${presetName}`);
    }
    
    return new PoseEstimator({
        canvas,
        ...preset,
        ...overrides
    });
}

/**
 * 工具函数
 */
export const utils = {
    /**
     * 检查浏览器兼容性
     * @returns {Object} 兼容性检查结果
     */
    checkCompatibility() {
        const result = {
            webgl: false,
            webgl2: false,
            webgpu: false,
            mediaDevices: false,
            requestAnimationFrame: false,
            webAssembly: false,
            workers: false,
            offscreenCanvas: false
        };
        
        // 检查WebGL
        try {
            const canvas = document.createElement('canvas');
            result.webgl = !!canvas.getContext('webgl');
            result.webgl2 = !!canvas.getContext('webgl2');
        } catch (e) {
            // WebGL不支持
        }
        
        // 检查WebGPU
        result.webgpu = 'gpu' in navigator;
        
        // 检查媒体设备
        result.mediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
        
        // 检查动画帧
        result.requestAnimationFrame = 'requestAnimationFrame' in window;
        
        // 检查WebAssembly
        result.webAssembly = 'WebAssembly' in window;
        
        // 检查Web Workers
        result.workers = 'Worker' in window;
        
        // 检查OffscreenCanvas
        result.offscreenCanvas = 'OffscreenCanvas' in window;
        
        return result;
    },
    
    /**
     * 获取推荐配置
     * @returns {Object} 推荐配置
     */
    getRecommendedConfig() {
        const compatibility = this.checkCompatibility();
        
        // 基础配置
        let config = {
            modelType: 'movenet',
            modelSize: 'lightning',
            enableFiltering: true,
            filterType: 'oneEuro',
            targetFPS: 30
        };
        
        // 根据设备性能调整
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        
        if (memory >= 8 && cores >= 8) {
            // 高性能设备
            config.modelSize = 'thunder';
            config.targetFPS = 60;
            config.enableBiomechanics = true;
            config.enableTrajectoryAnalysis = true;
        } else if (memory >= 4 && cores >= 4) {
            // 中等性能设备
            config.targetFPS = 30;
            config.enableBiomechanics = true;
        } else {
            // 低性能设备
            config.targetFPS = 15;
            config.showTrajectories = false;
        }
        
        // 根据兼容性调整
        if (!compatibility.webgl2) {
            config.modelSize = 'lightning'; // 使用更轻量的模型
        }
        
        return config;
    },
    
    /**
     * 创建Canvas元素
     * @param {Object} options - Canvas选项
     * @returns {HTMLCanvasElement} Canvas元素
     */
    createCanvas(options = {}) {
        const canvas = document.createElement('canvas');
        
        // 设置默认属性
        canvas.width = options.width || 640;
        canvas.height = options.height || 480;
        canvas.style.border = options.border || '1px solid #ccc';
        canvas.style.borderRadius = options.borderRadius || '4px';
        
        // 设置ID和类名
        if (options.id) {
            canvas.id = options.id;
        }
        
        if (options.className) {
            canvas.className = options.className;
        }
        
        return canvas;
    },
    
    /**
     * 创建视频元素
     * @param {Object} options - 视频选项
     * @returns {HTMLVideoElement} 视频元素
     */
    createVideo(options = {}) {
        const video = document.createElement('video');
        
        // 设置默认属性
        video.width = options.width || 640;
        video.height = options.height || 480;
        video.autoplay = options.autoplay !== false;
        video.muted = options.muted !== false;
        video.playsInline = options.playsInline !== false;
        video.controls = options.controls || false;
        
        // 设置样式
        if (options.hidden) {
            video.style.display = 'none';
        }
        
        // 设置ID和类名
        if (options.id) {
            video.id = options.id;
        }
        
        if (options.className) {
            video.className = options.className;
        }
        
        return video;
    },
    
    /**
     * 加载图片
     * @param {string} src - 图片路径
     * @returns {Promise<HTMLImageElement>} 图片元素
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },
    
    /**
     * 加载视频
     * @param {string} src - 视频路径
     * @returns {Promise<HTMLVideoElement>} 视频元素
     */
    loadVideo(src) {
        return new Promise((resolve, reject) => {
            const video = this.createVideo();
            video.onloadedmetadata = () => resolve(video);
            video.onerror = reject;
            video.src = src;
        });
    },
    
    /**
     * 请求摄像头权限
     * @param {Object} constraints - 媒体约束
     * @returns {Promise<MediaStream>} 媒体流
     */
    async requestCamera(constraints = {}) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 },
                    ...constraints.video
                },
                audio: false,
                ...constraints
            });
            
            return stream;
        } catch (error) {
            throw new Error(`摄像头访问失败: ${error.message}`);
        }
    },
    
    /**
     * 下载文件
     * @param {Blob|string} data - 文件数据
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    downloadFile(data, filename, mimeType = 'application/octet-stream') {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    },
    
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * 格式化时间
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化的时间
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }
};

// 默认导出
export default {
    PoseEstimator,
    createPoseEstimator,
    quickStart,
    presets,
    createWithPreset,
    utils
};