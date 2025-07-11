/**
 * 应用配置常量
 * 集中管理所有配置项，提高代码可维护性
 */

// Canvas 配置
export const CANVAS_CONFIG = {
    DEFAULT_WIDTH: 640,
    DEFAULT_HEIGHT: 480,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    CONTEXT_OPTIONS: {
        willReadFrequently: true,
        alpha: false,
        desynchronized: true
    },
    STYLE_FIXES: {
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        zIndex: '1'
    }
};

// 输入源类型
export const SOURCE_TYPES = {
    CAMERA: 'camera',
    VIDEO: 'video',
    IMAGE: 'image'
};

// 错误代码
export const ERROR_CODES = {
    CANVAS_NOT_FOUND: 'CANVAS_NOT_FOUND',
    CANVAS_NOT_INITIALIZED: 'CANVAS_NOT_INITIALIZED',
    CONTEXT_CREATION_FAILED: 'CONTEXT_CREATION_FAILED',
    CAMERA_START_FAILED: 'CAMERA_START_FAILED',
    VIDEO_START_FAILED: 'VIDEO_START_FAILED',
    IMAGE_START_FAILED: 'IMAGE_START_FAILED',
    VIDEO_LOAD_FAILED: 'VIDEO_LOAD_FAILED',
    IMAGE_LOAD_FAILED: 'IMAGE_LOAD_FAILED',
    VIDEO_PREPARE_FAILED: 'VIDEO_PREPARE_FAILED',
    FILE_READ_FAILED: 'FILE_READ_FAILED',
    INVALID_SOURCE_TYPE: 'INVALID_SOURCE_TYPE',
    RENDER_FAILED: 'RENDER_FAILED',
    RENDER_ERROR_THRESHOLD_EXCEEDED: 'RENDER_ERROR_THRESHOLD_EXCEEDED'
};

// 性能配置
export const PERFORMANCE_CONFIG = {
    MAX_FPS: 60,
    FRAME_TIME_WARNING_THRESHOLD: 16, // 毫秒
    ERROR_THRESHOLD: 10, // 连续错误次数阈值
    METRICS_UPDATE_INTERVAL: 1000 // 性能指标更新间隔(毫秒)
};

// 摄像头配置
export const CAMERA_CONFIG = {
    DEFAULT_CONSTRAINTS: {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        },
        audio: false
    },
    FALLBACK_CONSTRAINTS: {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
        },
        audio: false
    }
};

// 视频配置
export const VIDEO_CONFIG = {
    SUPPORTED_FORMATS: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    PRELOAD: 'metadata'
};

// 图片配置
export const IMAGE_CONFIG = {
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_DIMENSIONS: {
        width: 4096,
        height: 4096
    }
};

// UI 配置
export const UI_CONFIG = {
    LOADING_CONTAINER_ID: 'app-loading',
    MAIN_CONTAINER_ID: 'app-main',
    CANVAS_CONTAINER_ID: 'canvas-container',
    CANVAS_ID: 'canvas',
    ANIMATION_DURATION: 300 // 毫秒
};

// 调试配置
export const DEBUG_CONFIG = {
    ENABLE_PERFORMANCE_LOGGING: true,
    ENABLE_CANVAS_DEBUGGING: true,
    LOG_LEVEL: 'info' // 'debug', 'info', 'warn', 'error'
};

// 默认导出所有配置
export default {
    CANVAS_CONFIG,
    SOURCE_TYPES,
    ERROR_CODES,
    PERFORMANCE_CONFIG,
    CAMERA_CONFIG,
    VIDEO_CONFIG,
    IMAGE_CONFIG,
    UI_CONFIG,
    DEBUG_CONFIG
};