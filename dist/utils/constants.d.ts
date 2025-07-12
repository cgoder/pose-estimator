/**
 * 应用配置类型定义
 */
export interface AppConfig {
    DEVELOPMENT: {
        SKIP_HTTPS_CHECK: boolean;
        LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    };
    CAMERA: {
        WIDTH: number;
        HEIGHT: number;
        TIMEOUT: number;
        CONSTRAINTS: MediaStreamConstraints;
    };
    MODEL: {
        CACHE_VERSION: string;
        PRELOAD_TIMEOUT: number;
        MOVENET_URL: string;
        POSENET_URL: string;
        DEFAULT_TYPE: string;
    };
    FILTER: {
        DEFAULT_FREQUENCY: number;
        DEFAULT_MIN_CUTOFF: number;
        DEFAULT_BETA: number;
        DEFAULT_D_CUTOFF: number;
        MIN_FREQUENCY: number;
        MAX_FREQUENCY: number;
        MIN_CUTOFF_RANGE: {
            min: number;
            max: number;
        };
        BETA_RANGE: {
            min: number;
            max: number;
        };
        D_CUTOFF_RANGE: {
            min: number;
            max: number;
        };
    };
    PERFORMANCE: {
        FPS_UPDATE_INTERVAL: number;
        MEMORY_CHECK_INTERVAL: number;
        MAX_FRAME_TIME: number;
        PERFORMANCE_BUFFER_SIZE: number;
    };
    UI: {
        SKELETON_COLOR: string;
        SKELETON_LINE_WIDTH: number;
        KEYPOINT_RADIUS: number;
        CONFIDENCE_THRESHOLD: number;
        LOADING_TIMEOUT: number;
    };
    CACHE: {
        DB_NAME: string;
        DB_VERSION: number;
        STORE_NAME: string;
        MAX_MEMORY_CACHE_SIZE: number;
        CACHE_EXPIRY_DAYS: number;
    };
    ERROR_MESSAGES: {
        [key: string]: string;
    };
}
/**
 * 浏览器兼容性检查接口
 */
export interface BrowserSupport {
    checkWebGL(): boolean;
    checkIndexedDB(): boolean;
    checkCamera(): boolean;
}
export declare const CONFIG: AppConfig;
export declare const POSE_CONNECTIONS: readonly [number, number][];
export declare const KEYPOINT_NAMES: readonly string[];
export declare const BROWSER_SUPPORT: BrowserSupport;
//# sourceMappingURL=constants.d.ts.map