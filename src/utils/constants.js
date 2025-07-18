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
        },
        // 摄像头切换配置
        FACING_MODES: {
            FRONT: 'user',
            BACK: 'environment'
        },
        // 默认摄像头
        DEFAULT_FACING_MODE: 'user',
        
        // 高级摄像头配置
        ADVANCED: {
            // 切换超时时间
            SWITCH_TIMEOUT: 5000,
            // 重试次数
            MAX_RETRY_COUNT: 3,
            // 重试延迟
            RETRY_DELAY: 1000,
            // 支持的分辨率预设
            RESOLUTION_PRESETS: {
                LOW: { width: 320, height: 240 },
                MEDIUM: { width: 640, height: 480 },
                HIGH: { width: 1280, height: 720 },
                FULL_HD: { width: 1920, height: 1080 }
            },
            // 帧率配置
            FRAME_RATE: {
                MIN: 15,
                IDEAL: 30,
                MAX: 60
            },
            // 自动调整配置
            AUTO_ADJUST: {
                ENABLED: true,
                // 性能阈值（毫秒）
                PERFORMANCE_THRESHOLD: 50,
                // 降级策略
                FALLBACK_RESOLUTIONS: ['MEDIUM', 'LOW'],
                // 监控间隔
                MONITOR_INTERVAL: 5000
            }
        },
        
        // 错误处理配置
        ERROR_HANDLING: {
            // 自动重试
            AUTO_RETRY: true,
            // 降级策略
            FALLBACK_ENABLED: true,
            // 错误报告
            ERROR_REPORTING: true,
            // 用户友好提示
            USER_FRIENDLY_MESSAGES: true
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
        // IndexedDB 配置
        DB_NAME: 'PoseEstimatorCache',
        DB_VERSION: 1,
        STORE_NAME: 'models',
        MAX_MEMORY_CACHE_SIZE: 5,
        CACHE_EXPIRY_DAYS: 7,
        
        // 高级缓存策略配置
        ENABLE_CACHE_API: true,           // 启用 Cache API
        ENABLE_FILE_SYSTEM: false,       // 启用 File System Access API（需要用户授权）
        ENABLE_HYBRID_CACHE: true,       // 启用混合缓存策略
        
        // Cache API 配置
        CACHE_API: {
            CACHE_NAME_PREFIX: 'tf-models',
            MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
            CLEANUP_THRESHOLD: 0.8              // 80% 时开始清理
        },
        
        // File System Access API 配置
        FILE_SYSTEM: {
            DIRECTORY_NAME: 'tf-models-cache',
            MAX_FILE_SIZE: 50 * 1024 * 1024,    // 50MB per file
            COMPRESSION_ENABLED: true
        },
        
        // 缓存策略优先级
        STRATEGY_PRIORITY: [
            'filesystem',  // File System Access API (最佳性能)
            'cache-api',   // Cache API (推荐)
            'indexeddb'    // IndexedDB + Memory (兼容性最好)
        ]
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
        let canvas = null;
        let gl = null;
        
        try {
            canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            gl = canvas.getContext('webgl', { preserveDrawingBuffer: false }) || 
                 canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });
            return !!gl;
        } catch (e) {
            return false;
        } finally {
            // 清理WebGL上下文
            if (gl) {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            }
            if (canvas) {
                canvas.width = 1;
                canvas.height = 1;
                canvas = null;
            }
        }
    },
    
    checkIndexedDB: () => {
        return 'indexedDB' in window;
    },
    
    checkCamera: () => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    // 新增：Cache API 支持检测
    checkCacheAPI: () => {
        return 'caches' in window;
    },
    
    // 新增：File System Access API 支持检测
    checkFileSystemAccess: () => {
        return 'showDirectoryPicker' in window;
    },
    
    // 新增：Service Worker 支持检测
    checkServiceWorker: () => {
        return 'serviceWorker' in navigator;
    },
    
    // 新增：WebAssembly 支持检测
    checkWebAssembly: () => {
        return 'WebAssembly' in window;
    },
    
    // 新增：Compression Streams API 支持检测
    checkCompressionStreams: () => {
        return 'CompressionStream' in window;
    },
    
    // 新增：综合缓存能力评估
    getCacheCapabilities: () => {
        const capabilities = {
            indexedDB: BROWSER_SUPPORT.checkIndexedDB(),
            cacheAPI: BROWSER_SUPPORT.checkCacheAPI(),
            fileSystemAccess: BROWSER_SUPPORT.checkFileSystemAccess(),
            serviceWorker: BROWSER_SUPPORT.checkServiceWorker(),
            webAssembly: BROWSER_SUPPORT.checkWebAssembly(),
            compressionStreams: BROWSER_SUPPORT.checkCompressionStreams()
        };
        
        // 计算缓存能力评分 (0-100)
        const weights = {
            indexedDB: 20,
            cacheAPI: 30,
            fileSystemAccess: 40,
            serviceWorker: 5,
            webAssembly: 3,
            compressionStreams: 2
        };
        
        let score = 0;
        for (const [feature, supported] of Object.entries(capabilities)) {
            if (supported) {
                score += weights[feature] || 0;
            }
        }
        
        capabilities.score = score;
        capabilities.level = score >= 80 ? 'excellent' : 
                           score >= 60 ? 'good' : 
                           score >= 40 ? 'fair' : 'basic';
        
        return capabilities;
    },
    
    // 新增：获取推荐的缓存策略
    getRecommendedCacheStrategy: () => {
        const capabilities = BROWSER_SUPPORT.getCacheCapabilities();
        
        if (capabilities.fileSystemAccess && CONFIG.CACHE.ENABLE_FILE_SYSTEM) {
            return 'filesystem';
        } else if (capabilities.cacheAPI && CONFIG.CACHE.ENABLE_CACHE_API) {
            return 'cache-api';
        } else if (capabilities.indexedDB) {
            return 'indexeddb';
        } else {
            return 'memory-only';
        }
    }
};