// 应用配置常量
export const CONFIG = {
    // 开发模式配置
    DEVELOPMENT: {
        // 设置为true时跳过HTTPS检查（仅用于本地开发）
        SKIP_HTTPS_CHECK: true,
        // 开发模式日志级别
        LOG_LEVEL: 'info'
    },
    // 摄像头配置
    CAMERA: {
        WIDTH: 640,
        HEIGHT: 480,
        TIMEOUT: 10000,
        CONSTRAINTS: {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        }
    },
    // 模型配置
    MODEL: {
        CACHE_VERSION: '1.0.0',
        PRELOAD_TIMEOUT: 30000,
        // 使用TensorFlow.js官方CDN提供的模型URL，避免CORS问题
        MOVENET_URL: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
        POSENET_URL: 'https://tfhub.dev/google/tfjs-model/posenet/mobilenet/float/075/1/default/1',
        DEFAULT_TYPE: 'MoveNet'
    },
    // One Euro Filter 默认参数
    FILTER: {
        DEFAULT_FREQUENCY: 30.0,
        DEFAULT_MIN_CUTOFF: 1.0,
        DEFAULT_BETA: 0.5,
        DEFAULT_D_CUTOFF: 1.0,
        MIN_FREQUENCY: 1,
        MAX_FREQUENCY: 120,
        MIN_CUTOFF_RANGE: { min: 0.1, max: 10 },
        BETA_RANGE: { min: 0, max: 5 },
        D_CUTOFF_RANGE: { min: 0.1, max: 10 }
    },
    // 性能监控配置
    PERFORMANCE: {
        FPS_UPDATE_INTERVAL: 1000,
        MEMORY_CHECK_INTERVAL: 5000,
        MAX_FRAME_TIME: 33.33, // 30 FPS
        PERFORMANCE_BUFFER_SIZE: 60
    },
    // UI配置
    UI: {
        SKELETON_COLOR: '#00ff00',
        SKELETON_LINE_WIDTH: 2,
        KEYPOINT_RADIUS: 4,
        CONFIDENCE_THRESHOLD: 0.3,
        LOADING_TIMEOUT: 30000
    },
    // 缓存配置
    CACHE: {
        DB_NAME: 'PoseEstimatorCache',
        DB_VERSION: 1,
        STORE_NAME: 'models',
        MAX_MEMORY_CACHE_SIZE: 5,
        CACHE_EXPIRY_DAYS: 7
    },
    // 错误消息
    ERROR_MESSAGES: {
        HTTPS_REQUIRED: '摄像头访问需要HTTPS环境或本地环境',
        CAMERA_NOT_SUPPORTED: '浏览器不支持摄像头访问API',
        TENSORFLOW_NOT_LOADED: 'TensorFlow.js库未正确加载',
        CANVAS_NOT_FOUND: 'Canvas元素未找到，请检查HTML结构',
        CANVAS_NOT_SUPPORTED: '浏览器不支持Canvas API',
        CAMERA_PERMISSION_DENIED: '摄像头权限被拒绝',
        MODEL_LOAD_FAILED: '模型加载失败',
        INITIALIZATION_FAILED: '初始化失败'
    }
};
// 姿态关键点连接定义
export const POSE_CONNECTIONS = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16]
];
// 关键点名称映射
export const KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];
// 浏览器兼容性检查
export const BROWSER_SUPPORT = {
    checkWebGL: () => {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        }
        catch (e) {
            return false;
        }
    },
    checkIndexedDB: () => {
        return 'indexedDB' in window;
    },
    checkCamera: () => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
};
//# sourceMappingURL=constants.js.map